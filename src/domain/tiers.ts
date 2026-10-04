// Plan tiers over time (spec section 5). Pure: pass in the plan and "now".

import { PLAN_RULES } from '../config/plans.ts';
import { addMonths, daysBetween } from './dates.ts';
import { formatInr } from './format.ts';
import type { Tier } from './types.ts';

export interface PlanRecord {
  tier: Tier;
  startsAt: Date;
  endsAt: Date | null;
}

/**
 * The tier that applies right now. Mirrors private.effective_tier() in the database:
 * no plan, a plan that has not started, or a plan past its end date all count as Free.
 * So when a Paid plan ends, the institution is on Free with no job needing to run.
 */
export function effectiveTier(plan: PlanRecord | null, now: Date): Tier {
  if (!plan) return 'free';
  if (plan.startsAt.getTime() > now.getTime()) return 'free';
  if (plan.endsAt && plan.endsAt.getTime() <= now.getTime()) return 'free';
  return plan.tier;
}

/** A Paid plan runs for 6 months from the day of payment. No auto-renew. */
export function paidPlanEndsAt(startsAt: Date): Date {
  return addMonths(startsAt, PLAN_RULES.paid.lengthMonths);
}

export type ReminderStage = 'none' | 'ends_soon' | 'ends_very_soon' | 'ended';

export interface PlanReminder {
  stage: ReminderStage;
  /** Whole days left, counted in India. Null when the plan has no end date. */
  daysLeft: number | null;
}

/**
 * Renewal reminder state for a Paid plan: 30 days before the end, then 7 days before.
 * Free and Client plans have no reminders.
 */
export function planReminder(plan: PlanRecord | null, now: Date): PlanReminder {
  if (!plan || plan.tier !== 'paid' || !plan.endsAt) return { stage: 'none', daysLeft: null };
  if (plan.endsAt.getTime() <= now.getTime()) return { stage: 'ended', daysLeft: 0 };
  const daysLeft = Math.max(0, daysBetween(now, plan.endsAt));
  const [first, second] = PLAN_RULES.paid.reminderDaysBefore;
  if (daysLeft <= second) return { stage: 'ends_very_soon', daysLeft };
  if (daysLeft <= first) return { stage: 'ends_soon', daysLeft };
  return { stage: 'none', daysLeft };
}

/** Paid's price as it is written everywhere (spec section 5): "₹24,999 + GST". The amount stands alone, so it can be set in Inter. */
export const PAID_PRICE = {
  amount: formatInr(PLAN_RULES.paid.priceInr),
  tax: PLAN_RULES.paid.plusGst ? '+ GST' : '',
  text: `${formatInr(PLAN_RULES.paid.priceInr)}${PLAN_RULES.paid.plusGst ? ' + GST' : ''}`,
  /** "for 6 months" */
  term: `for ${PLAN_RULES.paid.lengthMonths} months`,
} as const;

export type PaidAskKind = 'ask_paid' | 'continue_paid';

/**
 * What an owner can ask AdmitLabs for now: Paid on Free (a Paid plan that ended counts as Free),
 * to continue Paid from the first renewal reminder, nothing on Client or earlier in Paid. Mirrors
 * private.paid_ask_kind() in the database, which turns away anything else.
 */
export function paidAskKind(plan: PlanRecord | null, now: Date): PaidAskKind | null {
  const tier = effectiveTier(plan, now);
  if (tier === 'free') return 'ask_paid';
  if (tier === 'client') return null;
  const stage = planReminder(plan, now).stage;
  return stage === 'ends_soon' || stage === 'ends_very_soon' ? 'continue_paid' : null;
}

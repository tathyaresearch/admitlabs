// Plan tiers over time (spec section 5). Pure: pass in the plan and "now".

import { PAID_MONTHS, PLAN_RULES, type PaidMonths } from '../config/plans.ts';
import { addMonths, daysBetween } from './dates.ts';
import { formatInr } from './format.ts';
import type { Tier } from './types.ts';

export type { PaidMonths } from '../config/plans.ts';

export interface PlanRecord {
  tier: Tier;
  startsAt: Date;
  endsAt: Date | null;
  /**
   * A Paid plan's billing period: 1 month or 3 months. Null on Free and Client. Left out where
   * only the tier matters; a Paid plan without one counts as 3 months (PLAN_RULES.paid.defaultMonths).
   */
  paidMonths?: PaidMonths | null;
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

/** 1 or 3 from a form, a query or the database; anything else is null. */
export function parsePaidMonths(value: unknown): PaidMonths | null {
  const months = typeof value === 'string' ? Number(value) : value;
  return PAID_MONTHS.find((option) => option === months) ?? null;
}

/** A Paid plan runs for its period, 1 month or 3 months, from the day of payment. No auto-renew. */
export function paidPlanEndsAt(startsAt: Date, months: PaidMonths): Date {
  return addMonths(startsAt, months);
}

/** How many days before the end of a Paid plan of this period the first reminder comes, and Renew now shows. */
export function renewalReminderDays(months: PaidMonths): number {
  return Math.max(...PLAN_RULES.paid.periods[months].reminderDaysBefore);
}

export type ReminderStage = 'none' | 'ends_soon' | 'ends_very_soon' | 'ended';

export interface PlanReminder {
  stage: ReminderStage;
  /** Whole days left, counted in India. Null when the plan has no end date. */
  daysLeft: number | null;
}

/**
 * Renewal reminder state for a Paid plan, by its period: on 3 months, 30 days before the end, then
 * 7 days before; on Monthly, 7 days before. Free and Client plans have no reminders.
 */
export function planReminder(plan: PlanRecord | null, now: Date): PlanReminder {
  if (!plan || plan.tier !== 'paid' || !plan.endsAt) return { stage: 'none', daysLeft: null };
  if (plan.endsAt.getTime() <= now.getTime()) return { stage: 'ended', daysLeft: 0 };
  const daysLeft = Math.max(0, daysBetween(now, plan.endsAt));
  const days = PLAN_RULES.paid.periods[plan.paidMonths ?? PLAN_RULES.paid.defaultMonths].reminderDaysBefore;
  if (daysLeft <= Math.min(...days)) return { stage: 'ends_very_soon', daysLeft };
  if (daysLeft <= Math.max(...days)) return { stage: 'ends_soon', daysLeft };
  return { stage: 'none', daysLeft };
}

/** One of Paid's prices as it is written everywhere (spec section 5). The amount stands alone, so it can be set in Inter. */
export interface PaidPrice {
  months: PaidMonths;
  /** "₹24,999" */
  amount: string;
  /** "+ GST" */
  tax: string;
  /** "₹24,999 + GST" */
  text: string;
  /** "per month", "for 3 months" */
  term: string;
  /** The period's name on the toggle and in a request: "Monthly", "3 months". */
  label: string;
}

function paidPrice(months: PaidMonths): PaidPrice {
  const amount = formatInr(PLAN_RULES.paid.periods[months].priceInr);
  const tax = PLAN_RULES.paid.plusGst ? '+ GST' : '';
  return {
    months,
    amount,
    tax,
    text: tax ? `${amount} ${tax}` : amount,
    term: months === 1 ? 'per month' : `for ${months} months`,
    label: months === 1 ? 'Monthly' : `${months} months`,
  };
}

/** Monthly first, then 3 months, as the toggle shows them. */
export const PAID_PRICES: readonly PaidPrice[] = PAID_MONTHS.map(paidPrice);

export const PAID_PRICE_BY_MONTHS: Readonly<Record<PaidMonths, PaidPrice>> = { 1: paidPrice(1), 3: paidPrice(3) };

/** The period shown and picked first. */
export const DEFAULT_PAID_MONTHS: PaidMonths = PLAN_RULES.paid.defaultMonths;

/** What 3 months saves against paying monthly for 3 months, rounded: 17. Worked out, never typed in. */
export const PAID_SAVING_PERCENT = Math.round((1 - PLAN_RULES.paid.periods[3].priceInr / (3 * PLAN_RULES.paid.periods[1].priceInr)) * 100);

/** Beside 3 months, on the toggle and the price. */
export const PAID_SAVING = `Save ${PAID_SAVING_PERCENT}%`;

/** Both prices in one line, where there is no toggle: "₹9,999 + GST per month, or ₹24,999 + GST for 3 months". */
export const PAID_PRICE_LINE = PAID_PRICES.map((price) => `${price.text} ${price.term}`).join(', or ');

/** When the reminders come, in one sentence: "We remind you 30 days before a 3-month plan ends, and 7 days before a monthly one." */
export const PLAN_REMINDER_TEXT = `We remind you ${renewalReminderDays(3)} days before a 3-month plan ends, and ${renewalReminderDays(1)} days before a monthly one.`;

/** "Paid, Monthly", "Paid, 3 months": what was asked for, or what a plan is. */
export function paidPeriodText(months: PaidMonths): string {
  return `Paid, ${PAID_PRICE_BY_MONTHS[months].label}`;
}

export type PaidAskKind = 'ask_paid' | 'continue_paid';

/** The button for each request: on Free, and from the first renewal reminder. */
export const PAID_BUTTONS: Readonly<Record<PaidAskKind, string>> = { ask_paid: 'Subscribe now', continue_paid: 'Renew now' };

/** Online payment is not set up yet: after the click, the team writes back to complete it (README, Before launch). */
export const PAID_THANKS = 'Thanks! The AdmitLabs team will contact you to complete payment.';

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

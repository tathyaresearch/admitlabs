// What an Admin can do with an institution's plan (spec section 5): start Paid (6 months from
// the day of payment, never in the future), make it a Client, or end the plan now. The database
// checks the same rules in set_plan() and end_plan(). Pure.

import { addMonths, istDate, istParts } from '../domain/dates.ts';
import { formatDate } from '../domain/format.ts';
import { effectiveTier, paidPlanEndsAt, type PlanRecord } from '../domain/tiers.ts';

export type PlanAction = 'start_paid' | 'make_client' | 'end_plan';

/** The actions that make sense for this plan today. Only for institutions that have signed up. */
export function planActions(plan: PlanRecord | null, claimed: boolean, now: Date): PlanAction[] {
  if (!claimed || !plan) return [];
  const tier = effectiveTier(plan, now);
  if (tier === 'paid') return ['make_client', 'end_plan'];
  if (tier === 'client') return ['end_plan'];
  return ['start_paid', 'make_client'];
}

/** "Paid until 15 Oct 2026", "Client since 2 Mar 2026", "Paid plan ended on 1 Sep 2026", "Free". */
export function planText(plan: PlanRecord | null, now: Date): string {
  if (!plan) return 'Free';
  const tier = effectiveTier(plan, now);
  if (tier === 'paid' && plan.endsAt) return `Paid until ${formatDate(plan.endsAt)}`;
  if (tier === 'client') return `Client since ${formatDate(plan.startsAt)}`;
  if (plan.tier === 'paid' && plan.endsAt && plan.endsAt.getTime() <= now.getTime()) return `Paid plan ended on ${formatDate(plan.endsAt)}`;
  if (plan.tier === 'client' && plan.endsAt && plan.endsAt.getTime() <= now.getTime()) return `Client service ended on ${formatDate(plan.endsAt)}`;
  return 'Free';
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 'YYYY-MM-DD' for a moment, in India. */
export function istDay(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The start dates an Admin can pick for Paid: today, back to the first day whose 6 months have not run out. */
export function paidStartRange(now: Date): { earliest: string; latest: string } {
  // A plan that started 6 months ago to the day has just ended, so the earliest is the day after.
  const earliest = addMonths(istDate(istDay(now)), -6);
  return { earliest: istDay(new Date(earliest.getTime() + 86_400_000)), latest: istDay(now) };
}

/** When a Paid plan starts, from the day picked: today means now, an earlier day means 10 am India time that day. */
export function paidStartFrom(day: string, now: Date): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const { earliest, latest } = paidStartRange(now);
  if (day > latest || day < earliest) return null;
  return day === latest ? now : istDate(day, 10);
}

/** "Ends 15 Apr 2027": what the Admin will see before starting Paid on that day. */
export function paidEndText(start: Date): string {
  return `Ends ${formatDate(paidPlanEndsAt(start))}`;
}

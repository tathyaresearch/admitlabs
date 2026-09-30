// When Audits run (spec section 11). Pure: pass in the plan, the last Audit and "now".
//
// Free: once every 3 months. Paid and Client: every month. The run date is the same day of
// the month as the plan start (the signup day for Free), and a day that does not exist in a
// month falls on its last day (a plan started on 31 Jan runs on 28 Feb, then 31 Mar).
// When a Paid or Client plan ends, Free Audits resume 3 months after the end date.
// Paid also gets one extra manual refresh each calendar month, India time.

import { SCHEDULES } from '../config/schedules.ts';
import { addMonths, istDayNumber, istParts, istDate } from './dates.ts';
import { effectiveTier, type PlanRecord } from './tiers.ts';
import type { Tier } from './types.ts';

export interface AuditSchedule {
  tier: Tier;
  /** The day the schedule counts from. */
  anchor: Date;
  everyMonths: number;
  /** The first run counted from the anchor: 0 runs on the anchor day itself, 1 a cycle later. */
  firstStep: number;
}

/** The schedule that applies now, or null when there is no plan to run on. */
export function auditSchedule(plan: PlanRecord | null, now: Date): AuditSchedule | null {
  if (!plan) return null;
  const tier = effectiveTier(plan, now);
  const ended = plan.tier !== 'free' && plan.endsAt !== null && plan.endsAt.getTime() <= now.getTime();
  if (ended) return { tier, anchor: plan.endsAt as Date, everyMonths: SCHEDULES.free.auditEveryMonths, firstStep: 1 };
  return { tier, anchor: plan.startsAt, everyMonths: SCHEDULES[tier].auditEveryMonths, firstStep: 0 };
}

function runOn(schedule: AuditSchedule, step: number): Date {
  return addMonths(schedule.anchor, step * schedule.everyMonths);
}

/** The latest scheduled run on or before `day`, counted in India days. Null before the first run. */
export function latestScheduledRun(schedule: AuditSchedule, day: Date): Date | null {
  const target = istDayNumber(day);
  if (istDayNumber(runOn(schedule, schedule.firstStep)) > target) return null;
  // Months between the anchor and the day give a close first guess; step back if it overshoots.
  const anchor = istParts(schedule.anchor);
  const now = istParts(day);
  const months = (now.year - anchor.year) * 12 + (now.month - anchor.month);
  let step = Math.max(schedule.firstStep, Math.floor(months / schedule.everyMonths) + 1);
  while (step > schedule.firstStep && istDayNumber(runOn(schedule, step)) > target) step -= 1;
  return runOn(schedule, step);
}

/** The first scheduled run after `day`. */
export function nextScheduledRun(schedule: AuditSchedule, day: Date): Date {
  const latest = latestScheduledRun(schedule, day);
  if (!latest) return runOn(schedule, schedule.firstStep);
  const anchor = istParts(schedule.anchor);
  const at = istParts(latest);
  const step = Math.round(((at.year - anchor.year) * 12 + (at.month - anchor.month)) / schedule.everyMonths);
  return runOn(schedule, step + 1);
}

/**
 * Whether a scheduled Audit is due. It is due once the latest scheduled run date has come and
 * no Audit has run on or after it, so a run that is missed one day still happens the next.
 * `lastRunAt` is the last signup or scheduled Audit; manual refreshes do not move the schedule.
 */
export function isAuditDue(schedule: AuditSchedule, lastRunAt: Date | null, now: Date): boolean {
  const latest = latestScheduledRun(schedule, now);
  if (!latest) return false;
  return lastRunAt === null || istDayNumber(lastRunAt) < istDayNumber(latest);
}

/** When the next Audit will run: today when one is due, else the next scheduled date. */
export function nextAuditDate(schedule: AuditSchedule, lastRunAt: Date | null, now: Date): Date {
  if (isAuditDue(schedule, lastRunAt, now)) return now;
  return nextScheduledRun(schedule, now);
}

/**
 * The next Audit and the tier it runs on. A run that would fall when a Paid or Client plan has
 * ended happens on the Free schedule instead: 3 months after the end date.
 */
export function upcomingAudit(plan: PlanRecord | null, lastRunAt: Date | null, now: Date): { on: Date; tier: Tier } | null {
  const schedule = auditSchedule(plan, now);
  if (!plan || !schedule) return null;
  const on = nextAuditDate(schedule, lastRunAt, now);
  if (schedule.tier !== 'free' && plan.endsAt && on.getTime() >= plan.endsAt.getTime()) {
    const afterEnd = auditSchedule(plan, plan.endsAt);
    return afterEnd ? { on: runOn(afterEnd, afterEnd.firstStep), tier: afterEnd.tier } : null;
  }
  return { on, tier: schedule.tier };
}

/** Extra manual refreshes left this calendar month (India time). Paid only; Client refreshes go through the team. */
export function refreshesLeft(tier: Tier, manualRefreshesThisMonth: number): number {
  if (SCHEDULES[tier].manualRefresh !== 'once_a_month') return 0;
  return Math.max(0, 1 - manualRefreshesThisMonth);
}

/** The first day of the next calendar month in India, when the refresh comes back. */
export function refreshResetsOn(now: Date): Date {
  const { year, month } = istParts(now);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return istDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
}

/** True when two moments fall in the same calendar month in India. */
export function sameIstMonth(a: Date, b: Date): boolean {
  const first = istParts(a);
  const second = istParts(b);
  return first.year === second.year && first.month === second.month;
}

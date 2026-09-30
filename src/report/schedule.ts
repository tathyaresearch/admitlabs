// When the monthly report is made (spec sections 11 and 12, Phase 5 decisions): on the 1st, for
// the India month that just ended, for institutions on Paid or Client that day. One report per
// institution and month; past reports stay after a Paid plan ends, but no new ones are made.
// Pure date rules.

import { istDate, monthKey, previousMonth } from '../domain/dates.ts';
import type { Tier } from '../domain/types.ts';

const pad = (value: number) => String(value).padStart(2, '0');

export function nextMonth(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`Expected YYYY-MM, got "${month}"`);
  const [year, value] = month.split('-').map(Number) as [number, number];
  return value === 12 ? `${year + 1}-01` : `${year}-${pad(value + 1)}`;
}

/** The month a report made on `now` covers: the India month before. 'YYYY-MM'. */
export function reportMonth(now: Date): string {
  return previousMonth(monthKey(now));
}

/** The first moment after the month: what the report knows is cut here. */
export function monthEnd(month: string): Date {
  return istDate(`${nextMonth(month)}-01`);
}

/** When a month's report is made: the 1st of the next month, 7 am India time. */
export function reportDayOf(month: string): Date {
  return istDate(`${nextMonth(month)}-01`, 7);
}

/** The next report day after `now`, and the month it covers. */
export function nextReport(now: Date): { on: Date; month: string } {
  const month = monthKey(now);
  return { on: reportDayOf(month), month };
}

export interface ReportCandidate {
  /** The tier on the day the report is made. */
  tier: Tier;
  claimed: boolean;
  /** The latest own Audit on or before the end of the month, if any. */
  lastAuditAt: Date | null;
  /** A report for the month already exists. */
  hasReport: boolean;
}

/** Only Paid and Client get new reports, only for a month they have an Audit for, and only once. */
export function isReportDue(candidate: ReportCandidate, month: string): boolean {
  if (candidate.tier === 'free' || !candidate.claimed || candidate.hasReport) return false;
  return candidate.lastAuditAt !== null && candidate.lastAuditAt.getTime() < monthEnd(month).getTime();
}

/** Where the file is kept in the private reports bucket. */
export function reportPath(institutionId: string, month: string): string {
  return `${institutionId}/${month}.pdf`;
}

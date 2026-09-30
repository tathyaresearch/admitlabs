// When rival work runs (spec section 11). Pure date rules, in India time.
//   Rival Audits      on the 1st of each month, shared by everyone tracking that rival
//   Weekly check      every Monday: new moves (alerts for Paid and Client) and best content
//   3 things to do    each month, after the institution's own Audit (Paid and Client)

import { istDate, istDayNumber, istParts } from '../domain/dates.ts';

const DAY_MS = 86_400_000;
const pad = (value: number) => String(value).padStart(2, '0');

function ymd(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The Monday (India date) of the week a moment falls in. */
export function mondayOf(date: Date): string {
  // Day 0 of the India day count (1 Jan 1970) was a Thursday, so Monday is 3 days later.
  const weekday = (((istDayNumber(date) - 4) % 7) + 7) % 7;
  return ymd(new Date(date.getTime() - weekday * DAY_MS));
}

/** The first moment of the India calendar month a moment falls in. */
export function monthStartOf(date: Date): Date {
  const { year, month } = istParts(date);
  return istDate(`${year}-${pad(month)}-01`);
}

/** 'YYYY-MM-01', the month column value for a moment. */
export function monthColumn(date: Date): string {
  const { year, month } = istParts(date);
  return `${year}-${pad(month)}-01`;
}

/** A rival's monthly Audit is due when it has none since the 1st of this month. */
export function isRivalAuditDue(lastRivalAudit: Date | null, now: Date): boolean {
  return lastRivalAudit === null || lastRivalAudit.getTime() < monthStartOf(now).getTime();
}

/** The weekly check is due when this week's Monday has not been checked. */
export function isWeeklyCheckDue(checkedWeeks: readonly string[], now: Date): boolean {
  return !checkedWeeks.includes(mondayOf(now));
}

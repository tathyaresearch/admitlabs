// When Demand is pulled (spec section 11): once a month, on the 28th (India time), shared by
// every institution that needs a region and program. A pull covers its month. Pure.

import { DEMAND_RULES } from '../config/demand.ts';
import { istDate, istParts, previousMonth } from '../domain/dates.ts';

const pad = (value: number) => String(value).padStart(2, '0');

/** The month a scheduled pull on `now` covers: this month from the 28th on, else last month. */
export function pullMonth(now: Date): string {
  const { year, month, day } = istParts(now);
  const key = `${year}-${pad(month)}`;
  return day >= DEMAND_RULES.pullDay ? key : previousMonth(key);
}

/** The scheduled pull day of a month ('YYYY-MM'), at 6 am India time. */
export function pullDayOf(month: string): Date {
  return istDate(`${month}-${pad(DEMAND_RULES.pullDay)}`, 6);
}

/**
 * A region and program is due for its monthly pull when that month has none yet, or only a
 * first pull made before the 28th (for an institution that had just signed up).
 */
export function isPullDue(pulledAt: Date | null, month: string): boolean {
  return pulledAt === null || pulledAt.getTime() < pullDayOf(month).getTime();
}

/** The next scheduled pull after `now`. */
export function nextPullOn(now: Date): Date {
  const { year, month, day } = istParts(now);
  const key = `${year}-${pad(month)}`;
  if (day < DEMAND_RULES.pullDay) return pullDayOf(key);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  return pullDayOf(next);
}

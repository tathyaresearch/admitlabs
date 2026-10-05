// What the Leads page says at the top (spec section 23): enquiries this month, measured against
// last month up to the same day so the start of a month never reads as a fall; last month in all
// against the month before; and the link that brought the most. From each link's counts, which
// the team sees too (lead_link_counts). Pure.

import { formatMonthName } from '../domain/format.ts';
import type { LeadSource } from '../domain/types.ts';

export interface LinkCount {
  id: string;
  code: string;
  name: string;
  usedOn: LeadSource;
  /** Null for a general link, where the student picks the course. */
  programName: string | null;
  createdAt: string;
  archivedAt: string | null;
  thisMonth: number;
  /** Last month, from the 1st up to the same moment this month has reached. */
  lastMonthToDate: number;
  lastMonth: number;
  monthBefore: number;
  total: number;
}

export interface LeadsSummary {
  thisMonth: number;
  lastMonthToDate: number;
  lastMonth: number;
  monthBefore: number;
  total: number;
  /** The link that brought the most this month, or last month while this month has none yet. */
  top: { link: LinkCount; count: number; month: 'this' | 'last' } | null;
}

const sum = (links: readonly LinkCount[], pick: (link: LinkCount) => number) => links.reduce((total, link) => total + pick(link), 0);

/** Most this month first, then last month, then in all; archived links after live ones. */
export function byLink(links: readonly LinkCount[]): LinkCount[] {
  return [...links].sort(
    (a, b) =>
      Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) || b.thisMonth - a.thisMonth || b.lastMonth - a.lastMonth || b.total - a.total || a.name.localeCompare(b.name),
  );
}

export function leadsSummary(links: readonly LinkCount[]): LeadsSummary {
  const best = (pick: (link: LinkCount) => number) => {
    const [link] = [...links].sort((a, b) => pick(b) - pick(a) || b.total - a.total || a.name.localeCompare(b.name));
    return link && pick(link) > 0 ? link : null;
  };
  const thisMonthTop = best((link) => link.thisMonth);
  const lastMonthTop = best((link) => link.lastMonth);
  return {
    thisMonth: sum(links, (link) => link.thisMonth),
    lastMonthToDate: sum(links, (link) => link.lastMonthToDate),
    lastMonth: sum(links, (link) => link.lastMonth),
    monthBefore: sum(links, (link) => link.monthBefore),
    total: sum(links, (link) => link.total),
    top: thisMonthTop
      ? { link: thisMonthTop, count: thisMonthTop.thisMonth, month: 'this' }
      : lastMonthTop
        ? { link: lastMonthTop, count: lastMonthTop.lastMonth, month: 'last' }
        : null,
  };
}

/**
 * This month so far against last month up to the same day: "3 more than by this day in
 * September", "The same as by this day in September", or, behind, plainly what last month had:
 * "By this day in September there were 3". A low month is something to act on, never a failure.
 */
export function soFarWords(now: number, before: number, lastMonth: string): string {
  const name = formatMonthName(lastMonth);
  if (now === before) return `The same as by this day in ${name}`;
  if (now > before) return `${now - before} more than by this day in ${name}`;
  return `By this day in ${name} there ${before === 1 ? 'was 1' : `were ${before}`}`;
}

/** Last month against the month before: "6 more than August", "The same as August", "August had 26". */
export function monthWords(month: number, before: number, monthBefore: string): string {
  const name = formatMonthName(monthBefore);
  if (month === before) return `The same as ${name}`;
  if (month > before) return `${month - before} more than ${name}`;
  return `${name} had ${before}`;
}

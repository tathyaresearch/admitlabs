// The AdmitLabs team's work log for a Client (C5). The team writes what it did, or does next,
// with the day and a link to the work when there is one; the Client reads it on Home's "Your
// AdmitLabs team" card (C4) and in the full list. Pure: what the team's form may save, what
// the card shows, and the full list by month. The database checks the same limits again.

import { istDayNumber, istDate, monthKey } from '../domain/dates.ts';
import { tidyText, type Check } from '../domain/onboarding.ts';

export type WorkKind = 'done' | 'next';

export const WORK_KINDS: readonly WorkKind[] = ['done', 'next'];

export interface WorkEntry {
  id: string;
  kind: WorkKind;
  text: string;
  /** 'YYYY-MM-DD': the day it was done, or for Next, the day it is due. */
  on: string;
  link: string | null;
}

export const WORK_RULES = {
  textMin: 3,
  textMax: 300,
  linkMax: 500,
  /** How far back a piece of work can be dated, and how far ahead Next can be due. */
  daysAround: 366,
  /** What the card on Home shows. The full list has the rest. */
  cardDone: 3,
  cardNext: 2,
} as const;

const ok = <T>(value: T): Check<T> => ({ ok: true, value });
const fail = <T>(error: string): Check<T> => ({ ok: false, error });

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day as 'YYYY-MM-DD', or null. */
function calendarDay(input: string): string | null {
  const match = DAY.exec(input.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? input.trim() : null;
}

/** Optional. A link to the work (a page, a post, a listing), http or https, kept as given. */
export function checkWorkLink(input: string): Check<string | null> {
  const text = input.trim();
  if (!text) return ok(null);
  const message = 'Paste a link that starts with https://, or leave it empty.';
  if (/\s/.test(text) || text.length > WORK_RULES.linkMax) return fail(message);
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    const host = url.hostname.toLowerCase();
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return fail(message);
    return ok(url.href);
  } catch {
    return fail(message);
  }
}

export interface WorkInput {
  kind: WorkKind;
  text: string;
  on: string;
  link: string | null;
}

/** What the team's form may save. Done is dated up to today, Next from today, both within a year (India time). */
export function checkWork(form: { kind: string; text: string; on: string; link: string }, now: Date): Check<WorkInput> {
  const kind = WORK_KINDS.find((entry) => entry === form.kind);
  if (!kind) return fail('Pick Done or Next.');
  const text = tidyText(form.text);
  if (text.length < WORK_RULES.textMin) return fail(kind === 'done' ? 'Write what was done.' : 'Write what the team does next.');
  if (text.length > WORK_RULES.textMax) return fail(`Keep it under ${WORK_RULES.textMax} characters.`);
  const on = calendarDay(form.on);
  if (!on) return fail(kind === 'done' ? 'Pick the day it was done.' : 'Pick the day it is due.');
  const days = istDayNumber(istDate(on, 12)) - istDayNumber(now);
  if (kind === 'done' && days > 0) return fail('Work that is done is dated today or earlier.');
  if (kind === 'next' && days < 0) return fail('Next is due today or later.');
  if (Math.abs(days) > WORK_RULES.daysAround) return fail(kind === 'done' ? 'Pick a day in the last year.' : 'Pick a day in the next year.');
  const link = checkWorkLink(form.link);
  if (!link.ok) return link;
  return ok({ kind, text, on, link: link.value });
}

/** Newest first; work on the same day keeps the order it came in (newest added first from the database). */
const newestFirst = (a: WorkEntry, b: WorkEntry) => b.on.localeCompare(a.on);
/** Soonest first. */
const soonestFirst = (a: WorkEntry, b: WorkEntry) => a.on.localeCompare(b.on);

/** Next whose day has passed: the team marks it done or removes it. */
export function isOverdue(entry: WorkEntry, now: Date): boolean {
  return entry.kind === 'next' && istDayNumber(istDate(entry.on, 12)) < istDayNumber(now);
}

export interface WorkCard {
  /** "Done this month" when the team logged work this month (India time); otherwise the latest work. */
  doneLabel: 'Done this month' | 'Latest work';
  done: WorkEntry[];
  next: WorkEntry[];
  /** Entries the card leaves for the full list. */
  more: number;
}

/** Home's card: what the team did this month (or lately), and what it does next. */
export function workCard(entries: readonly WorkEntry[], now: Date): WorkCard {
  const done = entries.filter((entry) => entry.kind === 'done').sort(newestFirst);
  const thisMonth = done.filter((entry) => entry.on.slice(0, 7) === monthKey(now));
  const shownDone = (thisMonth.length ? thisMonth : done).slice(0, WORK_RULES.cardDone);
  const next = entries
    .filter((entry) => entry.kind === 'next')
    .sort(soonestFirst)
    .slice(0, WORK_RULES.cardNext);
  return {
    doneLabel: thisMonth.length ? 'Done this month' : 'Latest work',
    done: shownDone,
    next,
    more: entries.length - shownDone.length - next.length,
  };
}

/** The full list: Next, soonest first, then what was done by month, newest first. */
export function workByMonth<T extends WorkEntry>(entries: readonly T[]): { next: T[]; months: { month: string; entries: T[] }[] } {
  const next = entries.filter((entry) => entry.kind === 'next').sort(soonestFirst);
  const months: { month: string; entries: T[] }[] = [];
  for (const entry of entries.filter((item) => item.kind === 'done').sort(newestFirst)) {
    const month = entry.on.slice(0, 7);
    const group = months.at(-1);
    if (group?.month === month) group.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }
  return { next, months };
}

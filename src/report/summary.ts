// The monthly summary (spec section 24), for Paid and Client: how you're doing (Visibility, Trust
// and Chosen, and any that moved), the 3 things to do this month (Home's three), one rival move,
// and for a Client the month's enquiries. Made on the 1st with the report; the same summary opens
// the month on Reports, in the PDF and in the email. Kept with the report (reports.summary), where
// the AdmitLabs team can fix a line in a review before it goes out (section 25). Pure.

import type { WordView } from '../audit/places.ts';
import { previousMonth } from '../domain/dates.ts';
import { formatMonthName, joinNames, plural } from '../domain/format.ts';
import { wordScoreText, type ScoreLabel } from '../domain/scores.ts';
import { EFFORT_LABELS, IMPACT_LABELS, PILLARS, type Pillar } from '../domain/types.ts';
import { THING_SOURCE_LABELS, THING_SOURCES, type Thing, type ThingSource } from './things.ts';

export interface SummaryWord {
  pillar: Pillar;
  name: string;
  /** Out of 100. Null in a summary kept before the numbers showed (October 2026). */
  score: number | null;
  word: ScoreLabel;
  /** "Up from Okay in August", or the word's question when it held. */
  note: string;
}

export interface MonthlySummary {
  /** 'YYYY-MM': the month it covers. */
  month: string;
  words: SummaryWord[];
  /** Each line the team can fix in a review. */
  lines: {
    words: string;
    /** The 3 things to do, by name. */
    things: string[];
    move: string;
    /** A Client's enquiries; null for Paid. */
    enquiries: string | null;
  };
  /** Where each thing comes from, and its small label, beside lines.things. */
  things: Array<{ source: ThingSource; meta: string }>;
}

/** The lines a review can fix: 'words', 'things.1' to 'things.3', 'move' and 'enquiries'. */
export type SummaryTarget = 'words' | 'things.1' | 'things.2' | 'things.3' | 'move' | 'enquiries';
export const SUMMARY_TARGETS: readonly SummaryTarget[] = ['words', 'things.1', 'things.2', 'things.3', 'move', 'enquiries'];

/** What each line is called in the review. */
export const SUMMARY_TARGET_LABELS: Readonly<Record<SummaryTarget, string>> = {
  words: 'How you’re doing',
  'things.1': 'Thing to do 1',
  'things.2': 'Thing to do 2',
  'things.3': 'Thing to do 3',
  move: 'One rival move',
  enquiries: 'Your enquiries',
};

export interface SummaryMove {
  rival: string;
  /** A sentence, as the weekly check found it: "Announced 2027 admission dates." */
  description: string;
  detectedAt: string;
}

export interface SummaryLeads {
  /** Enquiries in the month. */
  count: number;
  /** In the month before, or null before the first link existed. */
  before: number | null;
  /** The link that brought the most in the month. */
  top: { name: string; count: number } | null;
}

export interface SummaryInput {
  /** 'YYYY-MM'. */
  month: string;
  words: readonly WordView[];
  firstAudit: boolean;
  /** When the Audit before the latest ran, for "since August". */
  previousRunAt: string | null;
  things: readonly Thing[];
  /** The month's latest rival move. */
  move: SummaryMove | null;
  hasRivals: boolean;
  /** A Client's enquiries; null for Paid. */
  leads: SummaryLeads | null;
}

const lower = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

/** A word as a summary says it: "Visibility 79/100 (Strong)", or the word alone in an old summary. */
export function summaryWordText(word: Pick<SummaryWord, 'name' | 'score' | 'word'>): string {
  return word.score === null ? `${word.name} ${word.word}` : wordScoreText(word.name, word.score, word.word);
}

/** "Trust is up from Weak in August, now 45/100 (Okay).", "No word moved since August: ...", or the first Audit's words. */
export function wordsLine(words: readonly WordView[], options: { firstAudit: boolean; previousRunAt: string | null }): string {
  const all = words.map((word) => wordScoreText(word.name, word.score, word.word));
  if (options.firstAudit) return `Your first Audit: ${joinNames(all)}.`;
  const moved = words.filter((word) => word.moved);
  if (moved.length === 0) {
    return options.previousRunAt ? `No word moved since ${formatMonthName(options.previousRunAt.slice(0, 7))}: ${joinNames(all)}.` : `${joinNames(all)}.`;
  }
  return moved.map((word) => `${word.name} is ${lower(word.moved ?? '')}, now ${Math.round(word.score)}/100 (${word.word}).`).join(' ');
}

/**
 * The small label under a thing, after where it comes from: "Website · Fees · Impact High ·
 * Effort Quick", "Learned from Silverline College · Effort Medium", "Reel · BBA · Asked about 91
 * times in Guwahati this month."
 */
export function thingMeta(thing: Thing): string {
  const impact = thing.impact ? `Impact ${IMPACT_LABELS[thing.impact]}` : null;
  const effort = thing.effort ? `Effort ${EFFORT_LABELS[thing.effort]}` : null;
  const parts = thing.source === 'demand' ? [thing.label, thing.weight] : [thing.label, impact, effort];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

/** Where a thing comes from and its label, in one line, for the email: "From your Audit · Website · Fees · Impact High". */
export function thingLine(thing: MonthlySummary['things'][number]): string {
  return thing.source === 'rivals' ? thing.meta : `${THING_SOURCE_LABELS[thing.source]} · ${thing.meta}`;
}

/** "Silverline College: Announced 2027 admission dates.", or what to expect when there was none. */
export function moveLine(move: SummaryMove | null, options: { month: string; hasRivals: boolean }): string {
  if (move) return `${move.rival}: ${move.description}`;
  if (!options.hasRivals) return 'Pick 3 to 5 rivals in Drishti, and their moves show here.';
  return `No rival moves found in ${formatMonthName(options.month)}. Drishti checks their public pages every week.`;
}

/**
 * "Your content brought 23 enquiries in September, 6 more than in August. Most came from
 * Instagram bio." A smaller month says plainly what the month before had: something to act on.
 */
export function enquiriesLine(leads: SummaryLeads, month: string): string {
  const name = formatMonthName(month);
  const before = formatMonthName(previousMonth(month));
  if (leads.count === 0) {
    return leads.before ? `No enquiries came in through your links in ${name}. ${before} had ${leads.before}.` : `No enquiries came in through your links in ${name}.`;
  }
  const brought = `Your content brought ${plural(leads.count, 'enquiry', 'enquiries')} in ${name}`;
  const compared =
    leads.before === null || leads.before === 0
      ? `${brought}.`
      : leads.count > leads.before
        ? `${brought}, ${leads.count - leads.before} more than in ${before}.`
        : leads.count === leads.before
          ? `${brought}, the same as in ${before}.`
          : `${brought}. ${before} had ${leads.before}.`;
  return leads.top ? `${compared} Most came from ${leads.top.name}.` : compared;
}

export function buildSummary(input: SummaryInput): MonthlySummary {
  const things = input.things.slice(0, 3);
  return {
    month: input.month,
    words: input.words.map((word) => ({ pillar: word.pillar, name: word.name, score: Math.round(word.score), word: word.word, note: word.moved ?? word.question })),
    lines: {
      words: wordsLine(input.words, { firstAudit: input.firstAudit, previousRunAt: input.previousRunAt }),
      things: things.map((thing) => thing.title),
      move: moveLine(input.move, { month: input.month, hasRivals: input.hasRivals }),
      enquiries: input.leads ? enquiriesLine(input.leads, input.month) : null,
    },
    things: things.map((thing) => ({ source: thing.source, meta: thingMeta(thing) })),
  };
}

/** One line of a summary, by its target. Null when the summary has no such line. */
export function summaryLine(summary: MonthlySummary, target: SummaryTarget): string | null {
  if (target === 'words' || target === 'move') return summary.lines[target];
  if (target === 'enquiries') return summary.lines.enquiries;
  const index = Number(target.split('.')[1]) - 1;
  return summary.lines.things[index] ?? null;
}

/** The lines a review can fix in this summary, in reading order. */
export function summaryTargets(summary: MonthlySummary): SummaryTarget[] {
  return SUMMARY_TARGETS.filter((target) => summaryLine(summary, target) !== null);
}

/** "Your September: Visibility 75/100 (Strong), Trust 69/100 (Okay), Chosen 74/100 (Strong)". */
export function summarySubject(summary: Pick<MonthlySummary, 'month' | 'words'>): string {
  return `Your ${formatMonthName(summary.month)}: ${summary.words.map(summaryWordText).join(', ')}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const WORDS: readonly string[] = ['Strong', 'Okay', 'Weak'];

/** A stored summary (reports.summary), or null when it is missing or not one. */
export function parseSummary(value: unknown): MonthlySummary | null {
  if (!isRecord(value) || !isText(value.month) || !/^\d{4}-\d{2}$/.test(value.month)) return null;
  const { words, lines, things } = value;
  if (!Array.isArray(words) || !isRecord(lines) || !Array.isArray(things)) return null;
  const parsedWords = words.flatMap((word): SummaryWord[] =>
    isRecord(word) && PILLARS.includes(word.pillar as Pillar) && isText(word.name) && WORDS.includes(word.word as string) && isText(word.note)
      ? [
          {
            pillar: word.pillar as Pillar,
            name: word.name,
            score: typeof word.score === 'number' && Number.isFinite(word.score) ? Math.max(0, Math.min(100, Math.round(word.score))) : null,
            word: word.word as ScoreLabel,
            note: word.note,
          },
        ]
      : [],
  );
  if (parsedWords.length !== words.length || !isText(lines.words) || !isText(lines.move) || !Array.isArray(lines.things) || !lines.things.every(isText)) return null;
  if (lines.enquiries !== null && !isText(lines.enquiries)) return null;
  const parsedThings = things.flatMap((thing): MonthlySummary['things'] =>
    isRecord(thing) && THING_SOURCES.includes(thing.source as ThingSource) && isText(thing.meta) ? [{ source: thing.source as ThingSource, meta: thing.meta }] : [],
  );
  if (parsedThings.length !== things.length) return null;
  return {
    month: value.month,
    words: parsedWords,
    lines: { words: lines.words, things: lines.things as string[], move: lines.move, enquiries: (lines.enquiries as string | null) ?? null },
    things: parsedThings,
  };
}

// "Do these 3 things this month" (spec sections 12, 13 and 24), one list for Home, the monthly
// summary and the report on Paid and Client:
//   1. A fix from the Audit (the top of its one ranking).
//   2. A lesson from rivals that is not about the same check.
//   3. One of Make these 3 (the month's first pick).
// When one is missing (every check is Strong, no rivals yet, no picks yet), the next fixes, then
// the next lessons, then the next picks fill in, never two about the same check. Ordered by
// impact; a lesson about a check carries that check's impact, an idea has none and goes last.
// Free keeps "Fix these first": its top 3 fixes. Each thing carries what Home, the summary and
// the report show beside it, and what Mark as done saves. Pure.

import type { FixView } from '../audit/places.ts';
import type { ListItem } from '../audit/view.ts';
import type { PickedIdea } from '../demand/picks.ts';
import { checkAction } from '../domain/checks.ts';
import { IDEA_FORMAT_LABELS, IMPACTS, PLACE_LABELS, RESULTS, type CheckKey, type CheckResult, type Difficulty, type IdeaFormat, type Impact, type InstitutionType, type Place } from '../domain/types.ts';

export type ThingSource = 'audit' | 'rivals' | 'demand';

export const THING_SOURCES: readonly ThingSource[] = ['audit', 'rivals', 'demand'];

export const THING_SOURCE_LABELS: Readonly<Record<ThingSource, string>> = {
  audit: 'From your Audit',
  rivals: 'From your rivals',
  demand: 'Make these 3',
};

export interface Thing {
  source: ThingSource;
  title: string;
  /** A small label beside where it comes from: "Website · Fees", "Learned from Silverline College", "Reel · BBA". */
  label: string;
  /** Why, in a sentence or two. */
  detail: string;
  /** A fix's id, as Mark as done and Let AdmitLabs fix this name it: 'check:fees_shown' or 'finding:<key>'. */
  fixId: string | null;
  checkKey: CheckKey | null;
  place: Place | null;
  rivalId: string | null;
  impact: Impact | null;
  effort: Difficulty | null;
  programs: string[];
  format: IdeaFormat | null;
  /** For an idea: how often its question was asked, said instead of an impact. */
  weight: string | null;
  /** What Mark as done keeps for a lesson or an idea: its words and its month. A fix is marked by its id. */
  mark: { thing: string; month: string } | null;
}

/** One of the month's Rivals 3 things to do, as saved. */
export interface RivalLesson {
  text: string;
  detail: string | null;
  checkKey: CheckKey | null;
  rivalId: string | null;
  /** How big a job it is, from the analysis provider (null for a lesson about a check). */
  effort: Difficulty | null;
  /** 'YYYY-MM'. */
  month: string | null;
}

/** One of Make these 3, as picked for a month. */
export interface MonthPick {
  /** 'YYYY-MM' */
  month: string;
  rank: number;
  idea: PickedIdea;
}

export interface ThingsInput {
  /** The Audit's fixes, in its one ranking. */
  fixes: readonly FixView[];
  /** The month's Rivals 3 things to do, ranked. */
  lessons: readonly RivalLesson[];
  /** The month's Make these 3. */
  picks: readonly MonthPick[];
  /** Rival names by id, for "Learned from Silverline College". */
  rivalNames: ReadonlyMap<string, string>;
}

export function fixThing(fix: FixView): Thing {
  return {
    source: 'audit',
    title: fix.title,
    label: `${PLACE_LABELS[fix.place]} · ${fix.label}`,
    detail: fix.why ?? '',
    fixId: fix.id,
    checkKey: fix.checkKey,
    place: fix.place,
    rivalId: null,
    impact: fix.impact,
    effort: fix.effort,
    programs: [...fix.programs],
    format: null,
    weight: null,
    mark: null,
  };
}

/** A lesson about a check carries that check's fix from the Audit: its impact, how big it is, its programs. */
export function lessonThing(lesson: RivalLesson, fixes: readonly FixView[], rivalNames: ReadonlyMap<string, string>): Thing {
  const fix = lesson.checkKey ? fixes.find((item) => item.checkKey === lesson.checkKey) : undefined;
  const rival = lesson.rivalId ? rivalNames.get(lesson.rivalId) : undefined;
  return {
    source: 'rivals',
    title: lesson.text,
    label: rival ? `Learned from ${rival}` : 'Learned from your rivals',
    detail: lesson.detail ?? '',
    fixId: null,
    checkKey: lesson.checkKey,
    place: fix?.place ?? null,
    rivalId: lesson.rivalId,
    impact: fix?.impact ?? null,
    effort: lesson.effort ?? fix?.effort ?? null,
    programs: fix ? [...fix.programs] : [],
    format: null,
    weight: null,
    mark: lesson.month ? { thing: lesson.text, month: lesson.month } : null,
  };
}

/** One of Make these 3: what to make, for which program, and how often its question was asked. */
export function pickThing(pick: MonthPick): Thing {
  const { idea } = pick;
  const [first, ...rest] = idea.why.split(/(?<=\.)\s+/);
  return {
    source: 'demand',
    title: idea.title,
    label: idea.format ? `${IDEA_FORMAT_LABELS[idea.format]} · ${idea.programName}` : idea.programName,
    detail: rest.join(' '),
    fixId: null,
    checkKey: null,
    place: null,
    rivalId: null,
    impact: null,
    effort: idea.effort,
    programs: [idea.programName],
    format: idea.format,
    weight: first?.trim() || null,
    mark: { thing: idea.text, month: pick.month },
  };
}

const IMPACT_ORDER = (impact: Impact | null) => (impact ? IMPACTS.indexOf(impact) : IMPACTS.length);

/** Impact first (High, Medium, Low, then none), then where it comes from, then the order it was chosen. */
export function byImpact<T extends Pick<Thing, 'impact' | 'source'>>(things: readonly T[]): T[] {
  return things
    .map((thing, index) => ({ thing, index }))
    .sort((a, b) => IMPACT_ORDER(a.thing.impact) - IMPACT_ORDER(b.thing.impact) || THING_SOURCES.indexOf(a.thing.source) - THING_SOURCES.indexOf(b.thing.source) || a.index - b.index)
    .map(({ thing }) => thing);
}

/** Paid and Client: a fix, a lesson and one of Make these 3, ordered by impact. */
export function threeThings(input: ThingsInput): Thing[] {
  const fixes = input.fixes.map(fixThing);
  const lessons = input.lessons.filter((lesson) => lesson.text.trim()).map((lesson) => lessonThing(lesson, input.fixes, input.rivalNames));
  const picks = [...input.picks].sort((a, b) => a.rank - b.rank).map(pickThing);

  const chosen: Thing[] = [];
  const checks = new Set<CheckKey>();
  const take = (thing: Thing | undefined): boolean => {
    if (!thing || chosen.length >= 3 || chosen.includes(thing)) return false;
    if (thing.checkKey && checks.has(thing.checkKey)) return false;
    chosen.push(thing);
    if (thing.checkKey) checks.add(thing.checkKey);
    return true;
  };

  take(fixes[0]);
  lessons.some(take);
  picks.some(take);
  for (const thing of [...fixes, ...lessons, ...picks]) take(thing);
  return byImpact(chosen);
}

/** Free: "Fix these first", its top 3 fixes. */
export function freeThings(fixes: readonly FixView[], limit = 3): Thing[] {
  return fixes.slice(0, limit).map(fixThing);
}

// The team's view of a prospect still reads the Audit check by check (src/audit/view.ts).

/** Programs named in a fix title. More than three reads as "your programs". */
const MAX_NAMED_PROGRAMS = 3;
const RESULT_RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));

/** A check's fix, named for its weakest result, as the Audit names it: "Show your full BBA fees". */
export function checkFixTitle(item: ListItem, type: InstitutionType): string {
  const programs = [...new Set(item.parts.flatMap((part) => (part.programName ? [part.programName] : [])))];
  const weakest = item.parts.map((part) => part.result).sort((a, b) => (RESULT_RANK.get(b) ?? 0) - (RESULT_RANK.get(a) ?? 0))[0];
  return checkAction(item.key, programs.length > MAX_NAMED_PROGRAMS ? [] : programs, type, weakest);
}

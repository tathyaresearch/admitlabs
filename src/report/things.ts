// "3 things to do this month" (spec sections 12 and 13), one list for the report and for Home
// on Paid and Client. Built the same way every month:
//   1. The biggest Audit fix.
//   2. The top Rivals lesson that is not about the same check.
//   3. The top content idea from Demand.
// When one is missing (every check is Strong, no rivals yet, no Demand yet), the next fixes,
// then the next lessons, then the next ideas fill in, never two about the same check. Each one
// carries what Home shows beside it: the points it could add (a fix, or a lesson about a check
// the Audit can fix), how big a job it is, its programs, and for an idea its format and how
// often its question was asked. Pure.

import { pointsToGainText, type ListItem } from '../audit/view.ts';
import type { IdeaRow } from '../demand/view.ts';
import { checkAction } from '../domain/checks.ts';
import { formatCount } from '../domain/format.ts';
import { LANGUAGE_LABELS, RESULTS, type CheckKey, type CheckResult, type Difficulty, type IdeaFormat, type InstitutionType, type Language } from '../domain/types.ts';

export type ThingSource = 'audit' | 'rivals' | 'demand';

export const THING_SOURCES: readonly ThingSource[] = ['audit', 'rivals', 'demand'];

export const THING_SOURCE_LABELS: Readonly<Record<ThingSource, string>> = {
  audit: 'From your Audit',
  rivals: 'From Rivals',
  demand: 'From Demand',
};

export interface Thing {
  source: ThingSource;
  title: string;
  detail: string;
  /** The check it is about, when it is about one. */
  checkKey: CheckKey | null;
  /** The rival it is about, when there is one. */
  rivalId: string | null;
  /** What it could add to the score: an Audit fix, or a lesson about a check the Audit can fix. */
  points: number | null;
  /** How big a job it is, when known. */
  effort: Difficulty | null;
  /** The programs it is about. */
  programs: string[];
  /** A content idea's format, and the student question behind it: how often it was asked, and in what language. */
  format: IdeaFormat | null;
  question: { text: string; count: number; language: Language } | null;
  /** The month a lesson or an idea belongs to ('YYYY-MM'); null for a fix, which the next Audit checks. */
  month: string | null;
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

export interface ThingsInput {
  institutionType: InstitutionType;
  /** Where the Demand ideas come from, for the idea's line: "Guwahati". */
  place: string;
  /** Ranked, biggest first (the Audit's what to fix). */
  fixes: readonly ListItem[];
  /** Ranked (the month's Rivals 3 things to do). */
  lessons: readonly RivalLesson[];
  /** Ranked (the content ideas for the institution's city). */
  ideas: readonly IdeaRow[];
}

/** Programs named in a fix title. More than three reads as "your programs". */
const MAX_NAMED_PROGRAMS = 3;

function share(part: ListItem['parts'][number]): number {
  return part.maxPoints > 0 ? part.points / part.maxPoints : 0;
}

const RESULT_RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));

/** The weakest result among a fix's parts: what its title should fit. */
function weakest(item: ListItem): CheckResult | undefined {
  return item.parts.map((part) => part.result).sort((a, b) => (RESULT_RANK.get(b) ?? 0) - (RESULT_RANK.get(a) ?? 0))[0];
}

function programsOf(item: ListItem): string[] {
  return [...new Set(item.parts.flatMap((part) => (part.programName ? [part.programName] : [])))];
}

export function fixThing(item: ListItem, type: InstitutionType): Thing {
  const programs = programsOf(item);
  // The advice from the program with the most to gain.
  const advice = [...item.parts].filter((part) => part.detail?.howToFix).sort((a, b) => share(a) - share(b))[0]?.detail?.howToFix ?? null;
  return {
    source: 'audit',
    title: checkAction(item.key, programs.length > MAX_NAMED_PROGRAMS ? [] : programs, type, weakest(item)),
    detail: advice ? `${pointsToGainText(item.points)}. ${advice}` : `${pointsToGainText(item.points)}.`,
    checkKey: item.key,
    rivalId: null,
    points: item.points,
    effort: item.difficulty,
    programs,
    format: null,
    question: null,
    month: null,
  };
}

/** A lesson about a check carries that check's fix from the Audit: the points it could add, and how big it is. */
export function lessonThing(lesson: RivalLesson, fixes: readonly ListItem[] = []): Thing {
  const fix = lesson.checkKey ? fixes.find((item) => item.key === lesson.checkKey) : undefined;
  return {
    source: 'rivals',
    title: lesson.text,
    detail: lesson.detail ?? '',
    checkKey: lesson.checkKey,
    rivalId: lesson.rivalId,
    points: fix?.points ?? null,
    effort: lesson.effort ?? fix?.difficulty ?? null,
    programs: fix ? programsOf(fix) : [],
    format: null,
    question: null,
    month: lesson.month,
  };
}

export function ideaThing(idea: IdeaRow, place: string): Thing {
  const question = idea.question;
  let detail = `For students of ${idea.programName}.`;
  if (question) {
    const language = question.language === 'en' ? '' : `, in ${LANGUAGE_LABELS[question.language]}`;
    const times = question.count === null ? '' : ` about ${formatCount(question.count)} ${question.count === 1 ? 'time' : 'times'}`;
    detail = `Built on a question asked${times} in ${place}${language}: “${question.text}”`;
  }
  return {
    source: 'demand',
    title: idea.text,
    detail,
    checkKey: null,
    rivalId: null,
    points: null,
    effort: idea.effort,
    programs: [idea.programName],
    format: idea.format,
    question: question ? { text: question.text, count: question.count ?? 0, language: question.language } : null,
    month: idea.month,
  };
}

export function threeThings(input: ThingsInput): Thing[] {
  const fixes = input.fixes.map((item) => fixThing(item, input.institutionType));
  const lessons = input.lessons.filter((lesson) => lesson.text.trim()).map((lesson) => lessonThing(lesson, input.fixes));
  const ideas = input.ideas.map((idea) => ideaThing(idea, input.place));

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
  ideas.some(take);
  for (const thing of [...fixes, ...lessons, ...ideas]) take(thing);

  const order = (thing: Thing) => THING_SOURCES.indexOf(thing.source);
  return chosen.map((thing, index) => ({ thing, index })).sort((a, b) => order(a.thing) - order(b.thing) || a.index - b.index).map(({ thing }) => thing);
}

/** Home's order: the points each could add, biggest first; the ones without points keep their place after. */
export function byPoints<T extends { points: number | null }>(things: readonly T[]): T[] {
  return things
    .map((thing, index) => ({ thing, index }))
    .sort((a, b) => (b.thing.points ?? -1) - (a.thing.points ?? -1) || a.index - b.index)
    .map(({ thing }) => thing);
}

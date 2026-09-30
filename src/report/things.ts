// "3 things to do this month" (spec sections 12 and 13), one list for the report and for Home
// on Paid and Client. Built the same way every month:
//   1. The biggest Audit fix.
//   2. The top Rivals lesson that is not about the same check.
//   3. The top content idea from Demand.
// When one is missing (every check is Strong, no rivals yet, no Demand yet), the next fixes,
// then the next lessons, then the next ideas fill in, never two about the same check. Pure.

import { pointsToGainText, type ListItem } from '../audit/view.ts';
import type { IdeaRow } from '../demand/view.ts';
import { checkAction } from '../domain/checks.ts';
import { formatCount } from '../domain/format.ts';
import { LANGUAGE_LABELS, type CheckKey, type InstitutionType } from '../domain/types.ts';

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
}

/** One of the month's Rivals 3 things to do, as saved. */
export interface RivalLesson {
  text: string;
  detail: string | null;
  checkKey: CheckKey | null;
  rivalId: string | null;
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

export function fixThing(item: ListItem, type: InstitutionType): Thing {
  const programs = [...new Set(item.parts.flatMap((part) => (part.programName ? [part.programName] : [])))];
  // The advice from the program with the most to gain.
  const advice = [...item.parts].filter((part) => part.detail?.howToFix).sort((a, b) => share(a) - share(b))[0]?.detail?.howToFix ?? null;
  return {
    source: 'audit',
    title: checkAction(item.key, programs.length > MAX_NAMED_PROGRAMS ? [] : programs, type),
    detail: advice ? `${pointsToGainText(item.points)}. ${advice}` : `${pointsToGainText(item.points)}.`,
    checkKey: item.key,
    rivalId: null,
  };
}

export function lessonThing(lesson: RivalLesson): Thing {
  return { source: 'rivals', title: lesson.text, detail: lesson.detail ?? '', checkKey: lesson.checkKey, rivalId: lesson.rivalId };
}

export function ideaThing(idea: IdeaRow, place: string): Thing {
  const question = idea.question;
  let detail = `For students of ${idea.programName}.`;
  if (question) {
    const language = question.language === 'en' ? '' : `, in ${LANGUAGE_LABELS[question.language]}`;
    const times = `${formatCount(question.count)} ${question.count === 1 ? 'time' : 'times'}`;
    detail = `Built on a question asked about ${times} in ${place}${language}: “${question.text}”`;
  }
  return { source: 'demand', title: idea.text, detail, checkKey: null, rivalId: null };
}

export function threeThings(input: ThingsInput): Thing[] {
  const fixes = input.fixes.map((item) => fixThing(item, input.institutionType));
  const lessons = input.lessons.filter((lesson) => lesson.text.trim()).map(lessonThing);
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

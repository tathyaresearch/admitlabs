// Make these 3 this month (spec 9.4): three ideas picked for an institution with each monthly
// update, and kept until the next. Picked from what students ask most that the institution's
// website does not answer yet (its latest approved Audit says so), one per program where
// possible, and not one already picked last month while there are others. On Free the first is
// for its Free program: the one Free sees (spec section 10). After the next update, the page says
// how many were made and which are still rising. Pure.

import { DEMAND_RULES } from '../config/demand.ts';
import { ASK_TOPICS, DIFFICULTIES, IDEA_FORMATS, LANGUAGES, type AskTopic, type CheckKey, type CheckResult, type Difficulty, type IdeaFormat, type Language } from '../domain/types.ts';
import { ideaWhy, named, thisMonthKey, type IdeaView, type ThisMonth } from './signals.ts';
import { TREND_WORDS, type TrendWord } from './text.ts';

/** An idea as it was picked, kept in content_picks.idea: what the card shows (with the institution's name), and what the next month compares with. */
export interface PickedIdea {
  title: string;
  /** The longer brief, as found. What Mark as made saves. */
  text: string;
  why: string;
  hook: string;
  points: string[];
  format: IdeaFormat | null;
  effort: Difficulty | null;
  topic: AskTopic | null;
  programName: string;
  programKey: string;
  /** Where the question was asked: the city, or the state filling in. */
  region: string;
  basedOn: string | null;
  /** How often it was asked when picked: that question, or every question on its topic. */
  asked: number | null;
  askedOn: 'question' | 'topic' | null;
  language: Language;
  /** The rising search behind it, and its word when picked. */
  trend: string | null;
  trendWord: TrendWord | null;
  sourceUrl: string;
  platform: string | null;
  foundAt: string;
}

export interface Pick {
  rank: number;
  programId: string;
  idea: PickedIdea;
}

/** Program checks of the latest approved own Audit: program id, then check, then result. */
export type Answers = ReadonlyMap<string, ReadonlyMap<CheckKey, CheckResult>>;

/** The Audit check that says whether the website answers a topic. Hostel and other questions have none. */
export const TOPIC_CHECKS: Readonly<Record<AskTopic, CheckKey | null>> = {
  fees: 'fees_shown',
  scholarships: 'fees_shown',
  placements: 'placement_proof',
  careers: 'placement_proof',
  hostel: null,
  other: null,
};

/** What the website does not answer yet, from a check that is not Strong. */
export function openLine(check: CheckKey, programName: string): string | null {
  if (check === 'fees_shown') return `Your website does not show the ${programName} fee clearly yet.`;
  if (check === 'placement_proof') return `Your website does not show ${programName} placements with proof yet.`;
  return null;
}

type Answered = 'answered' | 'open' | 'unknown';

function answered(idea: IdeaView, answers: Answers | null): { state: Answered; check: CheckKey | null } {
  const check = idea.topic ? TOPIC_CHECKS[idea.topic] : null;
  const result = check ? answers?.get(idea.program.id)?.get(check) : undefined;
  if (!check || !result) return { state: 'unknown', check };
  return { state: result === 'strong' ? 'answered' : 'open', check };
}

const rising = (word: TrendWord | null | undefined) => word === 'Rising' || word === 'Rising fast';

/** Why this one: how often it was asked (or that it is rising), and what your website does not answer yet. */
export function pickWhy(idea: IdeaView, answers: Answers | null): string {
  const first = ideaWhy(idea);
  const { state, check } = answered(idea, answers);
  const open = state === 'open' && check ? openLine(check, idea.program.name) : null;
  const second = open ?? (idea.asked !== null && idea.trend && rising(idea.trend.word) ? ideaWhy({ ...idea, asked: null }) : null);
  return [first, second].filter(Boolean).join(' ');
}

/**
 * The month's 3: not picked last month first, then not answered by the website yet, then asked
 * most, then the writer's order. One per program while programs last; Free's first is for its
 * Free program.
 */
export function pickThree(input: {
  ideas: readonly IdeaView[];
  answers: Answers | null;
  freeProgramId: string | null;
  /** The briefs picked last month. */
  before: ReadonlySet<string>;
  institutionName: string;
}): Pick[] {
  const order = (idea: IdeaView) => [input.before.has(idea.text) ? 1 : 0, answered(idea, input.answers).state === 'answered' ? 1 : 0];
  const sorted = [...input.ideas].sort((a, b) => {
    const [aBefore = 0, aAnswered = 0] = order(a);
    const [bBefore = 0, bAnswered = 0] = order(b);
    return aBefore - bBefore || aAnswered - bAnswered || (b.asked ?? -1) - (a.asked ?? -1) || a.rank - b.rank || a.title.localeCompare(b.title);
  });

  const chosen: IdeaView[] = [];
  const first = input.freeProgramId ? sorted.find((idea) => idea.program.id === input.freeProgramId) : undefined;
  if (first) chosen.push(first);
  for (const idea of sorted) {
    if (chosen.length >= DEMAND_RULES.picks) break;
    if (!chosen.includes(idea) && !chosen.some((pick) => pick.program.id === idea.program.id)) chosen.push(idea);
  }
  for (const idea of sorted) {
    if (chosen.length >= DEMAND_RULES.picks) break;
    if (!chosen.includes(idea)) chosen.push(idea);
  }

  return chosen.map((idea, index) => ({
    rank: index + 1,
    programId: idea.program.id,
    idea: {
      title: named(idea.title, input.institutionName),
      text: idea.text,
      why: pickWhy(idea, input.answers),
      hook: named(idea.hook, input.institutionName),
      points: idea.points.map((point) => named(point, input.institutionName)),
      format: idea.format,
      effort: idea.effort,
      topic: idea.topic,
      programName: idea.program.name,
      programKey: idea.program.programKey,
      region: idea.region,
      basedOn: idea.basedOn,
      asked: idea.asked,
      askedOn: idea.askedOn,
      language: idea.language,
      trend: idea.trend?.text ?? null,
      trendWord: idea.trend?.word ?? null,
      sourceUrl: idea.sourceUrl,
      platform: idea.platform,
      foundAt: idea.foundAt,
    },
  }));
}

/**
 * Last month's pick, if it is still rising this month: its search is still rising, or its
 * question (or its topic) was asked more often than when it was picked. Its label for the line,
 * or null.
 */
export function stillRising(pick: PickedIdea, now: ThisMonth): string | null {
  if (pick.trend && rising(now.rising.get(thisMonthKey(pick.programKey, pick.trend)))) return `“${pick.trend}” (${pick.programName})`;
  if (pick.basedOn && pick.asked !== null && pick.askedOn) {
    const count = (pick.askedOn === 'question' ? now.questions : now.topics).get(thisMonthKey(pick.programKey, pick.basedOn));
    if (count !== undefined && count > pick.asked) return `“${pick.basedOn}” (${pick.programName})`;
  }
  return null;
}

/** How last month's 3 went: how many were made, and the ones not made that are still rising. */
export function lastMonthSummary(picks: readonly PickedIdea[], made: (idea: PickedIdea) => boolean, now: ThisMonth): { made: number; total: number; stillRising: string[] } {
  return {
    made: picks.filter(made).length,
    total: picks.length,
    stillRising: picks.filter((pick) => !made(pick)).flatMap((pick) => stillRising(pick, now) ?? []),
  };
}

const oneOf = <T extends string>(known: readonly T[], value: unknown): T | null => (known.includes(value as T) ? (value as T) : null);
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** A stored pick read back, or null when it is not one. */
export function parsePickedIdea(value: unknown): PickedIdea | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const title = str(raw.title);
  const text = str(raw.text);
  const programName = str(raw.programName);
  const programKey = str(raw.programKey);
  const sourceUrl = str(raw.sourceUrl);
  if (!title || !text || !programName || !programKey || !sourceUrl) return null;
  return {
    title,
    text,
    why: str(raw.why) ?? '',
    hook: str(raw.hook) ?? '',
    points: Array.isArray(raw.points) ? raw.points.filter((point): point is string => typeof point === 'string') : [],
    format: oneOf(IDEA_FORMATS, raw.format),
    effort: oneOf(DIFFICULTIES, raw.effort),
    topic: oneOf(ASK_TOPICS, raw.topic),
    programName,
    programKey,
    region: str(raw.region) ?? '',
    basedOn: str(raw.basedOn),
    asked: num(raw.asked),
    askedOn: oneOf(['question', 'topic'] as const, raw.askedOn),
    language: oneOf(LANGUAGES, raw.language) ?? 'en',
    trend: str(raw.trend),
    trendWord: oneOf(TREND_WORDS, raw.trendWord),
    sourceUrl,
    platform: str(raw.platform),
    foundAt: str(raw.foundAt) ?? '',
  };
}

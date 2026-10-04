// What the Demand page shows in version 2 (spec 9.4), from the grouped items the viewer may read
// (row level security applies when they are loaded). Each program takes its city's latest pull,
// or its state's when the city has too little data (spec 9.2), and the page says so. Then the
// program signals (programs rising and falling, courses asked for that you do not offer, what
// students ask by topic), the content signals (what gets attention, the best months to post) and
// the month's ideas, each built on a real student question. Honest numbers (spec 9.5): a count
// only where a source gave one; a search trend is a word. Grouped only, never a person. Pure.

import { DEMAND_RULES } from '../config/demand.ts';
import { monthSpanWords } from '../domain/format.ts';
import { ASK_TOPIC_LABELS, DIFFICULTIES, IDEA_FORMATS, type AskTopic, type Difficulty, type IdeaFormat, type Language } from '../domain/types.ts';
import { askTopic } from './items.ts';
import { askedLine, PLATFORM_ORDER, platformOf, risingLine, topicLine, trendWord, type AttentionLevel, type TrendWord } from './text.ts';
import type { DemandRow } from './view.ts';

export interface DemandProgram {
  id: string;
  name: string;
  programKey: string;
}

/** What the page needs to know about a program's latest pull for a region. */
export interface PullFacts {
  /** 'YYYY-MM' */
  month: string;
  pulledAt: string;
  /** A city pull only: the city had too little data, so its state fills in. */
  tooLittle: boolean;
}

export interface RegionRows {
  region: string;
  rows: readonly DemandRow[];
  /** Each program's latest pull, by program key. */
  pulls: ReadonlyMap<string, PullFacts>;
}

/** One program's signals, and where they come from. */
export interface ProgramSource {
  program: DemandProgram;
  scope: 'city' | 'state';
  /** The city, or the state filling in. */
  region: string;
  /** 'YYYY-MM' */
  month: string;
  pulledAt: string;
  rows: DemandRow[];
}

/** Each program's pull for the page: the city's, or the state's when the city has too little or nothing yet. */
export function programSources(programs: readonly DemandProgram[], city: RegionRows, state: RegionRows): ProgramSource[] {
  return programs.flatMap((program): ProgramSource[] => {
    const own = city.pulls.get(program.programKey);
    const filling = state.pulls.get(program.programKey);
    const useState = Boolean(filling) && (!own || own.tooLittle);
    const pull = useState ? filling : own;
    if (!pull) return [];
    const from = useState ? state : city;
    return [
      {
        program,
        scope: useState ? 'state' : 'city',
        region: from.region,
        month: pull.month,
        pulledAt: pull.pulledAt,
        rows: from.rows.filter((row) => row.programKey === program.programKey).map((row) => ({ ...row, programName: program.name })),
      },
    ];
  });
}

export interface TrendRow {
  key: string;
  kind: 'rising' | 'falling';
  text: string;
  programName: string;
  programKey: string;
  region: string;
  changePct: number | null;
  word: TrendWord | null;
  /** Searches a month, only when the keyword tool counted them (spec 9.5). */
  searches: number | null;
  searchesUrl: string | null;
  sourceUrl: string;
  foundAt: string;
  /** A course an institution could offer, rather than a career or a skill. */
  course: boolean;
  /** One of your programs, by its name. */
  offered: boolean;
}

export interface AskQuestion {
  key: string;
  text: string;
  language: Language;
  count: number | null;
  sourceUrl: string;
  foundAt: string;
  platform: string | null;
}

export interface AskTopicRow {
  topic: AskTopic;
  label: string;
  /** Questions counted on this topic. */
  count: number;
  /** Its share of the program's questions, 0 to 1. */
  share: number;
  /** Its top questions, asked most first. */
  questions: AskQuestion[];
}

export interface ProgramAsks {
  programName: string;
  programKey: string;
  region: string;
  /** Questions counted across the topics. */
  asked: number;
  topics: AskTopicRow[];
  /** Questions on no one topic, asked most first. */
  other: AskQuestion[];
}

export interface AttentionRow {
  key: string;
  text: string;
  format: IdeaFormat | null;
  level: AttentionLevel;
  programs: string[];
  region: string;
  sourceUrl: string;
  foundAt: string;
  platform: string | null;
}

export interface BestMonthsRow {
  programName: string;
  region: string;
  /** 1 to 12. */
  months: number[];
  /** "March to June". */
  text: string;
  sourceUrl: string;
  foundAt: string;
}

export interface IdeaView {
  key: string;
  /** The pull's month, 'YYYY-MM': what Mark as made keeps it with. */
  month: string;
  program: DemandProgram;
  region: string;
  /** What to make. Its title, hook and points may hold `{institution}`: the pull is shared (see named()). */
  title: string;
  /** The longer brief, as found. What Mark as made saves. */
  text: string;
  /** The first line. */
  hook: string;
  points: string[];
  format: IdeaFormat | null;
  effort: Difficulty | null;
  topic: AskTopic | null;
  /** The student question it is built on, how often it was asked (that question, or every question on its topic), and in what language. */
  basedOn: string | null;
  asked: number | null;
  askedOn: 'question' | 'topic' | null;
  language: Language;
  /** The rising search behind it, when there is one. */
  trend: { text: string; word: TrendWord | null } | null;
  /** Where the question was found. */
  sourceUrl: string;
  foundAt: string;
  platform: string | null;
  /** The writer's order within the pull. */
  rank: number;
}

export interface DemandSignals {
  sources: ProgramSource[];
  /** The newest month shown, 'YYYY-MM'. */
  month: string | null;
  pulledAt: string | null;
  /** The programs the state fills in for. */
  filledIn: string[];
  /** Rising, fastest first, then falling, steepest first. */
  trends: TrendRow[];
  /** Rising courses that are not one of your programs. */
  notOffered: TrendRow[];
  asks: ProgramAsks[];
  attention: AttentionRow[];
  bestMonths: BestMonthsRow[];
  /** Asked most first. */
  ideas: IdeaView[];
  /** Where it was found, by name, in a fixed order. */
  platforms: string[];
  languages: Language[];
}

const STOP_WORDS = new Set(['in', 'with', 'and', 'for', 'the', 'a', 'an', 'of', 'to', 'only']);
const nameWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word));

/** A course is one of your programs when every word of it is in one program's name: "MBA in Business Analytics" and "MBA (Business Analytics)". */
export function offeredBy(course: string, programNames: readonly string[]): boolean {
  const need = nameWords(course);
  if (need.length === 0) return false;
  return programNames.some((name) => {
    const have = new Set(nameWords(name));
    return need.every((word) => have.has(word));
  });
}

const oneOf = <T extends string>(known: readonly T[], value: unknown): T | null => (known.includes(value as T) ? (value as T) : null);
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const platformFor = (row: DemandRow): string | null => text(row.meta.platform) ?? platformOf(row.sourceUrl);
const LEVELS: readonly AttentionLevel[] = ['most', 'high', 'some'];
/** Most first; an item without a count after every item with one. */
const byCount = (a: { count: number | null }, b: { count: number | null }) => (b.count ?? -1) - (a.count ?? -1);

function trendRows(sources: readonly ProgramSource[], ownPrograms: readonly string[]): TrendRow[] {
  const rows = sources.flatMap((source) =>
    source.rows
      .filter((row) => row.kind === 'rising' || row.kind === 'falling')
      .map((row): TrendRow => {
        const counted = row.meta.countKind === 'searches' && row.count !== null;
        const course = row.meta.course !== false;
        return {
          key: row.id,
          kind: row.kind as TrendRow['kind'],
          text: row.text,
          programName: source.program.name,
          programKey: source.program.programKey,
          region: source.region,
          changePct: row.changePct,
          word: trendWord(row.changePct),
          searches: counted ? row.count : null,
          searchesUrl: counted ? text(row.meta.countSource) : null,
          sourceUrl: row.sourceUrl,
          foundAt: row.foundAt,
          course,
          offered: course && offeredBy(row.text, ownPrograms),
        };
      }),
  );
  const rising = rows.filter((row) => row.kind === 'rising').sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0) || (b.searches ?? -1) - (a.searches ?? -1) || a.text.localeCompare(b.text));
  const falling = rows.filter((row) => row.kind === 'falling').sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0) || (b.searches ?? -1) - (a.searches ?? -1) || a.text.localeCompare(b.text));
  return [...rising, ...falling];
}

const question = (row: DemandRow): AskQuestion => ({
  key: row.id,
  text: row.text,
  language: row.language,
  count: row.count,
  sourceUrl: row.sourceUrl,
  foundAt: row.foundAt,
  platform: platformFor(row),
});

function programAsks(source: ProgramSource): ProgramAsks {
  const questionRows = source.rows.filter((row) => row.kind === 'question').sort((a, b) => byCount(a, b) || a.text.localeCompare(b.text));
  const topicRows = source.rows.filter((row) => row.kind === 'topic' && askTopic(row.meta.topic));
  const asked = topicRows.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const topics = topicRows
    .map((row): AskTopicRow => {
      const topic = askTopic(row.meta.topic) as AskTopic;
      // A topic's count is every question on it; its top question has a count of its own only when it was counted on its own too.
      const own = questionRows.find((entry) => entry.text === row.text);
      return { topic, label: ASK_TOPIC_LABELS[topic], count: row.count ?? 0, share: asked ? (row.count ?? 0) / asked : 0, questions: [{ ...question(row), count: own?.count ?? null }] };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const other: AskQuestion[] = [];
  for (const row of questionRows) {
    const home = topics.find((topic) => topic.topic === askTopic(row.meta.topic) && topic.topic !== 'other');
    if (!home) other.push(question(row));
    else if (!home.questions.some((entry) => entry.text === row.text)) home.questions.push(question(row));
  }
  // The top question first, then the others asked most.
  for (const topic of topics) topic.questions = topic.questions.slice(0, DEMAND_RULES.topicQuestions);
  return { programName: source.program.name, programKey: source.program.programKey, region: source.region, asked, topics, other };
}

function attentionRows(sources: readonly ProgramSource[]): AttentionRow[] {
  const merged = new Map<string, AttentionRow>();
  const order = new Map<string, number>();
  for (const source of sources) {
    for (const row of source.rows.filter((entry) => entry.kind === 'content')) {
      const level = oneOf(LEVELS, row.meta.level) ?? 'some';
      const format = oneOf(IDEA_FORMATS, row.meta.format);
      const key = `${row.text}|${format ?? ''}`;
      const seen = merged.get(key);
      if (seen) {
        if (!seen.programs.includes(source.program.name)) seen.programs.push(source.program.name);
        if (LEVELS.indexOf(level) < LEVELS.indexOf(seen.level)) seen.level = level;
        continue;
      }
      order.set(row.id, typeof row.meta.contentIndex === 'number' ? row.meta.contentIndex : 99);
      merged.set(key, { key: row.id, text: row.text, format, level, programs: [source.program.name], region: source.region, sourceUrl: row.sourceUrl, foundAt: row.foundAt, platform: platformFor(row) });
    }
  }
  const at = (row: AttentionRow) => order.get(row.key) ?? 99;
  return [...merged.values()].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || at(a) - at(b) || a.text.localeCompare(b.text));
}

function bestMonthRows(sources: readonly ProgramSource[]): BestMonthsRow[] {
  return sources.flatMap((source) => {
    const row = source.rows.find((entry) => entry.kind === 'best_month');
    const months = Array.isArray(row?.meta.months) ? row.meta.months.filter((month): month is number => Number.isInteger(month) && month >= 1 && month <= 12) : [];
    if (!row || months.length === 0) return [];
    return [{ programName: source.program.name, region: source.region, months, text: monthSpanWords(months), sourceUrl: row.sourceUrl, foundAt: row.foundAt }];
  });
}

function ideaViews(sources: readonly ProgramSource[]): IdeaView[] {
  const ideas = sources.flatMap((source) =>
    source.rows
      .filter((row) => row.kind === 'idea')
      .map((row): IdeaView => {
        const basedOn = text(row.meta.basedOn);
        const asked = basedOn ? (source.rows.find((entry) => entry.kind === 'question' && entry.text === basedOn) ?? source.rows.find((entry) => entry.kind === 'topic' && entry.text === basedOn)) : undefined;
        const askedOn = asked && asked.count !== null ? (asked.kind === 'question' ? 'question' : 'topic') : null;
        const trendText = text(row.meta.trend);
        const trend = trendText ? source.rows.find((entry) => entry.kind === 'rising' && entry.text === trendText) : undefined;
        const points = Array.isArray(row.meta.points) ? row.meta.points.filter((point): point is string => typeof point === 'string') : [];
        return {
          key: row.id,
          month: row.month,
          program: source.program,
          region: source.region,
          title: text(row.meta.title) ?? row.text,
          text: row.text,
          hook: text(row.meta.hook) ?? '',
          points,
          format: oneOf(IDEA_FORMATS, row.meta.format),
          effort: oneOf(DIFFICULTIES, row.meta.effort),
          topic: askTopic(row.meta.topic) ?? (asked ? askTopic(asked.meta.topic) : null),
          basedOn,
          asked: askedOn ? (asked?.count ?? null) : null,
          askedOn,
          language: asked?.language ?? 'en',
          trend: trendText ? { text: trendText, word: trend ? trendWord(trend.changePct) : null } : null,
          sourceUrl: row.sourceUrl,
          foundAt: asked?.foundAt ?? row.foundAt,
          platform: asked ? platformFor(asked) : platformOf(row.sourceUrl),
          rank: row.rank ?? 99,
        };
      }),
  );
  return ideas.sort((a, b) => (b.asked ?? -1) - (a.asked ?? -1) || a.rank - b.rank || a.title.localeCompare(b.title));
}

/** An idea's words with the institution's name in place of `{institution}`: the pull is shared, the page is yours. */
export function named(text: string, institutionName: string): string {
  return text.split('{institution}').join(institutionName);
}

/** Why an idea, in a line: how often students asked, or that searches for it are rising. Empty when neither. */
export function ideaWhy(idea: Pick<IdeaView, 'asked' | 'askedOn' | 'topic' | 'program' | 'trend' | 'region'>): string {
  if (idea.asked !== null && idea.askedOn === 'topic' && idea.topic && idea.topic !== 'other') return topicLine(idea.program.name, idea.topic, idea.asked, idea.region);
  if (idea.asked !== null) return askedLine(idea.asked, idea.region);
  if (idea.trend && (idea.trend.word === 'Rising' || idea.trend.word === 'Rising fast')) return risingLine(idea.trend.text, idea.trend.word, idea.region);
  return '';
}

/** Everything the page shows, for the programs Demand covers. `ownPrograms` names every program of yours, for what you do not offer. */
export function demandSignals(sources: readonly ProgramSource[], ownPrograms: readonly string[]): DemandSignals {
  const trends = trendRows(sources, ownPrograms);
  const all = sources.flatMap((source) => source.rows);
  const found = all.filter((row) => row.kind !== 'idea');
  const platforms = new Set(found.flatMap((row) => [platformFor(row), row.meta.countKind === 'searches' ? 'keywords' : null]).filter((platform): platform is string => platform !== null));
  const months = sources.map((source) => source.month).sort();
  const pulled = sources.map((source) => source.pulledAt).sort();
  return {
    sources: [...sources],
    month: months[months.length - 1] ?? null,
    pulledAt: pulled[pulled.length - 1] ?? null,
    filledIn: sources.filter((source) => source.scope === 'state').map((source) => source.program.name),
    trends,
    notOffered: trends.filter((row) => row.kind === 'rising' && row.course && !row.offered && (row.word === 'Rising' || row.word === 'Rising fast')),
    asks: sources.map(programAsks).filter((asks) => asks.topics.length || asks.other.length),
    attention: attentionRows(sources),
    bestMonths: bestMonthRows(sources),
    ideas: ideaViews(sources),
    platforms: [...PLATFORM_ORDER.filter((platform) => platforms.has(platform)), ...[...platforms].filter((platform) => !PLATFORM_ORDER.includes(platform)).sort()],
    languages: [...new Set(all.filter((row) => row.kind === 'question' || row.kind === 'topic').map((row) => row.language))].sort(),
  };
}

/** How often each question, and each topic's questions, were asked this month, and which searches are rising, by program: for "still rising". */
export interface ThisMonth {
  questions: ReadonlyMap<string, number>;
  topics: ReadonlyMap<string, number>;
  rising: ReadonlyMap<string, TrendWord | null>;
}

export const thisMonthKey = (programKey: string, text: string) => `${programKey}|${text}`;

export function thisMonth(sources: readonly ProgramSource[]): ThisMonth {
  const questions = new Map<string, number>();
  const topics = new Map<string, number>();
  const rising = new Map<string, TrendWord | null>();
  for (const source of sources) {
    for (const row of source.rows) {
      const key = thisMonthKey(source.program.programKey, row.text);
      if (row.kind === 'question' && row.count !== null) questions.set(key, row.count);
      if (row.kind === 'topic' && row.count !== null) topics.set(key, row.count);
      if (row.kind === 'rising') rising.set(key, trendWord(row.changePct));
    }
  }
  return { questions, topics, rising };
}

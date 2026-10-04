// Words for the Demand screens and alerts. Plain language, short sentences, no dashes.
// Grouped only: a topic, a count and a source, never a person.

import { DEMAND_RULES } from '../config/demand.ts';
import { formatCount, formatMonthName, joinNames, plural } from '../domain/format.ts';
import { LANGUAGE_LABELS, LANGUAGES, type AskTopic, type DemandKind, type IdeaFormat, type InstitutionType, type Language } from '../domain/types.ts';

/** How much attention a topic and format gets, as the sources say it (spec 9.4). */
export type AttentionLevel = 'most' | 'high' | 'some';

/** "Up 38%", "Down 12%", "No change". */
export function changeWords(changePct: number | null): string {
  if (changePct === null) return '';
  const rounded = Math.round(changePct);
  if (rounded === 0) return 'No change';
  return `${rounded > 0 ? 'Up' : 'Down'} ${Math.abs(rounded)}%`;
}

/** The alert for a big spike: "Rising in Guwahati: BCA with AI and Machine Learning, up 47% this month." */
export function spikeNotice(text: string, place: string, changePct: number): string {
  return `Rising in ${place}: ${text}, up ${Math.round(changePct)}% this month.`;
}

/** Hindi and Assamese items show in English with a tag (the original wording is kept in the data). */
export const LANGUAGE_TAGS: Readonly<Record<Language, string | null>> = {
  en: null,
  hi: 'Asked in Hindi',
  as: 'Asked in Assamese',
};

export const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  reddit: 'Reddit',
  quora: 'Quora',
  forum: 'Forums',
  youtube: 'YouTube',
  instagram: 'Instagram',
  trends: 'Search trends',
  keywords: 'Keyword tool',
};

/** The platform a source link points at ("reddit" for reddit.example or reddit.com), if known. */
export function platformOf(url: string): string | null {
  try {
    const first = new URL(url).hostname.replace(/^www\./, '').split('.')[0] ?? '';
    return Object.hasOwn(PLATFORM_LABELS, first) ? first : null;
  } catch {
    return null;
  }
}

/** How often, in words that fit the kind of item. Empty when no source gave a count. */
export function countWords(kind: DemandKind, count: number | null): string {
  if (count === null) return '';
  switch (kind) {
    case 'topic':
    case 'question':
      return `Asked about ${plural(count, 'time', 'times')}`;
    case 'worry':
      return `Raised about ${plural(count, 'time', 'times')}`;
    case 'rising':
    case 'falling':
      return `About ${plural(count, 'search', 'searches')}`;
    case 'mention':
      return plural(count, 'mention', 'mentions');
    default:
      return formatCount(count);
  }
}

/** Where it was found, by name: "From Reddit, Quora and Search trends, in English and Hindi". */
export function sourcesCaption(platforms: readonly string[], languages: readonly Language[]): string {
  const from = `From ${joinNames(platforms.map((platform) => (platform === 'keywords' ? 'the keyword tool' : (PLATFORM_LABELS[platform] ?? platform))))}`;
  const spoken = LANGUAGES.filter((language) => languages.includes(language));
  return spoken.length ? `${from}, in ${joinNames(spoken.map((language) => LANGUAGE_LABELS[language]))}` : from;
}

/** The order sources are named in: search trends and counts first, then where students ask. */
export const PLATFORM_ORDER: readonly string[] = ['trends', 'keywords', 'reddit', 'quora', 'forum', 'youtube', 'instagram'];

export const TREND_WORDS = ['Rising fast', 'Rising', 'Steady', 'Falling'] as const;
export type TrendWord = (typeof TREND_WORDS)[number];

/** A search trend in words (spec 9.5): honest about its size without making up a figure. */
export function trendWord(changePct: number | null): TrendWord | null {
  if (changePct === null) return null;
  const rounded = Math.round(changePct);
  if (rounded >= DEMAND_RULES.risingFastMinPct) return 'Rising fast';
  if (rounded >= DEMAND_RULES.risingMinPct) return 'Rising';
  if (rounded <= -DEMAND_RULES.fallingMinDropPct) return 'Falling';
  return 'Steady';
}

/** What gets attention, in words: never a made up number. */
export const ATTENTION_LABELS: Readonly<Record<AttentionLevel, string>> = {
  most: 'Most attention',
  high: 'A lot of attention',
  some: 'Some attention',
};

export const FORMAT_PLURALS: Readonly<Record<IdeaFormat, string>> = {
  post: 'Posts',
  reel: 'Reels',
  video: 'Videos',
  faq: 'FAQs',
  page: 'Web pages',
};

/** "colleges like yours", for what gets attention among institutions like this one. */
export const LIKE_YOURS: Readonly<Record<InstitutionType, string>> = {
  college: 'colleges like yours',
  university: 'universities like yours',
  skilling: 'skilling institutes like yours',
};

/** When the city has too little data for some programs, the page says the state fills in (spec 9.2). */
export function filledInNote(city: string, state: string, programs: readonly string[], all: boolean): string {
  if (all) return `${city} has too little data yet, so ${state} fills in.`;
  return `${city} has too little data yet for ${joinNames(programs)}, so ${state} fills in there.`;
}

/** Why an idea: "Asked about 96 times in Guwahati this month." */
export function askedLine(count: number, place: string): string {
  return `Asked about ${plural(count, 'time', 'times')} in ${place} this month.`;
}

/** Why an idea built on a whole topic: "BBA fees came up in about 140 questions in Guwahati this month." */
export function topicLine(program: string, topic: Exclude<AskTopic, 'other'>, count: number, place: string): string {
  return `${program} ${TOPIC_WORDS[topic]} came up in about ${plural(count, 'question', 'questions')} in ${place} this month.`;
}

const TOPIC_WORDS: Readonly<Record<Exclude<AskTopic, 'other'>, string>> = {
  fees: 'fees',
  placements: 'placements',
  scholarships: 'scholarships',
  hostel: 'hostels',
  careers: 'careers',
};

/** Why an idea built on a search: "Searches for “Power BI and dashboards” are rising fast in Guwahati." */
export function risingLine(text: string, word: TrendWord, place: string): string {
  return `Searches for “${text}” are ${word.toLowerCase()} in ${place}.`;
}

/**
 * After the next update, how last month's 3 went (spec 9.4): "In August you made 2 of 3. This one
 * is still rising: “Is BBA worth it after commerce in Class 12?” (BBA)."
 */
export function lastMonthLine(month: string, made: number, total: number, stillRising: readonly string[]): string {
  const name = formatMonthName(month);
  const first =
    made >= total ? `In ${name} you made all ${total}.` : made === 0 ? `${name}’s ${total} are still waiting to be made.` : `In ${name} you made ${made} of ${total}.`;
  if (stillRising.length === 0) return first;
  return `${first} ${stillRising.length === 1 ? 'This one is' : 'These are'} still rising: ${joinNames(stillRising)}.`;
}

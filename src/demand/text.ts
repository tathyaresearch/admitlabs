// Words for the Demand screens and alerts. Plain language, short sentences, no dashes.
// Grouped only: a topic, a count and a source, never a person.

import { formatCount, joinNames, plural } from '../domain/format.ts';
import type { DemandKind, Language } from '../domain/types.ts';
import type { WorryTheme } from '../sample/demand.ts';

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
  x: 'X',
  quora: 'Quora',
  youtube: 'YouTube',
  instagram: 'Instagram',
  trends: 'Search trends',
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

const THEME_WORDS: Readonly<Record<Exclude<WorryTheme, 'new'>, string>> = {
  fees: 'fees',
  placements: 'placements',
  hostel: 'hostels',
  safety: 'safety',
  recognition: 'recognition',
};

/** "Students in Guwahati worry most about placements and fees." */
export function worrySentence(place: string, themes: readonly WorryTheme[]): string {
  const words = themes.flatMap((theme) => (theme === 'new' ? [] : [THEME_WORDS[theme]]));
  return words.length ? `Students in ${place} worry most about ${joinNames(words)}.` : '';
}

/** How often, in words that fit the kind of item. */
export function countWords(kind: DemandKind, count: number): string {
  switch (kind) {
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

/** "6 sources in 3 languages". */
export function sourcesCaption(platforms: number, languages: number): string {
  return `${plural(platforms, 'source', 'sources')} in ${plural(languages, 'language', 'languages')}`;
}

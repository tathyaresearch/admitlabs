// Mock Demand sources. Each returns grouped items for a region and program: a topic, a count
// when the source gives a real one, and a source link. Never a person, never a profile.
//
// The sample programs follow their hand-written fixtures; every other listed program follows a
// written template (demand-bank.ts). The fixtures are written for Guwahati and Assam; other
// regions get their own place names, and a smaller city much smaller counts, so its state fills
// in (spec 9.2). The fixtures describe September 2026: earlier months show the counts before
// that change, later months drift a little, with the odd big spike.
//
// Honest numbers (spec 9.5): questions and topics carry the questions counted; a search trend
// carries its change only, and the keyword tool gives searches a month for some of them.

import { monthKey } from '../../domain/dates.ts';
import { monthSpanWords } from '../../domain/format.ts';
import type { DemandScope, Language } from '../../domain/types.ts';
import { CITY_FACTOR, DEMAND_SCOPE_FACTOR, KEYWORD_VOLUME, type DemandPlatform, type TrendFixture } from '../../sample/demand.ts';
import type { DemandItemValue } from '../signals.ts';
import { makeSignal, type AnySignal, type Target } from '../types.ts';
import { demandFixture, localize, placeWords, type PlaceWords } from './demand-bank.ts';
import { rngFor } from './random.ts';
import { slugify } from './shared.ts';

/** The providers that bring Demand items. Quora and forums come through the search tool. */
export type DemandProvider = 'search' | 'reddit' | 'youtube' | 'instagram' | 'trends' | 'keywords';

const LATEST_MONTH = '2026-09';

/** Below this share of Guwahati's counts, a city has too little for search trends, search counts or what gets attention. */
export const THIN_CITY_FACTOR = 0.25;

/** A link to the grouped topic on the platform where it was found. */
export function topicUrl(platform: DemandPlatform, text: string, words: PlaceWords): string {
  const q = encodeURIComponent(text);
  const place = encodeURIComponent(words.place);
  switch (platform) {
    case 'reddit':
      return `https://reddit.example/r/${slugify(words.state)}/search?q=${q}`;
    case 'quora':
      return `https://quora.example/topic/${slugify(text)}`;
    case 'forum':
      return `https://forum.example/${slugify(words.state)}/t/${slugify(text)}`;
    case 'youtube':
      return `https://youtube.example/results?search_query=${q}`;
    case 'instagram':
      return `https://instagram.example/explore/search/?q=${q}`;
    case 'trends':
      return `https://trends.example/explore?q=${q}&geo=${place}`;
    case 'keywords':
      return `https://keywords.example/volume?q=${q}&location=${place}`;
  }
}

function item(partial: Pick<DemandItemValue, 'kind' | 'text' | 'count'> & Partial<DemandItemValue>): DemandItemValue {
  return {
    originalText: null,
    language: 'en',
    changePct: null,
    rank: null,
    about: null,
    sentiment: null,
    meta: {},
    ...partial,
  };
}

/** Whole months from September 2026 to `month` (negative before it). */
function monthsAfterLatest(month: string): number {
  const [year, value] = month.split('-').map(Number) as [number, number];
  const [latestYear, latestValue] = LATEST_MONTH.split('-').map(Number) as [number, number];
  return (year - latestYear) * 12 + (value - latestValue);
}

/** Before September the change is smaller the further back it is: half in August, a third in July, and so on. */
function changeBefore(trend: TrendFixture, after: number): number {
  return Math.round(trend.changePct / (1 - after));
}

/** This month's change and count growth for a trend. */
function trendThisMonth(trend: TrendFixture, kind: 'rising' | 'falling', programKey: string, month: string): { changePct: number; growth: number } {
  const after = monthsAfterLatest(month);
  if (after < 0) {
    // August holds the fixture's base count; each month before it is smaller by that month's change,
    // so a trend builds up month by month into September.
    let growth = 1;
    for (let back = -1; back > after; back -= 1) growth /= 1 + changeBefore(trend, back) / 100;
    return { changePct: changeBefore(trend, after), growth };
  }
  if (after === 0) return { changePct: trend.changePct, growth: 1 + trend.changePct / 100 };
  // After a big month, trends cool; now and then one spikes again (40% or more).
  const rng = rngFor('drift', programKey, trend.text, month);
  let changePct = Math.round(trend.changePct * rng.between(0.3, 0.8, 2));
  if (kind === 'rising' && rng.chance(0.08)) changePct = rng.int(40, 64);
  return { changePct, growth: (1 + 0.03 * after) * (1 + changePct / 100) };
}

/** How big a region's counts are against Guwahati's: the state's are bigger, a smaller city's much smaller. */
export function regionFactor(scope: DemandScope, region: string): number {
  return DEMAND_SCOPE_FACTOR[scope] * (scope === 'city' ? (CITY_FACTOR[region] ?? 1) : 1);
}

/** Which provider brings a platform's items: Quora and forums come through the search tool. */
function providerOf(platform: DemandPlatform): DemandProvider | null {
  switch (platform) {
    case 'quora':
    case 'forum':
      return 'search';
    case 'reddit':
    case 'youtube':
    case 'instagram':
    case 'trends':
    case 'keywords':
      return platform;
  }
}

/** A question as found in the region. Assamese is asked in Assam; elsewhere the same question comes up in Hindi. */
function asked(question: { text: string; original?: string; language: Language }, words: PlaceWords): { text: string; originalText: string | null; language: Language } {
  const text = localize(question.text, words);
  const language: Language = question.language === 'as' && !words.assamese ? 'hi' : question.language;
  const originalText = language !== 'en' && language === question.language && text === question.text ? (question.original ?? null) : null;
  return { text, originalText, language };
}

export function demandSignals(provider: DemandProvider, target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'region') return [];
  const fixture = demandFixture(target.programKey);
  if (!fixture) return [];

  const month = monthKey(asOf);
  const words = placeWords(target.scope, target.region, target.state);
  const factor = regionFactor(target.scope, target.region);
  const thin = factor < THIN_CITY_FACTOR;
  const wobble = (label: string) => 0.9 + rngFor('demand', label, target.scope, target.region, target.programKey, month).next() * 0.2;
  const counted = (base: number, label: string) => Math.round(base * factor * wobble(label));
  const signals: AnySignal[] = [];
  const add = (value: DemandItemValue, sourceUrl: string) => signals.push(makeSignal(provider, 'demand_item', target, value, sourceUrl, asOf));

  if (provider === 'trends' && !thin) {
    for (const [kind, trends] of [
      ['rising', fixture.rising],
      ['falling', fixture.falling],
    ] as const) {
      trends.forEach((trend, index) => {
        const text = localize(trend.text, words);
        const { changePct } = trendThisMonth(trend, kind, target.programKey, month);
        // Search trends give a change, never a count (spec 9.5).
        add(item({ kind, text, count: null, changePct, meta: { [kind === 'rising' ? 'trendIndex' : 'fallingIndex']: index, course: trend.course ?? true, platform: 'trends' } }), topicUrl('trends', text, words));
      });
    }
    add(
      item({ kind: 'best_month', text: monthSpanWords(fixture.bestMonths), count: null, meta: { months: fixture.bestMonths, platform: 'trends' } }),
      topicUrl('trends', localize(fixture.rising[0]?.text ?? target.programKey, words), words),
    );
  }

  if (provider === 'keywords' && !thin) {
    // Searches a month, for the trends the keyword tool covers.
    for (const [kind, trends, covered] of [
      ['rising', fixture.rising, KEYWORD_VOLUME.rising],
      ['falling', fixture.falling, KEYWORD_VOLUME.falling],
    ] as const) {
      trends.slice(0, covered).forEach((trend) => {
        const text = localize(trend.text, words);
        const { growth } = trendThisMonth(trend, kind, target.programKey, month);
        signals.push(makeSignal('keywords', 'search_volume', target, { text, monthly: Math.max(10, Math.round(trend.base * factor * growth)) }, topicUrl('keywords', text, words), asOf));
      });
    }
  }

  fixture.questions.forEach((question, index) => {
    if (providerOf(question.source) !== provider) return;
    const count = counted(question.base, `question-${index}`);
    if (count < 1) return;
    const found = asked(question, words);
    add(
      item({ kind: 'question', ...found, count, meta: { questionIndex: index, topic: question.topic, platform: question.source } }),
      topicUrl(question.source, found.originalText ?? found.text, words),
    );
  });

  // What students ask about the program: each topic's questions counted, with the question asked most.
  for (const topic of fixture.topics) {
    if (providerOf(topic.question.source) !== provider) continue;
    const count = counted(topic.base, `topic-${topic.topic}`);
    if (count < 1) continue;
    const found = asked(topic.question, words);
    add(
      item({ kind: 'topic', ...found, count, meta: { topic: topic.topic, platform: topic.question.source } }),
      topicUrl(topic.question.source, found.originalText ?? found.text, words),
    );
  }

  // What gets attention among institutions like this one: videos on YouTube, everything else on Instagram.
  if ((provider === 'youtube' || provider === 'instagram') && !thin) {
    fixture.content.forEach((content, index) => {
      if ((content.format === 'video') !== (provider === 'youtube')) return;
      const text = localize(content.text, words);
      add(
        item({ kind: 'content', text, count: null, meta: { format: content.format, level: content.level, contentIndex: index, platform: provider } }),
        topicUrl(provider, `${text} ${words.place}`, words),
      );
    });
  }

  return signals;
}

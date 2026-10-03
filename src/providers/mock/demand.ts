// Mock Demand sources. Each platform returns grouped items for a region and program:
// a topic, a count and a source link. Never a person, never a profile.
//
// The sample programs follow their hand-written fixtures; every other listed program follows a
// written template (demand-bank.ts). The fixtures are written for Guwahati and Assam; other
// regions get their own place names. The fixtures describe September 2026: earlier months show
// the counts before that change, later months drift a little, with the odd big spike.

import { monthKey } from '../../domain/dates.ts';
import type { DemandScope, Language } from '../../domain/types.ts';
import { institutionId } from '../../sample/ids.ts';
import { DEMAND_SCOPE_FACTOR, SEASON_DEGREE, SEASON_SKILLS, type DemandPlatform, type TrendFixture } from '../../sample/demand.ts';
import { SAMPLE_INSTITUTIONS } from '../../sample/institutions.ts';
import type { DemandItemValue } from '../signals.ts';
import { makeSignal, type AnySignal, type Target, type WatchedInstitution } from '../types.ts';
import { demandFixture, isSkillsProgram, localize, mentionTopics, placeWords } from './demand-bank.ts';
import { hashString, rngFor } from './random.ts';
import { slugify } from './shared.ts';

const LATEST_MONTH = '2026-09';

function geo(scope: DemandScope): string {
  return scope === 'india' ? 'IN' : 'IN-AS';
}

/** A link to the grouped topic on the platform where it was found. */
export function topicUrl(platform: DemandPlatform, text: string, scope: DemandScope): string {
  const q = encodeURIComponent(text);
  switch (platform) {
    case 'reddit':
      return `https://reddit.example/r/assam/search?q=${q}`;
    case 'x':
      return `https://x.example/search?q=${q}`;
    case 'quora':
      return `https://quora.example/topic/${slugify(text)}`;
    case 'youtube':
      return `https://youtube.example/results?search_query=${q}`;
    case 'instagram':
      return `https://instagram.example/explore/search/?q=${q}`;
    case 'trends':
      return `https://trends.example/explore?q=${q}&geo=${geo(scope)}`;
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

/** Without a watch list, the sample institutions (never a team prospect), as in the sample world. */
function sampleWatch(): WatchedInstitution[] {
  return SAMPLE_INSTITUTIONS.flatMap((institution) => {
    const first = institution.programs[0];
    if (institution.isProspect || !first) return [];
    return [
      {
        id: institutionId(institution.slug),
        slug: institution.slug,
        name: institution.name,
        type: institution.type,
        city: institution.city,
        state: institution.state,
        programKey: first.programKey,
      },
    ];
  });
}

export function demandSignals(platform: DemandPlatform, target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'region') return [];
  const fixture = demandFixture(target.programKey);
  if (!fixture) return [];

  const month = monthKey(asOf);
  const words = placeWords(target.scope, target.region, target.state);
  const factor = DEMAND_SCOPE_FACTOR[target.scope];
  const wobble = (label: string) => 0.9 + rngFor('demand', label, target.scope, target.region, target.programKey, month).next() * 0.2;
  const signals: AnySignal[] = [];
  const add = (value: DemandItemValue, sourceUrl: string) => signals.push(makeSignal(platform, 'demand_item', target, value, sourceUrl, asOf));

  if (platform === 'trends') {
    for (const [kind, trends] of [
      ['rising', fixture.rising],
      ['falling', fixture.falling],
    ] as const) {
      trends.forEach((trend, index) => {
        const text = localize(trend.text, words);
        const { changePct, growth } = trendThisMonth(trend, kind, target.programKey, month);
        add(item({ kind, text, count: Math.round(trend.base * factor * growth), changePct, meta: kind === 'rising' ? { trendIndex: index } : {} }), topicUrl('trends', text, target.scope));
      });
    }
    const season = isSkillsProgram(target.programKey) ? SEASON_SKILLS : SEASON_DEGREE;
    for (const stage of season) {
      add(
        item({ kind: 'season', text: stage.text, count: 0, meta: { stage: stage.stage, from: stage.from, to: stage.to } }),
        `https://exams.example/${slugify(words.state)}/admission-year-2027`,
      );
    }
  }

  fixture.questions.forEach((question, index) => {
    if (question.source !== platform) return;
    const text = localize(question.text, words);
    // Assamese is asked in Assam. Elsewhere the same question comes up in Hindi.
    const language: Language = question.language === 'as' && !words.assamese ? 'hi' : question.language;
    const originalText = language !== 'en' && language === question.language && text === question.text ? (question.original ?? null) : null;
    add(
      item({ kind: 'question', text, originalText, language, count: Math.round(question.base * factor * wobble(`question-${index}`)), meta: { questionIndex: index } }),
      topicUrl(platform, originalText ?? text, target.scope),
    );
  });

  fixture.worries.forEach((worry, index) => {
    if (worry.source !== platform) return;
    const text = localize(worry.text, words);
    add(
      item({ kind: 'worry', text, count: Math.round(worry.base * factor * wobble(`worry-${index}`)), meta: { isNew: worry.isNew ?? false, theme: worry.theme } }),
      topicUrl(platform, text, target.scope),
    );
  });

  // Grouped mentions of the institutions this pull watches, filed under each one's first program
  // so they are stored once per region. City and state only: All India is too broad for one institution.
  if (target.scope !== 'india') {
    for (const institution of target.watch ?? sampleWatch()) {
      if (institution.programKey !== target.programKey) continue;
      const inRegion =
        target.scope === 'city'
          ? institution.city === target.region && (!target.state || institution.state === target.state)
          : institution.state === target.region;
      if (!inRegion) continue;
      const scale = target.scope === 'state' ? 1.4 : 1;
      for (const mention of mentionTopics(institution.slug, institution.type)) {
        if (mention.source !== platform) continue;
        const source = new URL(topicUrl(platform, institution.name, target.scope));
        source.searchParams.set('topic', hashString(mention.text).toString(36));
        add(
          item({
            kind: 'mention',
            text: mention.text,
            count: Math.max(1, Math.round(mention.base * scale * wobble(`mention-${institution.slug}-${mention.sentiment}`))),
            about: { id: institution.id, slug: institution.slug, name: institution.name },
            sentiment: mention.sentiment,
          }),
          source.toString(),
        );
      }
    }
  }

  return signals;
}

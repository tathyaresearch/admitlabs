// Mock Demand sources. Each platform returns grouped items for a region and program:
// a topic, a count and a source link. Never a person, never a profile.

import { monthKey } from '../../domain/dates.ts';
import type { DemandScope } from '../../domain/types.ts';
import {
  DEMAND_FIXTURES,
  DEMAND_SCOPE_FACTOR,
  MENTION_FIXTURES,
  SEASON_DEGREE,
  SEASON_SKILLS,
  SKILLS_PROGRAM_KEYS,
  type DemandPlatform,
} from '../../sample/demand.ts';
import { SAMPLE_INSTITUTIONS } from '../../sample/institutions.ts';
import type { DemandItemValue } from '../signals.ts';
import { makeSignal, type AnySignal, type Target } from '../types.ts';
import { hashString, rngFor } from './random.ts';
import { slugify } from './shared.ts';

/** The fixtures describe September 2026. Earlier months show the counts before this month's change. */
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

export function demandSignals(platform: DemandPlatform, target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'region') return [];
  const fixture = DEMAND_FIXTURES[target.programKey];
  if (!fixture) return [];

  const month = monthKey(asOf);
  const latest = month >= LATEST_MONTH;
  const factor = DEMAND_SCOPE_FACTOR[target.scope];
  const wobble = (label: string) => 0.9 + rngFor('demand', label, target.scope, target.region, target.programKey, month).next() * 0.2;
  const signals: AnySignal[] = [];
  const add = (value: DemandItemValue, sourceUrl: string) => signals.push(makeSignal(platform, 'demand_item', target, value, sourceUrl, asOf));

  if (platform === 'trends') {
    for (const [kind, trends] of [
      ['rising', fixture.rising],
      ['falling', fixture.falling],
    ] as const) {
      for (const trend of trends) {
        const growth = latest ? 1 + trend.changePct / 100 : 1;
        add(
          item({ kind, text: trend.text, count: Math.round(trend.base * factor * growth), changePct: latest ? trend.changePct : Math.round(trend.changePct / 2) }),
          topicUrl('trends', trend.text, target.scope),
        );
      }
    }
    const season = SKILLS_PROGRAM_KEYS.has(target.programKey) ? SEASON_SKILLS : SEASON_DEGREE;
    for (const stage of season) {
      add(
        item({ kind: 'season', text: stage.text, count: 0, meta: { stage: stage.stage, from: stage.from, to: stage.to, current: stage.current } }),
        'https://exams.example/assam/admission-year-2027',
      );
    }
  }

  fixture.questions.forEach((question, index) => {
    if (question.source !== platform) return;
    add(
      item({
        kind: 'question',
        text: question.text,
        originalText: question.original ?? null,
        language: question.language,
        count: Math.round(question.base * factor * wobble(`question-${index}`)),
        meta: { questionIndex: index },
      }),
      topicUrl(platform, question.original ?? question.text, target.scope),
    );
  });

  fixture.worries.forEach((worry, index) => {
    if (worry.source !== platform) return;
    add(
      item({ kind: 'worry', text: worry.text, count: Math.round(worry.base * factor * wobble(`worry-${index}`)), meta: { isNew: worry.isNew ?? false } }),
      topicUrl(platform, worry.text, target.scope),
    );
  });

  // Grouped mentions of institutions in this region. Each institution's mentions sit in the
  // pull for its first program; Demand screens look them up by institution, not by program.
  if (target.scope !== 'india') {
    for (const mention of MENTION_FIXTURES) {
      if (mention.source !== platform) continue;
      const institution = SAMPLE_INSTITUTIONS.find((candidate) => candidate.slug === mention.slug);
      if (!institution || institution.isProspect) continue;
      if (institution.programs[0]?.programKey !== target.programKey) continue;
      const inRegion = target.scope === 'city' ? institution.city === target.region : institution.state === target.region;
      if (!inRegion) continue;
      const scale = target.scope === 'state' ? 1.4 : 1;
      const source = new URL(topicUrl(platform, institution.name, target.scope));
      source.searchParams.set('topic', hashString(mention.text).toString(36));
      add(
        item({
          kind: 'mention',
          text: mention.text,
          count: Math.max(1, Math.round(mention.base * scale * wobble(`mention-${mention.slug}-${mention.sentiment}`))),
          about: { slug: institution.slug, name: institution.name },
          sentiment: mention.sentiment,
        }),
        source.toString(),
      );
    }
  }

  return signals;
}

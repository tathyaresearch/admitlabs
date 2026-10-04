// From what the Demand sources found to the items one pull stores (spec 9.4 and 9.5): the
// keyword tool's searches a month join the trends they count, each kind is ranked, and the
// writer's ideas follow. Honest numbers: a trend keeps a count only when the keyword tool gives
// one; a question or a topic keeps the questions counted. Shared by the monthly job and the
// in-memory sample world. Pure.

import { DEMAND_RULES } from '../config/demand.ts';
import { ASK_TOPICS, type AskTopic, type DemandKind, type Language } from '../domain/types.ts';
import type { ContentIdea, ContentIdeaInput } from '../providers/analysis.ts';
import type { AnySignal, Signal } from '../providers/types.ts';
import type { DemandMetaValue } from '../providers/signals.ts';
import { rankDemand } from './rank.ts';

export interface PulledItem {
  kind: DemandKind;
  text: string;
  originalText: string | null;
  language: Language;
  count: number | null;
  changePct: number | null;
  rank: number | null;
  sourceUrl: string;
  foundAt: string;
  meta: Readonly<Record<string, DemandMetaValue>>;
}

/** A stored topic word, when it is one of the known ones. */
export const askTopic = (value: unknown): AskTopic | null => ((ASK_TOPICS as readonly unknown[]).includes(value) ? (value as AskTopic) : null);
const index = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/** The found items, ranked, and what the writer needs to build ideas on them. */
export function pulledItems(signals: readonly AnySignal[]): { items: PulledItem[]; basis: Pick<ContentIdeaInput, 'questions' | 'topics' | 'rising'> } {
  const volumes = new Map(signals.flatMap((signal) => (signal.key === 'search_volume' ? [[signal.value.text, { monthly: signal.value.monthly, sourceUrl: signal.sourceUrl }] as const] : [])));
  const found = signals
    .filter((signal): signal is Signal<'demand_item'> => signal.key === 'demand_item')
    .map((signal) => {
      const { kind, text, count, changePct } = signal.value;
      const volume = kind === 'rising' || kind === 'falling' ? volumes.get(text) : undefined;
      return { signal, kind, text, count: volume?.monthly ?? count, changePct, countKind: volume ? 'searches' : count === null ? null : 'asked', countSource: volume?.sourceUrl ?? null };
    });
  const ranks = rankDemand(found);

  const items = found.map((entry): PulledItem => {
    const value = entry.signal.value;
    return {
      kind: value.kind,
      text: value.text,
      originalText: value.originalText,
      language: value.language,
      count: entry.count,
      changePct: value.changePct,
      rank: ranks.get(entry) ?? null,
      sourceUrl: entry.signal.sourceUrl,
      foundAt: entry.signal.fetchedAt,
      meta: {
        ...value.meta,
        platform: typeof value.meta.platform === 'string' ? value.meta.platform : entry.signal.provider,
        ...(entry.countKind ? { countKind: entry.countKind } : {}),
        ...(entry.countSource ? { countSource: entry.countSource } : {}),
      },
    };
  });

  const questions = found
    .filter((entry) => entry.kind === 'question')
    .map((entry) => ({ text: entry.text, sourceUrl: entry.signal.sourceUrl, questionIndex: index(entry.signal.value.meta.questionIndex), topic: askTopic(entry.signal.value.meta.topic) }));
  const topics = found.flatMap((entry) => {
    const topic = entry.kind === 'topic' ? askTopic(entry.signal.value.meta.topic) : null;
    return topic ? [{ topic, text: entry.text, sourceUrl: entry.signal.sourceUrl }] : [];
  });
  const rising = found.filter((entry) => entry.kind === 'rising').map((entry) => ({ text: entry.text, trendIndex: index(entry.signal.value.meta.trendIndex) }));
  return { items, basis: { questions, topics, rising } };
}

/**
 * A city has too little data for a program when search trends gave it nothing, or fewer
 * questions than the rule were counted there (the topics' counts, else the questions'): its state
 * fills in (spec 9.2).
 */
export function hasTooLittle(items: ReadonlyArray<Pick<PulledItem, 'kind' | 'count'>>): boolean {
  const trends = items.some((item) => item.kind === 'rising' || item.kind === 'falling');
  const topics = items.filter((item) => item.kind === 'topic');
  const counted = topics.length ? topics : items.filter((item) => item.kind === 'question');
  const asked = counted.reduce((sum, item) => sum + (item.count ?? 0), 0);
  return !trends || asked < DEMAND_RULES.cityMinQuestions;
}

/** The writer's ideas, in its order, as items of the same pull. */
export function ideaItems(ideas: readonly ContentIdea[], pulledAt: Date): PulledItem[] {
  return ideas.map((idea, rank) => ({
    kind: 'idea',
    text: idea.text,
    originalText: null,
    language: 'en',
    count: null,
    changePct: null,
    rank: rank + 1,
    sourceUrl: idea.sourceUrl,
    foundAt: pulledAt.toISOString(),
    meta: { title: idea.title, hook: idea.hook, points: idea.points, basedOn: idea.basedOn, topic: idea.topic, trend: idea.trend, format: idea.format, effort: idea.effort },
  }));
}

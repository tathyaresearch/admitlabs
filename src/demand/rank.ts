// Ranking grouped Demand items within their kind: biggest rise, biggest fall, most asked,
// most raised. Pure.

import type { DemandKind } from '../domain/types.ts';

interface Rankable {
  kind: DemandKind;
  text: string;
  count: number;
  changePct: number | null;
}

const ORDER: Partial<Record<DemandKind, (a: Rankable, b: Rankable) => number>> = {
  rising: (a, b) => (b.changePct ?? 0) - (a.changePct ?? 0) || b.count - a.count,
  falling: (a, b) => (a.changePct ?? 0) - (b.changePct ?? 0) || b.count - a.count,
  question: (a, b) => b.count - a.count,
  worry: (a, b) => b.count - a.count,
};

/** The rank of each item within its kind (1 is first), or null for kinds that are not ranked. */
export function rankDemand<T extends Rankable>(items: readonly T[]): Map<T, number | null> {
  const ranks = new Map<T, number | null>(items.map((item) => [item, null]));
  for (const [kind, compare] of Object.entries(ORDER)) {
    items
      .filter((item) => item.kind === kind)
      .sort((a, b) => compare(a, b) || a.text.localeCompare(b.text))
      .forEach((item, index) => ranks.set(item, index + 1));
  }
  return ranks;
}

/**
 * A big spike (spec section 11): a rising course or career up by at least `minChangePct`
 * percent this month. Biggest first.
 */
export function bigSpikes<T extends Rankable>(items: readonly T[], minChangePct: number): T[] {
  return items
    .filter((item) => item.kind === 'rising' && item.changePct !== null && item.changePct >= minChangePct)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0) || a.text.localeCompare(b.text));
}

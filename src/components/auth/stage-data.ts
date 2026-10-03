// What the left sides of /signup and /login show: Larkmoor University, Bangalore, from the product
// page's sample (src/product/showcase.ts, the sample world through the real scoring engine), as
// plain data their motion can use in the browser.

import { askedOn } from '@/components/product/Previews';
import { formatDate } from '@/domain/format';
import { PILLAR_LABELS, PILLARS, type Pillar } from '@/domain/types';
import { PLATFORM_NAMES } from '@/graphics/platforms';
import type { Showcase } from '@/product/showcase';

export interface StageData {
  name: string;
  city: string;
  /** When the Audit ran: "15 Aug 2026". */
  checked: string;
  score: number;
  label: string;
  change: number | null;
  pillars: Array<{ key: Pillar; label: string; score: number }>;
  /** In rank order; `from`: how many rows away each starts, in the order of their names. */
  rivals: Array<{ id: string; name: string; score: number; rank: number; you: boolean; from: number }>;
  /** The questions asked most, with the site each was asked on. */
  questions: Array<{ text: string; count: number; platform: string }>;
  /** The search rising fastest, and its searches by month, oldest first. */
  trend: { text: string; changePct: number; count: number; history: number[] };
}

export function stageData(showcase: Showcase): StageData {
  const { audit, rivals, demand, home, institution } = showcase;
  const byName = [...rivals.rows].sort((a, b) => a.name.localeCompare(b.name)).map((row) => row.id);
  const top = demand.view.topTrend;
  return {
    name: institution.name,
    city: institution.city,
    checked: formatDate(home.checkedAt),
    score: audit.scores.overall,
    label: audit.label,
    change: audit.changes.overall,
    pillars: PILLARS.map((pillar) => ({ key: pillar, label: PILLAR_LABELS[pillar], score: audit.scores[pillar] })),
    rivals: rivals.rows.map((row, index) => ({
      id: row.id,
      name: row.you ? 'You' : row.name,
      score: row.overall ?? 0,
      rank: row.rank ?? index + 1,
      you: row.you,
      from: byName.indexOf(row.id) - index,
    })),
    questions: demand.view.questions.slice(0, 3).map((row) => ({ text: row.text, count: row.count, platform: PLATFORM_NAMES[askedOn(row)] })),
    trend: {
      text: top?.text ?? '',
      changePct: Math.round(top?.changePct ?? 0),
      count: top?.count ?? 0,
      history: demand.topHistory.map((point) => point.count),
    },
  };
}

// What the left side of /login shows: Larkmoor University, Bangalore, from the product page's
// sample (src/product/showcase.ts, the sample world through the real scoring engine), as plain
// data its motion can use in the browser.

import { trendWord } from '@/demand/text';
import { formatDate } from '@/domain/format';
import type { ScoreLabel } from '@/domain/scores';
import type { Pillar } from '@/domain/types';
import { topQuestions, type Showcase } from '@/product/showcase';

export interface StageData {
  name: string;
  city: string;
  /** When the Audit ran: "15 Aug 2026". */
  checked: string;
  /** Discovered, Trusted and Chosen, each with its word and the points behind it, out of 100. */
  words: Array<{ key: Pillar; label: string; word: ScoreLabel; score: number }>;
  /** The one line from the three words. */
  answer: string;
  /** In rank order, with the small score; `from`: how many rows away each starts, in the order of their names. */
  rivals: Array<{ id: string; name: string; score: number; rank: number; you: boolean; from: number }>;
  /** The month's one line about rivals. */
  line: string | null;
  /** The questions asked most, with the site each was asked on. */
  questions: Array<{ text: string; count: number; platform: string }>;
  /** The program rising fastest, its word, its searches a month when counted, and its searches by month, oldest first. */
  trend: { text: string; word: string; count: number | null; history: number[] };
}

export function stageData(showcase: Showcase): StageData {
  const { audit, rivals, demand, institution } = showcase;
  const ranking = rivals.view.ranking;
  const byName = [...ranking].sort((a, b) => a.name.localeCompare(b.name)).map((row) => row.id);
  const top = demand.highlight;
  return {
    name: institution.name,
    city: institution.city,
    checked: formatDate(showcase.checkedAt),
    words: audit.words.map((entry) => ({ key: entry.pillar, label: entry.name, word: entry.word, score: entry.score })),
    answer: showcase.answer,
    rivals: ranking.map((row, index) => ({
      id: row.id,
      name: row.you ? 'You' : row.name,
      score: row.overall ?? 0,
      rank: row.place ?? index + 1,
      you: row.you,
      from: byName.indexOf(row.id) - index,
    })),
    line: rivals.line,
    questions: topQuestions(demand.signals, 3).map((question) => ({ text: question.text, count: question.count, platform: question.site })),
    trend: {
      text: top?.text ?? '',
      word: (top ? trendWord(top.changePct) : null) ?? '',
      count: top?.count ?? null,
      history: demand.history.map((point) => point.count),
    },
  };
}

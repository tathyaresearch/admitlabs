// The rival charts as data: every pillar with you and each rival on it, and the overall score
// month by month. Pure, so the Rivals page and the monthly report draw the same picture.

import { monthRange } from '../domain/dates.ts';
import { PILLARS, type Pillar } from '../domain/types.ts';
import type { ScoreSet } from './compare.ts';

export interface Scored {
  id: string;
  name: string;
  scores: ScoreSet | null;
}

export interface PillarEntry {
  id: string;
  name: string;
  you: boolean;
  score: number;
}

export interface PillarSpread {
  pillar: Pillar;
  /** You and every scored rival, highest first. */
  entries: PillarEntry[];
  /** Your place on this pillar, 1 for the highest. Ties share a place. Null until you have a score. */
  rank: number | null;
  of: number;
}

/** Each pillar with you and every scored rival on it. */
export function pillarSpread(you: Scored, rivals: readonly Scored[]): PillarSpread[] {
  const everyone = [{ ...you, you: true }, ...rivals.map((rival) => ({ ...rival, you: false }))];
  return PILLARS.map((pillar) => {
    const entries = everyone
      .flatMap((row) => (row.scores ? [{ id: row.id, name: row.name, you: row.you, score: row.scores[pillar] }] : []))
      .sort((a, b) => b.score - a.score || Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
    const mine = entries.find((entry) => entry.you);
    return {
      pillar,
      entries,
      rank: mine ? 1 + entries.filter((entry) => entry.score > mine.score).length : null,
      of: entries.length,
    };
  });
}

export interface ScorePoint {
  /** 'YYYY-MM' */
  month: string;
  score: number;
}

export interface ScoreLine {
  id: string;
  name: string;
  you: boolean;
  points: ScorePoint[];
}

export interface ScoreTrend {
  /** Every month on the chart, oldest first, with no gaps. */
  months: string[];
  /** You first, then each rival with a score in those months. */
  lines: ScoreLine[];
}

/**
 * The last `count` months up to the newest score, and each line cut to them. A line with no
 * score in those months is left out; a month with no score is a gap in its line.
 */
export function scoreTrend(lines: readonly ScoreLine[], count: number): ScoreTrend {
  const all = lines.flatMap((line) => line.points.map((point) => point.month)).sort();
  const first = all[0];
  const last = all.at(-1);
  if (!first || !last) return { months: [], lines: [] };
  const months = monthRange(first, last).slice(-count);
  const shown = new Set(months);
  const cut = lines
    .map((line) => ({ ...line, points: line.points.filter((point) => shown.has(point.month)).sort((a, b) => a.month.localeCompare(b.month)) }))
    .filter((line) => line.points.length > 0);
  return { months, lines: [...cut.filter((line) => line.you), ...cut.filter((line) => !line.you)] };
}

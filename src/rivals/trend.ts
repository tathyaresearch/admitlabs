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

/** The one plain line under a part's ranking: how far you lead, or how far behind you are. */
export type PartGap = { kind: 'lead' | 'behind'; name: string; points: number } | { kind: 'level'; name: string };

/**
 * The gap on a part to the institution just above you, or, when nobody is above you, the one
 * just below (level when someone has your score). Null without a score of yours or a rival's.
 */
export function partGap(row: PillarSpread): PartGap | null {
  const you = row.entries.find((entry) => entry.you);
  if (!you) return null;
  const mine = Math.round(you.score);
  const others = row.entries.filter((entry) => !entry.you).map((entry) => ({ name: entry.name, score: Math.round(entry.score) }));
  const above = others.filter((entry) => entry.score > mine).sort((a, b) => a.score - b.score)[0];
  if (above) return { kind: 'behind', name: above.name, points: above.score - mine };
  const level = others.find((entry) => entry.score === mine);
  if (level) return { kind: 'level', name: level.name };
  const below = others.sort((a, b) => b.score - a.score)[0];
  return below ? { kind: 'lead', name: below.name, points: mine - below.score } : null;
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

/** Your place among you and your rivals in a month of the chart, by overall score. Null when you have no score that month. */
export function placeIn(trend: ScoreTrend, month: string): { place: number; of: number } | null {
  const scores = trend.lines.flatMap((line) => {
    const point = line.points.find((entry) => entry.month === month);
    return point ? [{ you: line.you, score: point.score }] : [];
  });
  const mine = scores.find((entry) => entry.you);
  return mine ? { place: 1 + scores.filter((entry) => entry.score > mine.score).length, of: scores.length } : null;
}

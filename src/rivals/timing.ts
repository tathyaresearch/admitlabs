// Two small facts about a rival (spec 8.3): when its admission push started, and whether its
// reviews are getting better or worse. Pure.

import { RIVAL_RULES } from '../config/rivals.ts';
import { daysBetween } from '../domain/dates.ts';
import type { RivalMoveKind } from '../domain/types.ts';

export interface MoveFact {
  kind: RivalMoveKind;
  description: string;
  detectedAt: string;
  sourceUrl: string;
}

/**
 * The admission push this season: the latest time the rival announced admission dates or opened
 * applications, within the last 8 months. Null when none was seen.
 */
export function admissionPush(moves: readonly MoveFact[], now: Date): MoveFact | null {
  const recent = moves
    .filter((move) => move.kind === 'admission_dates')
    .filter((move) => {
      const days = daysBetween(new Date(move.detectedAt), now);
      return days >= 0 && days <= RIVAL_RULES.admissionPushDays;
    })
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  return recent[0] ?? null;
}

export interface ReviewPoint {
  checkedAt: string;
  rating: number | null;
  reviewCount: number;
}

export type ReviewDirection = 'better' | 'worse' | 'steady' | 'unknown';

export interface ReviewTrend {
  direction: ReviewDirection;
  latest: ReviewPoint | null;
  previous: ReviewPoint | null;
}

/**
 * Better or worse, from the rival's Google rating at its last two rival Audits. A rating that
 * moved by 0.1 or more decides it; the same rating is steady. One reading is not a trend yet.
 */
export function reviewTrend(points: readonly ReviewPoint[]): ReviewTrend {
  const sorted = [...points].filter((point) => point.rating !== null).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  if (!latest || !previous || latest.rating === null || previous.rating === null) return { direction: 'unknown', latest, previous };
  const change = Math.round((latest.rating - previous.rating) * 10);
  return { direction: change > 0 ? 'better' : change < 0 ? 'worse' : 'steady', latest, previous };
}

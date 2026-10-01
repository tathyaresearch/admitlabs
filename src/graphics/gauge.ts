// The two gauges, as plain geometry, so the dashboard (SVG) and the PDFs (react-pdf) draw the same
// shapes. Half circles over the top, left to right. Pure.
//
//   Result gauge (small): three arc segments, one per level. Strong fills three, Okay two, Weak
//   one; Missing is an empty dashed arc. The word always sits beside it.
//   Score gauge (large): a half circle filled to the score out of 100, with a notch where each
//   score band starts (40 Needs work, 70 Strong, from the scoring config).

import type { CheckResult } from '../domain/types.ts';

/** An arc of a circle from one angle to another, in degrees (0 is right, 90 is down, 270 is up). */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const point = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)].map((value) => Number(value.toFixed(2)));
  };
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/** A point on a circle, for notches and labels. */
export function pointOn(cx: number, cy: number, r: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [Number((cx + r * Math.cos(radians)).toFixed(2)), Number((cy + r * Math.sin(radians)).toFixed(2))];
}

// The small result gauge ------------------------------------------------------------------------

export const RESULT_GAUGE = { width: 28, height: 16, cx: 14, cy: 14.5, r: 11, stroke: 4, gap: 12 } as const;

const FILLED: Readonly<Record<CheckResult, number>> = { strong: 3, okay: 2, weak: 1, missing: 0 };

export type SegmentState = 'on' | 'off' | 'missing';

export function resultGauge(result: CheckResult): Array<{ d: string; state: SegmentState }> {
  const { cx, cy, r, gap } = RESULT_GAUGE;
  const span = (180 - 2 * gap) / 3;
  return [0, 1, 2].map((index) => {
    const from = 180 + index * (span + gap);
    return {
      d: arcPath(cx, cy, r, from, from + span),
      state: result === 'missing' ? 'missing' : index < FILLED[result] ? 'on' : 'off',
    };
  });
}

// The large score gauge -------------------------------------------------------------------------

export const SCORE_GAUGE = { width: 220, height: 124, cx: 110, cy: 112, r: 92, stroke: 14 } as const;

export interface ScoreGaugeShape {
  track: string;
  /** Null for a score of 0. */
  value: string | null;
  /** One notch outside the arc where each band starts. */
  notches: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Where "0" and "100" sit, under the two ends. */
  ends: { zero: [number, number]; hundred: [number, number] };
}

export function scoreGauge(score: number, bandStarts: readonly number[]): ScoreGaugeShape {
  const { cx, cy, r, stroke } = SCORE_GAUGE;
  const value = Math.max(0, Math.min(100, score));
  const angle = (of: number) => 180 + (180 * of) / 100;
  return {
    track: arcPath(cx, cy, r, 180, 360),
    value: value > 0 ? arcPath(cx, cy, r, 180, angle(value)) : null,
    notches: bandStarts
      .filter((start) => start > 0 && start < 100)
      .map((start) => {
        const [x1, y1] = pointOn(cx, cy, r + stroke / 2 + 3, angle(start));
        const [x2, y2] = pointOn(cx, cy, r + stroke / 2 + 9, angle(start));
        return { x1, y1, x2, y2 };
      }),
    ends: { zero: [cx - r, cy + 14], hundred: [cx + r, cy + 14] },
  };
}

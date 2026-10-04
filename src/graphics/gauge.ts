// The large score gauge, as plain geometry, so the dashboard (SVG) and the PDFs (react-pdf) draw
// the same shape. A half circle over the top, left to right, filled to the score out of 100, with
// a tick where each score band starts (40 Okay, 70 Strong, from the scoring config), and over
// each tick what it means, on two lines ("Okay" over "from 40"), so no mark goes unnamed. The
// number is part of the drawing: centred in the bowl with its baseline on the arc's baseline (the
// line through its two ends), "/100" after it on the same baseline, and "0" and "100" centred
// under the two ends, so every part scales together. Pure.
//
// Results themselves are no longer gauges: a bar of the points earned with the word, or a small
// square in compact grids (src/components/ui/Results.tsx).

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

/** The arc's box (the "0" and "100" under the ends included) and the arc in it. */
export const SCORE_GAUGE = { width: 220, height: 132, cx: 110, cy: 112, r: 92, stroke: 14 } as const;

/** Room above the arc's box for what the ticks say. The whole drawing: viewBox `0 ${-top} width height + top`. */
export const GAUGE_HEADROOM = 18;

/** The whole drawing's viewBox, the ticks' words included. */
export const GAUGE_VIEWBOX = `0 ${-GAUGE_HEADROOM} ${SCORE_GAUGE.width} ${SCORE_GAUGE.height + GAUGE_HEADROOM}`;

/** Inter's tabular figures are all this wide, so the number's width is known without measuring. */
export const FIGURE_EM = 0.6446;

/** Sizes in the drawing's units: the number (smaller with three figures, so "/100" clears the
 *  arc), "/100", the "0" and "100" under the ends, and the words over the ticks with their line gap. */
export const SCORE_TEXT = { number: 52, numberThree: 44, of: 14, end: 10.5, gap: 3, endDrop: 17, tick: 9.5, tickLine: 10.5 } as const;

export interface ScoreGaugeShape {
  track: string;
  /** Null for a score of 0. */
  value: string | null;
  /** One notch outside the arc where each band starts. */
  notches: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Over each notch, where its two lines of words sit: centred at x, on the baselines y1 (top) and y2. */
  tickLabels: Array<{ start: number; x: number; y1: number; y2: number }>;
  /** Where "0" and "100" sit: centred under the two ends, on their baseline. */
  ends: { zero: [number, number]; hundred: [number, number] };
  /** The number: its size, centred at x on the arc's baseline y; "/100" starts at ofX. */
  number: { size: number; x: number; y: number; ofX: number };
}

/**
 * The gauge for a score. `tracking` is the letter spacing the number is drawn with, in em: the
 * dashboard tightens it a touch; the PDFs, which cannot, pass 0.
 */
export function scoreGauge(score: number, bandStarts: readonly number[], tracking = 0): ScoreGaugeShape {
  const { cx, cy, r, stroke } = SCORE_GAUGE;
  const value = Math.max(0, Math.min(100, score));
  const angle = (of: number) => 180 + (180 * of) / 100;
  const digits = String(Math.round(value)).length;
  const size = digits > 2 ? SCORE_TEXT.numberThree : SCORE_TEXT.number;
  const half = (digits * (FIGURE_EM + tracking) * size) / 2;
  const starts = bandStarts.filter((start) => start > 0 && start < 100);
  return {
    track: arcPath(cx, cy, r, 180, 360),
    value: value > 0 ? arcPath(cx, cy, r, 180, angle(value)) : null,
    notches: starts.map((start) => {
      const [x1, y1] = pointOn(cx, cy, r + stroke / 2 + 3, angle(start));
      const [x2, y2] = pointOn(cx, cy, r + stroke / 2 + 9, angle(start));
      return { x1, y1, x2, y2 };
    }),
    // The words stand just beyond the notch's outer end, the lower line closest to it.
    tickLabels: starts.map((start) => {
      const [x, y] = pointOn(cx, cy, r + stroke / 2 + 13, angle(start));
      const y2 = Number((y - 1).toFixed(2));
      return { start, x, y1: Number((y2 - SCORE_TEXT.tickLine).toFixed(2)), y2 };
    }),
    ends: { zero: [cx - r, cy + SCORE_TEXT.endDrop], hundred: [cx + r, cy + SCORE_TEXT.endDrop] },
    number: { size, x: cx, y: cy, ofX: Number((cx + half + SCORE_TEXT.gap).toFixed(2)) },
  };
}

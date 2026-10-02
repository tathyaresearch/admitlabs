// The overall score as a half-circle gauge: filled to the score out of 100, with a notch where each
// score band starts (from the scoring config). Drawn in one piece, so the number scales with the
// arc and never touches it: centred in the bowl on the arc's baseline, "/100" after it on the same
// line, "0" and "100" under the two ends (hidden on small gauges, where the number says it all).
// The same shape is drawn in the PDFs (src/graphics/gauge.ts).

import { bandStarts, scoreLabel } from '@/domain/scores';
import { SCORE_GAUGE, SCORE_TEXT, scoreGauge } from '@/graphics/gauge';
import styles from './charts.module.css';

/** The number's letter spacing, in em: a touch tight, like the other big numbers. */
const TRACKING = -0.04;

/**
 * `countUp`: the product page counts the number up and draws the arc as the gauge comes into view
 * (src/components/product/CountUp.tsx: data-count on the number, the state on the figure, a
 * normalised length on the arc). Elsewhere, and without script or motion, it simply shows.
 */
export function ScoreGauge({ score, label = 'Overall score', countUp = false }: { score: number; label?: string; countUp?: boolean }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const shape = scoreGauge(value, bandStarts(), TRACKING);
  const { stroke } = SCORE_GAUGE;
  return (
    <figure className={styles.gauge} role="img" aria-label={`${label}: ${value} out of 100, ${scoreLabel(value)}.`} data-count-root={countUp ? '' : undefined}>
      <svg viewBox={`0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}`} aria-hidden="true">
        <path d={shape.track} className={styles.gaugeTrack} strokeWidth={stroke} />
        {shape.value ? <path d={shape.value} className={styles.gaugeValue} strokeWidth={stroke} pathLength={countUp ? 100 : undefined} data-draw={countUp || undefined} /> : null}
        {shape.notches.map((notch) => (
          <line key={`${notch.x1}-${notch.y1}`} {...notch} className={styles.gaugeNotch} />
        ))}
        <text
          x={shape.number.x}
          y={shape.number.y}
          textAnchor="middle"
          className={styles.gaugeNumber}
          style={{ fontSize: shape.number.size, letterSpacing: `${TRACKING}em` }}
          data-count={countUp ? value : undefined}
        >
          {value}
        </text>
        <text x={shape.number.ofX} y={shape.number.y} className={styles.gaugeOf} style={{ fontSize: SCORE_TEXT.of }}>
          /100
        </text>
        <text x={shape.ends.zero[0]} y={shape.ends.zero[1]} textAnchor="middle" className={styles.gaugeEnd} style={{ fontSize: SCORE_TEXT.end }}>
          0
        </text>
        <text x={shape.ends.hundred[0]} y={shape.ends.hundred[1]} textAnchor="middle" className={styles.gaugeEnd} style={{ fontSize: SCORE_TEXT.end }}>
          100
        </text>
      </svg>
    </figure>
  );
}

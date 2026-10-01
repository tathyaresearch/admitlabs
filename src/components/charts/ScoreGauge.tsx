// The overall score as a half-circle gauge: filled to the score out of 100, with a notch where each
// score band starts (from the scoring config), the number inside in Inter. The same shape is drawn
// in the PDFs (src/graphics/gauge.ts).

import { bandStarts, scoreLabel } from '@/domain/scores';
import { SCORE_GAUGE, scoreGauge } from '@/graphics/gauge';
import styles from './charts.module.css';

export function ScoreGauge({ score, label = 'Overall score' }: { score: number; label?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const shape = scoreGauge(value, bandStarts());
  return (
    <figure className={styles.gauge} role="img" aria-label={`${label}: ${value} out of 100, ${scoreLabel(value)}.`}>
      <svg viewBox={`0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}`} aria-hidden="true">
        <path d={shape.track} className={styles.gaugeTrack} strokeWidth={SCORE_GAUGE.stroke} />
        {shape.value ? <path d={shape.value} className={styles.gaugeValue} strokeWidth={SCORE_GAUGE.stroke} /> : null}
        {shape.notches.map((notch) => (
          <line key={`${notch.x1}-${notch.y1}`} {...notch} className={styles.gaugeNotch} />
        ))}
        <text x={shape.ends.zero[0]} y={shape.ends.zero[1]} className={styles.gaugeEnd}>
          0
        </text>
        <text x={shape.ends.hundred[0]} y={shape.ends.hundred[1]} className={styles.gaugeEnd}>
          100
        </text>
      </svg>
      <figcaption className={styles.gaugeNumber} aria-hidden="true">
        <span className={`${styles.gaugeValueText} num`}>{value}</span>
        <span className={`${styles.gaugeOf} num`}>/100</span>
      </figcaption>
    </figure>
  );
}

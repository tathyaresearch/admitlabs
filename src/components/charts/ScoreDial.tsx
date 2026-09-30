// A single score out of 100 on a 240 degree dial. Ticks mark where the bands start
// (40 Needs work, 70 Strong), taken from the scoring config.

import { SCORING_V1 } from '@/config/scoring.v1';
import { scoreLabel } from '@/domain/scores';
import styles from './charts.module.css';

const START = 150;
const SWEEP = 240;

function point(cx: number, cy: number, r: number, angle: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = point(cx, cy, r, from);
  const [x2, y2] = point(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function ScoreDial({ score, size = 220, label = 'Overall score' }: { score: number; size?: number; label?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const cx = 100;
  const cy = 100;
  const r = 84;
  const end = START + (SWEEP * value) / 100;
  const bandStarts = SCORING_V1.labels.map((band) => band.min).filter((min) => min > 0);

  return (
    <figure className={styles.dial} style={{ width: size }} role="img" aria-label={`${label}: ${value} out of 100, ${scoreLabel(value)}.`}>
      <svg viewBox="0 0 200 172" width={size} height={(size * 172) / 200} aria-hidden="true">
        <path d={arc(cx, cy, r, START, START + SWEEP)} className={styles.dialTrack} />
        {value > 0 ? <path d={arc(cx, cy, r, START, end)} className={styles.dialValue} /> : null}
        {bandStarts.map((min) => {
          const angle = START + (SWEEP * min) / 100;
          const [x1, y1] = point(cx, cy, r + 9, angle);
          const [x2, y2] = point(cx, cy, r + 15, angle);
          return <line key={min} x1={x1} y1={y1} x2={x2} y2={y2} className={styles.dialTick} />;
        })}
      </svg>
      <figcaption className={styles.dialCenter} aria-hidden="true">
        <span className={styles.dialNumber}>{value}</span>
        <span className={styles.dialCaption}>{label}</span>
      </figcaption>
    </figure>
  );
}

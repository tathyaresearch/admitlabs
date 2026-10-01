'use client';

// A pillar's small trend: its score by month on a range the three pillars share, so their lines
// compare. The band lines that fall inside the range, the first month's score at the start, and
// the first and last months under it.

import { formatMonth, formatMonthShort } from '@/domain/format';
import { bandStarts } from '@/domain/scores';
import styles from './charts.module.css';
import { useChartWidth } from './useChartWidth';

const PAD_LEFT = 22;
const PAD_RIGHT = 6;
const PAD_Y = 6;

export function PillarTrend({
  points,
  range,
  label,
  height = 44,
}: {
  points: ReadonlyArray<{ month: string; score: number }>;
  range: readonly [number, number];
  label: string;
  height?: number;
}) {
  const { ref, width } = useChartWidth<HTMLElement>(160);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;

  const [low, high] = range;
  const x = (index: number) => PAD_LEFT + (index * (width - PAD_LEFT - PAD_RIGHT)) / (points.length - 1);
  const y = (score: number) => PAD_Y + (1 - (Math.max(low, Math.min(high, score)) - low) / (high - low)) * (height - PAD_Y * 2);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.score).toFixed(1)}`).join(' ');

  return (
    <figure ref={ref} className={styles.pillarTrend}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}: ${Math.round(first.score)} in ${formatMonth(first.month)}, ${Math.round(last.score)} in ${formatMonth(last.month)}.`}
      >
        {bandStarts()
          .filter((start) => start > low && start < high)
          .map((start) => (
            <line key={start} x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y(start)} y2={y(start)} className={styles.pillarTrendBand} />
          ))}
        <path d={path} className={styles.sparkLine} />
        <circle cx={x(0)} cy={y(first.score)} r={2.5} className={styles.sparkDot} />
        <circle cx={x(points.length - 1)} cy={y(last.score)} r={4} className={styles.sparkDot} />
        <text x={x(0) - 7} y={y(first.score)} className={`${styles.pillarTrendStart} num`} textAnchor="end" dominantBaseline="middle">
          {Math.round(first.score)}
        </text>
      </svg>
      <figcaption className={styles.pillarTrendMonths} aria-hidden="true">
        <span>{formatMonthShort(first.month)}</span>
        <span>{formatMonthShort(last.month)}</span>
      </figcaption>
    </figure>
  );
}

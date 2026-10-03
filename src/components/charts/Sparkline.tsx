// A tiny trend line. Fixed 0 to 100 scale for scores, so the slope is honest. Given `months`, every
// point carries its value above it and its month under it (rule 11: no mark without its number).

import { formatMonthShort } from '@/domain/format';
import styles from './charts.module.css';

interface SparklineProps {
  values: readonly number[];
  label: string;
  /** 'YYYY-MM' for each value: write each value and its month on the line. */
  months?: readonly string[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
}

/** Room for the values above the line and the months under it. */
const LABEL_TOP = 16;
const LABEL_BOTTOM = 16;

export function Sparkline({ values, label, months, width = 120, height = 36, min = 0, max = 100 }: SparklineProps) {
  if (values.length === 0) return null;
  const labelled = Boolean(months && months.length === values.length);
  const pad = labelled ? 12 : 5;
  const top = labelled ? LABEL_TOP + 4 : pad;
  const bottom = labelled ? LABEL_BOTTOM + 4 : pad;
  const x = (index: number) => (values.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (values.length - 1));
  const y = (value: number) => top + (1 - (value - min) / (max - min || 1)) * (height - top - bottom);
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const last = values[values.length - 1] as number;
  const first = values[0] as number;

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${label}: from ${Math.round(first)} to ${Math.round(last)} over ${values.length} points.`}
    >
      <polyline points={points} className={styles.sparkLine} />
      {labelled ? (
        values.map((value, index) => (
          <g key={months?.[index] ?? index} aria-hidden="true">
            <circle cx={x(index)} cy={y(value)} r={index === values.length - 1 ? 4 : 2.5} className={styles.sparkDot} />
            <text x={x(index)} y={y(value) - 8} textAnchor="middle" className={`${index === values.length - 1 ? styles.sparkValueLast : styles.sparkValue} num`}>
              {Math.round(value)}
            </text>
            <text x={x(index)} y={height - 3} textAnchor="middle" className={styles.sparkMonth}>
              {formatMonthShort(months?.[index] ?? '')}
            </text>
          </g>
        ))
      ) : (
        <circle cx={x(values.length - 1)} cy={y(last)} r={4} className={styles.sparkDot} />
      )}
    </svg>
  );
}

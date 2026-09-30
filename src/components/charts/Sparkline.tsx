// A tiny trend line. Fixed 0 to 100 scale for scores, so the slope is honest.

import styles from './charts.module.css';

interface SparklineProps {
  values: readonly number[];
  label: string;
  width?: number;
  height?: number;
  min?: number;
  max?: number;
}

export function Sparkline({ values, label, width = 120, height = 36, min = 0, max = 100 }: SparklineProps) {
  if (values.length === 0) return null;
  const pad = 5;
  const x = (index: number) => (values.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (values.length - 1));
  const y = (value: number) => pad + (1 - (value - min) / (max - min || 1)) * (height - pad * 2);
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
      <circle cx={x(values.length - 1)} cy={y(last)} r={4} className={styles.sparkDot} />
    </svg>
  );
}

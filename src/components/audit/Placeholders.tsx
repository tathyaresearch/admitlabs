// Fake content that gives a locked area its shape (spec section 10: blurred content is
// placeholder content, never real data hidden with CSS). Nothing here comes from an Audit.

import styles from './audit.module.css';

const WIDTHS = [88, 64, 76, 52, 70, 58, 82, 46] as const;

/** Rows of grey bars shaped like a ranked list. */
export function PlaceholderList({ rows = 4 }: { rows?: number }) {
  return (
    <ol className={styles.placeholderList}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={styles.placeholderRow}>
          <span className={styles.placeholderRank}>{index + 4}</span>
          <span className={styles.placeholderLines}>
            <span className={styles.placeholderBar} style={{ width: `${WIDTHS[index % WIDTHS.length] ?? 60}%` }} />
            <span className={styles.placeholderBarThin} style={{ width: `${(WIDTHS[(index + 3) % WIDTHS.length] ?? 50) - 10}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A made-up line on a 0 to 100 grid, shaped like score history. */
export function PlaceholderChart() {
  const points = [38, 44, 41, 52, 58, 63];
  const x = (index: number) => 24 + index * 110;
  const y = (value: number) => 180 - value * 1.6;
  return (
    <svg viewBox="0 0 600 200" className={styles.placeholderChart} aria-hidden="true">
      {[0, 40, 70, 100].map((tick) => (
        <line key={tick} x1="24" x2="584" y1={y(tick)} y2={y(tick)} className={styles.placeholderGrid} />
      ))}
      <polyline points={points.map((value, index) => `${x(index)},${y(value)}`).join(' ')} className={styles.placeholderLine} />
      {points.map((value, index) => (
        <circle key={index} cx={x(index)} cy={y(value)} r="5" className={styles.placeholderDot} />
      ))}
    </svg>
  );
}

/** Stand-in text blocks for a check's locked details. */
export function PlaceholderDetail() {
  return (
    <div className={styles.placeholderDetail}>
      <span className={styles.placeholderBarThin} style={{ width: '32%' }} />
      <span className={styles.placeholderBar} style={{ width: '92%' }} />
      <span className={styles.placeholderBar} style={{ width: '74%' }} />
      <span className={styles.placeholderBarThin} style={{ width: '28%', marginTop: '0.75rem' }} />
      <span className={styles.placeholderBar} style={{ width: '86%' }} />
      <span className={styles.placeholderBar} style={{ width: '60%' }} />
    </div>
  );
}

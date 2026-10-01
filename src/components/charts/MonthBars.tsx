// Counts by month as small columns from zero: earlier months in grey, the newest in the text
// colour, with the first and newest counts written on them. CSS only, so it is crisp at any
// width and needs no script. A hidden table carries every value.

import { formatCount, formatMonth, formatMonthShort } from '@/domain/format';
import styles from './charts.module.css';

export interface MonthCount {
  /** 'YYYY-MM' */
  month: string;
  count: number;
}

export function MonthBars({ points, title, valueLabel }: { points: readonly MonthCount[]; title: string; valueLabel: string }) {
  if (points.length < 2) return null;
  const top = Math.max(1, ...points.map((point) => point.count));
  const last = points.length - 1;
  return (
    <figure className={styles.monthBars}>
      <figcaption className={styles.monthBarsTitle}>{title}</figcaption>
      <div className={styles.monthBarsPlot} aria-hidden="true">
        {points.map((point, index) => (
          <div key={point.month} className={styles.monthBarsColumn} data-last={index === last ? 'true' : undefined}>
            <span className={styles.monthBarsTrack}>
              {index === 0 || index === last ? <span className={`${styles.monthBarsValue} num`}>{formatCount(point.count)}</span> : null}
              <span className={styles.monthBarsFill} style={{ height: `${Math.max(3, Math.round((point.count / top) * 100))}%` }} />
            </span>
            <span className={styles.monthBarsMonth}>{formatMonthShort(point.month)}</span>
          </div>
        ))}
      </div>
      <div className="visually-hidden">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month}>
                <th scope="row">{formatMonth(point.month)}</th>
                <td className="num">{formatCount(point.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

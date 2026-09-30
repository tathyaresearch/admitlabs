'use client';

// Score history, month by month, on a fixed 0 to 100 scale with the band lines marked.
// Hover or use the arrow keys to read any month. A hidden table carries every value.

import { SCORING_V1 } from '@/config/scoring.v1';
import { formatMonth, formatMonthShort } from '@/domain/format';
import { useState, type KeyboardEvent } from 'react';
import styles from './charts.module.css';
import { useChartWidth } from './useChartWidth';

export interface HistoryPoint {
  /** 'YYYY-MM' */
  month: string;
  score: number;
}

const HEIGHT = 240;
/** Band names sit in their own column on the right, so they never collide with the data. */
const BAND_COLUMN = 92;
const MIN_WIDTH_FOR_BANDS = 480;

export function HistoryLine({ points, label = 'Overall score by month' }: { points: readonly HistoryPoint[]; label?: string }) {
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const showBands = width >= MIN_WIDTH_FOR_BANDS;
  const MARGIN = { top: 24, right: showBands ? BAND_COLUMN : 24, bottom: 32, left: 36 };
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) => MARGIN.left + (points.length === 1 ? plotWidth / 2 : (index * plotWidth) / (points.length - 1));
  const y = (score: number) => MARGIN.top + (1 - score / 100) * plotHeight;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.score).toFixed(1)}`).join(' ');
  const bands = [...SCORING_V1.labels].sort((a, b) => a.min - b.min);
  const lastIndex = points.length - 1;
  const last = points[lastIndex] as HistoryPoint;
  const shown = active ?? null;
  const shownPoint = shown === null ? null : points[shown];
  const previous = shown !== null && shown > 0 ? points[shown - 1] : null;

  function nearest(clientX: number, element: SVGSVGElement) {
    const box = element.getBoundingClientRect();
    const relative = ((clientX - box.left) / box.width) * width;
    let best = 0;
    points.forEach((_, index) => {
      if (Math.abs(x(index) - relative) < Math.abs(x(best) - relative)) best = index;
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === 'ArrowRight') setActive((current) => Math.min(lastIndex, (current ?? -1) + 1));
    else if (event.key === 'ArrowLeft') setActive((current) => Math.max(0, (current ?? lastIndex + 1) - 1));
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(lastIndex);
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  }

  const summary = `${label}. ${points.length} months, from ${Math.round(points[0]?.score ?? 0)} in ${formatMonth(points[0]?.month ?? '')} to ${Math.round(last.score)} in ${formatMonth(last.month)}. Use the arrow keys to read each month.`;

  return (
    <div ref={ref} className={styles.history}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className={styles.historySvg}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={(event) => setActive(nearest(event.clientX, event.currentTarget))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {/* Band lines: where Needs work and Strong begin. */}
        {[0, ...bands.map((band) => band.min).filter((min) => min > 0), 100].map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.grid} />
            <text x={MARGIN.left - 10} y={y(tick)} className={styles.axisText} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        {showBands
          ? bands.map((band) => (
              <text key={band.label} x={width - MARGIN.right + 14} y={y((band.min + band.max) / 2)} className={styles.bandText} dominantBaseline="middle">
                {band.label}
              </text>
            ))
          : null}

        {points.map((point, index) => (
          <text key={point.month} x={x(index)} y={HEIGHT - 10} className={styles.axisText} textAnchor="middle">
            {formatMonthShort(point.month)}
          </text>
        ))}

        {shown !== null ? <line x1={x(shown)} x2={x(shown)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className={styles.crosshair} /> : null}

        <path d={path} className={styles.line} />
        {points.map((point, index) => (
          <circle key={point.month} cx={x(index)} cy={y(point.score)} r={index === shown || index === lastIndex ? 5 : 3.5} className={styles.point} />
        ))}
        <text x={x(lastIndex)} y={y(last.score) - 14} className={styles.endLabel} textAnchor="middle">
          {Math.round(last.score)}
        </text>
      </svg>

      {shownPoint ? (
        <div className={styles.tooltip} style={{ left: Math.min(Math.max(x(shown ?? 0), 80), width - 80), top: y(shownPoint.score) - 12 }} aria-hidden="true">
          <span className={styles.tooltipValue}>{Math.round(shownPoint.score)}</span>
          <span className={styles.tooltipLabel}>{formatMonth(shownPoint.month)}</span>
          {previous ? (
            <span className={styles.tooltipLabel}>
              {shownPoint.score === previous.score
                ? 'Same as the month before'
                : `${shownPoint.score > previous.score ? 'Up' : 'Down'} ${Math.abs(Math.round(shownPoint.score - previous.score))} on the month before`}
            </span>
          ) : null}
        </div>
      ) : null}

      <table className="visually-hidden">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonth(point.month)}</th>
              <td>{Math.round(point.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

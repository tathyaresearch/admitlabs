'use client';

// Overall score by month for you and each rival, on the same 0 to 100 scale as your own history,
// with the lines where Needs work (40) and Strong (70) begin. You in the text colour, rivals in
// grey, each named at the end of its line. Hover or use the arrow keys to read a month; hover a
// name or a line to bring it forward. A hidden table carries every value.

import { useState, type KeyboardEvent } from 'react';
import { formatMonth, formatMonthShort } from '@/domain/format';
import { bandStarts } from '@/domain/scores';
import type { ScoreLine, ScoreTrend } from '@/rivals/trend';
import styles from './charts.module.css';
import { fit } from './fit';
import { useChartWidth } from './useChartWidth';

const LABEL_GAP = 17;

/** End labels pushed apart so none overlap, kept inside the plot. */
function declutter(wanted: ReadonlyArray<{ id: string; y: number }>, top: number, bottom: number): Map<string, number> {
  const sorted = [...wanted].sort((a, b) => a.y - b.y);
  const ys = sorted.map((item) => item.y);
  for (let index = 1; index < ys.length; index += 1) ys[index] = Math.max(ys[index] as number, (ys[index - 1] as number) + LABEL_GAP);
  for (let index = ys.length - 1; index >= 0; index -= 1) {
    const limit = index === ys.length - 1 ? bottom : (ys[index + 1] as number) - LABEL_GAP;
    ys[index] = Math.min(ys[index] as number, limit);
  }
  for (let index = 0; index < ys.length; index += 1) ys[index] = Math.max(ys[index] as number, top + index * LABEL_GAP);
  return new Map(sorted.map((item, index) => [item.id, ys[index] as number]));
}

function linePath(line: ScoreLine, months: readonly string[], x: (index: number) => number, y: (score: number) => number): string {
  const scores = new Map(line.points.map((point) => [point.month, point.score]));
  const parts: string[] = [];
  let pen = false;
  months.forEach((month, index) => {
    const score = scores.get(month);
    if (score === undefined) {
      pen = false;
      return;
    }
    parts.push(`${pen ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(score).toFixed(1)}`);
    pen = true;
  });
  return parts.join(' ');
}

export function TrendLines({ trend, label, youName = 'You', height: HEIGHT = 260 }: { trend: ScoreTrend; label: string; youName?: string; height?: number }) {
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const { months, lines } = trend;
  if (months.length === 0 || lines.length === 0) return null;

  const narrow = width < 520;
  const MARGIN = { top: 16, right: narrow ? 112 : 196, bottom: 32, left: 36 };
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) => MARGIN.left + (months.length === 1 ? plotWidth / 2 : (index * plotWidth) / (months.length - 1));
  const y = (score: number) => MARGIN.top + (1 - Math.max(0, Math.min(100, score)) / 100) * plotHeight;
  const lastIndex = months.length - 1;
  const nameOf = (line: ScoreLine) => (line.you ? youName : fit(line.name, narrow ? 11 : 22));

  const ends = lines.flatMap((line) => {
    const last = line.points.at(-1);
    return last ? [{ line, index: months.indexOf(last.month), score: last.score }] : [];
  });
  const labelY = declutter(
    ends.map((end) => ({ id: end.line.id, y: y(end.score) })),
    MARGIN.top,
    MARGIN.top + plotHeight,
  );
  const labelX = width - MARGIN.right + 14;
  const drawOrder = [...lines.filter((line) => !line.you), ...lines.filter((line) => line.you)];
  const dim = (line: ScoreLine) => (focus !== null && focus !== line.id ? 'true' : undefined);

  const activeMonth = active === null ? null : months[active];
  const activeRows = activeMonth
    ? lines
        .flatMap((line) => {
          const point = line.points.find((candidate) => candidate.month === activeMonth);
          return point ? [{ line, score: point.score }] : [];
        })
        .sort((a, b) => b.score - a.score || Number(b.line.you) - Number(a.line.you))
    : [];

  function nearest(clientX: number, element: SVGSVGElement) {
    const box = element.getBoundingClientRect();
    const relative = ((clientX - box.left) / box.width) * width;
    let best = 0;
    months.forEach((_, index) => {
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

  const yours = lines.find((line) => line.you);
  const yourFirst = yours?.points[0];
  const yourLast = yours?.points.at(-1);
  const summary = [
    `${label}, ${formatMonth(months[0] as string)} to ${formatMonth(months[lastIndex] as string)}.`,
    yourFirst && yourLast ? `${youName}: from ${Math.round(yourFirst.score)} to ${Math.round(yourLast.score)}.` : '',
    'Use the arrow keys to read each month.',
  ]
    .filter(Boolean)
    .join(' ');

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
        onPointerLeave={() => {
          setActive(null);
          setFocus(null);
        }}
        onBlur={() => setActive(null)}
      >
        {[0, ...bandStarts(), 100].map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.grid} />
            <text x={MARGIN.left - 10} y={y(tick)} className={`${styles.axisText} num`} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        {months.map((month, index) => (
          <text key={month} x={x(index)} y={HEIGHT - 10} className={styles.axisText} textAnchor="middle">
            {formatMonthShort(month)}
          </text>
        ))}

        {active !== null ? <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className={styles.crosshair} /> : null}

        {drawOrder.map((line) => {
          const d = linePath(line, months, x, y);
          return (
            <g key={line.id} className={line.you ? styles.trendYou : styles.trendRival} data-dim={dim(line)} data-focus={focus === line.id ? 'true' : undefined}>
              <path d={d} className={styles.trendLine} />
              {line.points.map((point) => (
                <circle key={point.month} cx={x(months.indexOf(point.month))} cy={y(point.score)} r={line.you ? 3.5 : 2.5} className={styles.trendPoint} />
              ))}
              <path d={d} className={styles.trendHit} onPointerEnter={() => setFocus(line.id)} onPointerLeave={() => setFocus(null)} />
            </g>
          );
        })}

        {ends.map((end) => {
          const at = labelY.get(end.line.id) ?? y(end.score);
          return (
            <g
              key={end.line.id}
              className={end.line.you ? styles.trendLabelYou : styles.trendLabel}
              data-dim={dim(end.line)}
              onPointerEnter={() => setFocus(end.line.id)}
              onPointerLeave={() => setFocus(null)}
            >
              <line x1={x(end.index) + 7} x2={labelX - 5} y1={y(end.score)} y2={at} className={styles.trendLeader} />
              <rect x={labelX - 4} y={at - LABEL_GAP / 2} width={MARGIN.right - 12} height={LABEL_GAP} className={styles.hitArea} />
              <text x={labelX} y={at} dominantBaseline="middle">
                <tspan className={`${styles.trendLabelValue} num`}>{Math.round(end.score)}</tspan>
                <tspan dx={7}>{nameOf(end.line)}</tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {activeMonth && activeRows.length ? (
        <div
          className={`${styles.tooltip} ${styles.trendTooltip}`}
          data-side={(active ?? 0) > lastIndex / 2 ? 'left' : 'right'}
          style={{ left: x(active ?? 0), top: MARGIN.top }}
          aria-hidden="true"
        >
          <span className={styles.tooltipLabel}>{formatMonth(activeMonth)}</span>
          {activeRows.map((row) => (
            <span key={row.line.id} className={row.line.you ? `${styles.tooltipRow} ${styles.tooltipYou}` : styles.tooltipRow}>
              <span className={`${styles.tooltipValue} num`}>{Math.round(row.score)}</span> {row.line.you ? youName : row.line.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="visually-hidden">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Institution</th>
              {months.map((month) => (
                <th key={month} scope="col">
                  {formatMonth(month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const scores = new Map(line.points.map((point) => [point.month, point.score]));
              return (
                <tr key={line.id}>
                  <th scope="row">{line.you ? youName : line.name}</th>
                  {months.map((month) => {
                    const score = scores.get(month);
                    return score === undefined ? (
                      <td key={month}>Not scored</td>
                    ) : (
                      <td key={month} className="num">
                        {Math.round(score)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

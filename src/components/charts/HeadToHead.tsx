'use client';

// You against one rival, pillar by pillar. No colour and no key to decode: each bar says whose it
// is beside it, you in the text colour and the rival in grey, with the value at the bar's end.
// Hovering a row repeats both in a tooltip.

import { useState } from 'react';
import styles from './charts.module.css';
import { fit } from './fit';
import { useChartWidth } from './useChartWidth';

export interface HeadToHeadRow {
  label: string;
  you: number;
  rival: number;
}

const BAR = 10;
const GAP = 6;
const ROW = BAR * 2 + GAP + 22;
const VALUE_ROOM = 40;

export function HeadToHead({ rows, rivalName, youName = 'You' }: { rows: readonly HeadToHeadRow[]; rivalName: string; youName?: string }) {
  const { ref, width } = useChartWidth<HTMLDivElement>(560);
  const [active, setActive] = useState<number | null>(null);
  const narrow = width < 480;
  const labelWidth = narrow ? 80 : 104;
  const nameWidth = narrow ? 84 : 132;
  const rival = fit(rivalName, narrow ? 12 : 18);
  const plot = Math.max(80, width - labelWidth - nameWidth - VALUE_ROOM);
  const left = labelWidth + nameWidth;
  const height = rows.length * ROW;
  const scale = (value: number) => (Math.max(0, Math.min(100, value)) / 100) * plot;
  const activeRow = active === null ? null : rows[active];

  return (
    <div ref={ref} className={styles.h2h}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${youName} against ${rivalName}. ${rows.map((row) => `${row.label}: ${Math.round(row.you)} and ${Math.round(row.rival)}`).join('. ')}.`}
      >
        {rows.map((row, index) => {
          const top = index * ROW + 6;
          const second = top + BAR + GAP;
          return (
            <g
              key={row.label}
              className={styles.h2hRow}
              data-active={active === index ? 'true' : undefined}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
            >
              <rect x={0} y={top - 6} width={width} height={ROW} className={styles.hitArea} />
              <text x={0} y={top + BAR + GAP / 2} className={styles.rowLabel} dominantBaseline="middle">
                {row.label}
              </text>
              <text x={labelWidth} y={top + BAR / 2} className={styles.seriesName} dominantBaseline="middle">
                {youName}
              </text>
              <rect x={left} y={top} width={plot} height={BAR} className={styles.barTrack} />
              <rect x={left} y={top} width={Math.max(2, scale(row.you))} height={BAR} rx={2} className={styles.youFill} />
              <text x={left + scale(row.you) + 8} y={top + BAR / 2} className={`${styles.barValue} num`} dominantBaseline="middle">
                {Math.round(row.you)}
              </text>
              <text x={labelWidth} y={second + BAR / 2} className={styles.seriesNameMuted} dominantBaseline="middle">
                {rival}
              </text>
              <rect x={left} y={second} width={plot} height={BAR} className={styles.barTrack} />
              <rect x={left} y={second} width={Math.max(2, scale(row.rival))} height={BAR} rx={2} className={styles.rivalFill} />
              <text x={left + scale(row.rival) + 8} y={second + BAR / 2} className={`${styles.barValueMuted} num`} dominantBaseline="middle">
                {Math.round(row.rival)}
              </text>
            </g>
          );
        })}
      </svg>

      {activeRow ? (
        <div className={styles.tooltip} style={{ left: left + plot / 2, top: (active ?? 0) * ROW }} aria-hidden="true">
          <span className={styles.tooltipLabel}>{activeRow.label}</span>
          <span className={styles.tooltipRow}>
            <span className={`${styles.tooltipValue} num`}>{Math.round(activeRow.you)}</span> {youName}
          </span>
          <span className={styles.tooltipRow}>
            <span className={`${styles.tooltipValue} num`}>{Math.round(activeRow.rival)}</span> {rivalName}
          </span>
        </div>
      ) : null}
    </div>
  );
}

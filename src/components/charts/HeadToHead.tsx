'use client';

// You against one rival, pillar by pillar. No colour: you are a solid bar, the rival is a
// 45 degree hatch. Values sit at the bar ends; hovering a row repeats both in a tooltip.

import { useId, useState } from 'react';
import styles from './charts.module.css';
import { useChartWidth } from './useChartWidth';

export interface HeadToHeadRow {
  label: string;
  you: number;
  rival: number;
}

const BAR = 10;
const GAP = 4;
const ROW = BAR * 2 + GAP + 22;
const LABEL_WIDTH = 104;
const VALUE_ROOM = 40;

export function HeadToHead({ rows, rivalName, youName = 'You' }: { rows: readonly HeadToHeadRow[]; rivalName: string; youName?: string }) {
  const { ref, width } = useChartWidth<HTMLDivElement>(560);
  const [active, setActive] = useState<number | null>(null);
  const hatchId = useId().replace(/:/g, '');
  const plot = Math.max(80, width - LABEL_WIDTH - VALUE_ROOM);
  const height = rows.length * ROW;
  const scale = (value: number) => (Math.max(0, Math.min(100, value)) / 100) * plot;
  const activeRow = active === null ? null : rows[active];

  return (
    <div ref={ref} className={styles.h2h}>
      <ul className={styles.legend} aria-label="Key">
        <li>
          <svg width="14" height="14" aria-hidden="true">
            <rect width="14" height="14" rx="2" className={styles.youFill} />
          </svg>
          {youName}
        </li>
        <li>
          <svg width="14" height="14" aria-hidden="true">
            <defs>
              <pattern id={`${hatchId}-key`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" className={styles.hatchLine} />
              </pattern>
            </defs>
            <rect width="14" height="14" rx="2" fill={`url(#${hatchId}-key)`} />
          </svg>
          {rivalName}
        </li>
      </ul>

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${youName} against ${rivalName}. ${rows.map((row) => `${row.label}: ${Math.round(row.you)} and ${Math.round(row.rival)}`).join('. ')}.`}>
        <defs>
          <pattern id={hatchId} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" className={styles.hatchLine} />
          </pattern>
        </defs>
        {rows.map((row, index) => {
          const top = index * ROW + 6;
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
              <rect x={LABEL_WIDTH} y={top} width={plot} height={BAR} className={styles.barTrack} />
              <rect x={LABEL_WIDTH} y={top} width={Math.max(2, scale(row.you))} height={BAR} rx={2} className={styles.youFill} />
              <text x={LABEL_WIDTH + scale(row.you) + 8} y={top + BAR / 2} className={`${styles.barValue} num`} dominantBaseline="middle">
                {Math.round(row.you)}
              </text>
              <rect x={LABEL_WIDTH} y={top + BAR + GAP} width={plot} height={BAR} className={styles.barTrack} />
              <rect x={LABEL_WIDTH} y={top + BAR + GAP} width={Math.max(2, scale(row.rival))} height={BAR} rx={2} fill={`url(#${hatchId})`} />
              <text x={LABEL_WIDTH + scale(row.rival) + 8} y={top + BAR + GAP + BAR / 2} className={`${styles.barValueMuted} num`} dominantBaseline="middle">
                {Math.round(row.rival)}
              </text>
            </g>
          );
        })}
      </svg>

      {activeRow ? (
        <div className={styles.tooltip} style={{ left: LABEL_WIDTH + plot / 2, top: (active ?? 0) * ROW }} aria-hidden="true">
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

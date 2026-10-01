'use client';

// Each pillar on one line from 0 to 100: you as a filled dot with your score above it, every
// rival as an open dot, and your place on the right. Small ticks mark where Needs work (40) and
// Strong (70) begin. Hover or tap a pillar to read every score; the table above has them all.

import { useState, type PointerEvent } from 'react';
import { PillarIcon } from '@/components/ui/Marks';
import { ordinal } from '@/domain/format';
import { bandStarts } from '@/domain/scores';
import { PILLAR_LABELS } from '@/domain/types';
import { dotLanes } from '@/graphics/dots';
import type { PillarSpread } from '@/rivals/trend';
import styles from './charts.module.css';
import { useChartWidth } from './useChartWidth';

const PAD = 10;
const R_YOU = 7;
const R_RIVAL = 6;
const LANE = 13;
const MID = 27;

function Strip({ row }: { row: PillarSpread }) {
  const { ref, width } = useChartWidth<HTMLDivElement>(360);
  const x = (score: number) => PAD + (Math.max(0, Math.min(100, score)) / 100) * (width - PAD * 2);
  const at = row.entries.map((entry) => ({ ...entry, x: x(entry.score) }));
  const lanes = dotLanes(at, { you: R_YOU, rival: R_RIVAL, gap: 2 });
  const dots = at.map((entry, index) => ({ ...entry, lane: lanes[index] ?? 0 }));
  const height = MID + Math.max(0, ...lanes) * LANE + R_RIVAL + 6;
  const you = dots.find((dot) => dot.you);
  return (
    <div ref={ref} className={styles.dotsPlot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
        <line x1={x(0)} x2={x(100)} y1={MID} y2={MID} className={styles.dotsTrack} />
        {bandStarts().map((start) => (
          <line key={start} x1={x(start)} x2={x(start)} y1={MID - 7} y2={MID + 7} className={styles.dotsBand} />
        ))}
        {dots
          .filter((dot) => !dot.you)
          .map((dot) => (
            <circle key={dot.id} cx={dot.x} cy={MID + dot.lane * LANE} r={R_RIVAL} className={styles.rivalDot} />
          ))}
        {you ? (
          <>
            <circle cx={you.x} cy={MID} r={R_YOU} className={styles.youDot} />
            <text x={you.x} y={MID - R_YOU - 6} textAnchor="middle" className={`${styles.dotValue} num`}>
              {Math.round(you.score)}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}

function Scale() {
  const { ref, width } = useChartWidth<HTMLDivElement>(360);
  const x = (score: number) => PAD + (score / 100) * (width - PAD * 2);
  return (
    <div ref={ref} className={styles.dotsScale} aria-hidden="true">
      <svg width={width} height={16} viewBox={`0 0 ${width} 16`} focusable="false">
        {[0, ...bandStarts(), 100].map((tick) => (
          <text key={tick} x={x(tick)} y={12} textAnchor="middle" className={`${styles.axisText} num`}>
            {tick}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function PillarDots({ rows, youName = 'You' }: { rows: readonly PillarSpread[]; youName?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const hover = (pillar: string | null) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setActive(pillar);
  };
  const tap = (pillar: string) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') setActive((current) => (current === pillar ? null : pillar));
  };

  return (
    <div className={styles.dots}>
      <ul className={styles.key} aria-hidden="true">
        <li className={styles.keyItem}>
          <span className={styles.keyYou} />
          {youName}
        </li>
        <li className={styles.keyItem}>
          <span className={styles.keyRival} />
          Your rivals
        </li>
      </ul>
      {rows.map((row) => {
        const mine = row.entries.find((entry) => entry.you);
        return (
          <div
            key={row.pillar}
            className={styles.dotsRow}
            data-active={active === row.pillar ? 'true' : undefined}
            onPointerEnter={hover(row.pillar)}
            onPointerLeave={hover(null)}
            onPointerUp={tap(row.pillar)}
          >
            <span className={styles.dotsLabel}>
              <PillarIcon pillar={row.pillar} />
              {PILLAR_LABELS[row.pillar]}
            </span>
            <Strip row={row} />
            <span className={styles.dotsRank}>
              {row.rank ? (
                <>
                  <span className="num">{ordinal(row.rank)}</span> of {row.of}
                </>
              ) : null}
              {mine ? <span className="visually-hidden">, with {Math.round(mine.score)}</span> : null}
            </span>
            {active === row.pillar ? (
              <div className={`${styles.tooltip} ${styles.dotsTooltip}`} aria-hidden="true">
                <span className={styles.tooltipLabel}>{PILLAR_LABELS[row.pillar]}</span>
                {row.entries.map((entry) => (
                  <span key={entry.id} className={entry.you ? `${styles.tooltipRow} ${styles.tooltipYou}` : styles.tooltipRow}>
                    <span className={`${styles.tooltipValue} num`}>{Math.round(entry.score)}</span> {entry.you ? youName : entry.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className={styles.dotsScaleRow}>
        <Scale />
      </div>
    </div>
  );
}

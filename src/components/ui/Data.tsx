import { formatDate, hostAndPath } from '@/domain/format';
import { PILLAR_LABELS, PILLARS, type Pillar } from '@/domain/types';
import type { ReactNode } from 'react';
import styles from './Data.module.css';
import { Icon } from './Icon';
import { Delta, ScoreLabel } from './Results';

/** The one big number a view leads with. Exactly one per view. */
export function ScoreHero({ score, change, caption = 'Overall score' }: { score: number; change?: number | null; caption?: string }) {
  return (
    <div className={styles.hero}>
      <p className={styles.heroCaption}>{caption}</p>
      <p className={styles.heroValue}>
        <span className={styles.heroNumber}>{Math.round(score)}</span>
        <span className={styles.heroOutOf}>/ 100</span>
      </p>
      <div className={styles.heroMeta}>
        <ScoreLabel score={score} />
        {change !== undefined ? <Delta change={change} /> : null}
      </div>
    </div>
  );
}

export interface PillarScore {
  pillar: Pillar;
  score: number;
  change?: number | null;
}

/** Discovered, Trusted and Chosen, each with its score out of 100. */
export function PillarScores({ scores }: { scores: readonly PillarScore[] }) {
  const byPillar = new Map(scores.map((entry) => [entry.pillar, entry]));
  return (
    <ul className={styles.pillars}>
      {PILLARS.map((pillar) => {
        const entry = byPillar.get(pillar);
        if (!entry) return null;
        const value = Math.max(0, Math.min(100, Math.round(entry.score)));
        return (
          <li key={pillar} className={styles.pillar}>
            <div className={styles.pillarTop}>
              <span className={styles.pillarName}>{PILLAR_LABELS[pillar]}</span>
              <span className={styles.pillarScore}>{value}</span>
            </div>
            <span className={styles.pillarTrack} aria-hidden="true">
              <span className={styles.pillarFill} style={{ width: `${value}%` }} />
            </span>
            {entry.change !== undefined ? <Delta change={entry.change} size="sm" /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sub ? <p className={styles.statSub}>{sub}</p> : null}
    </div>
  );
}

/** Where a finding came from and when it was checked. Every result shows this (spec rule 2). */
export function SourceLine({ url, checkedAt, label = 'Source' }: { url: string; checkedAt: Date | string; label?: string }) {
  return (
    <p className={styles.source}>
      <span className={styles.sourceLabel}>{label}</span>
      <a href={url} target="_blank" rel="noreferrer" className={styles.sourceLink}>
        {hostAndPath(url)}
        <Icon name="external" size={14} />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      <span className={styles.sourceDate}>Checked {formatDate(checkedAt)}</span>
    </p>
  );
}

export function Tag({ children, variant = 'outline' }: { children: ReactNode; variant?: 'outline' | 'solid' | 'quiet' }) {
  return <span className={[styles.tag, styles[`tag-${variant}`]].join(' ')}>{children}</span>;
}

// How results and scores are shown without colour (spec section 14). A check's result is a thin
// bar of the points it earns against the points it could, then the word, always beside it. A
// part's checks at a glance are named rows or a split bar with its counts (./CheckSummary.tsx).

import type { CSSProperties } from 'react';
import { resultShare, scoreLabel, type ScoreLabel as ScoreLabelName } from '@/domain/scores';
import { DIFFICULTY_LABELS, RESULT_LABELS, type CheckResult, type Difficulty as DifficultyValue } from '@/domain/types';
import { Icon } from './Icon';
import styles from './Results.module.css';

interface ResultBarProps {
  /** "varies" when a check's programs disagree: the bar shows their average points. */
  result: CheckResult | 'varies';
  /** Points earned and possible: the bar's length, and "18/30" after it unless `showPoints` is off. */
  points?: number;
  max?: number;
  /** Points earned out of possible, 0 to 1, when only the share is known (a rival's check). */
  share?: number;
  showPoints?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A check's result in a row or a list: the bar of points earned against possible, the numbers
 * when there is room, then the word. Missing is an empty dashed bar. The bar is always in the
 * text colour: its length says the points, the word says the result.
 */
export function ResultBar({ result, points, max, share, showPoints = true, size = 'md' }: ResultBarProps) {
  const filled = max ? Math.max(0, Math.min(1, (points ?? 0) / max)) : (share ?? (result === 'varies' ? 0 : resultShare(result)));
  const word = result === 'varies' ? 'Varies by program' : RESULT_LABELS[result];
  const rounded = Math.round(points ?? 0);
  return (
    <span className={[styles.bar, styles[size]].join(' ')} data-result={result} title={max ? `${word}, ${rounded} of ${max} points` : word}>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ '--share': filled } as CSSProperties} data-fill />
      </span>
      {showPoints && max ? (
        <span className={styles.barPoints}>
          <span className="num">
            {rounded}/{max}
          </span>
          <span className="visually-hidden"> points,</span>
        </span>
      ) : null}
      <span className={styles.barWord}>{word}</span>
    </span>
  );
}

/** Strong, Needs work or Getting started, from the score bands in the scoring config. */
export function ScoreLabel({ score, label }: { score?: number; label?: ScoreLabelName }) {
  const value = label ?? scoreLabel(score ?? 0);
  return (
    <span className={[styles.scoreLabel, value === 'Strong' ? styles.scoreLabelStrong : ''].filter(Boolean).join(' ')} data-label={value}>
      {value}
    </span>
  );
}

/**
 * Change since the last Audit, next to a score: an arrow, the number in Inter and what it is
 * compared with ("↑ 5 since last Audit"). A drop is shown plainly, never as a failure.
 */
export function Delta({ change, since = 'last Audit', size = 'md' }: { change: number | null; since?: string; size?: 'sm' | 'md' }) {
  const rounded = change === null ? null : Math.round(change);
  const icon = rounded === null ? 'spark' : rounded > 0 ? 'arrowUp' : rounded < 0 ? 'arrowDown' : 'equal';
  return (
    <span className={[styles.delta, styles[`delta-${size}`]].join(' ')}>
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
      {rounded === null ? (
        'First Audit'
      ) : rounded === 0 ? (
        `Same as ${since}`
      ) : (
        <span>
          <span className="visually-hidden">{rounded > 0 ? 'Up ' : 'Down '}</span>
          <span className="num">{Math.abs(rounded)}</span> since {since}
        </span>
      )}
    </span>
  );
}

/**
 * A change on its own, as a value: "↑ 8", "↓ 2" (the number in Inter), "No change", or nothing
 * when there is nothing to compare with. `unit` adds a percent sign for Demand.
 */
export function Change({ value, unit = '' }: { value: number | null; unit?: '' | '%' }) {
  if (value === null) return null;
  const rounded = Math.round(value);
  if (rounded === 0) return <span className={styles.change}>No change</span>;
  return (
    <span className={styles.change}>
      <Icon name={rounded > 0 ? 'arrowUp' : 'arrowDown'} size={12} />
      <span className="visually-hidden">{rounded > 0 ? 'Up ' : 'Down '}</span>
      <span className="num">
        {Math.abs(rounded)}
        {unit}
      </span>
    </span>
  );
}

/**
 * Points as a value, the number in Inter. `gain`: what a fix could add ("+4 points").
 * `earned`: what a strength earns ("10 points"). `fraction`: a check's points ("21/30", with
 * "points" after it when `unit` is set). Whole numbers on screen; the exact value stays in the data.
 */
export function PointsValue({ kind, points, max, unit = false }: { kind: 'gain' | 'earned' | 'fraction'; points: number; max?: number; unit?: boolean }) {
  const rounded = Math.round(points);
  if (kind === 'fraction') {
    return (
      <span>
        <span className="num">
          {rounded}/{max}
        </span>
        {unit ? ' points' : <span className="visually-hidden"> points</span>}
      </span>
    );
  }
  if (points < 0.5) {
    return (
      <span>
        Under <span className="num">1</span> point
      </span>
    );
  }
  return (
    <span>
      <span className="num">{kind === 'gain' ? `+${rounded}` : rounded}</span> {rounded === 1 ? 'point' : 'points'}
    </span>
  );
}

/** A count with its unit, like "7 pages" or "120 KB": the number in Inter, the unit in words. */
export function Counted({ text }: { text: string }) {
  const match = /^([\d.,]+)(\s.*)?$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      <span className="num">{match[1]}</span>
      {match[2]}
    </>
  );
}

/** A table cell's words, or a bare number in Inter ("1" in the plan comparison). */
export function CellText({ text }: { text: string }) {
  return /^[\d.,]+$/.test(text) ? <span className="num">{text}</span> : <>{text}</>;
}

/** How hard a fix is. */
export function Difficulty({ value }: { value: DifficultyValue }) {
  return (
    <span className={styles.difficulty}>
      <span className={styles.difficultyLabel}>To fix</span>
      {DIFFICULTY_LABELS[value]}
    </span>
  );
}

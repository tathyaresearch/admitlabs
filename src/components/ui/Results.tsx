// How results and scores are shown without colour (spec section 14):
// a 3-segment meter plus the word, Strong in an inverted block, labels always in words.

import { scoreLabel, type ScoreLabel as ScoreLabelName } from '@/domain/scores';
import { DIFFICULTY_LABELS, RESULT_LABELS, type CheckResult, type Difficulty as DifficultyValue } from '@/domain/types';
import { Icon } from './Icon';
import styles from './Results.module.css';

const FILLED: Readonly<Record<CheckResult, number>> = { strong: 3, okay: 2, weak: 1, missing: 0 };

interface ResultMeterProps {
  result: CheckResult;
  size?: 'sm' | 'md' | 'lg';
  /** Put Strong results in an inverted block. On by default. */
  invertStrong?: boolean;
  /** Hide the word only when the word is already shown right next to it. */
  hideWord?: boolean;
}

export function ResultMeter({ result, size = 'md', invertStrong = true, hideWord = false }: ResultMeterProps) {
  const filled = FILLED[result];
  const inverted = invertStrong && result === 'strong';
  return (
    <span className={[styles.result, styles[size], inverted ? styles.invertedResult : ''].filter(Boolean).join(' ')} data-result={result}>
      <span className={styles.meter} aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span key={index} className={styles.segment} data-state={result === 'missing' ? 'missing' : index < filled ? 'on' : 'off'} />
        ))}
      </span>
      <span className={hideWord ? 'visually-hidden' : styles.word}>{RESULT_LABELS[result]}</span>
    </span>
  );
}

/** Strong, Needs work or At risk, from the score bands in the scoring config. */
export function ScoreLabel({ score, label }: { score?: number; label?: ScoreLabelName }) {
  const value = label ?? scoreLabel(score ?? 0);
  return (
    <span className={[styles.scoreLabel, value === 'Strong' ? styles.scoreLabelStrong : ''].filter(Boolean).join(' ')} data-label={value}>
      {value}
    </span>
  );
}

/** Change since the last Audit, in words. A drop is shown plainly, never as a failure. */
export function Delta({ change, since = 'last Audit', size = 'md' }: { change: number | null; since?: string; size?: 'sm' | 'md' }) {
  const rounded = change === null ? null : Math.round(change);
  const text =
    rounded === null ? 'First Audit' : rounded > 0 ? `Up ${rounded} since ${since}` : rounded < 0 ? `Down ${Math.abs(rounded)} since ${since}` : `Same as ${since}`;
  const icon = rounded === null ? 'spark' : rounded > 0 ? 'arrowUp' : rounded < 0 ? 'arrowDown' : 'equal';
  return (
    <span className={[styles.delta, styles[`delta-${size}`]].join(' ')}>
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
      {text}
    </span>
  );
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

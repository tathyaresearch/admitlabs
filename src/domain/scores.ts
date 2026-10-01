// Score labels (spec 7.4): 70 to 100 Strong, 40 to 69 Needs work, 0 to 39 At risk.
// The bands come from the scoring config, never from code.

import { SCORING_V1 } from '../config/scoring.v1.ts';
import type { ScoreLabelBand, ScoringConfig } from './scoring-config.ts';

export type ScoreLabel = ScoreLabelBand['label'];

export function scoreLabel(score: number, config: Pick<ScoringConfig, 'labels'> = SCORING_V1): ScoreLabel {
  const rounded = Math.round(score);
  const band = config.labels.find((candidate) => rounded >= candidate.min && rounded <= candidate.max);
  if (!band) throw new Error(`No label covers a score of ${score}`);
  return band.label;
}

/** Where each score band starts above 0 (40 and 70), for the notches on the score gauge. */
export function bandStarts(config: Pick<ScoringConfig, 'labels'> = SCORING_V1): number[] {
  return config.labels.map((band) => band.min).filter((min) => min > 0).sort((a, b) => a - b);
}

/**
 * The line under the score: how far the next band is ("24 points to Strong"), or, in the top
 * band, how far above its line the score sits ("3 points above the Strong line").
 */
export function nextBandText(score: number, config: Pick<ScoringConfig, 'labels'> = SCORING_V1): string {
  const rounded = Math.round(score);
  const points = (count: number) => `${count} ${count === 1 ? 'point' : 'points'}`;
  const above = [...config.labels].sort((a, b) => a.min - b.min).find((band) => band.min > rounded);
  if (above) return `${points(above.min - rounded)} to ${above.label}`;
  const top = [...config.labels].sort((a, b) => b.min - a.min)[0];
  if (!top) return '';
  return rounded === top.min ? `Right on the ${top.label} line` : `${points(rounded - top.min)} above the ${top.label} line`;
}

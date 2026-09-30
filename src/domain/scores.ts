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

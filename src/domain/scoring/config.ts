// Reads a scoring config version from storage and checks it before the engine uses it.
// A config that does not add up (a pillar not totalling 100, a gap in the labels) is
// refused, so a bad edit can never produce a wrong score.

import { SCORING_V1 } from '../../config/scoring.v1.ts';
import { CHECKS } from '../checks.ts';
import type { ScoreLabelBand, ScoringConfig } from '../scoring-config.ts';
import { PILLARS, RESULTS } from '../types.ts';

const FAMILIES = ['college_university', 'skilling'] as const;
const LABEL_NAMES: readonly ScoreLabelBand['label'][] = ['Strong', 'Needs work', 'At risk'];

export interface StoredScoringConfig {
  version: number;
  weights: unknown;
  result_shares: unknown;
  thresholds: unknown;
  labels: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when `candidate` has the same keys and value types as `reference`, all the way down. */
function sameShape(reference: unknown, candidate: unknown, path: string, problems: string[]): void {
  if (isRecord(reference)) {
    if (!isRecord(candidate)) {
      problems.push(`${path} should be an object`);
      return;
    }
    for (const key of Object.keys(reference)) sameShape(reference[key], candidate[key], `${path}.${key}`, problems);
    for (const key of Object.keys(candidate)) if (!(key in reference)) problems.push(`${path}.${key} is not a known setting`);
    return;
  }
  if (typeof reference === 'number') {
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0) problems.push(`${path} should be a number of 0 or more`);
    return;
  }
  if (typeof candidate !== typeof reference) problems.push(`${path} should be a ${typeof reference}`);
}

export function validateScoringConfig(config: ScoringConfig): string[] {
  const problems: string[] = [];

  for (const family of FAMILIES) {
    for (const pillar of PILLARS) {
      const weights = config.weights[family]?.[pillar];
      if (!isRecord(weights)) {
        problems.push(`weights.${family}.${pillar} is missing`);
        continue;
      }
      const expected = CHECKS.filter((check) => check.pillar === pillar).map((check) => check.key);
      for (const key of expected) {
        const weight = weights[key];
        if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 0) problems.push(`weights.${family}.${pillar}.${key} should be a whole number`);
      }
      for (const key of Object.keys(weights)) if (!expected.includes(key as never)) problems.push(`weights.${family}.${pillar}.${key} is not a ${pillar} check`);
      const total = expected.reduce((sum, key) => sum + (typeof weights[key] === 'number' ? (weights[key] as number) : 0), 0);
      if (total !== 100) problems.push(`weights.${family}.${pillar} adds up to ${total}, not 100`);
    }
  }

  let previousShare = Number.POSITIVE_INFINITY;
  for (const result of RESULTS) {
    const share = config.resultShares?.[result];
    if (typeof share !== 'number' || share < 0 || share > 1) {
      problems.push(`resultShares.${result} should be between 0 and 1`);
      continue;
    }
    if (Math.abs(Math.round(share * 100) - share * 100) > 1e-9) problems.push(`resultShares.${result} should be a whole percentage`);
    if (share > previousShare) problems.push(`resultShares.${result} is bigger than the result above it`);
    previousShare = share;
  }

  const bands = Array.isArray(config.labels) ? [...config.labels].sort((a, b) => a.min - b.min) : [];
  if (bands.length === 0) problems.push('labels are missing');
  else {
    if (bands[0]?.min !== 0) problems.push('labels should start at 0');
    if (bands.at(-1)?.max !== 100) problems.push('labels should end at 100');
    for (let index = 1; index < bands.length; index += 1) {
      if (bands[index]?.min !== (bands[index - 1]?.max ?? 0) + 1) problems.push('labels should have no gaps or overlaps');
    }
    for (const band of bands) if (!LABEL_NAMES.includes(band.label)) problems.push(`"${band.label}" is not a known label`);
  }

  if (config.thresholds?.mode !== 'fixed' && config.thresholds?.mode !== 'peer') problems.push('thresholds.mode should be fixed or peer');
  sameShape(SCORING_V1.thresholds, config.thresholds, 'thresholds', problems);

  return problems;
}

/** A stored config row as a ScoringConfig, or an error that says what is wrong with it. */
export function parseScoringConfig(row: StoredScoringConfig): ScoringConfig {
  const config = {
    version: row.version,
    weights: row.weights,
    resultShares: row.result_shares,
    thresholds: row.thresholds,
    labels: row.labels,
  } as ScoringConfig;
  const problems = validateScoringConfig(config);
  if (problems.length) throw new Error(`Scoring config version ${row.version} cannot be used: ${problems.join('; ')}.`);
  return config;
}

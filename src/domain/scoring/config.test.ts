import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../../config/scoring.v1.ts';
import type { ScoringConfig } from '../scoring-config.ts';
import { parseScoringConfig, validateScoringConfig } from './config.ts';

// A stored config is checked before the engine uses it: a bad edit can never produce a wrong score.

const stored = (config: ScoringConfig) => ({
  version: config.version,
  weights: JSON.parse(JSON.stringify(config.weights)) as unknown,
  result_shares: JSON.parse(JSON.stringify(config.resultShares)) as unknown,
  thresholds: JSON.parse(JSON.stringify(config.thresholds)) as unknown,
  labels: JSON.parse(JSON.stringify(config.labels)) as unknown,
});

const edit = (change: (copy: ScoringConfig) => void): ScoringConfig => {
  const copy = JSON.parse(JSON.stringify(SCORING_V1)) as ScoringConfig;
  change(copy);
  return copy;
};

describe('scoring config checks', () => {
  test('version 1 is valid, and survives a round trip through storage', () => {
    assert.deepEqual(validateScoringConfig(SCORING_V1), []);
    assert.deepEqual(parseScoringConfig(stored(SCORING_V1)), SCORING_V1);
  });

  test('a pillar that does not add up to 100 is refused', () => {
    const problems = validateScoringConfig(
      edit((copy) => {
        (copy.weights.skilling.discovered as Record<string, number>).youtube = 10;
      }),
    );
    assert.ok(problems.some((problem) => problem.includes('weights.skilling.discovered adds up to 105')), problems.join('; '));
  });

  test('weights must be whole numbers on the right checks', () => {
    const fractional = validateScoringConfig(
      edit((copy) => {
        (copy.weights.college_university.chosen as Record<string, number>).fees_shown = 24.5;
        (copy.weights.college_university.chosen as Record<string, number>).program_page = 20.5;
      }),
    );
    assert.ok(fractional.some((problem) => problem.includes('fees_shown should be a whole number')));
    const misplaced = validateScoringConfig(
      edit((copy) => {
        (copy.weights.college_university.chosen as Record<string, number>).youtube = 0;
      }),
    );
    assert.ok(misplaced.some((problem) => problem.includes('youtube is not a chosen check')));
  });

  test('shares must be whole percentages between 0 and 1, in order', () => {
    assert.ok(validateScoringConfig(edit((copy) => void ((copy.resultShares as Record<string, number>).okay = 1.2))).length > 0);
    assert.ok(validateScoringConfig(edit((copy) => void ((copy.resultShares as Record<string, number>).weak = 0.333))).some((p) => p.includes('whole percentage')));
    assert.ok(validateScoringConfig(edit((copy) => void ((copy.resultShares as Record<string, number>).weak = 0.7))).some((p) => p.includes('bigger than')));
  });

  test('labels must cover 0 to 100 with no gaps', () => {
    const gap = validateScoringConfig(
      edit((copy) => {
        const labels = copy.labels as unknown as Array<{ label: string; min: number; max: number }>;
        labels[1] = { label: 'Needs work', min: 41, max: 69 };
      }),
    );
    assert.ok(gap.some((problem) => problem.includes('no gaps')));
  });

  test('thresholds must keep every setting, with numbers where numbers belong', () => {
    const missing = validateScoringConfig(edit((copy) => void delete (copy.thresholds.page_speed as Partial<{ strongMinScore: number }>).strongMinScore));
    assert.ok(missing.some((problem) => problem.includes('thresholds.page_speed.strongMinScore')));
    const wrongType = validateScoringConfig(edit((copy) => void ((copy.thresholds.google_search as Record<string, unknown>).strongMaxPosition = 'three')));
    assert.ok(wrongType.some((problem) => problem.includes('strongMaxPosition should be a number')));
    const unknown = validateScoringConfig(edit((copy) => void ((copy.thresholds.fees_shown as Record<string, unknown>).extra = 1)));
    assert.ok(unknown.some((problem) => problem.includes('not a known setting')));
    const mode = validateScoringConfig(edit((copy) => void ((copy.thresholds as { mode: string }).mode = 'guess')));
    assert.ok(mode.some((problem) => problem.includes('mode')));
  });

  test('parse says which version is broken and why', () => {
    const broken = stored(edit((copy) => void ((copy.resultShares as Record<string, number>).strong = 2)));
    assert.throws(() => parseScoringConfig({ ...broken, version: 7 }), /Scoring config version 7 cannot be used: resultShares.strong/);
  });
});

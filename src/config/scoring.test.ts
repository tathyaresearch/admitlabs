import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getCheck } from '../domain/checks.ts';
import { CHECK_KEYS, PILLARS, RESULTS } from '../domain/types.ts';
import { SCORING_V1 } from './scoring.v1.ts';

// Integrity of scoring config v1 (spec 7.4 and 7.5). The engine itself arrives in Phase 2
// with its own full test suite.

const FAMILIES = ['college_university', 'skilling'] as const;

describe('scoring config v1', () => {
  test('every pillar adds up to 100 for both weight families', () => {
    for (const family of FAMILIES) {
      for (const pillar of PILLARS) {
        const total = Object.values(SCORING_V1.weights[family][pillar]).reduce((sum, points) => sum + (points ?? 0), 0);
        assert.equal(total, 100, `${family} ${pillar}`);
      }
    }
  });

  test('every check has a weight exactly once, in its own pillar', () => {
    for (const family of FAMILIES) {
      for (const key of CHECK_KEYS) {
        const pillars = PILLARS.filter((pillar) => SCORING_V1.weights[family][pillar][key] !== undefined);
        assert.deepEqual(pillars, [getCheck(key).pillar], `${family} ${key}`);
      }
    }
  });

  test('weights match the spec tables', () => {
    assert.deepEqual(SCORING_V1.weights.college_university.discovered, {
      google_search: 30,
      instagram_activity: 25,
      google_profile: 20,
      youtube: 10,
      ai_answers: 10,
      other_socials: 5,
    });
    assert.deepEqual(SCORING_V1.weights.skilling.discovered, {
      google_search: 30,
      instagram_activity: 25,
      google_profile: 30,
      youtube: 5,
      ai_answers: 5,
      other_socials: 5,
    });
    assert.deepEqual(SCORING_V1.weights.college_university.trusted, {
      placement_proof: 30,
      review_rating: 25,
      approvals: 20,
      faculty_leaders: 15,
      students_in_content: 10,
    });
    assert.deepEqual(SCORING_V1.weights.skilling.trusted, {
      placement_proof: 30,
      review_rating: 30,
      approvals: 20,
      faculty_leaders: 10,
      students_in_content: 10,
    });
    assert.deepEqual(SCORING_V1.weights.skilling.chosen, SCORING_V1.weights.college_university.chosen);
    assert.deepEqual(SCORING_V1.weights.skilling.chosen, {
      fees_shown: 25,
      program_page: 20,
      easy_enquiry: 20,
      admission_steps: 15,
      mobile_friendly: 10,
      page_speed: 10,
    });
  });

  test('result shares: Strong 100%, Okay 60%, Weak 30%, Missing 0%', () => {
    assert.deepEqual(SCORING_V1.resultShares, { strong: 1, okay: 0.6, weak: 0.3, missing: 0 });
    const ordered = RESULTS.map((result) => SCORING_V1.resultShares[result]);
    assert.deepEqual([...ordered].sort((a, b) => b - a), ordered);
  });

  test('labels cover 0 to 100 with no gaps or overlaps', () => {
    const bands = [...SCORING_V1.labels].sort((a, b) => a.min - b.min);
    assert.equal(bands[0]?.min, 0);
    assert.equal(bands.at(-1)?.max, 100);
    for (let index = 1; index < bands.length; index += 1) {
      assert.equal(bands[index]?.min, (bands[index - 1]?.max ?? 0) + 1);
    }
    assert.deepEqual(
      SCORING_V1.labels.map((band) => [band.label, band.min, band.max]),
      [
        ['Strong', 70, 100],
        ['Needs work', 40, 69],
        ['Getting started', 0, 39],
      ],
    );
  });

  test('fixed thresholds exist for every check, with the switch to peer comparison left open', () => {
    assert.equal(SCORING_V1.thresholds.mode, 'fixed');
    for (const key of CHECK_KEYS) assert.ok(key in SCORING_V1.thresholds, key);
    assert.deepEqual(SCORING_V1.thresholds.google_profile.college_university, { strongMinReviews: 100, okayMinReviews: 30, weakMinReviews: 1 });
    assert.deepEqual(SCORING_V1.thresholds.google_profile.skilling, { strongMinReviews: 50, okayMinReviews: 15, weakMinReviews: 1 });
    assert.deepEqual(SCORING_V1.thresholds.page_speed, { strongMinScore: 90, okayMinScore: 50 });
  });
});

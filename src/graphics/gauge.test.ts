import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { bandStarts, nextBandText } from '../domain/scores.ts';
import { RESULTS } from '../domain/types.ts';
import { arcPath, resultGauge, scoreGauge, SCORE_GAUGE } from './gauge.ts';

// The two gauges replace the 3-bar meter. Same shapes on screen and in the PDFs.

describe('the result gauge', () => {
  test('three segments: Strong fills three, Okay two, Weak one, Missing is dashed', () => {
    const states = Object.fromEntries(RESULTS.map((result) => [result, resultGauge(result).map((segment) => segment.state)]));
    assert.deepEqual(states, {
      strong: ['on', 'on', 'on'],
      okay: ['on', 'on', 'off'],
      weak: ['on', 'off', 'off'],
      missing: ['missing', 'missing', 'missing'],
    });
  });

  test('the segments run left to right over the top, with gaps between them', () => {
    const [first, second, third] = resultGauge('strong').map((segment) => segment.d);
    assert.equal(first, arcPath(14, 14.5, 11, 180, 232));
    assert.equal(second, arcPath(14, 14.5, 11, 244, 296));
    assert.equal(third, arcPath(14, 14.5, 11, 308, 360));
    assert.match(first as string, /^M 3 14\.5 A 11 11 0 0 1 /);
  });
});

describe('the score gauge', () => {
  test('filled to the score out of 100, with a notch where each band starts', () => {
    const shape = scoreGauge(73, bandStarts());
    assert.deepEqual(bandStarts(), [40, 70]);
    assert.equal(shape.notches.length, 2);
    assert.equal(shape.track, arcPath(SCORE_GAUGE.cx, SCORE_GAUGE.cy, SCORE_GAUGE.r, 180, 360));
    assert.equal(shape.value, arcPath(SCORE_GAUGE.cx, SCORE_GAUGE.cy, SCORE_GAUGE.r, 180, 180 + 0.73 * 180));
    // A full score sweeps the half circle; nothing is drawn for 0; scores never run past 100.
    assert.equal(scoreGauge(0, bandStarts()).value, null);
    assert.equal(scoreGauge(140, bandStarts()).value, scoreGauge(100, bandStarts()).value);
  });

  test('the line under the score: how far the next band is', () => {
    assert.equal(nextBandText(46), '24 points to Strong');
    assert.equal(nextBandText(27), '13 points to Needs work');
    assert.equal(nextBandText(39), '1 point to Needs work');
    assert.equal(nextBandText(69.6), 'Right on the Strong line');
    assert.equal(nextBandText(73), '3 points above the Strong line');
    assert.equal(nextBandText(71), '1 point above the Strong line');
    for (let score = 0; score <= 100; score += 1) assert.equal(hasDashes(nextBandText(score)), false);
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { bandStarts, nextBandText } from '../domain/scores.ts';
import { arcPath, FIGURE_EM, scoreGauge, SCORE_GAUGE, SCORE_TEXT } from './gauge.ts';

// The large score gauge. Same shape on screen and in the PDFs, with its number part of the drawing.

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

  test('the number sits centred on the arc’s baseline, with “/100” after it on the same line', () => {
    const { number } = scoreGauge(73, bandStarts());
    assert.equal(number.x, SCORE_GAUGE.cx);
    assert.equal(number.y, SCORE_GAUGE.cy);
    assert.equal(number.size, SCORE_TEXT.number);
    assert.equal(number.ofX, Number((SCORE_GAUGE.cx + FIGURE_EM * SCORE_TEXT.number + SCORE_TEXT.gap).toFixed(2)));
    assert.equal(scoreGauge(100, bandStarts()).number.size, SCORE_TEXT.numberThree);
  });

  test('the number and “/100” never touch the arc, from one figure to three, on screen and in print', () => {
    const inner = SCORE_GAUGE.r - SCORE_GAUGE.stroke / 2;
    const ofWidth = (0.338 + 3 * FIGURE_EM) * SCORE_TEXT.of;
    for (const score of [0, 7, 73, 99, 100]) {
      for (const tracking of [0, -0.04]) {
        const { number } = scoreGauge(score, bandStarts(), tracking);
        const right = number.ofX + ofWidth - SCORE_GAUGE.cx;
        assert.ok(right <= inner - 7, `score ${score}: "/100" ends ${right.toFixed(1)} from the centre, the arc at ${inner}`);
        const half = (String(score).length * (FIGURE_EM + tracking) * number.size) / 2;
        assert.ok(Math.hypot(half, 0.727 * number.size) <= inner - 7, `score ${score}: the number reaches the arc`);
      }
    }
  });

  test('“0” and “100” sit centred under the two ends, inside the drawing', () => {
    const { ends } = scoreGauge(73, bandStarts());
    assert.deepEqual(ends.zero, [SCORE_GAUGE.cx - SCORE_GAUGE.r, SCORE_GAUGE.cy + SCORE_TEXT.endDrop]);
    assert.deepEqual(ends.hundred, [SCORE_GAUGE.cx + SCORE_GAUGE.r, SCORE_GAUGE.cy + SCORE_TEXT.endDrop]);
    assert.ok(ends.zero[1] + 3 <= SCORE_GAUGE.height);
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

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { rangeTicks, scoreRange } from './range.ts';

describe('a score chart fitted to its values', () => {
  test('in tens, with room above and below', () => {
    assert.deepEqual(scoreRange([59, 61, 69, 72, 73, 73]), [50, 90]);
    assert.deepEqual(scoreRange([29, 38, 56, 62, 63, 63]), [20, 80]);
  });

  test('never past 0 or 100', () => {
    assert.deepEqual(scoreRange([2, 5]), [0, 20]);
    assert.deepEqual(scoreRange([95, 99]), [80, 100]);
  });

  test('a flat line still gets a range of at least 20', () => {
    assert.deepEqual(scoreRange([73]), [60, 90]);
    const [low, high] = scoreRange([50, 50]);
    assert.ok(high - low >= 20);
  });

  test('no values: the whole scale', () => {
    assert.deepEqual(scoreRange([]), [0, 100]);
  });

  test('ticks: the ends, and each band start that falls inside', () => {
    assert.deepEqual(rangeTicks([50, 90], [40, 70]), [50, 70, 90]);
    assert.deepEqual(rangeTicks([20, 80], [40, 70]), [20, 40, 70, 80]);
    assert.deepEqual(rangeTicks([0, 100], [40, 70]), [0, 40, 70, 100]);
  });
});

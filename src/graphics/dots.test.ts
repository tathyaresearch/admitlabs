import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dotLanes } from './dots.ts';

const sizes = { you: 7, rival: 6, gap: 2 };

describe('dots on one line', () => {
  test('dots far apart all stay on the line', () => {
    assert.deepEqual(
      dotLanes(
        [
          { x: 10, you: false },
          { x: 100, you: true },
          { x: 200, you: false },
        ],
        sizes,
      ),
      [0, 0, 0],
    );
  });

  test('you keep the line; a rival on top of you steps down', () => {
    assert.deepEqual(
      dotLanes(
        [
          { x: 104, you: false },
          { x: 100, you: true },
        ],
        sizes,
      ),
      [1, 0],
    );
  });

  test('three rivals on one spot take three lanes', () => {
    assert.deepEqual(
      dotLanes(
        [
          { x: 50, you: false },
          { x: 52, you: false },
          { x: 54, you: false },
        ],
        sizes,
      ),
      [0, 1, 2],
    );
  });

  test('just far enough apart is not a clash', () => {
    // Two rivals 14 apart: radius 6 each plus a gap of 2.
    assert.deepEqual(
      dotLanes(
        [
          { x: 50, you: false },
          { x: 64, you: false },
        ],
        sizes,
      ),
      [0, 0],
    );
  });
});

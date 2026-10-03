import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { partGap, pillarSpread, placeIn, scoreTrend, type PillarSpread, type ScoreLine } from './trend.ts';

const set = (overall: number, discovered: number, trusted: number, chosen: number) => ({ overall, discovered, trusted, chosen });

describe('each pillar with everyone on it', () => {
  const spread = pillarSpread({ id: 'you', name: 'Eastgate University', scores: set(73, 80, 66, 70) }, [
    { id: 'a', name: 'Highfield University', scores: set(70, 84, 66, 58) },
    { id: 'b', name: 'Silverline College', scores: set(51, 40, 70, 45) },
    { id: 'c', name: 'Northbank College', scores: null },
  ]);

  test('one row per pillar, in pillar order, highest first', () => {
    assert.deepEqual(
      spread.map((row) => row.pillar),
      ['discovered', 'trusted', 'chosen'],
    );
    assert.deepEqual(
      spread[0]?.entries.map((entry) => entry.score),
      [84, 80, 40],
    );
  });

  test('your place counts only those strictly higher, so a tie shares it', () => {
    assert.equal(spread[0]?.rank, 2);
    // Trusted: Silverline 70, then you and Highfield on 66.
    assert.equal(spread[1]?.rank, 2);
    assert.equal(spread[1]?.entries[1]?.you, true, 'on a tie you are listed first');
    assert.equal(spread[2]?.rank, 1);
  });

  test('a rival with no score yet is left off, and the count says so', () => {
    for (const row of spread) {
      assert.equal(row.of, 3);
      assert.ok(row.entries.every((entry) => entry.id !== 'c'));
    }
  });

  test('without your score there is no place', () => {
    const none = pillarSpread({ id: 'you', name: 'You', scores: null }, [{ id: 'a', name: 'A', scores: set(50, 50, 50, 50) }]);
    assert.ok(none.every((row) => row.rank === null && row.of === 1));
  });

  test('the gap line: to the one just above you, or, leading, to the one just below', () => {
    // Discovered: Highfield 84, you 80, Silverline 40: 4 behind Highfield.
    assert.deepEqual(partGap(spread[0] as PillarSpread), { kind: 'behind', name: 'Highfield University', points: 4 });
    // Trusted: Silverline 70, you and Highfield 66: behind Silverline, not level with Highfield.
    assert.deepEqual(partGap(spread[1] as PillarSpread), { kind: 'behind', name: 'Silverline College', points: 4 });
    // Chosen: you 70, Highfield 58, Silverline 45: you lead Highfield by 12.
    assert.deepEqual(partGap(spread[2] as PillarSpread), { kind: 'lead', name: 'Highfield University', points: 12 });
    // Level at the top.
    const level = pillarSpread({ id: 'you', name: 'You', scores: set(60, 60, 60, 60) }, [{ id: 'a', name: 'Highfield University', scores: set(60, 60, 60, 60) }]);
    assert.deepEqual(partGap(level[0] as PillarSpread), { kind: 'level', name: 'Highfield University' });
    // No rival scored, or no score of yours: no line.
    assert.equal(partGap(pillarSpread({ id: 'you', name: 'You', scores: set(60, 60, 60, 60) }, [])[0] as PillarSpread), null);
    assert.equal(partGap(pillarSpread({ id: 'you', name: 'You', scores: null }, [{ id: 'a', name: 'A', scores: set(50, 50, 50, 50) }])[0] as PillarSpread), null);
  });
});

describe('overall score by month', () => {
  const line = (id: string, you: boolean, points: Array<[string, number]>): ScoreLine => ({
    id,
    name: id,
    you,
    points: points.map(([month, score]) => ({ month, score })),
  });

  test('the last months up to the newest score, with no gaps in the months', () => {
    const trend = scoreTrend(
      [
        line('you', true, [
          ['2026-03', 50],
          ['2026-04', 52],
          ['2026-06', 58],
          ['2026-09', 61],
        ]),
        line('rival', false, [
          ['2026-08', 40],
          ['2026-09', 44],
        ]),
      ],
      6,
    );
    assert.deepEqual(trend.months, ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    assert.deepEqual(
      trend.lines[0]?.points.map((point) => point.month),
      ['2026-04', '2026-06', '2026-09'],
    );
  });

  test('you come first, and a rival with nothing in the window is left out', () => {
    const trend = scoreTrend(
      [
        line('old', false, [['2025-01', 40]]),
        line('rival', false, [['2026-09', 44]]),
        line('you', true, [['2026-09', 61]]),
      ],
      6,
    );
    assert.deepEqual(
      trend.lines.map((entry) => entry.id),
      ['you', 'rival'],
    );
  });

  test('no scores, no chart', () => {
    assert.deepEqual(scoreTrend([line('you', true, [])], 6), { months: [], lines: [] });
  });

  test('your place in a month: only those strictly higher count, of everyone scored that month', () => {
    const trend = scoreTrend(
      [
        line('you', true, [
          ['2026-08', 60],
          ['2026-09', 70],
        ]),
        line('a', false, [
          ['2026-08', 65],
          ['2026-09', 70],
        ]),
        line('b', false, [['2026-09', 40]]),
      ],
      6,
    );
    assert.deepEqual(placeIn(trend, '2026-08'), { place: 2, of: 2 });
    assert.deepEqual(placeIn(trend, '2026-09'), { place: 1, of: 3 });
    assert.equal(placeIn(trend, '2026-07'), null);
  });
});

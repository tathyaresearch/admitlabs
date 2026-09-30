import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DemandKind } from '../domain/types.ts';
import { bigSpikes, rankDemand } from './rank.ts';

const item = (kind: DemandKind, text: string, count: number, changePct: number | null = null) => ({ kind, text, count, changePct });

describe('ranking grouped items within their kind', () => {
  test('biggest rise, biggest fall, most asked, most raised', () => {
    const items = [
      item('rising', 'Slow riser', 300, 12),
      item('rising', 'Fast riser', 100, 47),
      item('falling', 'Small fall', 200, -6),
      item('falling', 'Big fall', 150, -18),
      item('question', 'Rarely asked', 20),
      item('question', 'Often asked', 96),
      item('worry', 'Fees', 140),
      item('worry', 'Hostel', 60),
      item('season', 'Classes have started', 0),
      item('mention', 'Praise', 14),
    ];
    const ranks = rankDemand(items);
    const rank = (text: string) => ranks.get(items.find((entry) => entry.text === text) as (typeof items)[number]);
    assert.equal(rank('Fast riser'), 1);
    assert.equal(rank('Slow riser'), 2);
    assert.equal(rank('Big fall'), 1);
    assert.equal(rank('Often asked'), 1);
    assert.equal(rank('Fees'), 1);
    assert.equal(rank('Hostel'), 2);
    assert.equal(rank('Classes have started'), null);
    assert.equal(rank('Praise'), null);
  });

  test('ties go to the bigger count, then the name', () => {
    const items = [item('rising', 'B', 100, 20), item('rising', 'A', 100, 20), item('rising', 'C', 300, 20)];
    const ranks = rankDemand(items);
    assert.deepEqual(
      items.map((entry) => ranks.get(entry)),
      [3, 2, 1],
    );
  });
});

describe('big spikes (spec section 11)', () => {
  test('a rising course or career up by at least the threshold, biggest first', () => {
    const items = [item('rising', 'Up 39', 100, 39), item('rising', 'Up 47', 100, 47), item('rising', 'Up 40', 100, 40), item('falling', 'Down 60', 100, -60), item('rising', 'No change', 100, null)];
    assert.deepEqual(
      bigSpikes(items, 40).map((entry) => entry.text),
      ['Up 47', 'Up 40'],
    );
  });
});

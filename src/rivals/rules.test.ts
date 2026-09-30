import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { canChangeRivals, rivalChangeState } from './rules.ts';

const NOW = istDate('2026-09-30', 15);

describe('who can change their rivals, and when (spec section 10)', () => {
  test('with no rivals yet, every plan picks its first list', () => {
    for (const tier of ['free', 'paid', 'client'] as const) {
      const state = rivalChangeState(tier, false, null, NOW);
      assert.equal(state.kind, 'first_setup');
      assert.equal(canChangeRivals(state), true);
    }
  });

  test('Free picks once and keeps them', () => {
    const state = rivalChangeState('free', true, null, NOW);
    assert.equal(state.kind, 'locked');
    assert.equal(canChangeRivals(state), false);
  });

  test('Client changes any time', () => {
    const state = rivalChangeState('client', true, istDate('2026-09-29', 10), NOW);
    assert.equal(state.kind, 'anytime');
    assert.equal(canChangeRivals(state), true);
  });

  test('Paid changes once each calendar month', () => {
    assert.equal(rivalChangeState('paid', true, null, NOW).kind, 'available');
    assert.equal(rivalChangeState('paid', true, istDate('2026-08-31', 23), NOW).kind, 'available');
    const used = rivalChangeState('paid', true, istDate('2026-09-12', 11), NOW);
    assert.equal(used.kind, 'used');
    assert.equal(canChangeRivals(used), false);
    if (used.kind === 'used') {
      assert.equal(used.changedOn.toISOString(), istDate('2026-09-12', 11).toISOString());
      assert.equal(used.nextOn.toISOString(), istDate('2026-10-01').toISOString());
    }
  });

  test('the month is counted in India time', () => {
    // 1 Oct, 1:30 am in India is still 30 Sep in UTC. A change then belongs to October.
    const early = new Date('2026-09-30T20:00:00Z');
    assert.equal(rivalChangeState('paid', true, early, istDate('2026-10-01', 9)).kind, 'used');
    assert.equal(rivalChangeState('paid', true, early, istDate('2026-09-30', 23)).kind, 'available');
  });

  test('the first setup is not counted as a change (the caller passes only counted changes)', () => {
    assert.equal(rivalChangeState('paid', true, null, NOW).kind, 'available');
  });
});

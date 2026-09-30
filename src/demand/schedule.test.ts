import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { isPullDue, nextPullOn, pullDayOf, pullMonth } from './schedule.ts';

describe('when Demand is pulled (monthly, on the 28th, India time)', () => {
  test('a pull covers its month from the 28th on, and last month before it', () => {
    assert.equal(pullMonth(istDate('2026-09-30', 12)), '2026-09');
    assert.equal(pullMonth(istDate('2026-10-05', 12)), '2026-09');
    assert.equal(pullMonth(istDate('2026-10-28', 6)), '2026-10');
    assert.equal(pullMonth(istDate('2027-01-10', 9)), '2026-12');
  });

  test('the pull day of a month', () => {
    assert.equal(pullDayOf('2026-10').toISOString(), istDate('2026-10-28', 6).toISOString());
  });

  test('due when the month has no pull, or only a first pull made before the 28th', () => {
    assert.equal(isPullDue(null, '2026-10'), true);
    assert.equal(isPullDue(istDate('2026-10-05', 9), '2026-10'), true);
    assert.equal(isPullDue(istDate('2026-10-28', 6), '2026-10'), false);
    assert.equal(isPullDue(istDate('2026-11-02', 9), '2026-10'), false);
  });

  test('the next pull', () => {
    assert.equal(nextPullOn(istDate('2026-09-30', 12)).toISOString(), istDate('2026-10-28', 6).toISOString());
    assert.equal(nextPullOn(istDate('2026-10-05', 12)).toISOString(), istDate('2026-10-28', 6).toISOString());
    assert.equal(nextPullOn(istDate('2026-12-29', 12)).toISOString(), istDate('2027-01-28', 6).toISOString());
  });
});

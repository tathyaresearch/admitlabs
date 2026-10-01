import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addMonths, daysBetween, istDate, monthKey, monthRange, monthStart, previousMonth, recentGroup } from './dates.ts';

describe('India dates', () => {
  test('istDate builds India wall-clock time', () => {
    assert.equal(istDate('2026-09-30').toISOString(), '2026-09-29T18:30:00.000Z');
    assert.equal(istDate('2026-04-15', 10).toISOString(), '2026-04-15T04:30:00.000Z');
  });

  test('istDate rejects anything that is not YYYY-MM-DD', () => {
    assert.throws(() => istDate('30-09-2026'));
  });

  test('monthKey counts the month in India, not UTC', () => {
    // 30 Sep 2026, 19:00 UTC is already 1 Oct in India.
    assert.equal(monthKey(new Date('2026-09-30T19:00:00Z')), '2026-10');
    assert.equal(monthKey(new Date('2026-09-30T18:00:00Z')), '2026-09');
  });

  test('daysBetween counts India calendar days', () => {
    assert.equal(daysBetween(istDate('2026-09-30', 23), istDate('2026-10-01', 1)), 1);
    assert.equal(daysBetween(istDate('2026-09-30', 1), istDate('2026-09-30', 23)), 0);
    assert.equal(daysBetween(istDate('2026-10-15'), istDate('2026-09-30')), -15);
  });

  test('addMonths keeps the day, or moves to the last day of a shorter month', () => {
    assert.equal(addMonths(istDate('2026-04-15', 10), 6).toISOString(), istDate('2026-10-15', 10).toISOString());
    assert.equal(addMonths(istDate('2026-08-31'), 6).toISOString(), istDate('2027-02-28').toISOString());
    assert.equal(addMonths(istDate('2027-08-31'), 6).toISOString(), istDate('2028-02-29').toISOString());
    assert.equal(addMonths(istDate('2026-11-30'), 3).toISOString(), istDate('2027-02-28').toISOString());
  });

  test('month helpers', () => {
    assert.equal(monthStart('2026-09'), '2026-09-01');
    assert.deepEqual(monthRange('2026-11', '2027-02'), ['2026-11', '2026-12', '2027-01', '2027-02']);
    assert.equal(previousMonth('2027-01'), '2026-12');
    assert.equal(previousMonth('2026-09'), '2026-08');
    assert.throws(() => monthStart('2026-13'));
  });
});

describe('notification groups', () => {
  test('this week from Monday, this month from the 1st, then earlier (India time)', () => {
    // Thursday 1 October 2026: the week began on Monday 28 September, in the month before.
    const thursday = istDate('2026-10-01', 12);
    assert.equal(recentGroup(istDate('2026-10-01', 9), thursday), 'week');
    assert.equal(recentGroup(istDate('2026-09-28', 0, 5), thursday), 'week');
    assert.equal(recentGroup(istDate('2026-09-27', 23, 55), thursday), 'earlier');
    // Wednesday 30 September 2026.
    const wednesday = istDate('2026-09-30', 12);
    assert.equal(recentGroup(istDate('2026-09-28', 10), wednesday), 'week');
    assert.equal(recentGroup(istDate('2026-09-27', 10), wednesday), 'month');
    assert.equal(recentGroup(istDate('2026-09-01', 0, 30), wednesday), 'month');
    assert.equal(recentGroup(istDate('2026-08-31', 23), wednesday), 'earlier');
    // A Monday counts itself as this week.
    assert.equal(recentGroup(istDate('2026-09-28', 0, 1), istDate('2026-09-28', 20)), 'week');
  });
});

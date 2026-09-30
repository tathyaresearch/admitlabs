import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addMonths, daysBetween, istDate, monthKey, monthRange, monthStart, previousMonth } from './dates.ts';

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

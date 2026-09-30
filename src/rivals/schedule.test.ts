import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { isRivalAuditDue, isWeeklyCheckDue, mondayOf, monthColumn, monthStartOf } from './schedule.ts';

describe('when rival work runs (India time)', () => {
  test('the Monday of the week', () => {
    assert.equal(mondayOf(istDate('2026-09-30', 12)), '2026-09-28'); // a Wednesday
    assert.equal(mondayOf(istDate('2026-09-28', 0, 30)), '2026-09-28'); // Monday, just after midnight
    assert.equal(mondayOf(istDate('2026-09-27', 23)), '2026-09-21'); // Sunday night
    assert.equal(mondayOf(istDate('2026-08-03', 9)), '2026-08-03');
    assert.equal(mondayOf(istDate('2027-01-01', 9)), '2026-12-28'); // across the year end
  });

  test('the month a moment falls in', () => {
    assert.equal(monthStartOf(istDate('2026-09-30', 23)).toISOString(), istDate('2026-09-01').toISOString());
    assert.equal(monthColumn(new Date('2026-09-30T20:00:00Z')), '2026-10-01'); // 1:30 am on 1 Oct in India
  });

  test('a rival Audit is due once each month, from the 1st', () => {
    const now = istDate('2026-10-05', 10);
    assert.equal(isRivalAuditDue(null, now), true);
    assert.equal(isRivalAuditDue(istDate('2026-09-01', 10), now), true);
    assert.equal(isRivalAuditDue(istDate('2026-10-01', 10), now), false);
    assert.equal(isRivalAuditDue(istDate('2026-10-01', 0), istDate('2026-10-01', 0)), false);
  });

  test('the weekly check is due until this week is checked', () => {
    const now = istDate('2026-10-07', 10);
    assert.equal(isWeeklyCheckDue(['2026-09-28'], now), true);
    assert.equal(isWeeklyCheckDue(['2026-09-28', '2026-10-05'], now), false);
  });
});

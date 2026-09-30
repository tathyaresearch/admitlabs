import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import type { PlanRecord } from '../domain/tiers.ts';
import { paidEndText, paidStartFrom, paidStartRange, planActions, planText } from './plans.ts';

const NOW = istDate('2026-09-30', 12);
const plan = (tier: PlanRecord['tier'], starts: string, ends: string | null): PlanRecord => ({ tier, startsAt: istDate(starts, 10), endsAt: ends ? istDate(ends, 10) : null });

describe('what an Admin can do with a plan', () => {
  test('Free (never paid, or ended) can start Paid or become a Client', () => {
    assert.deepEqual(planActions(plan('free', '2026-06-10', null), true, NOW), ['start_paid', 'make_client']);
    assert.deepEqual(planActions(plan('paid', '2026-03-01', '2026-09-01'), true, NOW), ['start_paid', 'make_client']);
  });

  test('Paid can become a Client or end now; a Client can end now', () => {
    assert.deepEqual(planActions(plan('paid', '2026-04-15', '2026-10-15'), true, NOW), ['make_client', 'end_plan']);
    assert.deepEqual(planActions(plan('client', '2026-03-02', null), true, NOW), ['end_plan']);
  });

  test('nothing for an institution that has not signed up', () => {
    assert.deepEqual(planActions(null, false, NOW), []);
  });

  test('the plan in words', () => {
    assert.equal(planText(plan('paid', '2026-04-15', '2026-10-15'), NOW), 'Paid until 15 Oct 2026');
    assert.equal(planText(plan('client', '2026-03-02', null), NOW), 'Client since 2 Mar 2026');
    assert.equal(planText(plan('paid', '2026-03-01', '2026-09-01'), NOW), 'Paid plan ended on 1 Sep 2026');
    assert.equal(planText(plan('client', '2026-03-01', '2026-09-01'), NOW), 'Client service ended on 1 Sep 2026');
    assert.equal(planText(plan('free', '2026-06-10', null), NOW), 'Free');
  });
});

describe('starting Paid', () => {
  test('today, or an earlier day whose 6 months have not run out, never the future', () => {
    assert.deepEqual(paidStartRange(NOW), { earliest: '2026-03-31', latest: '2026-09-30' });
    assert.equal(paidStartFrom('2026-09-30', NOW), NOW);
    assert.equal(paidStartFrom('2026-09-20', NOW)?.toISOString(), istDate('2026-09-20', 10).toISOString());
    assert.equal(paidStartFrom('2026-10-01', NOW), null);
    assert.equal(paidStartFrom('2026-03-30', NOW), null);
    assert.equal(paidStartFrom('someday', NOW), null);
  });

  test('always 6 months', () => {
    assert.equal(paidEndText(istDate('2026-08-31', 10)), 'Ends 28 Feb 2027');
    assert.equal(paidEndText(istDate('2026-09-30', 12)), 'Ends 30 Mar 2027');
  });
});

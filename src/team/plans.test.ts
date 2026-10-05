import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import type { PlanRecord } from '../domain/tiers.ts';
import { paidEndText, paidStartFrom, paidStartHint, paidStartRange, paidTermsText, planActions, planDetail, planText } from './plans.ts';

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

  test('the line under the plan, without repeating its name', () => {
    assert.equal(planDetail(plan('paid', '2026-04-15', '2026-10-15'), NOW), 'Ends 15 Oct 2026');
    assert.equal(planDetail(plan('client', '2026-03-02', null), NOW), 'Since 2 Mar 2026');
    assert.equal(planDetail(plan('paid', '2026-03-01', '2026-09-01'), NOW), 'Paid plan ended on 1 Sep 2026');
    assert.equal(planDetail(plan('client', '2026-03-01', '2026-09-01'), NOW), 'Client service ended on 1 Sep 2026');
    assert.equal(planDetail(plan('free', '2026-06-10', null), NOW), 'Since 10 Jun 2026');
    assert.equal(planDetail(null, NOW), null);
  });
});

describe('starting Paid', () => {
  test('3 months: today, or an earlier day whose 3 months have not run out, never the future', () => {
    assert.deepEqual(paidStartRange(NOW, 3), { earliest: '2026-07-01', latest: '2026-09-30' });
    assert.equal(paidStartFrom('2026-09-30', NOW, 3), NOW);
    assert.equal(paidStartFrom('2026-09-20', NOW, 3)?.toISOString(), istDate('2026-09-20', 10).toISOString());
    assert.equal(paidStartFrom('2026-10-01', NOW, 3), null);
    assert.equal(paidStartFrom('2026-06-30', NOW, 3), null);
    assert.equal(paidStartFrom('someday', NOW, 3), null);
  });

  test('Monthly: back to the first day whose month has not run out', () => {
    assert.deepEqual(paidStartRange(NOW, 1), { earliest: '2026-08-31', latest: '2026-09-30' });
    assert.equal(paidStartFrom('2026-08-31', NOW, 1)?.toISOString(), istDate('2026-08-31', 10).toISOString());
    assert.equal(paidStartFrom('2026-08-30', NOW, 1), null);
  });

  test('the end date follows the period', () => {
    assert.equal(paidEndText(istDate('2026-11-30', 10), 3), 'Ends 28 Feb 2027');
    assert.equal(paidEndText(istDate('2026-09-30', 12), 3), 'Ends 30 Dec 2026');
    assert.equal(paidEndText(istDate('2027-01-31', 10), 1), 'Ends 28 Feb 2027');
    assert.equal(paidEndText(istDate('2026-09-30', 12), 1), 'Ends 30 Oct 2026');
  });

  test('what the form says, for each period', () => {
    assert.equal(paidStartHint(3), 'Pick today, or a day in the last 3 months.');
    assert.equal(paidStartHint(1), 'Pick today, or a day in the last month.');
    assert.equal(paidTermsText(3), '₹24,999 + GST for 3 months, no auto-renew.');
    assert.equal(paidTermsText(1), '₹9,999 + GST per month, no auto-renew.');
  });
});

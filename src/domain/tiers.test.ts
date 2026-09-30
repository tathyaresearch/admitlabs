import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from './dates.ts';
import { effectiveTier, paidPlanEndsAt, planReminder, type PlanRecord } from './tiers.ts';

const now = istDate('2026-09-30', 12);
const paid = (startsAt: string, endsAt: string): PlanRecord => ({ tier: 'paid', startsAt: istDate(startsAt, 10), endsAt: istDate(endsAt, 10) });

describe('effectiveTier (mirrors private.effective_tier in the database)', () => {
  test('no plan is Free', () => {
    assert.equal(effectiveTier(null, now), 'free');
  });

  test('a Paid plan inside its dates is Paid', () => {
    assert.equal(effectiveTier(paid('2026-04-15', '2026-10-15'), now), 'paid');
  });

  test('a Paid plan past its end date drops to Free', () => {
    assert.equal(effectiveTier(paid('2026-03-01', '2026-09-01'), now), 'free');
  });

  test('at the exact end moment the plan counts as Free', () => {
    const plan = paid('2026-04-15', '2026-10-15');
    assert.equal(effectiveTier(plan, plan.endsAt as Date), 'free');
  });

  test('a plan that has not started yet counts as Free', () => {
    assert.equal(effectiveTier(paid('2026-10-05', '2027-04-05'), now), 'free');
  });

  test('a Client plan with no end stays Client', () => {
    assert.equal(effectiveTier({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: null }, istDate('2036-01-01')), 'client');
  });

  test('a Client plan ended by Admin drops to Free', () => {
    assert.equal(effectiveTier({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: istDate('2026-09-01') }, now), 'free');
  });
});

describe('paidPlanEndsAt', () => {
  test('Paid runs 6 months from the day of payment', () => {
    assert.equal(paidPlanEndsAt(istDate('2026-04-15', 10)).toISOString(), istDate('2026-10-15', 10).toISOString());
  });

  test('month ends clamp to the last day', () => {
    assert.equal(paidPlanEndsAt(istDate('2026-08-31')).toISOString(), istDate('2027-02-28').toISOString());
  });
});

describe('planReminder', () => {
  const plan = paid('2026-04-15', '2026-10-15');
  const on = (ymd: string, hour = 12) => planReminder(plan, istDate(ymd, hour));

  test('no reminder more than 30 days out', () => {
    assert.deepEqual(on('2026-09-14'), { stage: 'none', daysLeft: 31 });
  });

  test('first reminder from 30 days before the end', () => {
    assert.deepEqual(on('2026-09-15'), { stage: 'ends_soon', daysLeft: 30 });
    assert.deepEqual(on('2026-09-30'), { stage: 'ends_soon', daysLeft: 15 });
    assert.deepEqual(on('2026-10-07'), { stage: 'ends_soon', daysLeft: 8 });
  });

  test('second reminder from 7 days before the end', () => {
    assert.deepEqual(on('2026-10-08'), { stage: 'ends_very_soon', daysLeft: 7 });
    assert.deepEqual(on('2026-10-15', 9), { stage: 'ends_very_soon', daysLeft: 0 });
  });

  test('ended once the end moment passes', () => {
    assert.deepEqual(on('2026-10-15', 11), { stage: 'ended', daysLeft: 0 });
  });

  test('Free and Client plans have no reminders', () => {
    assert.deepEqual(planReminder({ tier: 'free', startsAt: istDate('2026-06-10'), endsAt: null }, now), { stage: 'none', daysLeft: null });
    assert.deepEqual(planReminder({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: null }, now), { stage: 'none', daysLeft: null });
    assert.deepEqual(planReminder(null, now), { stage: 'none', daysLeft: null });
  });
});

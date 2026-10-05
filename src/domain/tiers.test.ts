import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from './dates.ts';
import { PLAN_RULES } from '../config/plans.ts';
import {
  DEFAULT_PAID_MONTHS,
  effectiveTier,
  PAID_BUTTONS,
  PAID_PRICE_BY_MONTHS,
  PAID_PRICE_LINE,
  PAID_PRICES,
  PAID_SAVING,
  PAID_SAVING_PERCENT,
  PAID_THANKS,
  paidAskKind,
  paidPeriodText,
  paidPlanEndsAt,
  parsePaidMonths,
  planReminder,
  renewalReminderDays,
  type PaidMonths,
  type PlanRecord,
} from './tiers.ts';

const now = istDate('2026-09-30', 12);
const paid = (startsAt: string, endsAt: string, paidMonths: PaidMonths = 3): PlanRecord => ({ tier: 'paid', startsAt: istDate(startsAt, 10), endsAt: istDate(endsAt, 10), paidMonths });

describe('effectiveTier (mirrors private.effective_tier in the database)', () => {
  test('no plan is Free', () => {
    assert.equal(effectiveTier(null, now), 'free');
  });

  test('a Paid plan inside its dates is Paid', () => {
    assert.equal(effectiveTier(paid('2026-07-15', '2026-10-15'), now), 'paid');
    assert.equal(effectiveTier(paid('2026-09-20', '2026-10-20', 1), now), 'paid');
  });

  test('a Paid plan past its end date drops to Free', () => {
    assert.equal(effectiveTier(paid('2026-06-01', '2026-09-01'), now), 'free');
  });

  test('at the exact end moment the plan counts as Free', () => {
    const plan = paid('2026-07-15', '2026-10-15');
    assert.equal(effectiveTier(plan, plan.endsAt as Date), 'free');
  });

  test('a plan that has not started yet counts as Free', () => {
    assert.equal(effectiveTier(paid('2026-10-05', '2027-01-05'), now), 'free');
  });

  test('a Client plan with no end stays Client', () => {
    assert.equal(effectiveTier({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: null }, istDate('2036-01-01')), 'client');
  });

  test('a Client plan ended by Admin drops to Free', () => {
    assert.equal(effectiveTier({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: istDate('2026-09-01') }, now), 'free');
  });
});

describe('paidPlanEndsAt', () => {
  test('3 months runs 3 months from the day of payment, Monthly one month', () => {
    assert.equal(paidPlanEndsAt(istDate('2026-07-15', 10), 3).toISOString(), istDate('2026-10-15', 10).toISOString());
    assert.equal(paidPlanEndsAt(istDate('2026-09-15', 10), 1).toISOString(), istDate('2026-10-15', 10).toISOString());
  });

  test('month ends clamp to the last day', () => {
    assert.equal(paidPlanEndsAt(istDate('2026-11-30'), 3).toISOString(), istDate('2027-02-28').toISOString());
    assert.equal(paidPlanEndsAt(istDate('2027-01-31'), 1).toISOString(), istDate('2027-02-28').toISOString());
  });

  test('1 and 3 are the only periods', () => {
    assert.equal(parsePaidMonths('1'), 1);
    assert.equal(parsePaidMonths(3), 3);
    assert.equal(parsePaidMonths('6'), null);
    assert.equal(parsePaidMonths(''), null);
    assert.equal(parsePaidMonths(undefined), null);
  });
});

describe('planReminder, on 3 months', () => {
  const plan = paid('2026-07-15', '2026-10-15');
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

  test('a Paid plan with no period on record counts as 3 months', () => {
    assert.deepEqual(planReminder({ ...plan, paidMonths: null }, istDate('2026-09-15', 12)), { stage: 'ends_soon', daysLeft: 30 });
  });
});

describe('planReminder, on Monthly', () => {
  const plan = paid('2026-09-15', '2026-10-15', 1);
  const on = (ymd: string, hour = 12) => planReminder(plan, istDate(ymd, hour));

  test('no reminder until 7 days before the end', () => {
    assert.deepEqual(on('2026-09-20'), { stage: 'none', daysLeft: 25 });
    assert.deepEqual(on('2026-10-07'), { stage: 'none', daysLeft: 8 });
  });

  test('the reminder from 7 days before the end', () => {
    assert.deepEqual(on('2026-10-08'), { stage: 'ends_very_soon', daysLeft: 7 });
    assert.deepEqual(on('2026-10-15', 9), { stage: 'ends_very_soon', daysLeft: 0 });
  });

  test('ended once the end moment passes', () => {
    assert.deepEqual(on('2026-10-15', 11), { stage: 'ended', daysLeft: 0 });
  });
});

describe('the first renewal reminder, by period', () => {
  test('7 days before on Monthly, 30 days before on 3 months', () => {
    assert.equal(renewalReminderDays(1), 7);
    assert.equal(renewalReminderDays(3), 30);
  });

  test('Free and Client plans have no reminders', () => {
    assert.deepEqual(planReminder({ tier: 'free', startsAt: istDate('2026-06-10'), endsAt: null }, now), { stage: 'none', daysLeft: null });
    assert.deepEqual(planReminder({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: null }, now), { stage: 'none', daysLeft: null });
    assert.deepEqual(planReminder(null, now), { stage: 'none', daysLeft: null });
  });
});

describe('what an owner can ask AdmitLabs for (mirrors private.paid_ask_kind)', () => {
  const paid = { tier: 'paid' as const, startsAt: istDate('2026-07-15'), endsAt: istDate('2026-10-15'), paidMonths: 3 as const };
  const monthly = { tier: 'paid' as const, startsAt: istDate('2026-09-15'), endsAt: istDate('2026-10-15'), paidMonths: 1 as const };
  test('Free asks for Paid, and so does a Paid plan that has ended', () => {
    assert.equal(paidAskKind(null, istDate('2026-10-03', 12)), 'ask_paid');
    assert.equal(paidAskKind({ tier: 'free', startsAt: istDate('2026-06-10'), endsAt: null }, istDate('2026-10-03', 12)), 'ask_paid');
    assert.equal(paidAskKind(paid, istDate('2026-10-20', 12)), 'ask_paid');
  });

  test('Paid asks to continue from its first reminder, 30 days before the end', () => {
    assert.equal(paidAskKind(paid, istDate('2026-08-20', 12)), null);
    assert.equal(paidAskKind(paid, istDate('2026-09-15', 12)), 'continue_paid');
    assert.equal(paidAskKind(paid, istDate('2026-10-03', 12)), 'continue_paid');
  });

  test('Monthly asks to continue from 7 days before the end', () => {
    assert.equal(paidAskKind(monthly, istDate('2026-10-03', 12)), null);
    assert.equal(paidAskKind(monthly, istDate('2026-10-08', 12)), 'continue_paid');
  });

  test('Client never asks', () => {
    assert.equal(paidAskKind({ tier: 'client', startsAt: istDate('2026-03-02'), endsAt: null }, istDate('2026-10-03', 12)), null);
  });
});

describe('the payment buttons (October 2026): online payment comes before launch', () => {
  test('Subscribe now on Free, Renew now near the end of Paid, and the team completes payment', () => {
    assert.deepEqual(PAID_BUTTONS, { ask_paid: 'Subscribe now', continue_paid: 'Renew now' });
    assert.equal(PAID_THANKS, 'Thanks! The AdmitLabs team will contact you to complete payment.');
  });
});

describe('Paid prices (October 2026): Monthly or 3 months, one place in config', () => {
  test('₹9,999 + GST per month, or ₹24,999 + GST for 3 months', () => {
    assert.deepEqual(
      PAID_PRICES.map((price) => [price.months, price.amount, price.tax, price.text, price.term, price.label]),
      [
        [1, '₹9,999', '+ GST', '₹9,999 + GST', 'per month', 'Monthly'],
        [3, '₹24,999', '+ GST', '₹24,999 + GST', 'for 3 months', '3 months'],
      ],
    );
    assert.equal(PAID_PRICE_BY_MONTHS[3].amount, '₹24,999');
    assert.equal(PAID_PRICE_LINE, '₹9,999 + GST per month, or ₹24,999 + GST for 3 months');
  });

  test('3 months saves 17% against paying monthly, worked out from the prices', () => {
    assert.equal(PLAN_RULES.paid.periods[1].priceInr, 9999);
    assert.equal(PLAN_RULES.paid.periods[3].priceInr, 24999);
    assert.equal(PAID_SAVING_PERCENT, 17);
    assert.equal(PAID_SAVING, 'Save 17%');
  });

  test('3 months is shown and picked first; no auto-renew', () => {
    assert.equal(DEFAULT_PAID_MONTHS, 3);
    assert.equal(PLAN_RULES.paid.autoRenew, false);
    assert.equal(paidPeriodText(1), 'Paid, Monthly');
    assert.equal(paidPeriodText(3), 'Paid, 3 months');
  });
});

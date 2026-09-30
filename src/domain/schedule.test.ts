import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from './dates.ts';
import { formatDate } from './format.ts';
import {
  auditSchedule,
  isAuditDue,
  latestScheduledRun,
  nextScheduledRun,
  refreshesLeft,
  refreshResetsOn,
  sameIstMonth,
  upcomingAudit,
  type AuditSchedule,
} from './schedule.ts';
import type { PlanRecord } from './tiers.ts';

// Spec section 11: Free every 3 months, Paid and Client monthly, on the start day of the month.

const at = (ymd: string, hour = 10) => istDate(ymd, hour);
const day = (date: Date | null) => (date ? formatDate(date) : null);
const plan = (tier: PlanRecord['tier'], startsAt: string, endsAt: string | null = null): PlanRecord => ({ tier, startsAt: at(startsAt), endsAt: endsAt ? at(endsAt) : null });

const northbank = plan('free', '2026-06-10');
const eastgate = plan('paid', '2026-04-15', '2026-10-15');
const brightpath = plan('client', '2026-03-02');
const now = at('2026-09-30', 12);

describe('audit schedules', () => {
  test('Free runs every 3 months from the signup day', () => {
    const schedule = auditSchedule(northbank, now) as AuditSchedule;
    assert.deepEqual([schedule.tier, schedule.everyMonths], ['free', 3]);
    assert.equal(day(latestScheduledRun(schedule, now)), '10 Sep 2026');
    assert.equal(day(nextScheduledRun(schedule, now)), '10 Dec 2026');
    assert.equal(isAuditDue(schedule, at('2026-09-10'), now), false);
    assert.equal(isAuditDue(schedule, at('2026-06-10'), now), true, 'the September run has not happened');
  });

  test('Paid and Client run monthly on the plan start day', () => {
    const paid = auditSchedule(eastgate, now) as AuditSchedule;
    assert.deepEqual([paid.tier, paid.everyMonths], ['paid', 1]);
    assert.equal(day(latestScheduledRun(paid, now)), '15 Sep 2026');
    const client = auditSchedule(brightpath, now) as AuditSchedule;
    assert.equal(day(latestScheduledRun(client, now)), '2 Sep 2026');
    assert.equal(day(nextScheduledRun(client, now)), '2 Oct 2026');
  });

  test('a day missing from a month falls on its last day, without drifting', () => {
    const schedule = auditSchedule(plan('client', '2026-01-31'), at('2026-12-31')) as AuditSchedule;
    const runs = ['2026-02-28', '2026-03-31', '2026-04-30', '2026-06-30'].map((ymd) => day(latestScheduledRun(schedule, at(ymd, 23))));
    assert.deepEqual(runs, ['28 Feb 2026', '31 Mar 2026', '30 Apr 2026', '30 Jun 2026']);
    assert.equal(day(latestScheduledRun(schedule, at('2026-02-27', 23))), '31 Jan 2026');
  });

  test('a run missed on its day still happens the next day', () => {
    const schedule = auditSchedule(eastgate, at('2026-09-16')) as AuditSchedule;
    assert.equal(isAuditDue(schedule, at('2026-08-15'), at('2026-09-16')), true);
    assert.equal(isAuditDue(schedule, at('2026-08-15'), at('2026-09-14')), false);
  });

  test('a new signup is due on day one; its first Audit covers that', () => {
    const fresh = plan('free', '2026-09-30');
    const schedule = auditSchedule(fresh, at('2026-09-30', 11)) as AuditSchedule;
    assert.equal(isAuditDue(schedule, null, at('2026-09-30', 11)), true);
    assert.equal(isAuditDue(schedule, at('2026-09-30', 11), at('2026-09-30', 12)), false);
    assert.equal(day(upcomingAudit(fresh, at('2026-09-30', 11), at('2026-09-30', 12))?.on ?? null), '30 Dec 2026');
  });

  test('when a Paid plan ends, Free Audits resume 3 months after the end date', () => {
    assert.deepEqual(upcomingAudit(eastgate, at('2026-09-15'), now), { on: at('2027-01-15'), tier: 'free' });
    const after = auditSchedule(eastgate, at('2026-11-01')) as AuditSchedule;
    assert.deepEqual([after.tier, after.everyMonths, day(after.anchor)], ['free', 3, '15 Oct 2026']);
    assert.equal(isAuditDue(after, at('2026-09-15'), at('2026-11-01')), false);
    assert.equal(isAuditDue(after, at('2026-09-15'), at('2027-01-15', 11)), true);
  });

  test('upcoming Audits for the sample tiers', () => {
    assert.deepEqual(upcomingAudit(northbank, at('2026-09-10'), now), { on: at('2026-12-10'), tier: 'free' });
    assert.deepEqual(upcomingAudit(brightpath, at('2026-09-02'), now), { on: at('2026-10-02'), tier: 'client' });
    assert.equal(upcomingAudit(null, null, now), null);
  });

  test('a plan that has not started has nothing due yet', () => {
    const schedule = auditSchedule(plan('paid', '2026-10-05', '2027-04-05'), now) as AuditSchedule;
    assert.equal(schedule.tier, 'free');
    assert.equal(isAuditDue(schedule, null, now), false);
  });
});

describe('Paid extra refresh: once per calendar month, India time', () => {
  test('Paid has one a month; Free and Client have none', () => {
    assert.equal(refreshesLeft('paid', 0), 1);
    assert.equal(refreshesLeft('paid', 1), 0);
    assert.equal(refreshesLeft('paid', 3), 0);
    assert.equal(refreshesLeft('free', 0), 0);
    assert.equal(refreshesLeft('client', 0), 0);
  });

  test('it comes back on the 1st of the next month', () => {
    assert.equal(day(refreshResetsOn(now)), '1 Oct 2026');
    assert.equal(day(refreshResetsOn(at('2026-12-15'))), '1 Jan 2027');
    // Months are counted on the India calendar, whatever the server's time zone.
    assert.equal(sameIstMonth(at('2026-10-31', 23), at('2026-10-01', 0)), true);
    assert.equal(sameIstMonth(at('2026-11-01', 0), at('2026-10-31', 23)), false);
  });
});

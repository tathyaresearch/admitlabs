import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { isReportDue, monthEnd, nextMonth, nextReport, reportDayOf, reportMonth, reportPath, type ReportCandidate } from './schedule.ts';

describe('when the monthly report is made (on the 1st, for the month just ended, India time)', () => {
  test('a report made on a day covers the India month before it', () => {
    assert.equal(reportMonth(istDate('2026-10-01', 7)), '2026-09');
    assert.equal(reportMonth(istDate('2026-10-20', 12)), '2026-09');
    assert.equal(reportMonth(istDate('2027-01-01', 0)), '2026-12');
    // 30 September at 11 pm in UTC is already 1 October in India.
    assert.equal(reportMonth(new Date('2026-09-30T19:00:00Z')), '2026-09');
  });

  test('the month ends at the first moment of the next one, and its report is made that morning', () => {
    assert.equal(monthEnd('2026-09').toISOString(), istDate('2026-10-01').toISOString());
    assert.equal(monthEnd('2026-12').toISOString(), istDate('2027-01-01').toISOString());
    assert.equal(reportDayOf('2026-09').toISOString(), istDate('2026-10-01', 7).toISOString());
    assert.equal(nextMonth('2026-12'), '2027-01');
    assert.throws(() => nextMonth('2026-13'));
  });

  test('the next report, for the Reports page', () => {
    const next = nextReport(istDate('2026-09-30', 12));
    assert.equal(next.month, '2026-09');
    assert.equal(next.on.toISOString(), istDate('2026-10-01', 7).toISOString());
  });

  test('where the file is kept', () => {
    assert.equal(reportPath('abc', '2026-09'), 'abc/2026-09.pdf');
  });
});

describe('who gets a report', () => {
  const due: ReportCandidate = { tier: 'paid', claimed: true, lastAuditAt: istDate('2026-09-15', 10), hasReport: false };

  test('Paid and Client, with an Audit for the month, and no report yet', () => {
    assert.equal(isReportDue(due, '2026-09'), true);
    assert.equal(isReportDue({ ...due, tier: 'client' }, '2026-09'), true);
    // An older Audit still counts: the report shows what was known at the end of the month.
    assert.equal(isReportDue({ ...due, lastAuditAt: istDate('2026-07-15', 10) }, '2026-09'), true);
  });

  test('never Free, including a Paid plan that has ended (past reports stay, no new ones)', () => {
    assert.equal(isReportDue({ ...due, tier: 'free' }, '2026-09'), false);
  });

  test('never twice, never unclaimed, never without an Audit before the month ends', () => {
    assert.equal(isReportDue({ ...due, hasReport: true }, '2026-09'), false);
    assert.equal(isReportDue({ ...due, claimed: false }, '2026-09'), false);
    assert.equal(isReportDue({ ...due, lastAuditAt: null }, '2026-09'), false);
    assert.equal(isReportDue({ ...due, lastAuditAt: istDate('2026-10-01', 0) }, '2026-09'), false);
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { alertsAhead } from './alerts.ts';
import { hasDashes } from './copy.ts';
import { istDate } from './dates.ts';

const BASE = {
  nextAudit: { on: istDate('2026-10-15', 6), tier: 'paid' as const },
  hasRivals: true,
  city: 'Guwahati',
  nextUpdate: istDate('2026-10-28', 6),
  nextReport: istDate('2026-11-01', 7),
};

describe('what arrives in Notifications, and when', () => {
  test('Paid and Client: the next Audit, rival moves, search jumps and the report, each with when', () => {
    assert.deepEqual(alertsAhead({ ...BASE, tier: 'paid' }), [
      'Your next Audit, on 15 Oct 2026, and what moved in it.',
      "Your rivals' moves, from the weekly check every Monday.",
      'Big jumps in what students in Guwahati search for, after each update. The next is on 28 Oct 2026.',
      'Your monthly summary and report, on 1 Nov 2026.',
    ]);
    assert.equal(alertsAhead({ ...BASE, tier: 'client', hasRivals: false })[1], "Your rivals' moves, once you pick your rivals.");
  });

  test('a Paid plan that ends before the next report: no report promised', () => {
    const lines = alertsAhead({ ...BASE, tier: 'paid', nextReport: null });
    assert.equal(lines.length, 3);
    assert.ok(lines.every((line) => !line.includes('report')));
  });

  test('Free: its next free Audit, and what Paid adds', () => {
    assert.deepEqual(alertsAhead({ ...BASE, tier: 'free', nextAudit: { on: istDate('2027-01-03', 6), tier: 'free' } }), [
      'Your next free Audit, on 3 Jan 2027, and what moved in it.',
      "Paid adds your rivals' moves, big jumps in what students search for, and a monthly summary and report.",
    ]);
  });

  test('without a known date, still says what comes; no dashes anywhere', () => {
    const lines = alertsAhead({ ...BASE, tier: 'paid', nextAudit: null });
    assert.equal(lines[0], 'Your next Audit, and what moved in it.');
    for (const line of lines) assert.equal(hasDashes(line), false, line);
  });
});

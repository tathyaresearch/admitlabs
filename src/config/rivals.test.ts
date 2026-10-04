import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { entitlement } from './entitlements.ts';
import { RIVAL_RULES } from './rivals.ts';
import { SCHEDULES } from './schedules.ts';

describe('rival rules', () => {
  test('the database enforces the same limits (private.rival_limits in the rivals_access migration)', () => {
    const migration = readFileSync(new URL('../../supabase/migrations/20261002120100_rivals_access.sql', import.meta.url), 'utf8');
    const match = /create function private\.rival_limits\([\s\S]*?select (\d+), (\d+), (\d+);/.exec(migration);
    assert.ok(match, 'private.rival_limits not found');
    assert.deepEqual([Number(match[1]), Number(match[2]), Number(match[3])], [RIVAL_RULES.min, RIVAL_RULES.max, RIVAL_RULES.suggestions]);
  });

  test('3 to 5 rivals (spec 8.2)', () => {
    assert.equal(RIVAL_RULES.min, 3);
    assert.equal(RIVAL_RULES.max, 5);
  });

  test('matches what each plan sees and when moves are checked (spec sections 10 and 11)', () => {
    assert.equal(entitlement('rivals_change', 'free').access, 'none');
    assert.equal(entitlement('rivals_change', 'paid').every, 'month');
    assert.equal(entitlement('rivals_change', 'client').access, 'full');
    assert.equal(entitlement('rivals_full_comparison', 'free').access, 'placeholder');
    assert.equal(entitlement('rivals_line', 'free').access, 'full');
    assert.equal(SCHEDULES.free.rivalMoveAlerts, false);
    assert.equal(SCHEDULES.paid.rivalMovesEveryDays, 7);
    assert.equal(SCHEDULES.client.rivalMoveAlerts, true);
  });
});

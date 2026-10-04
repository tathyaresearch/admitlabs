import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { TIERS } from '../domain/types.ts';
import { accessRank, canSee, ENTITLEMENT_KEYS, ENTITLEMENTS, entitlement, INSTEAD, isPlaceholder, limitFor, paidUnlocks, PLAN_PAGE_GROUPS } from './entitlements.ts';

describe('entitlements (spec section 10)', () => {
  test('one row per key, each with all three tiers', () => {
    assert.deepEqual(
      ENTITLEMENTS.map((row) => row.key),
      [...ENTITLEMENT_KEYS],
    );
    for (const row of ENTITLEMENTS) for (const tier of TIERS) assert.ok(row.cells[tier], `${row.key} ${tier}`);
  });

  test('Free never gets more than Paid, and Paid never more than Client, except where a plan gets something else instead', () => {
    for (const row of ENTITLEMENTS) {
      if (INSTEAD.has(row.key)) continue;
      assert.ok(accessRank(row.cells.free.access) <= accessRank(row.cells.paid.access), `${row.key} free vs paid`);
      assert.ok(accessRank(row.cells.paid.access) <= accessRank(row.cells.client.access), `${row.key} paid vs client`);
    }
    // A Client's team already works on every fix; Paid and Client get the monthly summary instead.
    assert.equal(entitlement('audit_fix_request', 'client').text, 'No: the team already works on it');
    assert.equal(entitlement('audit_ready_email', 'paid').text, 'No: the monthly summary covers it');
    assert.equal(canSee('audit_ready_email', 'free'), true);
    assert.equal(canSee('monthly_summary', 'free'), false);
    assert.equal(canSee('leads', 'paid'), false);
    assert.equal(canSee('leads', 'client'), true);
  });

  test('Free limits match the spec', () => {
    assert.equal(limitFor('audit_programs', 'free'), 1);
    assert.equal(limitFor('audit_good', 'free'), 3);
    assert.equal(limitFor('audit_what_to_fix', 'free'), 3);
    assert.equal(limitFor('audit_programs', 'paid'), null);
    assert.equal(canSee('audit_score_history', 'free'), false);
    assert.equal(canSee('audit_score_history', 'paid'), true);
    assert.equal(limitFor('demand_make_three', 'free'), 1);
    assert.equal(limitFor('demand_programs', 'free'), 1);
    assert.equal(limitFor('demand_make_three', 'paid'), null);
    assert.equal(canSee('monthly_report', 'free'), false);
    assert.equal(canSee('alerts', 'free'), false);
  });

  test('the database enforces the same Free Top 3 (private.free_top_limit in the audit_access migration)', () => {
    const migration = readFileSync(new URL('../../supabase/migrations/20261001120100_audit_access.sql', import.meta.url), 'utf8');
    const limit = /create function private\.free_top_limit\(\)[\s\S]*?select (\d+);/.exec(migration)?.[1];
    assert.equal(Number(limit), limitFor('audit_good', 'free'));
    assert.equal(Number(limit), limitFor('audit_what_to_fix', 'free'));
  });

  test('blurred rows are placeholders for Free only', () => {
    assert.equal(isPlaceholder('rivals_full_comparison', 'free'), true);
    assert.equal(isPlaceholder('demand_everything_else', 'free'), true);
    assert.equal(isPlaceholder('rivals_full_comparison', 'paid'), false);
    assert.equal(limitFor('rivals_full_comparison', 'free'), 0);
  });

  test('changing rivals: never on Free, once a month on Paid, anytime for Clients', () => {
    assert.equal(entitlement('rivals_change', 'free').access, 'none');
    assert.equal(entitlement('rivals_change', 'paid').every, 'month');
    assert.equal(entitlement('rivals_change', 'client').text, 'Anytime');
  });

  test('only Clients get the AdmitLabs team acting on it', () => {
    assert.equal(canSee('team_acts_on_it', 'free'), false);
    assert.equal(canSee('team_acts_on_it', 'paid'), false);
    assert.equal(canSee('team_acts_on_it', 'client'), true);
  });

  test('what Paid unlocks', () => {
    assert.deepEqual(
      paidUnlocks().map((row) => row.key),
      [
        'audit_found',
        'audit_good',
        'audit_what_to_fix',
        'audit_people_other',
        'audit_programs',
        'audit_score_history',
        'rivals_full_comparison',
        'rivals_change',
        'demand_make_three',
        'demand_programs',
        'demand_everything_else',
        'alerts',
        'monthly_summary',
        'monthly_report',
      ],
    );
  });

  test('table wording has no dashes', () => {
    for (const row of ENTITLEMENTS) {
      assert.equal(hasDashes(row.label), false, row.label);
      for (const tier of TIERS) assert.equal(hasDashes(row.cells[tier].text), false, `${row.key} ${tier}`);
    }
  });
});

describe('the Plan page comparison', () => {
  test('every row appears once, under Audit, Rivals, Demand, Leads, Reports and emails, and the AdmitLabs service', () => {
    assert.deepEqual(
      PLAN_PAGE_GROUPS.map((group) => group.title),
      ['Audit', 'Rivals', 'Demand', 'Leads', 'Reports and emails', 'AdmitLabs service'],
    );
    const keys = PLAN_PAGE_GROUPS.flatMap((group) => group.keys);
    assert.equal(keys.length, ENTITLEMENT_KEYS.length);
    assert.deepEqual([...keys].sort(), [...ENTITLEMENT_KEYS].sort());
  });
});

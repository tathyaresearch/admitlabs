import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { TEAM_RULES } from '../config/team.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { attentionReasons, type AttentionInput } from './attention.ts';

const NOW = istDate('2026-10-03', 12);
const ROW: AttentionInput = { claimed: true, tier: 'free', planEndsAt: null, planMonths: null, scoreChange: 0, rivals: 3, sharedAt: null, teamRefreshedAt: null };
const keys = (row: Partial<AttentionInput>) => attentionReasons({ ...ROW, ...row }, NOW).map((reason) => reason.key);
const texts = (row: Partial<AttentionInput>) => attentionReasons({ ...ROW, ...row }, NOW).map((reason) => reason.text);

describe('why an institution needs attention', () => {
  test('nothing to say for a signed-up institution with rivals and a steady score', () => {
    assert.deepEqual(keys({}), []);
  });

  test('a Paid plan ending within 30 days, in days', () => {
    assert.deepEqual(texts({ tier: 'paid', planEndsAt: istDate('2026-10-15', 0).toISOString() }), ['Paid ends in 12 days']);
    assert.deepEqual(texts({ tier: 'paid', planEndsAt: istDate('2026-10-04', 9).toISOString() }), ['Paid ends tomorrow']);
    assert.deepEqual(texts({ tier: 'paid', planEndsAt: istDate('2026-10-03', 20).toISOString() }), ['Paid ends today']);
    assert.deepEqual(keys({ tier: 'paid', planEndsAt: istDate('2026-12-20', 0).toISOString() }), [], 'not yet ending soon');
    assert.deepEqual(texts({ tier: 'paid', planMonths: 3, planEndsAt: istDate('2026-10-15', 0).toISOString() }), ['Paid ends in 12 days'], '3 months: from 30 days before the end');
    assert.deepEqual(keys({ tier: 'paid', planMonths: 1, planEndsAt: istDate('2026-10-15', 0).toISOString() }), [], 'Monthly: not yet, 12 days out');
    assert.deepEqual(texts({ tier: 'paid', planMonths: 1, planEndsAt: istDate('2026-10-09', 0).toISOString() }), ['Paid ends in 6 days'], 'Monthly: from 7 days before the end');
  });

  test('a Client with no Audit run by the team this month', () => {
    assert.deepEqual(texts({ tier: 'client', teamRefreshedAt: null }), ['No team Audit in October yet']);
    assert.deepEqual(texts({ tier: 'client', teamRefreshedAt: istDate('2026-09-20', 10).toISOString() }), ['No team Audit in October yet']);
    assert.deepEqual(keys({ tier: 'client', teamRefreshedAt: istDate('2026-10-01', 10).toISOString() }), []);
  });

  test('a score down by 3 or more', () => {
    assert.deepEqual(texts({ scoreChange: -6 }), ['Score down 6']);
    assert.deepEqual(keys({ scoreChange: -2 }), []);
    assert.equal(TEAM_RULES.attentionScoreDrop, 3, 'the database uses the same (private.attention_score_drop)');
  });

  test('no rivals picked, once signed up', () => {
    assert.deepEqual(texts({ rivals: 0 }), ['No rivals picked']);
    assert.deepEqual(keys({ claimed: false, tier: null, rivals: 0 }), [], 'a prospect picks no rivals');
  });

  test('a prospect a week or more after their Audit was shared', () => {
    const prospect = { claimed: false, tier: null, rivals: 0 };
    assert.deepEqual(texts({ ...prospect, sharedAt: istDate('2026-09-19', 11).toISOString() }), ['Shared 14 days ago, not signed up']);
    assert.deepEqual(keys({ ...prospect, sharedAt: istDate('2026-09-28', 11).toISOString() }), []);
    assert.equal(TEAM_RULES.followUpAfterDays, 7, 'the database uses the same (private.attention_follow_up_days)');
  });

  test('every reason that applies, most urgent first, in plain words', () => {
    const reasons = attentionReasons({ ...ROW, tier: 'paid', planEndsAt: istDate('2026-10-15', 0).toISOString(), scoreChange: -4, rivals: 0 }, NOW);
    assert.deepEqual(
      reasons.map((reason) => reason.key),
      ['paid_ending', 'score_down', 'no_rivals'],
    );
    for (const reason of reasons) assert.equal(hasDashes(reason.text), false, reason.text);
  });
});

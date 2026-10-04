import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findingsOf, recordFor, stored } from '../audit/testing.ts';
import { TEAM_RULES } from '../config/team.ts';
import { istDate } from '../domain/dates.ts';
import { explainedInFull, linkState, linkStateText, parseSharedLink, sharedPlaces, sharedView } from './share.ts';
import { sharedPayload as payload } from './testing.ts';

describe('share links', () => {
  const now = istDate('2026-10-01', 12);

  test('live for 90 days unless the team stops it sooner', () => {
    assert.equal(TEAM_RULES.shareLinkDays, 90);
    assert.equal(linkState({ expiresAt: istDate('2026-12-18', 11), stoppedAt: null }, now), 'live');
    assert.equal(linkState({ expiresAt: istDate('2026-09-30', 11), stoppedAt: null }, now), 'expired');
    assert.equal(linkState({ expiresAt: istDate('2026-12-18', 11), stoppedAt: istDate('2026-09-25', 11) }, now), 'stopped');
  });

  test('the top 3 fixes are explained in full, the same number the database uses', () => {
    // private.shared_fix_limit() in the database; supabase/tests/team.test.sql checks that side.
    assert.equal(TEAM_RULES.sharedFixesInFull, 3);
  });

  test('its state in words', () => {
    assert.equal(linkStateText({ expiresAt: istDate('2026-12-18', 11), stoppedAt: null }, now), 'Works until 18 Dec 2026');
    assert.equal(linkStateText({ expiresAt: istDate('2026-09-30', 11), stoppedAt: null }, now), 'Expired on 30 Sep 2026');
    assert.equal(linkStateText({ expiresAt: istDate('2026-12-18', 11), stoppedAt: istDate('2026-09-25', 11) }, now), 'Stopped on 25 Sep 2026');
  });
});

describe('the shared Audit', () => {
  test('an expired or unknown link shows no Audit', () => {
    assert.deepEqual(parseSharedLink({ status: 'expired' }), { status: 'expired' });
    assert.equal(parseSharedLink(null), null);
    assert.equal(parseSharedLink({ status: 'live' }), null);
  });

  test('every check with its result, what was found, the source and the date', async () => {
    const { record, names } = await recordFor('riverbend-college', '2026-09-18');
    const audit = stored(record);
    const shared = parseSharedLink(payload(audit, names));
    assert.equal(shared?.status, 'live');
    if (shared?.status !== 'live') return;
    assert.equal(shared.audit.checks.length, audit.checks.length);
    assert.ok(shared.audit.checks.every((check) => check.detail?.finding && check.detail.sourceUrl && check.checkedAt));
    assert.equal(shared.institution.name, 'Riverbend College');
    assert.deepEqual([...shared.programNames.values()].sort(), [...names.values()].sort());
    assert.equal(shared.audit.scores.overall, audit.scores.overall);
  });

  test('how to fix for the top 3 fixes only, the rest without it', async () => {
    const { record, names } = await recordFor('riverbend-college', '2026-09-18');
    const shared = parseSharedLink(payload(stored(record), names, undefined, findingsOf(record)));
    if (shared?.status !== 'live') throw new Error('expected a live link');
    const view = sharedView(shared);
    // The one ranking: checks and findings share the top 3.
    const inFull = shared.audit.checks.filter((check) => explainedInFull(check)).map((check) => check.key);
    const findingsInFull = shared.findings.filter((finding) => explainedInFull(finding));
    assert.equal(new Set(inFull).size + findingsInFull.length, 3);
    assert.equal(view.topFixes.length, new Set(inFull).size);
    assert.ok(view.moreFixes.length > 0);
    assert.ok(view.topFixes.every((item) => item.parts.every((part) => part.detail?.howToFix && part.detail.fixSteps.length)));
    assert.ok(view.moreFixes.every((item) => item.parts.every((part) => part.detail?.howToFix === null && part.detail.fixSteps.length === 0 && !part.detail.readyFix)));
    assert.ok(findingsInFull.every((finding) => finding.fix?.steps.length));
    assert.ok(shared.findings.filter((finding) => !explainedInFull(finding)).every((finding) => !finding.fix || (finding.fix.steps.length === 0 && finding.fix.readyFix === null && finding.fix.why === null)));
    assert.ok(view.working.length <= 3);
    assert.equal(view.view.scores.overall, shared.audit.scores.overall);
  });

  test('place by place with the three words: the top 3 in full, every other fix by name', async () => {
    const { record, names } = await recordFor('riverbend-college', '2026-09-18');
    const shared = parseSharedLink(payload(stored(record), names, undefined, findingsOf(record)));
    if (shared?.status !== 'live') throw new Error('expected a live link');
    const view = sharedPlaces(shared);
    assert.deepEqual(
      view.words.map((word) => word.name),
      ['Visibility', 'Trust', 'Chosen'],
    );
    assert.deepEqual(
      view.places.map((place) => place.key),
      ['website', 'google', 'social', 'people', 'other'],
    );
    assert.equal(view.topFixes.length, 3);
    assert.ok(view.topFixes.every((fix) => fix.advice.length > 0));
    assert.ok(view.fixes.slice(3).every((fix) => fix.advice.length === 0 && fix.readyFix === null && fix.title));
    // Every finding shows with its line and link.
    const shown = view.places.flatMap((place) => place.found.filter((row) => row.kind === 'finding'));
    assert.equal(shown.length, shared.findings.length);
    assert.ok(shown.every((row) => row.proof?.url && row.proof.line && row.proof.date));
  });
});

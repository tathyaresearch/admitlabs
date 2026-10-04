import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { sampleAuditChain, type SampleAudit } from '../sample/world.ts';
import { waitedFor } from '../team/review.ts';
import { changesLine, reviewChanges, reviewPayload, ReviewError, type ApprovedBefore } from './review.ts';
import { findingsOf, stored } from './testing.ts';

// Review before sending (spec section 25), the part with no database: what changed since the
// last approved Audit, and what each change the team makes does to a waiting Audit.

function approvedBefore(run: SampleAudit): ApprovedBefore {
  const { record } = run;
  return {
    id: run.id,
    runAt: record.run_at,
    scores: { overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen },
    programs: stored(record).programs,
    checks: record.checks.map((check) => ({ key: check.check_key, programId: check.program_id, result: check.result })),
    findingKeys: findingsOf(record).map((finding) => finding.findingKey),
  };
}

/** Eastgate's Audit of a month as it waits for review, with the approved Audit before it. */
async function waiting(until: string) {
  const chain = await sampleAuditChain('eastgate-university', 'own', until);
  const now = chain[chain.length - 1] as SampleAudit;
  const before = approvedBefore(chain[chain.length - 2] as SampleAudit);
  const audit = stored(now.record);
  const findings = findingsOf(now.record);
  return { now, audit, findings, before, options: { institutionType: now.type, city: now.institution.city, programNames: now.names }, input: { audit, findings, before, institutionType: now.type } };
}

describe('what changed since the last approved Audit', () => {
  test('the words that moved and the checks that moved, before and after', async () => {
    const { audit, findings, before, options } = await waiting('2026-06-15');
    const changes = reviewChanges(audit, findings, before, options);
    assert.deepEqual(
      changes.words.map((word) => [word.name, word.before, word.word]),
      [
        ['Visibility', 'Okay', 'Strong'],
        ['Trust', 'Okay', 'Okay'],
        ['Chosen', 'Okay', 'Okay'],
      ],
    );
    assert.deepEqual(
      changes.checks.map((check) => [check.name, check.program, check.before, check.after]),
      [
        ['Instagram', null, 'okay', 'strong'],
        ['YouTube', null, 'weak', 'okay'],
        ['Enquiry', null, 'weak', 'okay'],
        ['AI answers', 'BBA', 'weak', 'okay'],
        ['Search from Guwahati', 'B.Sc Data Analytics', 'missing', 'weak'],
        ['Fees', 'B.Sc Data Analytics', 'weak', 'okay'],
      ],
    );
    assert.equal(changesLine(changes, false), 'Visibility Okay to Strong, 6 checks moved');
  });

  test('findings new and gone', async () => {
    const { audit, findings, before, options } = await waiting('2026-09-15');
    const changes = reviewChanges(audit, findings, before, options);
    assert.deepEqual(
      changes.findings.added.map((finding) => finding.findingKey),
      ['eastgate-forum-bba-scholarship', 'eastgate-reddit-hostel-fees', 'eastgate-reddit-nursing-labs', 'eastgate-news-health-camp'],
    );
    assert.deepEqual(changes.findings.gone, ['eastgate-quora-mba-hostel']);
    assert.equal(changesLine(changes, false), 'No word moved, 4 new findings, 1 finding gone');
    // A finding taken out in the review counts as gone, since the college will not see it.
    const removed = findings.map((finding) => (finding.findingKey === 'eastgate-news-health-camp' ? { ...finding, removed: true } : finding));
    assert.equal(changesLine(reviewChanges(audit, removed, before, options), false), 'No word moved, 3 new findings, 1 finding gone');
  });

  test('a first Audit has nothing to compare with', async () => {
    const { audit, findings, options } = await waiting('2026-09-15');
    const changes = reviewChanges(audit, findings, null, options);
    assert.ok(changes.words.every((word) => word.before === null));
    assert.deepEqual([changes.checks, changes.findings.added, changes.findings.gone], [[], [], []]);
    assert.equal(changesLine(changes, true), 'First Audit: nothing to compare with');
  });
});

describe('fixing a result', () => {
  test('the engine scores it again: the words, the score and the one ranking move with it', async () => {
    const { audit, input } = await waiting('2026-09-15');
    const missing = audit.checks.find((check) => check.key === 'ai_answers' && check.result === 'missing');
    assert.ok(missing);
    const payload = reviewPayload(input, { kind: 'result', checkId: missing.id, result: 'strong', reason: '  Named by ChatGPT when asked.  ' });
    assert.deepEqual(payload.scores, { overall: 73, discovered: 77, trusted: 69, chosen: 74, overall_change: 0, discovered_change: 2, trusted_change: 0, chosen_change: 0 });
    assert.deepEqual(payload.checks.find((check) => check.id === missing.id), { id: missing.id, result: 'strong', points_awarded: 10, team_checked: true, strength_rank: null, fix_rank: null });
    // Only the changed check takes a new result; every check carries its ranks again.
    assert.equal(payload.checks.filter((check) => check.result !== undefined).length, 1);
    assert.equal(payload.checks.length, audit.checks.length);
    const ranks = [...new Set([...payload.checks.map((check) => check.fix_rank), ...payload.findings.map((finding) => finding.fix_rank)].filter((rank) => rank !== null))];
    assert.deepEqual(
      ranks.sort((a, b) => Number(a) - Number(b)),
      Array.from({ length: ranks.length }, (_, index) => index + 1),
    );
    assert.deepEqual(payload.edits, [{ what: 'result', target: `check:ai_answers:${missing.programId}`, before: 'missing', after: 'strong', reason: 'Named by ChatGPT when asked.' }]);
    assert.deepEqual(payload.details, []);
  });

  test('a result moved below Strong gets the writer’s fix when it had none', async () => {
    const { audit, input } = await waiting('2026-09-15');
    const mobile = audit.checks.find((check) => check.key === 'mobile_friendly');
    assert.equal(mobile?.result, 'strong');
    assert.deepEqual(mobile?.detail?.fixSteps, []);
    const advice = { whyItMatters: 'Most students browse on a phone.', steps: ['Fix the menu on small screens.'], difficulty: 'easy' as const, readyFix: { kind: 'text' as const, title: 'A note for your web team', text: 'Make the menu fit a 360 pixel screen.' } };
    const payload = reviewPayload({ ...input, advice }, { kind: 'result', checkId: mobile?.id ?? '', result: 'okay', reason: 'The menu covers the page on small phones.' });
    assert.deepEqual(payload.details, [{ audit_check_id: mobile?.id, why_it_matters: advice.whyItMatters, fix_steps: advice.steps, difficulty: 'easy', ready_fix: advice.readyFix }]);
    const row = payload.checks.find((check) => check.id === mobile?.id);
    assert.equal(row?.result, 'okay');
    assert.equal(typeof row?.fix_rank, 'number');
  });

  test('a reason is needed, and a different result', async () => {
    const { audit, input } = await waiting('2026-09-15');
    const check = audit.checks[0];
    assert.ok(check);
    assert.throws(() => reviewPayload(input, { kind: 'result', checkId: check.id, result: check.result === 'weak' ? 'okay' : 'weak', reason: '  ' }), new ReviewError('Say in a few words why the result is different.'));
    assert.throws(() => reviewPayload(input, { kind: 'result', checkId: check.id, result: check.result, reason: 'Checked again.' }), new ReviewError('That is the result already.'));
    assert.throws(() => reviewPayload(input, { kind: 'result', checkId: 'nope', result: 'okay', reason: 'Checked again.' }), new ReviewError('That check is not in this Audit.'));
  });
});

describe('fixing a line', () => {
  test('what was seen, or a fix’s steps, change nothing in the score', async () => {
    const { audit, input } = await waiting('2026-09-15');
    const fees = audit.checks.find((check) => check.key === 'fees_shown' && check.result === 'okay');
    assert.ok(fees);
    const seen = reviewPayload(input, { kind: 'line', on: 'check', checkId: fees.id, field: 'finding', value: ' A fee range shown for each year. ', reason: 'Clearer.' });
    assert.deepEqual(seen.details, [{ audit_check_id: fees.id, finding: 'A fee range shown for each year.' }]);
    assert.equal(seen.scores.overall, audit.scores.overall);
    assert.deepEqual(seen.edits, [{ what: 'line', target: `check:fees_shown:${fees.programId}:finding`, before: fees.detail?.finding, after: 'A fee range shown for each year.', reason: 'Clearer.' }]);
    // Steps: one a line, numbers taken off.
    const steps = reviewPayload(input, { kind: 'line', on: 'check', checkId: fees.id, field: 'fix_steps', value: '1. Add the yearly fee.\n2) List other charges.\n\n' });
    assert.deepEqual(steps.details, [{ audit_check_id: fees.id, fix_steps: ['Add the yearly fee.', 'List other charges.'] }]);
    assert.equal(steps.edits[0]?.reason, null);
    // A ready fix written as text.
    const ready = reviewPayload(input, { kind: 'line', on: 'check', checkId: fees.id, field: 'ready_fix', value: 'Year 1: ₹[amount]' });
    assert.deepEqual((ready.details[0] as { ready_fix: unknown }).ready_fix, { kind: 'text', title: fees.detail?.readyFix?.title ?? 'Ready to copy', text: 'Year 1: ₹[amount]' });
  });

  test('a finding’s line, or its fix when it has one', async () => {
    const { findings, input } = await waiting('2026-09-15');
    const thread = findings.find((finding) => finding.findingKey === 'eastgate-reddit-hostel-fees');
    const news = findings.find((finding) => finding.findingKey === 'eastgate-news-health-camp');
    assert.ok(thread && news);
    const payload = reviewPayload(input, { kind: 'line', on: 'finding', findingId: thread.id, field: 'fix_title', value: 'Answer the hostel fee thread' });
    assert.deepEqual(
      payload.findings.find((row) => row.id === thread.id),
      { id: thread.id, fix_title: 'Answer the hostel fee thread', fix_rank: 1 },
    );
    assert.equal(payload.edits[0]?.target, 'finding:eastgate-reddit-hostel-fees:fix_title');
    assert.throws(() => reviewPayload(input, { kind: 'line', on: 'finding', findingId: news.id, field: 'fix_steps', value: 'Write back.' }), new ReviewError('That finding has nothing to fix.'));
    assert.throws(() => reviewPayload(input, { kind: 'line', on: 'finding', findingId: thread.id, field: 'line', value: '   ' }), new ReviewError('Write the line first.'));
  });
});

describe('taking out a finding', () => {
  test('it leaves the ranking, and the reason is kept', async () => {
    const { findings, input } = await waiting('2026-09-15');
    const thread = findings.find((finding) => finding.findingKey === 'eastgate-reddit-hostel-fees');
    assert.ok(thread);
    const payload = reviewPayload(input, { kind: 'remove', findingId: thread.id, reason: 'Another college with a similar name.' });
    assert.deepEqual(payload.findings.find((row) => row.id === thread.id), { id: thread.id, removed: true, fix_rank: null });
    const ranks = [...new Set([...payload.checks.map((check) => check.fix_rank), ...payload.findings.map((finding) => finding.fix_rank)].filter((rank) => rank !== null))];
    assert.deepEqual(
      ranks.sort((a, b) => Number(a) - Number(b)),
      Array.from({ length: 14 }, (_, index) => index + 1),
    );
    assert.deepEqual(payload.edits, [{ what: 'finding_removed', target: 'finding:eastgate-reddit-hostel-fees', before: thread.line, after: null, reason: 'Another college with a similar name.' }]);
    assert.throws(() => reviewPayload(input, { kind: 'remove', findingId: thread.id, reason: '' }), new ReviewError('Say in a few words why it is not about the college.'));
  });
});

describe('how long something has waited', () => {
  test('in hours, then days', () => {
    const since = '2026-09-29T04:30:00.000Z';
    assert.equal(waitedFor(since, new Date('2026-09-29T05:00:00.000Z')), 'under an hour');
    assert.equal(waitedFor(since, new Date('2026-09-29T05:30:00.000Z')), '1 hour');
    assert.equal(waitedFor(since, new Date('2026-09-29T15:30:00.000Z')), '11 hours');
    assert.equal(waitedFor(since, new Date('2026-09-30T04:30:00.000Z')), '1 day');
    assert.equal(waitedFor(since, new Date('2026-10-04T10:00:00.000Z')), '5 days');
    assert.equal(waitedFor(since, new Date('2026-09-28T04:30:00.000Z')), 'under an hour');
  });
});

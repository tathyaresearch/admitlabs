import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { sampleAuditChain } from '../sample/world.ts';
import { markKey, markOutcome, pointsAddedText } from './marks.ts';
import { stored } from './testing.ts';
import type { StoredAudit, StoredCheck } from './view.ts';

// What a fix marked done turns into once the next Audit has checked it, on the sample data and
// on small made-up Audits.

async function northbankSeptember() {
  const chain = await sampleAuditChain('northbank-college', 'own', '2026-09-10');
  const latest = chain.at(-1);
  if (!latest) throw new Error('no Audit');
  return { audit: stored(latest.record), names: latest.names };
}

function check(key: StoredCheck['key'], programId: string | null, previousResult: StoredCheck['previousResult'], result: StoredCheck['result'], pointsAwarded: number, pointsMax: number): StoredCheck {
  return {
    id: `${key}-${programId}`,
    programId,
    pillar: 'trusted',
    key,
    result,
    pointsAwarded,
    pointsMax,
    strengthRank: null,
    fixRank: null,
    previousResult,
    checkedAt: '2026-09-15T04:30:00.000Z',
    detail: { finding: `Found for ${programId ?? 'everyone'}.`, whyItMatters: null, howToFix: null, fixSteps: [], difficulty: 'medium', sourceUrl: 'https://site.example' },
  };
}

const audit = (checks: StoredCheck[], programCount: number): Pick<StoredAudit, 'checks' | 'programCount'> => ({ checks, programCount });
const NAMES = new Map([
  ['bba', 'BBA'],
  ['mba', 'MBA'],
]);

describe('a fix marked done, after the next Audit', () => {
  test('Northbank fixed its enquiry buttons: Weak to Okay, 2 points on the overall score', async () => {
    const { audit: september, names } = await northbankSeptember();
    const outcome = markOutcome('easy_enquiry', september, names);
    assert.deepEqual(outcome, { kind: 'confirmed', points: 2, moved: [{ programs: [], from: 'weak', to: 'okay' }] });
    assert.equal(pointsAddedText(outcome.kind === 'confirmed' ? outcome.points : 0), '2 points added');
  });

  test('Northbank marked its BBA fees done, but the Audit still found them Weak', async () => {
    const { audit: september, names } = await northbankSeptember();
    const outcome = markOutcome('fees_shown', september, names);
    assert.equal(outcome.kind, 'not_yet');
    assert.equal(outcome.kind === 'not_yet' ? outcome.result : null, 'weak');
    assert.ok(outcome.kind === 'not_yet' && outcome.finding && outcome.finding.length > 0);
  });

  test('a program check counts once in its program; an institution check in every program', () => {
    // Placement proof moved in BBA only: 9 of 30 to 18 of 30 is 9 points in one of two programs' Trusted.
    const program = markOutcome('placement_proof', audit([check('placement_proof', 'bba', 'weak', 'okay', 18, 30), check('placement_proof', 'mba', 'weak', 'weak', 9, 30)], 2), NAMES);
    assert.deepEqual(program, { kind: 'confirmed', points: 1.5, moved: [{ programs: ['BBA'], from: 'weak', to: 'okay' }] });
    // Review rating moved for the whole institution: 7.5 of 25 to 25 of 25 is 17.5 points in every program's Trusted.
    const institution = markOutcome('review_rating', audit([check('review_rating', null, 'weak', 'strong', 25, 25)], 2), NAMES);
    assert.deepEqual(institution, { kind: 'confirmed', points: 17.5 / 3, moved: [{ programs: [], from: 'weak', to: 'strong' }] });
  });

  test('programs that moved the same way share a line, named in order', () => {
    const outcome = markOutcome(
      'fees_shown',
      audit([check('fees_shown', 'mba', 'missing', 'strong', 25, 25), check('fees_shown', 'bba', 'missing', 'strong', 25, 25), check('fees_shown', 'x', 'weak', 'okay', 15, 25)], 3),
      NAMES,
    );
    assert.equal(outcome.kind, 'confirmed');
    assert.deepEqual(outcome.kind === 'confirmed' ? outcome.moved : [], [
      { programs: ['BBA', 'MBA'], from: 'missing', to: 'strong' },
      { programs: ['A program'], from: 'weak', to: 'okay' },
    ]);
  });

  test('nothing moved: the weakest result and what was found there; a check the Audit did not run says nothing', () => {
    const outcome = markOutcome('placement_proof', audit([check('placement_proof', 'bba', 'okay', 'okay', 18, 30), check('placement_proof', 'mba', 'missing', 'missing', 0, 30)], 2), NAMES);
    assert.deepEqual(outcome, { kind: 'not_yet', result: 'missing', finding: 'Found for mba.' });
    assert.deepEqual(markOutcome('youtube', audit([], 1), NAMES), { kind: 'not_yet', result: null, finding: null });
    // A first Audit has nothing before it to compare with.
    assert.equal(markOutcome('youtube', audit([check('youtube', null, null, 'okay', 6, 10)], 1), NAMES).kind, 'not_yet');
  });

  test('points added read as whole numbers', () => {
    assert.equal(pointsAddedText(0.2), 'Less than 1 point added');
    assert.equal(pointsAddedText(0.6), '1 point added');
    assert.equal(pointsAddedText(5.83), '6 points added');
  });

  test('a mark and the thing it marks share one key', () => {
    assert.equal(markKey({ checkKey: 'fees_shown', thing: null, month: null }), 'check:fees_shown');
    assert.equal(markKey({ checkKey: null, thing: 'Post the full fee in one image.', month: '2026-09' }), '2026-09:Post the full fee in one image.');
  });
});

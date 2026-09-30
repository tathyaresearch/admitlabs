import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../../config/scoring.v1.ts';
import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../checks.ts';
import type { CheckKey, CheckResult, Difficulty } from '../types.ts';
import { itemPoints, outcomeRanks, rankFixes, rankWorking } from './rank.ts';
import { scoreAudit, type CheckOutcome } from './score.ts';

type InstitutionResults = Record<InstitutionCheckKey, CheckResult>;
type ProgramResults = Record<ProgramCheckKey, CheckResult>;

const everyInstitution = (result: CheckResult, overrides: Partial<InstitutionResults> = {}): InstitutionResults => ({
  ...(Object.fromEntries(INSTITUTION_CHECK_KEYS.map((key) => [key, result])) as InstitutionResults),
  ...overrides,
});
const everyProgram = (result: CheckResult, overrides: Partial<ProgramResults> = {}): ProgramResults => ({
  ...(Object.fromEntries(PROGRAM_CHECK_KEYS.map((key) => [key, result])) as ProgramResults),
  ...overrides,
});

function outcomes(institution: InstitutionResults, ...programs: ProgramResults[]): CheckOutcome[] {
  return scoreAudit({
    config: SCORING_V1,
    family: 'college_university',
    institution,
    programs: programs.map((results, index) => ({ id: `program-${index + 1}`, results })),
  }).outcomes;
}

const medium = () => 'medium' as Difficulty;
const keys = (items: ReadonlyArray<{ key: CheckKey }>) => items.map((item) => item.key);

// Northbank College, BBA, September 2026: nothing Strong yet.
const NORTHBANK = outcomes(
  everyInstitution('weak', {
    instagram_activity: 'okay',
    youtube: 'missing',
    review_rating: 'okay',
    approvals: 'okay',
    easy_enquiry: 'okay',
    mobile_friendly: 'okay',
  }),
  everyProgram('weak', { google_search: 'okay', program_page: 'okay', admission_steps: 'okay' }),
);

describe("what's working", () => {
  test('Northbank has nothing Strong, so the best Okay results fill in: Google search, Instagram, Review rating', () => {
    const working = rankWorking(NORTHBANK, 1);
    assert.deepEqual(keys(working.slice(0, 3)), ['google_search', 'instagram_activity', 'review_rating']);
    assert.ok(working.every((item) => item.strength === 'okay'));
    assert.deepEqual(
      working.map((item) => item.rank),
      working.map((_, index) => index + 1),
    );
    assert.equal(itemPoints(working[0] as never, 1), 6); // 18 points in Discovered is 6 on the overall score
  });

  test('Strong results come first, ranked by the points they earn; Okay results follow', () => {
    const working = rankWorking(
      outcomes(everyInstitution('weak', { review_rating: 'strong', other_socials: 'strong', instagram_activity: 'okay' }), everyProgram('weak', { fees_shown: 'strong' })),
      1,
    );
    assert.deepEqual(keys(working), ['review_rating', 'fees_shown', 'other_socials', 'instagram_activity']);
    assert.deepEqual(
      working.map((item) => item.strength),
      ['strong', 'strong', 'strong', 'okay'],
    );
  });

  test('ties keep the spec order: Discovered before Trusted before Chosen', () => {
    // Instagram (Discovered) and Review rating (Trusted) both earn 25 points.
    const working = rankWorking(outcomes(everyInstitution('missing', { review_rating: 'strong', instagram_activity: 'strong' }), everyProgram('missing')), 1);
    assert.deepEqual(keys(working), ['instagram_activity', 'review_rating']);
  });

  test('nothing Strong or Okay means an empty list', () => {
    assert.deepEqual(rankWorking(outcomes(everyInstitution('weak'), everyProgram('missing')), 1), []);
  });

  test('across programs, a program check groups the programs where it is Strong', () => {
    const working = rankWorking(outcomes(everyInstitution('missing'), everyProgram('missing', { google_search: 'strong' }), everyProgram('missing', { google_search: 'strong' }), everyProgram('missing', { google_search: 'okay' })), 3);
    assert.deepEqual(
      working.map((item) => [item.key, item.strength, item.outcomes.map((outcome) => outcome.programId)]),
      [
        ['google_search', 'strong', ['program-1', 'program-2']],
        ['google_search', 'okay', ['program-3']],
      ],
    );
    assert.equal(itemPoints(working[0] as never, 3), 60 / 9); // 30 points in two of three programs
  });
});

describe('what to fix', () => {
  test('Northbank: Placement proof (up to 7 points), Fees shown (about 6), Google profile (about 5)', () => {
    const fixes = rankFixes(NORTHBANK, 1, medium);
    assert.deepEqual(keys(fixes.slice(0, 3)), ['placement_proof', 'fees_shown', 'google_profile']);
    assert.deepEqual(
      fixes.slice(0, 3).map((item) => Math.round(itemPoints(item, 1) * 100) / 100),
      [7, 5.83, 4.67],
    );
  });

  test('every result below Strong is a fix, including Okay', () => {
    const fixes = rankFixes(NORTHBANK, 1, medium);
    assert.equal(fixes.length, 17);
    assert.ok(keys(fixes).includes('google_search'));
    const none = rankFixes(outcomes(everyInstitution('strong'), everyProgram('strong')), 1, medium);
    assert.deepEqual(none, []);
  });

  test('when two fixes are worth the same, the easier one comes first', () => {
    // YouTube, Instagram and Review rating could each add 10 points in their pillar.
    const difficulty: Record<string, Difficulty> = { youtube: 'hard', instagram_activity: 'medium', review_rating: 'easy' };
    const fixes = rankFixes(NORTHBANK, 1, (outcome) => difficulty[outcome.key] ?? 'medium');
    const tied = fixes.filter((item) => ['youtube', 'instagram_activity', 'review_rating'].includes(item.key));
    assert.deepEqual(keys(tied), ['review_rating', 'instagram_activity', 'youtube']);
    assert.deepEqual(
      tied.map((item) => item.value),
      [1000, 1000, 1000],
    );
  });

  test('a program check that needs work in several programs is one item naming them', () => {
    const list = outcomes(everyInstitution('strong'), everyProgram('strong', { fees_shown: 'weak' }), everyProgram('strong', { fees_shown: 'missing' }), everyProgram('strong'));
    const fixes = rankFixes(list, 3, (outcome) => (outcome.result === 'missing' ? 'medium' : 'easy'));
    assert.equal(fixes.length, 1);
    const fees = fixes[0];
    assert.deepEqual(
      fees?.outcomes.map((outcome) => [outcome.programId, outcome.result]),
      [
        ['program-1', 'weak'],
        ['program-2', 'missing'],
      ],
    );
    assert.equal(fees?.difficulty, 'medium'); // the hardest of the two
    assert.equal(fees && Math.round(itemPoints(fees, 3) * 100) / 100, 4.72); // (17.5 + 25) / 9
  });

  test('an institution check counts in every program, so it outranks the same gap in one program', () => {
    const list = outcomes(everyInstitution('strong', { easy_enquiry: 'missing' }), everyProgram('strong', { program_page: 'missing' }), everyProgram('strong'));
    const fixes = rankFixes(list, 2, medium);
    assert.deepEqual(keys(fixes), ['easy_enquiry', 'program_page']);
    assert.deepEqual(
      fixes.map((item) => Math.round(itemPoints(item, 2) * 100) / 100),
      [6.67, 3.33],
    );
  });
});

describe('ranks carried into storage', () => {
  test('grouped outcomes share their item rank', () => {
    const list = outcomes(everyInstitution('strong', { youtube: 'weak' }), everyProgram('strong', { fees_shown: 'weak' }), everyProgram('strong', { fees_shown: 'weak' }));
    const fixes = rankFixes(list, 2, medium);
    const ranks = outcomeRanks(fixes);
    const fees = list.filter((outcome) => outcome.key === 'fees_shown');
    assert.equal(fees.length, 2);
    assert.deepEqual(
      fees.map((outcome) => ranks.get(outcome)),
      [1, 1],
    );
    assert.equal(ranks.get(list.find((outcome) => outcome.key === 'youtube') as CheckOutcome), 2);
    assert.equal(ranks.get(list.find((outcome) => outcome.key === 'page_speed') as CheckOutcome), undefined);
  });
});

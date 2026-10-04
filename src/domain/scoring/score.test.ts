import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../../config/scoring.v1.ts';
import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../checks.ts';
import { scoreLabel } from '../scores.ts';
import { RESULTS, type CheckResult, type ScoringFamily } from '../types.ts';
import { compareScores, earnedHundredths, resultKey, roundHalfUp, scoreAudit, shareHundredths, type PreviousScores } from './score.ts';

// Spec 7.4: pillar = sum of weight x share, rounded; program = average of its pillars, rounded;
// overall and institution pillars = averages across programs, rounded. Halves round up.

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

function score(family: ScoringFamily, institution: InstitutionResults, ...programs: ProgramResults[]) {
  return scoreAudit({
    config: SCORING_V1,
    family,
    institution,
    programs: programs.map((results, index) => ({ id: `program-${index + 1}`, results })),
  });
}

// Northbank College's BBA in the sample data (a college), June and September 2026.
const NORTHBANK_SEPTEMBER = {
  institution: everyInstitution('weak', {
    instagram_activity: 'okay',
    youtube: 'missing',
    review_rating: 'okay',
    approvals: 'okay',
    easy_enquiry: 'okay',
    mobile_friendly: 'okay',
  }),
  bba: everyProgram('weak', { google_search: 'okay', program_page: 'okay', admission_steps: 'okay' }),
};
const NORTHBANK_JUNE = {
  institution: { ...NORTHBANK_SEPTEMBER.institution, instagram_activity: 'weak', easy_enquiry: 'weak' } as InstitutionResults,
  bba: NORTHBANK_SEPTEMBER.bba,
};

describe('rounding', () => {
  test('halves round up, everything else to the nearest whole number', () => {
    assert.equal(roundHalfUp(4350, 100), 44);
    assert.equal(roundHalfUp(4349, 100), 43);
    assert.equal(roundHalfUp(4351, 100), 44);
    assert.equal(roundHalfUp(1, 3), 0);
    assert.equal(roundHalfUp(2, 3), 1);
    assert.equal(roundHalfUp(157, 2), 79);
    assert.equal(roundHalfUp(0, 7), 0);
    assert.equal(roundHalfUp(10000, 100), 100);
  });

  test('only whole numbers go in, so floating point can never move a score', () => {
    assert.throws(() => roundHalfUp(43.5, 1));
    assert.throws(() => roundHalfUp(1, 0));
    assert.throws(() => roundHalfUp(-1, 2));
  });

  test('shares are counted in whole percentages', () => {
    assert.deepEqual(
      RESULTS.map((result) => shareHundredths(SCORING_V1, result)),
      [100, 60, 30, 0],
    );
    assert.throws(() => shareHundredths({ resultShares: { ...SCORING_V1.resultShares, okay: 0.605 } }, 'okay'));
  });

  test('points earned are exact: Weak on a 25 point check is 7.5 points', () => {
    assert.equal(earnedHundredths(SCORING_V1, 'college_university', 'fees_shown', 'weak'), 750);
    assert.equal(earnedHundredths(SCORING_V1, 'college_university', 'google_search', 'okay'), 1800);
    assert.equal(earnedHundredths(SCORING_V1, 'skilling', 'google_profile', 'strong'), 3000);
    assert.equal(earnedHundredths(SCORING_V1, 'skilling', 'youtube', 'missing'), 0);
  });
});

describe('scoreAudit', () => {
  for (const family of ['college_university', 'skilling'] as const) {
    test(`${family}: the same result everywhere gives that result's share`, () => {
      const expected: Record<CheckResult, number> = { strong: 100, okay: 60, weak: 30, missing: 0 };
      for (const result of RESULTS) {
        const scores = score(family, everyInstitution(result), everyProgram(result));
        assert.equal(scores.overall, expected[result], result);
        assert.deepEqual(scores.pillars, { discovered: expected[result], trusted: expected[result], chosen: expected[result] }, result);
      }
    });
  }

  test('Northbank BBA, September: pillars 43.5, 43.5, 49.5 round up to 44, 44, 50; program 46', () => {
    const scores = score('college_university', NORTHBANK_SEPTEMBER.institution, NORTHBANK_SEPTEMBER.bba);
    assert.deepEqual(scores.pillars, { discovered: 44, trusted: 44, chosen: 50 });
    assert.equal(scores.programs[0]?.overall, 46);
    assert.equal(scores.overall, 46);
  });

  test('Northbank BBA, June: 36, 44, 44 and 41 overall', () => {
    const scores = score('college_university', NORTHBANK_JUNE.institution, NORTHBANK_JUNE.bba);
    assert.deepEqual(scores.pillars, { discovered: 36, trusted: 44, chosen: 44 });
    assert.equal(scores.overall, 41);
  });

  test('each result earns its share of one check', () => {
    // Everything Strong except Google search (30 points in Discovered).
    const expected: Record<CheckResult, number> = { strong: 100, okay: 88, weak: 79, missing: 70 };
    for (const result of RESULTS) {
      const scores = score('college_university', everyInstitution('strong'), everyProgram('strong', { google_search: result }));
      assert.equal(scores.pillars.discovered, expected[result], result);
      assert.equal(scores.pillars.trusted, 100);
      assert.equal(scores.pillars.chosen, 100);
    }
  });

  test('skilling weights: Google profile counts more, YouTube and AI answers less', () => {
    const results = everyInstitution('strong', { google_profile: 'missing', youtube: 'missing' });
    const collegeScores = score('college_university', results, everyProgram('strong', { ai_answers: 'missing' }));
    const skillingScores = score('skilling', results, everyProgram('strong', { ai_answers: 'missing' }));
    // College: 100 - 20 - 10 - 10 = 60. Skilling: 100 - 30 - 5 - 5 = 60, from different checks.
    assert.equal(collegeScores.pillars.discovered, 60);
    assert.equal(skillingScores.pillars.discovered, 60);

    const profileOnly = everyInstitution('strong', { google_profile: 'missing' });
    assert.equal(score('college_university', profileOnly, everyProgram('strong')).pillars.discovered, 80);
    assert.equal(score('skilling', profileOnly, everyProgram('strong')).pillars.discovered, 70);

    const reviews = everyInstitution('strong', { review_rating: 'missing', faculty_leaders: 'missing' });
    assert.equal(score('college_university', reviews, everyProgram('strong')).pillars.trusted, 60);
    assert.equal(score('skilling', reviews, everyProgram('strong')).pillars.trusted, 60);
    const rating = everyInstitution('strong', { review_rating: 'missing' });
    assert.equal(score('college_university', rating, everyProgram('strong')).pillars.trusted, 75);
    assert.equal(score('skilling', rating, everyProgram('strong')).pillars.trusted, 70);
  });

  test('a pillar that lands on a half rounds up: skilling YouTube Weak is 96.5, so 97', () => {
    const scores = score('skilling', everyInstitution('strong', { youtube: 'weak' }), everyProgram('strong'));
    assert.equal(scores.pillars.discovered, 97);
    assert.equal(scores.overall, 99);
    assert.equal(score('college_university', everyInstitution('strong', { youtube: 'weak' }), everyProgram('strong')).pillars.discovered, 93);
  });

  test('program score is the average of its three pillars, rounded', () => {
    // 60, 70, 40: 56.67 rounds to 57.
    const scores = score('college_university', everyInstitution('strong'), everyProgram('missing'));
    assert.deepEqual(
      { discovered: scores.programs[0]?.discovered, trusted: scores.programs[0]?.trusted, chosen: scores.programs[0]?.chosen },
      { discovered: 60, trusted: 70, chosen: 40 },
    );
    assert.equal(scores.programs[0]?.overall, 57);
  });

  test('overall and institution pillars average the programs; a half rounds up', () => {
    const scores = score('college_university', everyInstitution('strong'), everyProgram('strong'), everyProgram('missing'));
    assert.deepEqual(
      scores.programs.map((program) => program.overall),
      [100, 57],
    );
    assert.equal(scores.overall, 79); // (100 + 57) / 2 = 78.5
    assert.deepEqual(scores.pillars, { discovered: 80, trusted: 85, chosen: 70 });
    // Each level rounds, so the overall can sit a point away from the plain average of the
    // three pillar numbers shown (here 78.3). This is expected.
    assert.equal(roundHalfUp(scores.pillars.discovered + scores.pillars.trusted + scores.pillars.chosen, 3), 78);
  });

  test('institution checks are shared by every program; program checks are per program', () => {
    const scores = score('college_university', everyInstitution('okay'), everyProgram('strong'), everyProgram('weak'), everyProgram('missing'));
    assert.equal(scores.outcomes.length, INSTITUTION_CHECK_KEYS.length + PROGRAM_CHECK_KEYS.length * 3);
    assert.equal(scores.outcomes.filter((outcome) => outcome.programId === null).length, 11);
    for (const program of ['program-1', 'program-2', 'program-3']) {
      assert.equal(scores.outcomes.filter((outcome) => outcome.programId === program).length, 6);
    }
    const instagram = scores.outcomes.find((outcome) => outcome.key === 'instagram_activity');
    assert.deepEqual(instagram && { earned: instagram.earned, max: instagram.maxPoints, pillar: instagram.pillar }, { earned: 1500, max: 25, pillar: 'discovered' });
  });

  test('needs at least one program, each once', () => {
    assert.throws(() => score('college_university', everyInstitution('strong')), /at least one program/);
    assert.throws(
      () =>
        scoreAudit({
          config: SCORING_V1,
          family: 'college_university',
          institution: everyInstitution('strong'),
          programs: [
            { id: 'same', results: everyProgram('strong') },
            { id: 'same', results: everyProgram('weak') },
          ],
        }),
      /only be audited once/,
    );
  });

  test('refuses a config with a missing weight', () => {
    const broken = {
      ...SCORING_V1,
      weights: { ...SCORING_V1.weights, skilling: { ...SCORING_V1.weights.skilling, chosen: { fees_shown: 100 } } },
    };
    assert.throws(() => scoreAudit({ config: broken, family: 'skilling', institution: everyInstitution('strong'), programs: [{ id: 'a', results: everyProgram('strong') }] }));
  });
});

describe('score labels (spec 7.4)', () => {
  test('70 to 100 Strong, 40 to 69 Okay, 0 to 39 Weak', () => {
    const cases: Array<[number, string]> = [
      [0, 'Weak'],
      [39, 'Weak'],
      [40, 'Okay'],
      [69, 'Okay'],
      [70, 'Strong'],
      [100, 'Strong'],
    ];
    for (const [value, label] of cases) assert.equal(scoreLabel(value, SCORING_V1), label, String(value));
  });

  test('the bands come from the config', () => {
    const stricter = { labels: [{ label: 'Strong' as const, min: 80, max: 100 }, { label: 'Okay' as const, min: 50, max: 79 }, { label: 'Weak' as const, min: 0, max: 49 }] };
    assert.equal(scoreLabel(75, stricter), 'Okay');
    assert.equal(scoreLabel(75, SCORING_V1), 'Strong');
  });
});

describe('change since the last Audit', () => {
  const june = score('college_university', NORTHBANK_JUNE.institution, NORTHBANK_JUNE.bba);
  const september = score('college_university', NORTHBANK_SEPTEMBER.institution, NORTHBANK_SEPTEMBER.bba);
  const asPrevious = (scores: ReturnType<typeof score>): PreviousScores => ({
    overall: scores.overall,
    pillars: scores.pillars,
    programs: scores.programs,
    results: new Map(scores.outcomes.map((outcome) => [resultKey(outcome.key, outcome.programId), outcome.result])),
  });

  test('the first Audit has nothing to compare with', () => {
    const changes = compareScores(september, null);
    assert.equal(changes.overall, null);
    assert.deepEqual(changes.pillars, { discovered: null, trusted: null, chosen: null });
    assert.equal(changes.programs.size, 0);
    assert.equal(changes.previousResults.size, 0);
  });

  test('Northbank: up 5 overall, Discovered up 8, Chosen up 6', () => {
    const changes = compareScores(september, asPrevious(june));
    assert.equal(changes.overall, 5);
    assert.deepEqual(changes.pillars, { discovered: 8, trusted: 0, chosen: 6 });
    assert.deepEqual(changes.programs.get('program-1'), { overall: 5, pillars: { discovered: 8, trusted: 0, chosen: 6 } });
    assert.equal(changes.previousResults.get(resultKey('instagram_activity', null)), 'weak');
    assert.equal(changes.previousResults.get(resultKey('google_search', 'program-1')), 'okay');
  });

  test('a drop is a negative change', () => {
    assert.equal(compareScores(june, asPrevious(september)).overall, -5);
  });

  test('when the programs differ, only matching programs show a change', () => {
    const switched = scoreAudit({
      config: SCORING_V1,
      family: 'college_university',
      institution: NORTHBANK_SEPTEMBER.institution,
      programs: [{ id: 'program-2', results: NORTHBANK_SEPTEMBER.bba }],
    });
    const changes = compareScores(switched, asPrevious(june));
    assert.equal(changes.overall, null);
    assert.deepEqual(changes.pillars, { discovered: null, trusted: null, chosen: null });
    assert.equal(changes.programs.size, 0);
    assert.equal(changes.previousResults.get(resultKey('instagram_activity', null)), 'weak');
    assert.equal(changes.previousResults.has(resultKey('google_search', 'program-2')), false);

    const added = score('college_university', NORTHBANK_SEPTEMBER.institution, NORTHBANK_SEPTEMBER.bba, everyProgram('okay'));
    const addedChanges = compareScores(added, asPrevious(june));
    assert.equal(addedChanges.overall, null);
    assert.equal(addedChanges.programs.get('program-1')?.overall, 5);
  });
});

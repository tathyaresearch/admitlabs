import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { PROGRAM_CHECK_KEYS, getCheck, isProgramCheck } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { classify } from '../domain/scoring/classify.ts';
import { resultKey } from '../domain/scoring/score.ts';
import { CHECK_KEYS, RESULTS, scoringFamily, type CheckKey } from '../domain/types.ts';
import { collect } from '../providers/collect.ts';
import { mockAnalysis } from '../providers/mock/index.ts';
import type { ProgramRef } from '../providers/types.ts';
import { PROFILE_MONTHS, profileResult, sampleInstitution, SAMPLE_INSTITUTIONS, toInstitutionRef, toProgramRefs, type SampleInstitution } from '../sample/index.ts';
import { factsFromSignals, findingsFromSignals, IncompleteFactsError, type CheckSignal } from './facts.ts';
import { prepareAudit, type PreviousAudit } from './record.ts';

// The whole path on sample data: mock providers, facts, the engine, and the stored record.

const CHECK_KEY_SET: ReadonlySet<string> = new Set(CHECK_KEYS);

async function signalsFor(sample: SampleInstitution, asOf: Date): Promise<CheckSignal[]> {
  const institution = toInstitutionRef(sample);
  const found = [
    ...(await collect({ kind: 'institution', institution }, asOf)),
    ...(await Promise.all(toProgramRefs(sample).map((program) => collect({ kind: 'program', institution, program }, asOf)))).flat(),
  ];
  return found
    .filter((signal) => CHECK_KEY_SET.has(signal.key))
    .map((signal) => ({ key: signal.key as CheckKey, programId: signal.programId, value: signal.value, sourceUrl: signal.sourceUrl, fetchedAt: signal.fetchedAt }));
}

const named = (programs: readonly ProgramRef[]) => programs.map((program) => ({ id: program.id, name: program.name }));

async function auditOf(slug: string, day: string, options: { programKeys?: readonly string[]; previous?: PreviousAudit | null } = {}) {
  const sample = sampleInstitution(slug);
  const asOf = istDate(day, 10);
  const programs = toProgramRefs(sample).filter((program) => !options.programKeys || options.programKeys.includes(program.programKey ?? ''));
  const collected = factsFromSignals(await signalsFor(sample, asOf), named(programs));
  return prepareAudit(
    {
      institutionId: toInstitutionRef(sample).id,
      institutionType: sample.type,
      kind: 'team',
      trigger: 'manual',
      runAt: asOf,
      createdBy: null,
      config: SCORING_V1,
      thresholds: SCORING_V1.thresholds,
      programs: named(programs),
      collected,
      previous: options.previous ?? null,
    },
    mockAnalysis,
  );
}

describe('mock facts score back to the intended result', () => {
  test('every sample institution, every month, every check and program', async () => {
    let checked = 0;
    for (const sample of SAMPLE_INSTITUTIONS) {
      const programs = toProgramRefs(sample);
      const context = { family: scoringFamily(sample.type), thresholds: SCORING_V1.thresholds };
      for (const month of PROFILE_MONTHS) {
        const collected = factsFromSignals(await signalsFor(sample, istDate(`${month}-15`, 10)), named(programs));
        for (const key of CHECK_KEYS) {
          const targets = isProgramCheck(key) ? programs : [null];
          for (const program of targets) {
            const facts = program ? (collected.programs.get(program.id) as Record<string, unknown>)[key] : (collected.institution as Record<string, unknown>)[key];
            const actual = classify(key, facts as never, context);
            const intended = profileResult(sample.slug, key, program?.programKey ?? null, month);
            assert.equal(actual, intended, `${sample.slug} ${month} ${key} ${program?.name ?? ''}`);
            checked += 1;
          }
        }
      }
    }
    assert.ok(checked > 1000, `checked ${checked}`);
  });
});

describe('sample scores in September 2026 (golden values)', () => {
  const golden: Array<[string, number, string, [number, number, number]]> = [
    ['eastgate-university', 73, 'Strong', [75, 69, 74]],
    ['silverline-college', 77, 'Strong', [73, 82, 76]],
    ['brightpath-skills', 63, 'Okay', [55, 61, 72]],
    ['highfield-university', 51, 'Okay', [44, 66, 43]],
    ['cedar-skill-institute', 51, 'Okay', [62, 48, 42]],
    ['loomcraft-skills', 32, 'Weak', [35, 29, 34]],
    ['riverbend-college', 27, 'Weak', [28, 29, 24]],
  ];

  for (const [slug, overall, label, [discovered, trusted, chosen]] of golden) {
    test(`${slug}: ${overall}, ${label}`, async () => {
      const { evaluation } = await auditOf(slug, '2026-09-15');
      assert.equal(evaluation.overall, overall);
      assert.equal(evaluation.label, label);
      assert.deepEqual(evaluation.pillars, { discovered, trusted, chosen });
      // Discovered, Trusted and Chosen in words: Strong from 70, Okay from 40, Weak below.
      const word = (score: number) => (score >= 70 ? 'Strong' : score >= 40 ? 'Okay' : 'Weak');
      assert.deepEqual(evaluation.words, { discovered: word(discovered), trusted: word(trusted), chosen: word(chosen) });
    });
  }

  test('Northbank, Free on BBA: 41 in June, 46 in September, up 5', async () => {
    const june = await auditOf('northbank-college', '2026-06-10', { programKeys: ['bba'] });
    assert.equal(june.evaluation.overall, 41);
    const previous: PreviousAudit = {
      id: 'june-audit',
      overall: june.evaluation.overall,
      pillars: june.evaluation.pillars,
      programs: june.evaluation.programs,
      results: new Map(june.evaluation.outcomes.map((outcome) => [resultKey(outcome.key, outcome.programId), outcome.result])),
    };
    const september = await auditOf('northbank-college', '2026-09-10', { programKeys: ['bba'], previous });
    assert.equal(september.evaluation.overall, 46);
    assert.equal(september.record.overall_change, 5);
    assert.equal(september.record.previous_audit_id, 'june-audit');
    assert.equal(september.record.programs[0]?.overall_change, 5);
    const instagram = september.record.checks.find((check) => check.check_key === 'instagram_activity');
    assert.deepEqual([instagram?.result, instagram?.previous_result], ['okay', 'weak']);
  });

  test('Eastgate climbs from 59 in April into Strong from July', async () => {
    const scores = [];
    for (const day of ['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15']) scores.push((await auditOf('eastgate-university', day)).evaluation.overall);
    assert.deepEqual(scores, [59, 61, 69, 72]);
  });
});

describe('the stored record', () => {
  test('one row per check: 11 shared, 6 for each program, with source, date and advice', async () => {
    const { record } = await auditOf('eastgate-university', '2026-09-15');
    assert.equal(record.checks.length, 11 + PROGRAM_CHECK_KEYS.length * 5);
    assert.equal(record.programs.length, 5);
    for (const check of record.checks) {
      assert.ok(new URL(check.source_url).hostname.endsWith('.example'), check.source_url);
      assert.ok(!Number.isNaN(Date.parse(check.checked_at)));
      assert.ok(check.finding.length > 0 && !hasDashes(check.finding), check.finding);
      assert.ok(check.why_it_matters.length > 0);
      assert.equal(check.points_max, SCORING_V1.weights.college_university[getCheck(check.check_key).pillar][check.check_key]);
      assert.ok(check.points_awarded >= 0 && check.points_awarded <= check.points_max);
      if (check.result === 'strong') {
        assert.equal(check.how_to_fix, null);
        assert.equal(check.fix_rank, null);
      } else {
        assert.ok(check.how_to_fix && check.difficulty, `${check.check_key} ${check.result}`);
        assert.ok(check.fix_rank !== null);
      }
    }
  });

  test('Free: the top 3 to fix are ranked 1 to 3; only a check Strong everywhere is ranked as working', async () => {
    const { record } = await auditOf('northbank-college', '2026-09-10', { programKeys: ['bba'] });
    const byRank = (field: 'strength_rank' | 'fix_rank') =>
      record.checks
        .filter((check) => (check[field] ?? 99) <= 3)
        .sort((a, b) => (a[field] ?? 0) - (b[field] ?? 0))
        .map((check) => check.check_key);
    // Nothing is Strong yet, so nothing is ranked as working, and Free sees details for its top 3 fixes only.
    assert.deepEqual(byRank('strength_rank'), []);
    // All three are High impact; the quicker fees fix comes first.
    assert.deepEqual(byRank('fix_rank'), ['fees_shown', 'placement_proof', 'google_profile']);
    assert.equal(record.checks.find((check) => check.check_key === 'fees_shown')?.points_awarded, 7.5);
    // Every check carries exactly one of the two ranks.
    for (const check of record.checks) assert.equal((check.strength_rank === null) !== (check.fix_rank === null), true, check.check_key);
  });

  test('when a check has no data, nothing is saved', async () => {
    const sample = sampleInstitution('riverbend-college');
    const signals = (await signalsFor(sample, istDate('2026-09-18', 10))).filter((signal) => signal.key !== 'page_speed');
    assert.throws(() => factsFromSignals(signals, named(toProgramRefs(sample))), (error) => error instanceof IncompleteFactsError && error.missing.includes('Speed'));
  });

  test('the newest signal for a check wins', async () => {
    const sample = sampleInstitution('cedar-skill-institute');
    const older = await signalsFor(sample, istDate('2026-04-15', 10));
    const newer = await signalsFor(sample, istDate('2026-09-18', 10));
    const collected = factsFromSignals([...newer, ...older], named(toProgramRefs(sample)));
    assert.equal(collected.sources.get(resultKey('page_speed', null))?.checkedAt, istDate('2026-09-18', 10).toISOString());
  });
});

describe('fix advice bank', () => {
  test('every check and result, for every type: plain text, no dashes, a difficulty below Strong', async () => {
    const sample = sampleInstitution('eastgate-university');
    const collected = factsFromSignals(await signalsFor(sample, istDate('2026-09-15', 10)), named(toProgramRefs(sample)));
    const programId = toProgramRefs(sample)[0]?.id as string;
    for (const key of CHECK_KEYS) {
      const facts = isProgramCheck(key) ? (collected.programs.get(programId) as Record<string, unknown>)[key] : (collected.institution as Record<string, unknown>)[key];
      for (const institutionType of ['college', 'university', 'skilling'] as const) {
        for (const result of RESULTS) {
          const advice = await mockAnalysis.fixAdvice({ checkKey: key, result, facts: facts as never, institutionType, programName: isProgramCheck(key) ? 'BBA' : null });
          assert.ok(advice.whyItMatters.length > 20, key);
          assert.equal(hasDashes(advice.whyItMatters + (advice.howToFix ?? '')), false, `${key} ${result}`);
          if (result === 'strong') assert.deepEqual([advice.howToFix, advice.steps, advice.difficulty], [null, [], null]);
          else {
            assert.ok(advice.howToFix && advice.howToFix.length > 20, `${key} ${result}`);
            assert.ok(advice.difficulty, `${key} ${result}`);
            assert.doesNotMatch(advice.howToFix ?? '', /this program/, 'program checks name the program');
            // Short numbered steps, one thing each, that read as the same advice in one paragraph.
            assert.ok(advice.steps.length >= 2 && advice.steps.length <= 4, `${key} ${result}: ${advice.steps.length} steps`);
            for (const step of advice.steps) assert.match(step, /^[A-Z“].{8,140}[.?]$/, `${key} ${result}: ${step}`);
            assert.equal(advice.howToFix, advice.steps.join(' '), `${key} ${result}`);
          }
        }
      }
    }
  });

  test('skilling institutes read about recognition, not approvals', async () => {
    const advice = await mockAnalysis.fixAdvice({
      checkKey: 'approvals',
      result: 'weak',
      facts: { shown: ['NSDC'], withProof: [], held: ['NSDC', 'Skill India'] },
      institutionType: 'skilling',
      programName: null,
    });
    assert.match(advice.whyItMatters, /skilling recognition/);
    assert.deepEqual(advice.steps, ['Add Skill India to your website. You hold it but do not show it yet.', 'Add the certificate or an official link for each one you show.']);
    assert.equal(advice.howToFix, advice.steps.join(' '));
  });
});

describe('findings and ready fixes in the stored record (version 2)', () => {
  async function eastgateWithFindings(review?: 'waiting' | 'approved') {
    const sample = sampleInstitution('eastgate-university');
    const asOf = istDate('2026-09-15', 10);
    const institution = toInstitutionRef(sample);
    const programs = toProgramRefs(sample);
    const found = [
      ...(await collect({ kind: 'institution', institution }, asOf)),
      ...(await Promise.all(programs.map((program) => collect({ kind: 'program', institution, program }, asOf)))).flat(),
    ];
    const signals = found.filter((signal) => CHECK_KEY_SET.has(signal.key)).map((signal) => ({ key: signal.key as CheckKey, programId: signal.programId, value: signal.value, sourceUrl: signal.sourceUrl, fetchedAt: signal.fetchedAt }));
    return prepareAudit(
      {
        institutionId: institution.id,
        institutionType: sample.type,
        kind: 'paid',
        trigger: 'scheduled',
        runAt: asOf,
        createdBy: null,
        config: SCORING_V1,
        thresholds: SCORING_V1.thresholds,
        programs: named(programs),
        collected: factsFromSignals(signals, named(programs)),
        findings: findingsFromSignals(found),
        previous: null,
        context: { institutionName: sample.name, city: sample.city, programNames: sample.programs.map((program) => program.name), institutionDetails: null, programDetails: new Map() },
        ...(review ? { review } : {}),
      },
      mockAnalysis,
    );
  }

  test('a finding with something to do carries its fix, impact and effort; the rest carry none', async () => {
    const { record } = await eastgateWithFindings();
    assert.ok(record.findings.length >= 5);
    for (const finding of record.findings) {
      const actionable = finding.kind === 'unanswered' || finding.kind === 'bad' || ((finding.kind === 'listing' || finding.kind === 'directory') && finding.listing !== null);
      assert.equal(finding.fix !== null, actionable, finding.finding_key);
      assert.equal(finding.fix_rank !== null, actionable, finding.finding_key);
      if (finding.fix) assert.ok(finding.fix.steps.length > 0 && finding.fix.ready_fix.title, finding.finding_key);
    }
    // The same complaint from three students is High and quick: first in the whole list.
    const complaint = record.findings.find((finding) => finding.finding_key === 'eastgate-reddit-hostel-fees');
    assert.equal(complaint?.fix?.impact, 'high');
    assert.equal(complaint?.fix_rank, 1);
  });

  test('checks and findings share one ranking: every place used once, a program check across programs once', async () => {
    const { record } = await eastgateWithFindings();
    const checkRanks = new Set(record.checks.flatMap((check) => (check.fix_rank === null ? [] : [check.fix_rank])));
    const findingRanks = record.findings.flatMap((finding) => (finding.fix_rank === null ? [] : [finding.fix_rank]));
    const all = [...checkRanks, ...findingRanks].sort((a, b) => a - b);
    assert.deepEqual(all, Array.from({ length: all.length }, (_, index) => index + 1));
  });

  test('every check below Strong has a ready fix; Strong ones need none', async () => {
    const { record } = await eastgateWithFindings();
    for (const check of record.checks) assert.equal(check.ready_fix !== null, check.result !== 'strong', `${check.check_key} ${check.program_id}`);
  });

  test('the review state goes into the record: approved unless asked to wait', async () => {
    assert.equal((await eastgateWithFindings()).record.review, 'approved');
    assert.equal((await eastgateWithFindings('waiting')).record.review, 'waiting');
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { istDate, monthKey } from '../domain/dates.ts';
import { itemPoints, rankFixes } from '../domain/scoring/rank.ts';
import { collect } from '../providers/collect.ts';
import { mockAnalysis } from '../providers/mock/index.ts';
import { sampleInstitution, toInstitutionRef, toProgramRefs } from '../sample/index.ts';
import { CHECK_KEYS, type CheckKey } from '../domain/types.ts';
import { factsFromSignals, type CheckSignal } from './facts.ts';
import { prepareAudit, type AuditRecord } from './record.ts';
import { historyByMonth, overviewView, pointsEarnedText, pointsToGainText, programView, type StoredAudit } from './view.ts';

// The Audit screens' view model, from records built on sample data.

const KEYS: ReadonlySet<string> = new Set(CHECK_KEYS);

async function recordFor(slug: string, day: string, programKeys?: readonly string[]) {
  const sample = sampleInstitution(slug);
  const institution = toInstitutionRef(sample);
  const asOf = istDate(day, 10);
  const programs = toProgramRefs(sample).filter((program) => !programKeys || programKeys.includes(program.programKey ?? ''));
  const found = [
    ...(await collect({ kind: 'institution', institution }, asOf)),
    ...(await Promise.all(programs.map((program) => collect({ kind: 'program', institution, program }, asOf)))).flat(),
  ];
  const signals: CheckSignal[] = found
    .filter((signal) => KEYS.has(signal.key))
    .map((signal) => ({ key: signal.key as CheckKey, programId: signal.programId, value: signal.value, sourceUrl: signal.sourceUrl, fetchedAt: signal.fetchedAt }));
  const named = programs.map((program) => ({ id: program.id, name: program.name }));
  const prepared = await prepareAudit(
    {
      institutionId: institution.id,
      institutionType: sample.type,
      kind: 'paid',
      trigger: 'scheduled',
      runAt: asOf,
      createdBy: null,
      config: SCORING_V1,
      thresholds: SCORING_V1.thresholds,
      programs: named,
      collected: factsFromSignals(signals, named),
      previous: null,
    },
    mockAnalysis,
  );
  return { ...prepared, names: new Map(named.map((program) => [program.id, program.name])), type: sample.type };
}

/** The record as a viewer reads it back. `freeDetails` hides details outside the top 3, as the database does for Free. */
function stored(record: AuditRecord, options: { freeDetails?: boolean; previousAuditId?: string | null } = {}): StoredAudit {
  const change = (value: number | null) => value;
  return {
    id: 'audit',
    runAt: record.run_at,
    kind: record.kind,
    trigger: record.trigger,
    programCount: record.programs.length,
    previousAuditId: options.previousAuditId ?? null,
    scores: { overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen },
    changes: { overall: change(record.overall_change), discovered: record.discovered_change, trusted: record.trusted_change, chosen: record.chosen_change },
    programs: record.programs.map((program) => ({
      programId: program.program_id,
      scores: { overall: program.overall, discovered: program.discovered, trusted: program.trusted, chosen: program.chosen },
      changes: { overall: program.overall_change, discovered: program.discovered_change, trusted: program.trusted_change, chosen: program.chosen_change },
    })),
    checks: record.checks.map((check, index) => {
      const open = !options.freeDetails || (check.strength_rank ?? 99) <= 3 || (check.fix_rank ?? 99) <= 3;
      return {
        id: `check-${index}`,
        programId: check.program_id,
        pillar: check.pillar,
        key: check.check_key,
        result: check.result,
        pointsAwarded: check.points_awarded,
        pointsMax: check.points_max,
        strengthRank: check.strength_rank,
        fixRank: check.fix_rank,
        previousResult: check.previous_result,
        checkedAt: check.checked_at,
        detail: open
          ? { finding: check.finding, whyItMatters: check.why_it_matters, howToFix: check.how_to_fix, difficulty: check.difficulty, sourceUrl: check.source_url }
          : null,
      };
    }),
  };
}

describe('the all-programs view', () => {
  test('Northbank on Free: the top 3 each way, with their details; the rest results only', async () => {
    const { record, names, type } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const view = overviewView(stored(record, { freeDetails: true }), { institutionType: type, programNames: names });
    assert.equal(view.scores.overall, 46);
    assert.equal(view.label, 'Needs work');
    assert.deepEqual(view.working.slice(0, 3).map((item) => item.name), ['Google search', 'Instagram', 'Review rating']);
    assert.deepEqual(view.fixes.slice(0, 3).map((item) => [item.name, pointsToGainText(item.points)]), [
      ['Placement proof', 'Could add up to 7 points'],
      ['Fees shown', 'Could add up to 6 points'],
      ['Google profile', 'Could add up to 5 points'],
    ]);
    assert.ok(view.fixes.slice(0, 3).every((item) => item.parts.every((part) => part.detail !== null) && item.difficulty !== null));
    // Beyond the top 3 fixes, details stay hidden, except for checks already open as a top 3 strength.
    const topStrengths = new Set(view.working.slice(0, 3).map((item) => item.key));
    for (const item of view.fixes.slice(3)) {
      const open = item.parts.every((part) => part.detail !== null);
      assert.equal(open, topStrengths.has(item.key), item.name);
    }
    assert.equal(view.fixes.length, 17);
    assert.equal(view.firstAudit, true);
  });

  test('Eastgate on Paid: grouped fixes across 5 programs, with the same points as the engine', async () => {
    const { record, evaluation, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const view = overviewView(stored(record), { institutionType: type, programNames: names });
    assert.equal(view.scores.overall, 73);
    assert.equal(view.fixes.length, evaluation.fixes.length);
    view.fixes.forEach((item, index) => {
      const engine = evaluation.fixes[index];
      assert.equal(item.key, engine?.key);
      assert.equal(item.parts.length, engine?.outcomes.length);
      assert.ok(Math.abs(item.points - itemPoints(engine as never, 5)) < 1e-9, item.name);
    });
    const grouped = view.fixes.find((item) => item.parts.length > 1);
    assert.ok(grouped && grouped.parts.every((part) => part.programName));
  });

  test('area by area: 17 checks in 3 pillars; program checks show each program', async () => {
    const { record, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const view = overviewView(stored(record), { institutionType: type, programNames: names });
    assert.deepEqual(view.areas.map((area) => [area.pillar, area.rows.length]), [
      ['discovered', 6],
      ['trusted', 5],
      ['chosen', 6],
    ]);
    const search = view.areas[0]?.rows.find((row) => row.key === 'google_search');
    assert.equal(search?.parts.length, 5);
    assert.deepEqual(search?.parts.map((part) => part.programName), ['B.Sc Data Analytics', 'B.Sc Nursing', 'BBA', 'BCA', 'MBA']);
    assert.equal(view.areas[0]?.rows.find((row) => row.key === 'instagram_activity')?.parts.length, 1);
  });

  test('change flags: a first Audit, and programs that changed', async () => {
    const { record, names, type } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const changed = overviewView(stored(record, { previousAuditId: 'earlier' }), { institutionType: type, programNames: names });
    assert.deepEqual([changed.firstAudit, changed.programsChanged], [false, true]);
  });
});

describe('the one-program view', () => {
  test('Eastgate MBA: its own score, its checks plus shared ones, ranked for that program', async () => {
    const { record, evaluation, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const mba = [...names.entries()].find(([, name]) => name === 'MBA')?.[0] as string;
    const view = programView(stored(record), mba, { institutionType: type, programNames: names });
    assert.ok(view);
    const engineRow = evaluation.programs.find((program) => program.programId === mba);
    assert.equal(view.scores.overall, engineRow?.overall);
    assert.equal(view.areas.flatMap((area) => area.rows).reduce((sum, row) => sum + row.parts.length, 0), 17);
    const own = evaluation.outcomes.filter((outcome) => outcome.programId === null || outcome.programId === mba);
    const expected = rankFixes(own, 1, () => 'medium').map((item) => item.key);
    assert.equal(view.fixes.length, expected.length);
    assert.ok(view.fixes.every((item) => item.points > 0));
    assert.equal(programView(stored(record), 'not-a-program', { institutionType: type, programNames: names }), null);
  });
});

describe('history and wording', () => {
  test('one point per month: the latest Audit that month', () => {
    const points = historyByMonth(
      [
        { id: 'a', runAt: istDate('2026-09-15', 10).toISOString(), scores: { overall: 70, discovered: 0, trusted: 0, chosen: 0 } },
        { id: 'b', runAt: istDate('2026-08-15', 10).toISOString(), scores: { overall: 66, discovered: 0, trusted: 0, chosen: 0 } },
        { id: 'c', runAt: istDate('2026-09-20', 10).toISOString(), scores: { overall: 73, discovered: 0, trusted: 0, chosen: 0 } },
      ],
      (runAt) => monthKey(new Date(runAt)),
    );
    assert.deepEqual(points, [
      { month: '2026-08', score: 66 },
      { month: '2026-09', score: 73 },
    ]);
  });

  test('points wording', () => {
    assert.equal(pointsToGainText(0.3), 'Could add less than 1 point');
    assert.equal(pointsToGainText(0.5), 'Could add up to 1 point');
    assert.equal(pointsToGainText(5.83), 'Could add up to 6 points');
    assert.equal(pointsEarnedText(7.5, 25), '7.5 of 25 points');
    assert.equal(pointsEarnedText(18, 30), '18 of 30 points');
  });
});

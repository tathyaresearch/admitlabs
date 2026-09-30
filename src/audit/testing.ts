// Test support only: builds a sample institution's Audit through the live path (mock providers,
// then the scoring engine), and reads it back the way a viewer would. Used by the Audit and
// report tests; the app never imports it.

import { SCORING_V1 } from '../config/scoring.v1.ts';
import { istDate } from '../domain/dates.ts';
import { CHECK_KEYS, type CheckKey } from '../domain/types.ts';
import { collect } from '../providers/collect.ts';
import { mockAnalysis } from '../providers/mock/index.ts';
import { sampleInstitution, toInstitutionRef, toProgramRefs } from '../sample/index.ts';
import { factsFromSignals, type CheckSignal } from './facts.ts';
import { prepareAudit, type AuditRecord } from './record.ts';
import type { StoredAudit } from './view.ts';

const KEYS: ReadonlySet<string> = new Set(CHECK_KEYS);

export async function recordFor(slug: string, day: string, programKeys?: readonly string[]) {
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
  return { ...prepared, names: new Map(named.map((program) => [program.id, program.name])), type: sample.type, institution };
}

/** The record as a viewer reads it back. `freeDetails` hides details outside the top 3, as the database does for Free. */
export function stored(record: AuditRecord, options: { freeDetails?: boolean; previousAuditId?: string | null } = {}): StoredAudit {
  return {
    id: 'audit',
    runAt: record.run_at,
    kind: record.kind,
    trigger: record.trigger,
    programCount: record.programs.length,
    previousAuditId: options.previousAuditId ?? null,
    scores: { overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen },
    changes: { overall: record.overall_change, discovered: record.discovered_change, trusted: record.trusted_change, chosen: record.chosen_change },
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

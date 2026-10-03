// Builds the finished Audit, ready to store, from collected facts. No database and no network:
// the caller loads the inputs and saves the record through record_audit().

import { classify } from '../domain/scoring/classify.ts';
import { evaluateAudit, type AuditEvaluation } from '../domain/scoring/evaluate.ts';
import { describeFinding } from '../domain/scoring/findings.ts';
import { resultKey, type PreviousScores } from '../domain/scoring/score.ts';
import type { ScoringConfig, Thresholds } from '../domain/scoring-config.ts';
import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS } from '../domain/checks.ts';
import type { CheckFacts } from '../domain/facts.ts';
import {
  scoringFamily,
  type AuditKind,
  type AuditTrigger,
  type CheckKey,
  type CheckResult,
  type Difficulty,
  type InstitutionType,
  type Pillar,
} from '../domain/types.ts';
import type { AnalysisProvider, FixAdvice } from '../providers/analysis.ts';
import type { CollectedFacts } from './facts.ts';

export type { AuditTrigger } from '../domain/types.ts';

/** Kinds an institution sees as its own Audits. Team and rival runs stay private. */
export const OWN_AUDIT_KINDS: readonly AuditKind[] = ['free', 'paid', 'client'];

export interface PreviousAudit extends PreviousScores {
  id: string;
}

export interface PrepareInput {
  institutionId: string;
  institutionType: InstitutionType;
  kind: AuditKind;
  trigger: AuditTrigger;
  runAt: Date;
  createdBy: string | null;
  config: ScoringConfig;
  thresholds: Thresholds;
  /** The programs this Audit covers: one for Free, all for everyone else. */
  programs: ReadonlyArray<{ id: string; name: string }>;
  collected: CollectedFacts;
  previous: PreviousAudit | null;
}

/** One row per check, with its details. Field names match the record_audit() payload. */
export interface CheckRecord {
  program_id: string | null;
  pillar: Pillar;
  check_key: CheckKey;
  result: CheckResult;
  points_awarded: number;
  points_max: number;
  strength_rank: number | null;
  fix_rank: number | null;
  previous_result: CheckResult | null;
  checked_at: string;
  finding: string;
  why_it_matters: string;
  how_to_fix: string | null;
  /** How to fix, in short steps (how_to_fix is the same as one paragraph). */
  fix_steps: string[];
  difficulty: Difficulty | null;
  source_url: string;
}

export interface ScoreRecord {
  overall: number;
  discovered: number;
  trusted: number;
  chosen: number;
  overall_change: number | null;
  discovered_change: number | null;
  trusted_change: number | null;
  chosen_change: number | null;
}

export interface AuditRecord extends ScoreRecord {
  institution_id: string;
  kind: AuditKind;
  trigger: AuditTrigger;
  run_at: string;
  config_version: number;
  created_by: string | null;
  previous_audit_id: string | null;
  programs: Array<ScoreRecord & { program_id: string }>;
  checks: CheckRecord[];
}

export interface PreparedAudit {
  record: AuditRecord;
  evaluation: AuditEvaluation;
}

export async function prepareAudit(input: PrepareInput, analysis: Pick<AnalysisProvider, 'fixAdvice'>): Promise<PreparedAudit> {
  const { collected, institutionType } = input;
  const context = { family: scoringFamily(institutionType), thresholds: input.thresholds };
  const names = new Map(input.programs.map((program) => [program.id, program.name]));

  // Advice first: ranking needs to know how hard each fix is.
  const advice = new Map<string, FixAdvice>();
  const ask = async <K extends CheckKey>(key: K, programId: string | null, facts: CheckFacts[K]) => {
    const result = classify(key, facts, context);
    advice.set(
      resultKey(key, programId),
      await analysis.fixAdvice({ checkKey: key, result, facts, institutionType, programName: programId ? (names.get(programId) ?? null) : null }),
    );
  };
  await Promise.all([
    ...INSTITUTION_CHECK_KEYS.map((key) => ask(key, null, collected.institution[key] as never)),
    ...input.programs.flatMap((program) => {
      const facts = collected.programs.get(program.id);
      if (!facts) throw new Error(`No facts for ${program.name}.`);
      return PROGRAM_CHECK_KEYS.map((key) => ask(key, program.id, facts[key] as never));
    }),
  ]);

  const evaluation = evaluateAudit({
    config: input.config,
    thresholds: input.thresholds,
    institutionType,
    institution: collected.institution,
    programs: input.programs.map((program) => ({ id: program.id, facts: collected.programs.get(program.id) as never })),
    previous: input.previous,
    difficultyOf: (outcome) => advice.get(resultKey(outcome.key, outcome.programId))?.difficulty ?? 'medium',
  });

  const factsFor = (key: CheckKey, programId: string | null): unknown => {
    const facts: Readonly<Record<string, unknown>> | undefined = programId === null ? collected.institution : collected.programs.get(programId);
    return facts?.[key];
  };

  const checks: CheckRecord[] = evaluation.ranked.map((outcome) => {
    const id = resultKey(outcome.key, outcome.programId);
    const source = collected.sources.get(id);
    const tip = advice.get(id);
    if (!source || !tip) throw new Error(`Missing source or advice for ${id}.`);
    return {
      program_id: outcome.programId,
      pillar: outcome.pillar,
      check_key: outcome.key,
      result: outcome.result,
      points_awarded: outcome.earned / 100,
      points_max: outcome.maxPoints,
      strength_rank: outcome.strengthRank,
      fix_rank: outcome.fixRank,
      previous_result: outcome.previousResult,
      checked_at: source.checkedAt,
      finding: describeFinding(outcome.key, factsFor(outcome.key, outcome.programId) as never, {
        institutionType,
        programName: outcome.programId ? (names.get(outcome.programId) ?? null) : null,
      }),
      why_it_matters: tip.whyItMatters,
      how_to_fix: tip.howToFix,
      fix_steps: tip.steps,
      difficulty: tip.difficulty,
      source_url: source.sourceUrl,
    };
  });

  const { changes } = evaluation;
  const record: AuditRecord = {
    institution_id: input.institutionId,
    kind: input.kind,
    trigger: input.trigger,
    run_at: input.runAt.toISOString(),
    config_version: input.config.version,
    created_by: input.createdBy,
    previous_audit_id: input.previous?.id ?? null,
    overall: evaluation.overall,
    discovered: evaluation.pillars.discovered,
    trusted: evaluation.pillars.trusted,
    chosen: evaluation.pillars.chosen,
    overall_change: changes.overall,
    discovered_change: changes.pillars.discovered,
    trusted_change: changes.pillars.trusted,
    chosen_change: changes.pillars.chosen,
    programs: evaluation.programs.map((program) => {
      const change = changes.programs.get(program.programId);
      return {
        program_id: program.programId,
        overall: program.overall,
        discovered: program.discovered,
        trusted: program.trusted,
        chosen: program.chosen,
        overall_change: change?.overall ?? null,
        discovered_change: change?.pillars.discovered ?? null,
        trusted_change: change?.pillars.trusted ?? null,
        chosen_change: change?.pillars.chosen ?? null,
      };
    }),
    checks,
  };

  return { record, evaluation };
}

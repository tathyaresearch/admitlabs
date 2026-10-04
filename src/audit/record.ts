// Builds the finished Audit, ready to store, from collected facts and findings. No database and no
// network: the caller loads the inputs and saves the record through record_audit().
//
// The writer (the AI provider) words each fix and its ready fix; the details an institution added
// fill some of a ready fix's blanks, and are never read by scoring. A finding with something to do
// gets its impact and effort from the rules (src/domain/finding-rules.ts) and joins the checks' fixes
// in one ranking.

import { classify } from '../domain/scoring/classify.ts';
import { evaluateAudit, type AuditEvaluation } from '../domain/scoring/evaluate.ts';
import { describeFinding } from '../domain/scoring/findings.ts';
import { resultKey, type PreviousScores } from '../domain/scoring/score.ts';
import type { ScoringConfig, Thresholds } from '../domain/scoring-config.ts';
import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS } from '../domain/checks.ts';
import type { CheckFacts } from '../domain/facts.ts';
import { findingEffort, findingHasFix, findingImpact, type ListingProblem } from '../domain/finding-rules.ts';
import type { ReadyFix } from '../domain/ready-fix.ts';
import {
  scoringFamily,
  type AuditKind,
  type AuditTrigger,
  type CheckKey,
  type CheckResult,
  type Difficulty,
  type FindingKind,
  type FindingPlace,
  type Impact,
  type InstitutionType,
  type Pillar,
  type ReviewState,
} from '../domain/types.ts';
import type { AnalysisProvider, FindingFixText, FixAdvice, WritingContext } from '../providers/analysis.ts';
import type { CollectedFacts } from './facts.ts';

export type { AuditTrigger } from '../domain/types.ts';

/** Kinds an institution sees as its own Audits. Team and rival runs stay private. */
export const OWN_AUDIT_KINDS: readonly AuditKind[] = ['free', 'paid', 'client'];

export interface PreviousAudit extends PreviousScores {
  id: string;
}

/** Something found about the institution in What people say or Other places, as collected. */
export interface CollectedFinding {
  key: string;
  place: FindingPlace;
  kind: FindingKind;
  line: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  repeats: number;
  listing: ListingProblem | null;
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
  /** What people say and Other places. */
  findings?: readonly CollectedFinding[];
  previous: PreviousAudit | null;
  /** Who the fixes are for and the details they added, for the ready fixes. */
  context?: WritingContext;
  /** An own Audit waits for the team when its college has Review first on (spec section 25). */
  review?: ReviewState;
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
  /** A text or layout to copy. Null when the check is Strong. */
  ready_fix: ReadyFix | null;
  source_url: string;
}

/** One finding, with its fix when there is something to do. Field names match the record_audit() payload. */
export interface FindingRecord {
  place: FindingPlace;
  kind: FindingKind;
  finding_key: string;
  line: string;
  source_name: string;
  source_url: string;
  checked_at: string;
  repeats: number;
  listing: ListingProblem | null;
  fix: { title: string; why: string; steps: string[]; ready_fix: ReadyFix; effort: Difficulty; impact: Impact } | null;
  fix_rank: number | null;
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
  findings: FindingRecord[];
  review: ReviewState;
}

export interface PreparedAudit {
  record: AuditRecord;
  evaluation: AuditEvaluation;
}

/** A listing's ready fix shows the fees of the institution's first program with details added. */
function firstProgramDetails(context: WritingContext | undefined) {
  if (!context) return null;
  for (const name of context.programNames) {
    const details = context.programDetails.get(name);
    if (details) return details;
  }
  return null;
}

/** People say first, then Other places; otherwise in the order they were found. */
const PLACE_ORDER: Readonly<Record<FindingPlace, number>> = { people: 0, other: 1 };

export async function prepareAudit(input: PrepareInput, analysis: Pick<AnalysisProvider, 'fixAdvice' | 'findingFix'>): Promise<PreparedAudit> {
  const { collected, institutionType } = input;
  const context = { family: scoringFamily(institutionType), thresholds: input.thresholds };
  const names = new Map(input.programs.map((program) => [program.id, program.name]));

  // Advice first: ranking needs to know how hard each fix is.
  const advice = new Map<string, FixAdvice>();
  const ask = async <K extends CheckKey>(key: K, programId: string | null, facts: CheckFacts[K]) => {
    const result = classify(key, facts, context);
    advice.set(
      resultKey(key, programId),
      await analysis.fixAdvice({ checkKey: key, result, facts, institutionType, programName: programId ? (names.get(programId) ?? null) : null, context: input.context }),
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

  // Findings: the writer words each fix; the rules say its impact and effort, unless the writer knows better.
  const findings = [...(input.findings ?? [])].sort((a, b) => PLACE_ORDER[a.place] - PLACE_ORDER[b.place]);
  const findingFixes = new Map<string, { text: FindingFixText; impact: Impact; effort: Difficulty }>();
  await Promise.all(
    findings.map(async (finding) => {
      if (!findingHasFix(finding)) return;
      const impact = findingImpact(finding);
      const effort = findingEffort(finding);
      const text = await analysis.findingFix({
        finding: { place: finding.place, kind: finding.kind, key: finding.key, line: finding.line, source: finding.source, repeats: finding.repeats, listing: finding.listing },
        institutionType,
        institutionName: input.context?.institutionName ?? 'your institution',
        city: input.context?.city ?? 'your city',
        programNames: input.context?.programNames ?? [],
        details: { institution: input.context?.institutionDetails ?? null, program: firstProgramDetails(input.context) },
      });
      if (text && impact && effort) findingFixes.set(finding.key, { text, impact: text.impact ?? impact, effort: text.effort ?? effort });
    }),
  );

  const evaluation = evaluateAudit({
    config: input.config,
    thresholds: input.thresholds,
    institutionType,
    institution: collected.institution,
    programs: input.programs.map((program) => ({ id: program.id, facts: collected.programs.get(program.id) as never })),
    previous: input.previous,
    difficultyOf: (outcome) => advice.get(resultKey(outcome.key, outcome.programId))?.difficulty ?? 'medium',
    findingFixes: findings.flatMap((finding) => {
      const fix = findingFixes.get(finding.key);
      return fix ? [{ id: finding.key, impact: fix.impact, difficulty: fix.effort }] : [];
    }),
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
      ready_fix: tip.readyFix,
      source_url: source.sourceUrl,
    };
  });

  const findingRecords: FindingRecord[] = findings.map((finding) => {
    const fix = findingFixes.get(finding.key);
    return {
      place: finding.place,
      kind: finding.kind,
      finding_key: finding.key,
      line: finding.line,
      source_name: finding.source,
      source_url: finding.sourceUrl,
      checked_at: finding.checkedAt,
      repeats: finding.repeats,
      listing: finding.listing,
      fix: fix ? { title: fix.text.title, why: fix.text.why, steps: fix.text.steps, ready_fix: fix.text.readyFix, effort: fix.effort, impact: fix.impact } : null,
      fix_rank: evaluation.findingRanks.get(finding.key) ?? null,
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
    findings: findingRecords,
    review: input.review ?? 'approved',
  };

  return { record, evaluation };
}

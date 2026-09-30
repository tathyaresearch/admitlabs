// One call from facts to a finished Audit: classify every check, score it, compare it with
// the last Audit and rank what's working and what to fix. Pure: the caller loads the facts
// and the config, and stores what comes back.

import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../checks.ts';
import type { CheckFacts } from '../facts.ts';
import { scoreLabel, type ScoreLabel } from '../scores.ts';
import type { ScoringConfig, Thresholds } from '../scoring-config.ts';
import { scoringFamily, type CheckResult, type InstitutionType } from '../types.ts';
import { classify } from './classify.ts';
import { outcomeRanks, rankFixes, rankWorking, type DifficultyOf, type FixItem, type WorkingItem } from './rank.ts';
import { compareScores, resultKey, scoreAudit, type AuditScores, type CheckOutcome, type PreviousScores, type ScoreChanges } from './score.ts';

export type InstitutionFacts = { readonly [K in InstitutionCheckKey]: CheckFacts[K] };
export type ProgramFacts = { readonly [K in ProgramCheckKey]: CheckFacts[K] };

export interface EvaluateInput {
  config: ScoringConfig;
  /** From thresholdsFor(config), so peer comparison can slot in later. */
  thresholds: Thresholds;
  institutionType: InstitutionType;
  institution: InstitutionFacts;
  programs: ReadonlyArray<{ id: string; facts: ProgramFacts }>;
  previous: PreviousScores | null;
  difficultyOf: DifficultyOf;
}

export interface RankedOutcome extends CheckOutcome {
  strengthRank: number | null;
  fixRank: number | null;
  previousResult: CheckResult | null;
}

export interface AuditEvaluation extends AuditScores {
  label: ScoreLabel;
  changes: ScoreChanges;
  working: WorkingItem[];
  fixes: FixItem[];
  ranked: RankedOutcome[];
}

export function evaluateAudit(input: EvaluateInput): AuditEvaluation {
  const family = scoringFamily(input.institutionType);
  const context = { family, thresholds: input.thresholds };

  const institution = Object.fromEntries(INSTITUTION_CHECK_KEYS.map((key) => [key, classify(key, input.institution[key] as never, context)])) as Record<
    InstitutionCheckKey,
    CheckResult
  >;
  const programs = input.programs.map((program) => ({
    id: program.id,
    results: Object.fromEntries(PROGRAM_CHECK_KEYS.map((key) => [key, classify(key, program.facts[key] as never, context)])) as Record<
      ProgramCheckKey,
      CheckResult
    >,
  }));

  const scores = scoreAudit({ config: input.config, family, institution, programs });
  const changes = compareScores(scores, input.previous);
  const count = scores.programs.length;
  const working = rankWorking(scores.outcomes, count);
  const fixes = rankFixes(scores.outcomes, count, input.difficultyOf);
  const strengthRanks = outcomeRanks(working);
  const fixRanks = outcomeRanks(fixes);

  const ranked = scores.outcomes.map((outcome) => ({
    ...outcome,
    strengthRank: strengthRanks.get(outcome) ?? null,
    fixRank: fixRanks.get(outcome) ?? null,
    previousResult: changes.previousResults.get(resultKey(outcome.key, outcome.programId)) ?? null,
  }));

  return { ...scores, label: scoreLabel(scores.overall, input.config), changes, working, fixes, ranked };
}

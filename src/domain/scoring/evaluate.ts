// One call from facts to a finished Audit: classify every check, score it, compare it with
// the last Audit, give each part its word, and rank what's working and what to fix (with each
// fix's impact, and the fixes from findings in the same ranking). Pure: the caller loads the
// facts and the config, and stores what comes back.

import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../checks.ts';
import type { CheckFacts } from '../facts.ts';
import { scoreLabel, type ScoreLabel } from '../scores.ts';
import type { ScoringConfig, Thresholds } from '../scoring-config.ts';
import { PILLARS, scoringFamily, type CheckResult, type InstitutionType, type Pillar } from '../types.ts';
import { classify } from './classify.ts';
import { outcomeRanks, rankAllFixes, rankFixes, rankWorking, type DifficultyOf, type FindingFix, type FixItem, type WorkingItem } from './rank.ts';
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
  /** Fixes from findings (What people say, Other places), ranked with the checks' fixes. */
  findingFixes?: readonly FindingFix[];
}

export interface RankedOutcome extends CheckOutcome {
  strengthRank: number | null;
  fixRank: number | null;
  previousResult: CheckResult | null;
}

export interface AuditEvaluation extends AuditScores {
  label: ScoreLabel;
  /** Discovered, Trusted and Chosen in words: Strong, Okay or Weak. */
  words: Readonly<Record<Pillar, ScoreLabel>>;
  changes: ScoreChanges;
  working: WorkingItem[];
  /** The checks' fixes, each with its place in the one ranking as its rank. */
  fixes: FixItem[];
  /** Each finding fix's place in the same ranking, by its id. */
  findingRanks: Map<string, number>;
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
  const checkFixes = rankFixes(scores.outcomes, count, input.difficultyOf, input.config.impact);
  const all = rankAllFixes(checkFixes, input.findingFixes ?? []);
  const fixes = checkFixes.map((item) => ({ ...item, rank: all.checks.get(item) ?? item.rank }));
  const strengthRanks = outcomeRanks(working);
  const fixRanks = outcomeRanks(fixes);

  const ranked = scores.outcomes.map((outcome) => ({
    ...outcome,
    strengthRank: strengthRanks.get(outcome) ?? null,
    fixRank: fixRanks.get(outcome) ?? null,
    previousResult: changes.previousResults.get(resultKey(outcome.key, outcome.programId)) ?? null,
  }));

  const words = Object.fromEntries(PILLARS.map((pillar) => [pillar, scoreLabel(scores.pillars[pillar], input.config)])) as Record<Pillar, ScoreLabel>;
  return { ...scores, label: scoreLabel(scores.overall, input.config), words, changes, working, fixes, findingRanks: all.findings, ranked };
}

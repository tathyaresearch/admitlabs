// The Audit score model (spec section 7.4). Results and config in, every score out.
//
//   Pillar score   = sum of (check weight x result share), rounded to a whole number
//   Program score  = average of its three pillar scores, rounded
//   Overall score  = average of the audited programs' scores, rounded
//   Institution pillar scores = average of the programs' pillar scores, rounded
//
// The arithmetic is exact: points are counted in hundredths as whole numbers, so a half
// always rounds up and floating point never moves a score.

import { getCheck, INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../checks.ts';
import type { ScoringConfig } from '../scoring-config.ts';
import { PILLARS, type CheckKey, type CheckResult, type Pillar, type ScoringFamily } from '../types.ts';

export type PillarScores = Readonly<Record<Pillar, number>>;

export interface ProgramScores extends PillarScores {
  programId: string;
  overall: number;
}

/** One scored check: an institution check (programId null) or one program's check. */
export interface CheckOutcome {
  key: CheckKey;
  pillar: Pillar;
  programId: string | null;
  result: CheckResult;
  /** Points earned, in hundredths of a point (7.5 points is 750). */
  earned: number;
  /** The check's weight: the most it can earn, in whole points. */
  maxPoints: number;
}

export interface AuditScores {
  overall: number;
  pillars: PillarScores;
  programs: ProgramScores[];
  outcomes: CheckOutcome[];
}

export interface ScoreInput {
  config: Pick<ScoringConfig, 'weights' | 'resultShares'>;
  family: ScoringFamily;
  /** Results of the 11 institution checks, shared by every program. */
  institution: Readonly<Record<InstitutionCheckKey, CheckResult>>;
  /** Results of the 6 program checks, for each audited program. */
  programs: ReadonlyArray<{ id: string; results: Readonly<Record<ProgramCheckKey, CheckResult>> }>;
}

/** numerator / denominator as a whole number, halves rounding up. Exact for whole numbers. */
export function roundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator < 0 || denominator <= 0) {
    throw new Error(`roundHalfUp needs whole numbers, got ${numerator} / ${denominator}`);
  }
  const whole = Math.floor(numerator / denominator);
  const rest = numerator - whole * denominator;
  return rest * 2 >= denominator ? whole + 1 : whole;
}

/** A result's share of the check's points, in hundredths (Okay at 60% is 60). */
export function shareHundredths(config: Pick<ScoringConfig, 'resultShares'>, result: CheckResult): number {
  const hundredths = Math.round(config.resultShares[result] * 100);
  if (Math.abs(hundredths - config.resultShares[result] * 100) > 1e-9) {
    throw new Error(`The ${result} share must be a whole percentage, got ${config.resultShares[result]}`);
  }
  return hundredths;
}

export function checkWeight(config: Pick<ScoringConfig, 'weights'>, family: ScoringFamily, key: CheckKey): number {
  const weight = config.weights[family][getCheck(key).pillar][key];
  if (weight === undefined || !Number.isInteger(weight) || weight < 0) {
    throw new Error(`No whole-number weight for ${key} in the ${family} weights`);
  }
  return weight;
}

/** Points a result earns on a check, in hundredths of a point. */
export function earnedHundredths(config: ScoreInput['config'], family: ScoringFamily, key: CheckKey, result: CheckResult): number {
  return checkWeight(config, family, key) * shareHundredths(config, result);
}

function outcome(config: ScoreInput['config'], family: ScoringFamily, key: CheckKey, programId: string | null, result: CheckResult): CheckOutcome {
  return {
    key,
    pillar: getCheck(key).pillar,
    programId,
    result,
    earned: earnedHundredths(config, family, key, result),
    maxPoints: checkWeight(config, family, key),
  };
}

/** The whole score model. Pure: no database, no clock. */
export function scoreAudit(input: ScoreInput): AuditScores {
  const { config, family } = input;
  if (input.programs.length === 0) throw new Error('An Audit needs at least one program.');
  const ids = new Set(input.programs.map((program) => program.id));
  if (ids.size !== input.programs.length) throw new Error('Each program can only be audited once.');

  const shared = INSTITUTION_CHECK_KEYS.map((key) => outcome(config, family, key, null, input.institution[key]));
  const sharedByPillar = sumByPillar(shared);

  const perProgram = input.programs.map((program) => {
    const own = PROGRAM_CHECK_KEYS.map((key) => outcome(config, family, key, program.id, program.results[key]));
    const ownByPillar = sumByPillar(own);
    const pillars = Object.fromEntries(
      PILLARS.map((pillar) => [pillar, roundHalfUp(sharedByPillar[pillar] + ownByPillar[pillar], 100)]),
    ) as Record<Pillar, number>;
    const overall = roundHalfUp(pillars.discovered + pillars.trusted + pillars.chosen, 3);
    return { scores: { programId: program.id, overall, ...pillars } satisfies ProgramScores, own };
  });

  const programs = perProgram.map((entry) => entry.scores);
  const count = programs.length;
  const pillars = Object.fromEntries(
    PILLARS.map((pillar) => [pillar, roundHalfUp(programs.reduce((sum, program) => sum + program[pillar], 0), count)]),
  ) as Record<Pillar, number>;
  const overall = roundHalfUp(programs.reduce((sum, program) => sum + program.overall, 0), count);

  return { overall, pillars, programs, outcomes: [...shared, ...perProgram.flatMap((entry) => entry.own)] };
}

function sumByPillar(outcomes: readonly CheckOutcome[]): Record<Pillar, number> {
  const sums: Record<Pillar, number> = { discovered: 0, trusted: 0, chosen: 0 };
  for (const item of outcomes) sums[item.pillar] += item.earned;
  return sums;
}

/** What the last Audit said, for "change since last Audit". */
export interface PreviousScores {
  overall: number;
  pillars: PillarScores;
  programs: readonly ProgramScores[];
  /** Results by check, keyed by resultKey(). */
  results: ReadonlyMap<string, CheckResult>;
}

export type PillarChanges = Readonly<Record<Pillar, number | null>>;

export interface ScoreChanges {
  /** Overall and pillar change: only when the last Audit covered exactly the same programs. */
  overall: number | null;
  pillars: PillarChanges;
  /** Per program, when that program was in the last Audit. */
  programs: ReadonlyMap<string, { overall: number; pillars: PillarScores }>;
  /** Each check's result last time, when it was checked. */
  previousResults: ReadonlyMap<string, CheckResult>;
}

export function resultKey(key: CheckKey, programId: string | null): string {
  return `${programId ?? 'institution'}|${key}`;
}

const NO_PILLAR_CHANGE: PillarChanges = { discovered: null, trusted: null, chosen: null };

/**
 * Change since the last Audit. When the programs differ (a Free program was switched, or a
 * program was added or removed) the overall change is left out rather than comparing
 * different things; each program still shows its own change.
 */
export function compareScores(current: AuditScores, previous: PreviousScores | null): ScoreChanges {
  if (!previous) return { overall: null, pillars: NO_PILLAR_CHANGE, programs: new Map(), previousResults: new Map() };

  const before = new Map(previous.programs.map((program) => [program.programId, program]));
  const sameSet = previous.programs.length === current.programs.length && current.programs.every((program) => before.has(program.programId));

  const programs = new Map<string, { overall: number; pillars: PillarScores }>();
  for (const program of current.programs) {
    const last = before.get(program.programId);
    if (!last) continue;
    programs.set(program.programId, {
      overall: program.overall - last.overall,
      pillars: { discovered: program.discovered - last.discovered, trusted: program.trusted - last.trusted, chosen: program.chosen - last.chosen },
    });
  }

  const previousResults = new Map<string, CheckResult>();
  for (const item of current.outcomes) {
    const last = previous.results.get(resultKey(item.key, item.programId));
    if (last) previousResults.set(resultKey(item.key, item.programId), last);
  }

  return {
    overall: sameSet ? current.overall - previous.overall : null,
    pillars: sameSet
      ? {
          discovered: current.pillars.discovered - previous.pillars.discovered,
          trusted: current.pillars.trusted - previous.pillars.trusted,
          chosen: current.pillars.chosen - previous.pillars.chosen,
        }
      : NO_PILLAR_CHANGE,
    programs,
    previousResults,
  };
}

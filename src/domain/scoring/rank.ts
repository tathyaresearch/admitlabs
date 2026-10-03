// What's working and what to fix (spec 7.6), ranked by effect on the score. Each check is in
// exactly one of the two lists, so their counts add up to the checks the Audit ran.
//
// What's working: the checks that are Strong everywhere they apply (in every program, for a
// program check), ranked by the points they earn.
//
// What to fix: every check below Strong anywhere, ranked by the points it could add to the
// score. Ties go to the easier fix. A program check that needs work in several programs is one
// item naming them.
//
// A short "what's working" (the top 3 in the monthly report and on a shared Audit) is filled in
// by the best checks that are at least Okay everywhere when fewer than 3 are Strong. Those
// checks stay in what to fix too; they only fill the short list (topWorking).
//
// Effect on the score is counted exactly. An institution check moves every program's pillar,
// so it moves the overall score by earned / 3. A program check moves one program's pillar, so
// it moves the overall score by earned / (3 x programs). Values below are kept as whole
// numbers over a shared denominator of (3 x 100 x programs).

import { compareChecks } from '../checks.ts';
import { DIFFICULTIES, type CheckKey, type CheckResult, type Difficulty, type Pillar } from '../types.ts';
import type { CheckOutcome } from './score.ts';

export interface RankedItem {
  rank: number;
  key: CheckKey;
  pillar: Pillar;
  /** The outcomes this item covers: one institution check, or one check across programs. */
  outcomes: CheckOutcome[];
  /** Effect on the overall score, over the denominator (3 x 100 x programCount). */
  value: number;
}

export interface WorkingItem extends RankedItem {
  /** Strong everywhere, or (only to fill a short list) at least Okay everywhere. */
  strength: 'strong' | 'okay';
}

export interface FixItem extends RankedItem {
  /** The hardest fix among the outcomes it covers. */
  difficulty: Difficulty;
}

export type DifficultyOf = (outcome: CheckOutcome) => Difficulty;

const DIFFICULTY_ORDER = new Map<Difficulty, number>(DIFFICULTIES.map((difficulty, index) => [difficulty, index]));

/** Points an item is worth on the overall score, as a plain number (for display only). */
export function itemPoints(item: Pick<RankedItem, 'value'>, programCount: number): number {
  return item.value / (300 * programCount);
}

function effect(outcome: CheckOutcome, amount: number, programCount: number): number {
  return outcome.programId === null ? amount * programCount : amount;
}

/** Institution checks stand alone; program checks with the same key are grouped. */
function group(outcomes: readonly CheckOutcome[]): CheckOutcome[][] {
  const groups = new Map<string, CheckOutcome[]>();
  for (const outcome of outcomes) {
    const id = outcome.programId === null ? `institution|${outcome.key}` : `programs|${outcome.key}`;
    const list = groups.get(id) ?? [];
    list.push(outcome);
    groups.set(id, list);
  }
  return [...groups.values()];
}

function byValueThenCheck(a: RankedItem, b: RankedItem): number {
  return b.value - a.value || compareChecks(a.key, b.key);
}

const AT_LEAST_OKAY: ReadonlySet<CheckResult> = new Set(['strong', 'okay']);

/** Strong: every outcome Strong. Okay: every outcome at least Okay, and one or more only Okay. */
function workingItems(outcomes: readonly CheckOutcome[], programCount: number, strength: 'strong' | 'okay'): WorkingItem[] {
  return group(outcomes)
    .filter((items) =>
      strength === 'strong'
        ? items.every((item) => item.result === 'strong')
        : items.every((item) => AT_LEAST_OKAY.has(item.result)) && items.some((item) => item.result === 'okay'),
    )
    .map((items) => {
      const first = items[0] as CheckOutcome;
      return {
        rank: 0,
        key: first.key,
        pillar: first.pillar,
        outcomes: items,
        value: items.reduce((sum, item) => sum + effect(item, item.earned, programCount), 0),
        strength,
      };
    })
    .sort(byValueThenCheck);
}

const ranked = <T extends RankedItem>(items: readonly T[]): T[] => items.map((item, index) => ({ ...item, rank: index + 1 }));

/** What's working: the checks Strong everywhere they apply, ranked by the points they earn. */
export function rankWorking(outcomes: readonly CheckOutcome[], programCount: number): WorkingItem[] {
  return ranked(workingItems(outcomes, programCount, 'strong'));
}

/**
 * The checks at least Okay everywhere they apply but not Strong everywhere, ranked by the points
 * they earn. They are in what to fix; a short what's working only uses them to fill in.
 */
export function rankOkay(outcomes: readonly CheckOutcome[], programCount: number): WorkingItem[] {
  return ranked(workingItems(outcomes, programCount, 'okay'));
}

/** A short what's working: the Strong checks first, then the best Okay ones when fewer than `limit` are Strong. */
export function topWorking(outcomes: readonly CheckOutcome[], programCount: number, limit: number): WorkingItem[] {
  return ranked([...rankWorking(outcomes, programCount), ...rankOkay(outcomes, programCount)].slice(0, limit));
}

export function rankFixes(outcomes: readonly CheckOutcome[], programCount: number, difficultyOf: DifficultyOf): FixItem[] {
  return group(outcomes.filter((outcome) => outcome.result !== 'strong'))
    .map((items) => {
      const first = items[0] as CheckOutcome;
      const hardest = items
        .map(difficultyOf)
        .reduce<Difficulty>((worst, next) => ((DIFFICULTY_ORDER.get(next) ?? 0) > (DIFFICULTY_ORDER.get(worst) ?? 0) ? next : worst), 'easy');
      return {
        rank: 0,
        key: first.key,
        pillar: first.pillar,
        outcomes: items,
        value: items.reduce((sum, item) => sum + effect(item, item.maxPoints * 100 - item.earned, programCount), 0),
        difficulty: hardest,
      };
    })
    .sort((a, b) => b.value - a.value || (DIFFICULTY_ORDER.get(a.difficulty) ?? 0) - (DIFFICULTY_ORDER.get(b.difficulty) ?? 0) || compareChecks(a.key, b.key))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/** The rank each outcome carries into storage. Grouped outcomes share their item's rank. */
export function outcomeRanks(items: readonly RankedItem[]): Map<CheckOutcome, number> {
  const ranks = new Map<CheckOutcome, number>();
  for (const item of items) for (const outcome of item.outcomes) ranks.set(outcome, item.rank);
  return ranks;
}

/** A result is "below Strong" when there is something to fix. */
export function hasSomethingToFix(result: CheckResult): boolean {
  return result !== 'strong';
}

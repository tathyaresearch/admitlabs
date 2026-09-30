// What's working and what to fix (spec 7.6), ranked by effect on the score.
//
// What's working: Strong results ranked by the points they earn. When fewer than 3 are
// Strong, the best Okay results fill the list (Free shows the top 3; Paid shows every Strong
// and Okay result, Strong first).
//
// What to fix: every result below Strong, ranked by the points it could add to the score.
// Ties go to the easier fix. A program check that needs work in several programs is one
// item naming them.
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
  /** Strong items come first; Okay items fill in after them. */
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

export function rankWorking(outcomes: readonly CheckOutcome[], programCount: number): WorkingItem[] {
  const build = (strength: 'strong' | 'okay'): WorkingItem[] =>
    group(outcomes.filter((outcome) => outcome.result === strength))
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

  return [...build('strong'), ...build('okay')].map((item, index) => ({ ...item, rank: index + 1 }));
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

// What's working and what to fix (spec 7.6), ranked by effect on the score. Each check is in
// exactly one of the two lists, so their counts add up to the checks the Audit ran.
//
// What's working: the checks that are Strong everywhere they apply (in every program, for a
// program check), ranked by the points they earn.
//
// What to fix: every check below Strong anywhere, ranked by its impact (High, Medium, Low, from
// the points it could add to its part), then the quicker fix, then the points. A program check
// that needs work in several programs is one item naming them. Fixes from findings (What people
// say, Other places) join the same ranking by impact and effort (rankAllFixes).
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
import type { ImpactBands } from '../scoring-config.ts';
import { DIFFICULTIES, IMPACTS, type CheckKey, type CheckResult, type Difficulty, type Impact, type Pillar } from '../types.ts';
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
  /** Points it could add to its part, out of 100 (a program check's averaged over the programs). */
  partPoints: number;
  impact: Impact;
}

export type DifficultyOf = (outcome: CheckOutcome) => Difficulty;

const DIFFICULTY_ORDER = new Map<Difficulty, number>(DIFFICULTIES.map((difficulty, index) => [difficulty, index]));
const IMPACT_ORDER = new Map<Impact, number>(IMPACTS.map((impact, index) => [impact, index]));

/** Points an item is worth on the overall score, as a plain number (for display only). */
export function itemPoints(item: Pick<RankedItem, 'value'>, programCount: number): number {
  return item.value / (300 * programCount);
}

/** Points an item could add to its part, out of 100: three times its effect on the overall score. */
export function partPoints(item: Pick<RankedItem, 'value'>, programCount: number): number {
  return item.value / (100 * programCount);
}

/** High, Medium or Low, from the points a fix could add to its part (spec 7.7). */
export function impactOf(points: number, bands: ImpactBands): Impact {
  if (points >= bands.highMinPoints) return 'high';
  if (points >= bands.mediumMinPoints) return 'medium';
  return 'low';
}

/** Higher impact first, then the quicker fix. */
function byImpactThenEffort(a: { impact: Impact; difficulty: Difficulty }, b: { impact: Impact; difficulty: Difficulty }): number {
  return (IMPACT_ORDER.get(a.impact) ?? 0) - (IMPACT_ORDER.get(b.impact) ?? 0) || (DIFFICULTY_ORDER.get(a.difficulty) ?? 0) - (DIFFICULTY_ORDER.get(b.difficulty) ?? 0);
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

export function rankFixes(outcomes: readonly CheckOutcome[], programCount: number, difficultyOf: DifficultyOf, bands: ImpactBands): FixItem[] {
  return group(outcomes.filter((outcome) => outcome.result !== 'strong'))
    .map((items) => {
      const first = items[0] as CheckOutcome;
      const hardest = items
        .map(difficultyOf)
        .reduce<Difficulty>((worst, next) => ((DIFFICULTY_ORDER.get(next) ?? 0) > (DIFFICULTY_ORDER.get(worst) ?? 0) ? next : worst), 'easy');
      const value = items.reduce((sum, item) => sum + effect(item, item.maxPoints * 100 - item.earned, programCount), 0);
      const points = partPoints({ value }, programCount);
      return {
        rank: 0,
        key: first.key,
        pillar: first.pillar,
        outcomes: items,
        value,
        difficulty: hardest,
        partPoints: points,
        impact: impactOf(points, bands),
      };
    })
    .sort((a, b) => byImpactThenEffort(a, b) || b.value - a.value || compareChecks(a.key, b.key))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/** A fix from a finding (What people say, Other places): no points, an impact and an effort from the writer. */
export interface FindingFix {
  id: string;
  impact: Impact;
  difficulty: Difficulty;
}

export interface AllFixRanks {
  /** Each check fix's place in the one ranking. */
  checks: Map<FixItem, number>;
  /** Each finding fix's place in the one ranking, by its id. */
  findings: Map<string, number>;
}

/**
 * Check fixes and finding fixes in one ranking, as "Fix these first" lists them: by impact, then
 * the quicker fix; at the same impact and effort, a check (it moves the three words) before a
 * finding, checks by their points, findings in the order given.
 */
export function rankAllFixes(checks: readonly FixItem[], findings: readonly FindingFix[]): AllFixRanks {
  type Entry = { kind: 'check'; item: FixItem; impact: Impact; difficulty: Difficulty } | { kind: 'finding'; fix: FindingFix; index: number; impact: Impact; difficulty: Difficulty };
  const entries: Entry[] = [
    ...checks.map((item) => ({ kind: 'check' as const, item, impact: item.impact, difficulty: item.difficulty })),
    ...findings.map((fix, index) => ({ kind: 'finding' as const, fix, index, impact: fix.impact, difficulty: fix.difficulty })),
  ];
  entries.sort((a, b) => {
    const order = byImpactThenEffort(a, b);
    if (order) return order;
    if (a.kind !== b.kind) return a.kind === 'check' ? -1 : 1;
    if (a.kind === 'check' && b.kind === 'check') return b.item.value - a.item.value || compareChecks(a.item.key, b.item.key);
    return a.kind === 'finding' && b.kind === 'finding' ? a.index - b.index : 0;
  });
  const result: AllFixRanks = { checks: new Map(), findings: new Map() };
  entries.forEach((entry, index) => {
    if (entry.kind === 'check') result.checks.set(entry.item, index + 1);
    else result.findings.set(entry.fix.id, index + 1);
  });
  return result;
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

// How you compare with your rivals: ahead or behind overall, the ladder of scores, and check by
// check. Pure: the page loads the rows (row level security applies), this shapes them.
//
// Rival scores always come from Drishti's own monthly rival Audit. Checks are compared on the
// share of their points each side earned, so a college and a skilling institute (whose weights
// differ) still compare fairly. Program checks compare the programs both sides offer.

import { CHECKS, compareChecks as byCheckOrder } from '../domain/checks.ts';
import type { CheckKey, CheckResult, Pillar } from '../domain/types.ts';

export interface ScoreSet {
  overall: number;
  discovered: number;
  trusted: number;
  chosen: number;
}

/** Where a rival stands against you, overall only. 'ahead' means the rival is ahead of you. */
export type Standing = 'ahead' | 'behind' | 'level' | 'unscored';

export function standingOf(yours: number | null, theirs: number | null): Standing {
  if (yours === null || theirs === null) return 'unscored';
  if (theirs > yours) return 'ahead';
  if (theirs < yours) return 'behind';
  return 'level';
}

export interface LadderInput {
  id: string;
  name: string;
  overall: number | null;
  change: number | null;
}

export interface LadderRow extends LadderInput {
  you: boolean;
  /** 1 is the highest score. Equal scores share a rank. Null until a rival is scored. */
  rank: number | null;
}

/** You and your rivals, highest overall score first. You sit first among equals; unscored rivals go last. */
export function ladder(you: LadderInput, rivals: readonly LadderInput[]): LadderRow[] {
  const rows = [{ ...you, you: true }, ...rivals.map((rival) => ({ ...rival, you: false }))];
  const scored = rows
    .filter((row) => row.overall !== null)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0) || Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
  const unscored = rows.filter((row) => row.overall === null).sort((a, b) => a.name.localeCompare(b.name));
  return [
    ...scored.map((row) => ({ ...row, rank: 1 + scored.filter((other) => (other.overall ?? 0) > (row.overall ?? 0)).length })),
    ...unscored.map((row) => ({ ...row, rank: null })),
  ];
}

/**
 * Rivals grouped by standing, each group in name order. Free sees these groups only, so the
 * order inside a group never hints at a score.
 */
export function byStanding<T extends { name: string; standing: Standing }>(rivals: readonly T[]): Record<Standing, T[]> {
  const groups: Record<Standing, T[]> = { ahead: [], level: [], behind: [], unscored: [] };
  for (const rival of [...rivals].sort((a, b) => a.name.localeCompare(b.name))) groups[rival.standing].push(rival);
  return groups;
}

/** One scored check on one side, as stored by an Audit. */
export interface CheckScore {
  checkId: string;
  key: CheckKey;
  pillar: Pillar;
  /** For program checks: the program's key (or its name in lower case) and name. Null for institution checks. */
  programKey: string | null;
  programName: string | null;
  result: CheckResult;
  points: number;
  maxPoints: number;
  checkedAt: string;
  /** What was found and where. Null when the viewer's plan does not include it. */
  finding: string | null;
  sourceUrl: string | null;
}

export type SideSummary =
  | { kind: 'single'; result: CheckResult; share: number }
  | { kind: 'varies'; share: number }
  | { kind: 'none' };

export type Lead = 'them' | 'you' | 'level' | 'unknown';

export interface CheckComparison {
  key: CheckKey;
  pillar: Pillar;
  them: SideSummary;
  you: SideSummary;
  lead: Lead;
  /** Points on your scale you could add by matching them (negative when you lead). */
  gap: number;
  /** For program checks: the programs compared, by your names. Empty for institution checks. */
  programs: string[];
  theirParts: CheckScore[];
  yourParts: CheckScore[];
}

const EPSILON = 0.005;

function share(check: CheckScore): number {
  return check.maxPoints > 0 ? check.points / check.maxPoints : 0;
}

function summarize(parts: readonly CheckScore[]): SideSummary {
  const first = parts[0];
  if (!first) return { kind: 'none' };
  const average = parts.reduce((sum, part) => sum + share(part), 0) / parts.length;
  return parts.every((part) => part.result === first.result) ? { kind: 'single', result: first.result, share: average } : { kind: 'varies', share: average };
}

function averageMax(parts: readonly CheckScore[]): number {
  return parts.length ? parts.reduce((sum, part) => sum + part.maxPoints, 0) / parts.length : 0;
}

/** Program checks compare the programs both sides offer; with none in common, all of each side's. */
function sharedParts(yours: readonly CheckScore[], theirs: readonly CheckScore[]): { yours: CheckScore[]; theirs: CheckScore[] } {
  const theirKeys = new Set(theirs.map((part) => part.programKey));
  const shared = new Set(yours.map((part) => part.programKey).filter((key) => theirKeys.has(key)));
  if (shared.size === 0) return { yours: [...yours], theirs: [...theirs] };
  return { yours: yours.filter((part) => shared.has(part.programKey)), theirs: theirs.filter((part) => shared.has(part.programKey)) };
}

/** Every check side by side, in the spec's order. */
export function compareChecks(yours: readonly CheckScore[], theirs: readonly CheckScore[]): CheckComparison[] {
  return CHECKS.map((check) => {
    const mine = yours.filter((part) => part.key === check.key);
    const other = theirs.filter((part) => part.key === check.key);
    const parts = check.level === 'program' ? sharedParts(mine, other) : { yours: mine, theirs: other };
    const you = summarize(parts.yours);
    const them = summarize(parts.theirs);
    let lead: Lead = 'unknown';
    let gap = 0;
    if (you.kind !== 'none' && them.kind !== 'none') {
      const difference = them.share - you.share;
      gap = difference * averageMax(parts.yours);
      lead = difference > EPSILON ? 'them' : difference < -EPSILON ? 'you' : 'level';
    }
    const programs = check.level === 'program' ? [...new Set(parts.yours.flatMap((part) => (part.programName ? [part.programName] : [])))].sort() : [];
    return { key: check.key, pillar: check.pillar, them, you, lead, gap, programs, theirParts: parts.theirs, yourParts: parts.yours };
  });
}

/** Where they lead you, biggest gap first. */
export function whereTheyLead(comparisons: readonly CheckComparison[]): CheckComparison[] {
  return comparisons.filter((item) => item.lead === 'them').sort((a, b) => b.gap - a.gap || byCheckOrder(a.key, b.key));
}

/** Where you lead them, biggest lead first. */
export function whereYouLead(comparisons: readonly CheckComparison[]): CheckComparison[] {
  return comparisons.filter((item) => item.lead === 'you').sort((a, b) => a.gap - b.gap || byCheckOrder(a.key, b.key));
}

/** Pillar by pillar: where they lead, where you lead, where you are level. */
export function pillarLeads(yours: ScoreSet, theirs: ScoreSet): Record<Exclude<keyof ScoreSet, 'overall'>, Lead> {
  const lead = (a: number, b: number): Lead => (b > a ? 'them' : b < a ? 'you' : 'level');
  return {
    discovered: lead(yours.discovered, theirs.discovered),
    trusted: lead(yours.trusted, theirs.trusted),
    chosen: lead(yours.chosen, theirs.chosen),
  };
}

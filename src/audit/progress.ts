// Progress month by month (B7): the Audit's score history as a table you can read. Each month's
// latest Audit: the score and its three parts, the change since the month before, your place
// among your rivals that month, and the checks that moved since the month before. The checks are
// compared between the two months' Audits directly, so an extra refresh in between never hides
// a move. Pure.

import { CHECKS, checkName } from '../domain/checks.ts';
import { RESULTS, type CheckKey, type CheckResult, type InstitutionType } from '../domain/types.ts';
import type { MovedCheck, ScoreSet } from './view.ts';

/** One check's result in one Audit, as stored. */
export interface StoredResult {
  key: CheckKey;
  programId: string | null;
  result: CheckResult;
}

export interface ProgressMonth {
  /** 'YYYY-MM'. */
  month: string;
  /** The month's latest Audit. */
  auditId: string;
  scores: ScoreSet;
  /** The overall score's change since the month before. Null for the first month. */
  change: number | null;
  /** Your place among you and the rivals scored that month. Null without rivals, or on a program's page. */
  place: { rank: number; of: number } | null;
  /** The checks that moved since the month before, the ones that moved up first. Empty for the first month. */
  moved: MovedCheck[];
}

const RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));
const ORDER = new Map<CheckKey, number>(CHECKS.map((check, index) => [check.key, index]));

/** Each month's latest row, oldest month first. */
export function latestByMonth<T extends { runAt: string }>(rows: readonly T[], monthOf: (runAt: string) => string): Array<{ month: string; row: T }> {
  const byMonth = new Map<string, T>();
  for (const row of [...rows].sort((a, b) => a.runAt.localeCompare(b.runAt))) byMonth.set(monthOf(row.runAt), row);
  return [...byMonth.entries()].map(([month, row]) => ({ month, row }));
}

/**
 * The checks whose result changed between two Audits, one line per check and change: programs
 * that moved the same way share a line. Up first, then down, each in check order.
 */
export function movedBetween(
  before: readonly StoredResult[],
  after: readonly StoredResult[],
  names: ReadonlyMap<string, string>,
  type: InstitutionType,
): MovedCheck[] {
  const earlier = new Map(before.map((check) => [`${check.key}:${check.programId ?? ''}`, check.result]));
  const lines = new Map<string, MovedCheck>();
  for (const check of after) {
    const from = earlier.get(`${check.key}:${check.programId ?? ''}`);
    if (!from || from === check.result) continue;
    const id = `${check.key}:${from}:${check.result}`;
    const line = lines.get(id) ?? { key: check.key, name: checkName(check.key, type), programs: [], from, to: check.result };
    if (check.programId) line.programs.push(names.get(check.programId) ?? 'A program');
    lines.set(id, line);
  }
  const up = (line: MovedCheck) => (RANK.get(line.to) ?? 0) < (RANK.get(line.from) ?? 0);
  return [...lines.values()]
    .map((line) => ({ ...line, programs: [...line.programs].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => Number(up(b)) - Number(up(a)) || (ORDER.get(a.key) ?? 0) - (ORDER.get(b.key) ?? 0));
}

export function progressMonths(input: {
  history: ReadonlyArray<{ id: string; runAt: string; scores: ScoreSet }>;
  monthOf: (runAt: string) => string;
  /** The check results of each month's latest Audit, by Audit id. */
  checks: ReadonlyMap<string, readonly StoredResult[]>;
  /** Program names by id. */
  names: ReadonlyMap<string, string>;
  type: InstitutionType;
  /** On a program's page: that program's checks and the institution's own. */
  programId?: string | null;
  /** Each rival's Audits, for your place among them. Null on a program's page. */
  rivals?: ReadonlyArray<ReadonlyArray<{ runAt: string; overall: number }>> | null;
}): ProgressMonth[] {
  const months = latestByMonth(input.history, input.monthOf);
  const rivalMonths = (input.rivals ?? []).map((audits) => new Map(latestByMonth(audits, input.monthOf).map(({ month, row }) => [month, row.overall])));
  const checksOf = (auditId: string) => (input.checks.get(auditId) ?? []).filter((check) => !input.programId || check.programId === null || check.programId === input.programId);

  return months.map(({ month, row }, index) => {
    const previous = months[index - 1]?.row;
    const scored = rivalMonths.flatMap((byMonth) => {
      const score = byMonth.get(month);
      return score === undefined ? [] : [score];
    });
    return {
      month,
      auditId: row.id,
      scores: row.scores,
      change: previous ? row.scores.overall - previous.scores.overall : null,
      place: input.rivals && scored.length ? { rank: 1 + scored.filter((score) => score > row.scores.overall).length, of: scored.length + 1 } : null,
      moved: previous ? movedBetween(checksOf(previous.id), checksOf(row.id), input.names, input.type) : [],
    };
  });
}

// Mark as done: the owner marks one of the month's things done. A check (an Audit fix, or a
// rival lesson about a check) waits for the next own Audit, which checks it; any other thing (a
// rival's post to learn from, a content idea) is kept with the month it belongs to. Pure: the
// page loads the marks and the Audit that checked them (row level security applies), and this
// says what each one found.

import { SCORING_V1 } from '../config/scoring.v1.ts';
import type { ScoringConfig } from '../domain/scoring-config.ts';
import { RESULTS, type CheckKey, type CheckResult } from '../domain/types.ts';
import type { StoredAudit } from './view.ts';

export interface DoneMark {
  id: string;
  /** A check, which the next own Audit checks. */
  checkKey: CheckKey | null;
  /** Or any other thing to do, by its words, with its month ('YYYY-MM'). */
  thing: string | null;
  month: string | null;
  markedAt: string;
  /** The own Audit that checked a check; null while it waits. */
  checkedBy: string | null;
}

/** What a mark is about, the same way for a mark and for the thing it marks: 'check:fees_shown', or '2026-09:Post the full fee'. */
export function markKey(mark: { checkKey: CheckKey | null; thing: string | null; month: string | null }): string {
  return mark.checkKey ? `check:${mark.checkKey}` : `${mark.month ?? ''}:${mark.thing ?? ''}`;
}

export interface MovedPart {
  /** The programs it moved in, by name; empty for a check on the whole institution. */
  programs: string[];
  from: CheckResult;
  to: CheckResult;
}

export type MarkOutcome =
  /** The Audit found it: the check moved up, adding `points` to the overall score. */
  | { kind: 'confirmed'; points: number; moved: MovedPart[] }
  /** Nothing moved up yet: what the Audit still found, where the plan shows it. */
  | { kind: 'not_yet'; result: CheckResult | null; finding: string | null };

const RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));
const rank = (result: CheckResult) => RANK.get(result) ?? 0;

/**
 * What the Audit that checked a mark found for its check. Moved up anywhere: confirmed, with
 * the points it added to the overall score (each part's points now, against what its result
 * before was worth; a program check counts once in one program, an institution check in every
 * program). Nothing moved up: not found yet, with the weakest result and what was found there.
 */
export function markOutcome(
  checkKey: CheckKey,
  audit: Pick<StoredAudit, 'checks' | 'programCount'>,
  programNames: ReadonlyMap<string, string>,
  config: Pick<ScoringConfig, 'resultShares'> = SCORING_V1,
): MarkOutcome {
  const rows = audit.checks.filter((check) => check.key === checkKey);
  const programs = Math.max(1, audit.programCount);
  const moved = new Map<string, MovedPart>();
  let points = 0;
  for (const row of rows) {
    if (!row.previousResult) continue;
    const before = row.pointsMax * config.resultShares[row.previousResult];
    points += ((row.pointsAwarded - before) * (row.programId === null ? 1 : 1 / programs)) / 3;
    if (rank(row.result) >= rank(row.previousResult)) continue;
    const id = `${row.previousResult}:${row.result}`;
    const entry = moved.get(id) ?? { programs: [], from: row.previousResult, to: row.result };
    if (row.programId) entry.programs.push(programNames.get(row.programId) ?? 'A program');
    moved.set(id, entry);
  }
  if (moved.size) {
    const parts = [...moved.values()].map((part) => ({ ...part, programs: [...part.programs].sort((a, b) => a.localeCompare(b)) }));
    return { kind: 'confirmed', points: Math.max(0, points), moved: parts };
  }
  const weakest = [...rows].sort((a, b) => rank(b.result) - rank(a.result))[0];
  return { kind: 'not_yet', result: weakest?.result ?? null, finding: weakest?.detail?.finding ?? null };
}

/** "2 points added", "1 point added", "Less than 1 point added". Whole numbers on screen. */
export function pointsAddedText(points: number): string {
  if (points < 0.5) return 'Less than 1 point added';
  const rounded = Math.round(points);
  return `${rounded} ${rounded === 1 ? 'point' : 'points'} added`;
}

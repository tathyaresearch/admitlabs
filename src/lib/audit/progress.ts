// Loads the Audit's Progress tab (B7), Paid and Client: each month's latest Audit, the check
// results of those Audits, and, on the overall page, your rivals' scores for your place among
// them. Read as the signed-in user, so row level security decides what comes back.

import { latestByMonth, progressMonths, type ProgressMonth } from '@/audit/progress';
import type { HistoryRow } from '@/audit/view';
import { monthKey } from '@/domain/dates';
import type { InstitutionType } from '@/domain/types';
import { loadCheckResults } from '@/lib/audit/load';
import { loadRivalScores } from '@/lib/rivals/load';

const monthOf = (runAt: string) => monthKey(new Date(runAt));

export async function loadProgress(input: {
  history: readonly HistoryRow[];
  names: ReadonlyMap<string, string>;
  type: InstitutionType;
  /** A program's page: its checks and the institution's own, and no rivals (they compare overall). */
  programId?: string;
  /** The overall page: whose rivals to place you among. */
  institutionId?: string;
}): Promise<ProgressMonth[]> {
  const latest = latestByMonth(input.history, monthOf).map(({ row }) => row.id);
  const [checks, rivals] = await Promise.all([loadCheckResults(latest), input.institutionId && !input.programId ? loadRivalScores(input.institutionId) : Promise.resolve([])]);
  return progressMonths({
    history: input.history,
    monthOf,
    checks,
    names: input.names,
    type: input.type,
    programId: input.programId ?? null,
    rivals: rivals.length ? rivals : null,
  });
}

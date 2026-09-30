// Loads what a monthly report needs, with the service key, as it was at the end of the month:
// the latest own Audit (every detail), score history, rivals and their Audits, the month's moves
// and Rivals 3 things to do, and the city's Demand. The report job decides whether a report may
// be made at all; this only reads.

import type { SupabaseClient } from '@supabase/supabase-js';
import { latestStoredAudit, ownHistory } from '../audit/read.ts';
import { latestDemandRows } from '../demand/read.ts';
import { regionsFor } from '../demand/regions.ts';
import { istDate } from '../domain/dates.ts';
import type { Database } from '../lib/supabase/database.types.ts';
import { latestRivalAudits } from '../rivals/read.ts';
import type { ReportInput, ReportInstitution } from './data.ts';
import { monthEnd } from './schedule.ts';
import type { RivalLesson } from './things.ts';

type Db = SupabaseClient<Database>;

export class ReportLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportLoadError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new ReportLoadError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new ReportLoadError(`No ${what} found.`);
  return result.data;
}

/** Moves found on the rivals' pages from `from` up to the cut. */
async function monthMoves(db: Db, rivalIds: readonly string[], from: Date, cut: Date): Promise<ReportInput['moves']> {
  if (rivalIds.length === 0) return [];
  const result = await db
    .from('rival_moves')
    .select('rival_institution_id, kind, description, detected_at')
    .in('rival_institution_id', [...rivalIds])
    .gte('detected_at', from.toISOString())
    .lt('detected_at', cut.toISOString());
  return must(result, 'rival moves').map((row) => ({ rivalId: row.rival_institution_id, kind: row.kind, description: row.description, detectedAt: row.detected_at }));
}

/** When the weekly check last ran on any of the rivals, up to the cut. */
async function lastRivalCheck(db: Db, rivalIds: readonly string[], cut: Date): Promise<string | null> {
  if (rivalIds.length === 0) return null;
  const { data, error } = await db
    .from('rival_checks')
    .select('checked_at')
    .in('rival_institution_id', [...rivalIds])
    .lt('checked_at', cut.toISOString())
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ReportLoadError(`Could not read the weekly rival check: ${error.message}`);
  return data?.checked_at ?? null;
}

/**
 * Everything the report for `month` shows, cut at the end of the month (or at `madeAt`, if a
 * report is made by hand before the month is over). Null when there is no Audit to report on.
 */
export async function loadReportInput(
  db: Db,
  institutionId: string,
  month: string,
  madeAt: Date,
  tier: ReportInput['tier'],
): Promise<ReportInput | null> {
  const cut = new Date(Math.min(monthEnd(month).getTime(), madeAt.getTime()));
  const monthStart = `${month}-01`;

  const [institutionResult, programsResult, linksResult] = await Promise.all([
    db.from('institutions').select('id, name, type, city, state, website').eq('id', institutionId).maybeSingle(),
    db.from('programs').select('id, name, program_key, archived_at').eq('institution_id', institutionId).order('name'),
    db.from('rivals').select('rival_institution_id, institutions!rivals_rival_institution_id_fkey(name)').eq('institution_id', institutionId),
  ]);
  const institution: ReportInstitution = must(institutionResult, 'institution');
  const programs = must(programsResult, 'programs');
  const rivals = must(linksResult, 'rivals')
    .map((row) => ({ id: row.rival_institution_id, name: row.institutions?.name ?? 'A rival' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rivalIds = rivals.map((rival) => rival.id);

  const audit = await latestStoredAudit(db, institutionId, cut);
  if (!audit) return null;

  const covered = programs.filter((program) => !program.archived_at && program.program_key).map((program) => ({ name: program.name, programKey: program.program_key as string }));
  const region = regionsFor(institution).city;
  const [history, rivalAudits, moves, actions, lastCheck, demand] = await Promise.all([
    ownHistory(db, institutionId, cut),
    latestRivalAudits(db, rivalIds, cut),
    monthMoves(db, rivalIds, istDate(monthStart), cut),
    db
      .from('actions')
      .select('rank, text, detail, check_key, rival_institution_id, month')
      .eq('institution_id', institutionId)
      .eq('feature', 'rivals')
      .lte('month', monthStart)
      .order('month', { ascending: false })
      .order('rank'),
    lastRivalCheck(db, rivalIds, cut),
    latestDemandRows(db, region, covered, month),
  ]);

  // The month's Rivals 3 things to do (or the latest month's before it).
  const actionRows = must(actions, 'the Rivals 3 things to do');
  const actionMonth = actionRows[0]?.month;
  const lessons: RivalLesson[] = actionRows
    .filter((row) => row.month === actionMonth)
    .map((row) => ({ text: row.text, detail: row.detail, checkKey: row.check_key, rivalId: row.rival_institution_id }));

  return {
    institution,
    tier,
    month,
    madeAt,
    audit,
    programNames: new Map(programs.map((program) => [program.id, program.name])),
    history,
    rivals: rivals.map((rival) => {
      const scores = rivalAudits.get(rival.id);
      return { ...rival, audit: scores ? { runAt: scores.runAt, scores: scores.scores, changes: scores.changes } : null };
    }),
    moves,
    lessons,
    lastRivalCheck: lastCheck,
    demand: { region, ...demand },
  };
}

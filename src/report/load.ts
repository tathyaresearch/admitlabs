// Loads what a monthly report needs, with the service key, as it was at the end of the month: the
// latest approved own Audit (every detail and finding), its history, each rival with its latest
// rival Audit (checks and findings) and its history, the month's one line, moves and Rivals 3 things
// to do, the city's Demand (the state filling in) with the month's Make these 3, a Client's
// enquiries by link (counts only), and what the institution added about itself. The report job
// decides whether a report may be made at all; this only reads.

import type { SupabaseClient } from '@supabase/supabase-js';
import { findingsByAudit, latestStoredAudit, ownHistory, storedFindings } from '../audit/read.ts';
import { parsePickedIdea } from '../demand/picks.ts';
import { latestDemandRows } from '../demand/read.ts';
import { regionsFor } from '../demand/regions.ts';
import { demandSignals, programSources } from '../demand/signals.ts';
import { istDate, previousMonth } from '../domain/dates.ts';
import { institutionDetailsFromRow, programDetailsFromRow } from '../domain/details.ts';
import type { Database } from '../lib/supabase/database.types.ts';
import { checkScores, latestRivalAudits, programInfo, rivalAuditHistory } from '../rivals/read.ts';
import type { ReportInput, ReportInstitution, ReportLeadLink } from './data.ts';
import { monthEnd } from './schedule.ts';
import type { MonthPick, RivalLesson } from './things.ts';

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

/** A Client's enquiries by link, in the month and in the month before: counts only, never a student's details. */
async function leadCounts(db: Db, institutionId: string, month: string, cut: Date): Promise<ReportLeadLink[]> {
  const before = istDate(`${previousMonth(month)}-01`);
  const start = istDate(`${month}-01`);
  const [links, leads] = await Promise.all([
    db.from('lead_links').select('id, name, created_at').eq('institution_id', institutionId).lt('created_at', cut.toISOString()),
    db.from('leads').select('link_id, created_at').eq('institution_id', institutionId).gte('created_at', before.toISOString()).lt('created_at', cut.toISOString()),
  ]);
  const counts = new Map<string, { count: number; before: number }>();
  for (const lead of must(leads, 'enquiry counts')) {
    if (!lead.link_id) continue;
    const entry = counts.get(lead.link_id) ?? { count: 0, before: 0 };
    if (new Date(lead.created_at).getTime() >= start.getTime()) entry.count += 1;
    else entry.before += 1;
    counts.set(lead.link_id, entry);
  }
  return must(links, 'tracking links').map((link) => ({ name: link.name, count: counts.get(link.id)?.count ?? 0, before: counts.get(link.id)?.before ?? 0 }));
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
    db.from('programs').select('id, name, program_key, archived_at, created_at').eq('institution_id', institutionId).order('name'),
    db.from('rivals').select('rival_institution_id, institutions!rivals_rival_institution_id_fkey(name, city)').eq('institution_id', institutionId),
  ]);
  const institution: ReportInstitution = must(institutionResult, 'institution');
  const programs = must(programsResult, 'programs');
  const rivals = must(linksResult, 'rivals')
    .map((row) => ({ id: row.rival_institution_id, name: row.institutions?.name ?? 'A rival', city: row.institutions?.city ?? institution.city }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rivalIds = rivals.map((rival) => rival.id);

  const audit = await latestStoredAudit(db, institutionId, cut);
  if (!audit) return null;

  const active = programs.filter((program) => !program.archived_at);
  const covered = active.flatMap((program) => (program.program_key ? [{ id: program.id, name: program.name, programKey: program.program_key }] : []));
  const regions = regionsFor(institution);
  const [findings, history, rivalAudits, rivalHistory, info, moves, actions, lastCheck, cityRows, stateRows, picks, line, institutionDetails, programDetails, leads] = await Promise.all([
    storedFindings(db, audit.id),
    ownHistory(db, institutionId, cut),
    latestRivalAudits(db, rivalIds, cut),
    rivalAuditHistory(db, rivalIds),
    programInfo(db, [institutionId, ...rivalIds]),
    monthMoves(db, rivalIds, istDate(monthStart), cut),
    db
      .from('actions')
      .select('rank, text, detail, check_key, rival_institution_id, month, effort')
      .eq('institution_id', institutionId)
      .eq('feature', 'rivals')
      .lte('month', monthStart)
      .order('month', { ascending: false })
      .order('rank'),
    lastRivalCheck(db, rivalIds, cut),
    latestDemandRows(db, regions.city, covered, month),
    latestDemandRows(db, regions.state, covered, month),
    db.from('content_picks').select('month, rank, idea').eq('institution_id', institutionId).lte('month', monthStart).order('month', { ascending: false }).order('rank').limit(6),
    db.from('rival_lines').select('line, rival_institution_id').eq('institution_id', institutionId).lte('month', monthStart).order('month', { ascending: false }).limit(1).maybeSingle(),
    // What the institution added about itself: shown as added by them, never scored.
    db.from('institution_details').select('*').eq('institution_id', institutionId).maybeSingle(),
    db.from('program_details').select('*').eq('institution_id', institutionId),
    tier === 'client' ? leadCounts(db, institutionId, month, cut) : Promise.resolve(null),
  ]);
  if (institutionDetails.error) throw new ReportLoadError(`Could not read the institution's details: ${institutionDetails.error.message}`);
  if (programDetails.error) throw new ReportLoadError(`Could not read the program details: ${programDetails.error.message}`);
  if (line.error) throw new ReportLoadError(`Could not read the month's line: ${line.error.message}`);

  const rivalAuditIds = [...rivalAudits.values()].map((entry) => entry.id);
  const [checks, rivalFindings] = await Promise.all([checkScores(db, [audit.id, ...rivalAuditIds], info), findingsByAudit(db, rivalAuditIds)]);

  // The month's Rivals 3 things to do (or the latest month's before it).
  const actionRows = must(actions, 'the Rivals 3 things to do');
  const actionMonth = actionRows[0]?.month;
  const lessons: RivalLesson[] = actionRows
    .filter((row) => row.month === actionMonth)
    .map((row) => ({ text: row.text, detail: row.detail, checkKey: row.check_key, rivalId: row.rival_institution_id, effort: row.effort, month: row.month.slice(0, 7) }));

  // The month's Make these 3 (or the latest month's before it).
  const pickRows = must(picks, 'Make these 3');
  const pickMonth = pickRows[0]?.month;
  const monthPicks: MonthPick[] = pickRows.flatMap((row) => {
    const idea = row.month === pickMonth ? parsePickedIdea(row.idea) : null;
    return idea ? [{ month: row.month.slice(0, 7), rank: row.rank, idea }] : [];
  });

  const names = active.map((program) => program.name);
  const signals = covered.length
    ? demandSignals(programSources(covered, { region: regions.city.region, ...cityRows }, { region: regions.state.region, ...stateRows }), names)
    : null;

  return {
    institution,
    tier,
    month,
    madeAt,
    audit,
    findings,
    programNames: new Map(programs.map((program) => [program.id, program.name])),
    history,
    yourChecks: checks.get(audit.id) ?? [],
    rivals: rivals.map((rival) => {
      const latest = rivalAudits.get(rival.id);
      return {
        id: rival.id,
        name: rival.name,
        nearby: rival.city !== institution.city,
        audit: latest ? { runAt: latest.runAt, scores: latest.scores, checks: checks.get(latest.id) ?? [], findings: rivalFindings.get(latest.id) ?? [] } : null,
        history: (rivalHistory.get(rival.id) ?? []).filter((entry) => entry.runAt <= cut.toISOString()).map((entry) => ({ runAt: entry.runAt, overall: entry.scores.overall })),
      };
    }),
    // A line that names a rival no longer tracked is left out.
    line: line.data && (!line.data.rival_institution_id || rivalIds.includes(line.data.rival_institution_id)) ? line.data.line : null,
    moves,
    lessons,
    lastRivalCheck: lastCheck,
    picks: monthPicks,
    demand: { place: regions.city.region, signals },
    leads,
    added: {
      institution: institutionDetailsFromRow(institutionDetails.data),
      programs: new Map((programDetails.data ?? []).map((row) => [row.program_id, programDetailsFromRow(row)])),
    },
  };
}

// Reads shared by the Rivals pages (as the signed-in user, so row level security applies) and
// the rival jobs (service key). Nothing here decides who may see what; the database does.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import type { CheckScore, ScoreSet } from './compare.ts';

type Db = SupabaseClient<Database>;

export class RivalReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RivalReadError';
  }
}

export interface ProgramInfo {
  institutionId: string;
  name: string;
  /** The program's key, or its name in lower case: how two institutions' programs are matched. */
  matchKey: string;
  archived: boolean;
}

export interface AuditScores {
  id: string;
  institutionId: string;
  runAt: string;
  scores: ScoreSet;
  changes: { overall: number | null; discovered: number | null; trusted: number | null; chosen: number | null };
}

const AUDIT_COLUMNS = 'id, institution_id, run_at, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change';

type AuditRow = Pick<
  Database['public']['Tables']['audits']['Row'],
  'id' | 'institution_id' | 'run_at' | 'overall' | 'discovered' | 'trusted' | 'chosen' | 'overall_change' | 'discovered_change' | 'trusted_change' | 'chosen_change'
>;

function toScores(row: AuditRow): AuditScores {
  return {
    id: row.id,
    institutionId: row.institution_id,
    runAt: row.run_at,
    scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen },
    changes: { overall: row.overall_change, discovered: row.discovered_change, trusted: row.trusted_change, chosen: row.chosen_change },
  };
}

export async function programInfo(db: Db, institutionIds: readonly string[]): Promise<Map<string, ProgramInfo>> {
  if (institutionIds.length === 0) return new Map();
  const { data, error } = await db.from('programs').select('id, institution_id, name, program_key, archived_at').in('institution_id', [...institutionIds]);
  if (error) throw new RivalReadError(`Could not read programs: ${error.message}`);
  return new Map(
    (data ?? []).map((row) => [
      row.id,
      { institutionId: row.institution_id, name: row.name, matchKey: row.program_key ?? row.name.toLowerCase(), archived: row.archived_at !== null },
    ]),
  );
}

/** Each rival's latest rival Audit (never its own Audits), up to `before` when given. */
export async function latestRivalAudits(db: Db, rivalIds: readonly string[], before?: Date): Promise<Map<string, AuditScores>> {
  if (rivalIds.length === 0) return new Map();
  let query = db.from('audits').select(AUDIT_COLUMNS).in('institution_id', [...rivalIds]).eq('kind', 'rival');
  if (before) query = query.lte('run_at', before.toISOString());
  const { data, error } = await query.order('run_at', { ascending: false });
  if (error) throw new RivalReadError(`Could not read rival Audits: ${error.message}`);
  const latest = new Map<string, AuditScores>();
  for (const row of data ?? []) if (!latest.has(row.institution_id)) latest.set(row.institution_id, toScores(row));
  return latest;
}

/** An institution's latest own Audit (Free, Paid or Client), up to `before` when given. */
export async function latestOwnAudit(db: Db, institutionId: string, before?: Date): Promise<AuditScores | null> {
  let query = db.from('audits').select(AUDIT_COLUMNS).eq('institution_id', institutionId).in('kind', ['free', 'paid', 'client']);
  if (before) query = query.lte('run_at', before.toISOString());
  const { data, error } = await query.order('run_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new RivalReadError(`Could not read the Audit: ${error.message}`);
  return data ? toScores(data) : null;
}

/** Every check of these Audits, with what was found where the reader may see it. */
export async function checkScores(db: Db, auditIds: readonly string[], programs: ReadonlyMap<string, ProgramInfo>): Promise<Map<string, CheckScore[]>> {
  const byAudit = new Map<string, CheckScore[]>(auditIds.map((id) => [id, []]));
  if (auditIds.length === 0) return byAudit;
  const { data, error } = await db
    .from('audit_checks')
    .select('id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, checked_at, audit_check_details(finding, source_url)')
    .in('audit_id', [...auditIds]);
  if (error) throw new RivalReadError(`Could not read check results: ${error.message}`);
  for (const row of data ?? []) {
    const program = row.program_id ? programs.get(row.program_id) : undefined;
    byAudit.get(row.audit_id)?.push({
      checkId: row.id,
      key: row.check_key,
      pillar: row.pillar,
      programKey: row.program_id ? (program?.matchKey ?? row.program_id) : null,
      programName: row.program_id ? (program?.name ?? 'Program') : null,
      result: row.result,
      points: Number(row.points_awarded),
      maxPoints: row.points_max,
      checkedAt: row.checked_at,
      finding: row.audit_check_details?.finding ?? null,
      sourceUrl: row.audit_check_details?.source_url ?? null,
    });
  }
  return byAudit;
}

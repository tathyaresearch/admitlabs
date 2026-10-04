// Reads a stored Audit back, for the Audit screens (as the signed-in user, so row level security
// decides what comes back), for the team's review (a waiting Audit, by its id) and for the monthly
// report (service key, as of the end of a month). Nothing here decides who may see what; the
// database does. An institution's own Audits are read approved only, so the AdmitLabs team viewing
// a dashboard sees what the college sees (spec section 25).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import type { ListingProblem } from '../domain/finding-rules.ts';
import { parseReadyFix } from '../domain/ready-fix.ts';
import type { AuditKind } from '../domain/types.ts';
import type { StoredFinding } from './places.ts';
import type { HistoryRow, StoredAudit, StoredCheck } from './view.ts';

type Db = SupabaseClient<Database>;

export class AuditReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditReadError';
  }
}

const OWN_KINDS: readonly AuditKind[] = ['free', 'paid', 'client'];

const AUDIT_FIELDS =
  'id, run_at, kind, trigger, review, program_count, previous_audit_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change';

type AuditRow = {
  id: string;
  run_at: string;
  kind: AuditKind;
  trigger: StoredAudit['trigger'];
  program_count: number;
  previous_audit_id: string | null;
  overall: number;
  discovered: number;
  trusted: number;
  chosen: number;
  overall_change: number | null;
  discovered_change: number | null;
  trusted_change: number | null;
  chosen_change: number | null;
};

async function withChecks(db: Db, audit: AuditRow): Promise<StoredAudit> {
  const [programs, checks] = await Promise.all([
    db
      .from('audit_program_scores')
      .select('program_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change')
      .eq('audit_id', audit.id),
    db
      .from('audit_checks')
      .select(
        'id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, previous_result, checked_at, team_checked_at, audit_check_details(finding, why_it_matters, how_to_fix, fix_steps, difficulty, source_url, ready_fix, fix_title)',
      )
      .eq('audit_id', audit.id),
  ]);
  if (programs.error) throw new AuditReadError(`Could not load program scores: ${programs.error.message}`);
  if (checks.error) throw new AuditReadError(`Could not load check results: ${checks.error.message}`);

  return {
    id: audit.id,
    runAt: audit.run_at,
    kind: audit.kind,
    trigger: audit.trigger,
    programCount: audit.program_count,
    previousAuditId: audit.previous_audit_id,
    scores: { overall: audit.overall, discovered: audit.discovered, trusted: audit.trusted, chosen: audit.chosen },
    changes: { overall: audit.overall_change, discovered: audit.discovered_change, trusted: audit.trusted_change, chosen: audit.chosen_change },
    programs: (programs.data ?? []).map((row) => ({
      programId: row.program_id,
      scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen },
      changes: { overall: row.overall_change, discovered: row.discovered_change, trusted: row.trusted_change, chosen: row.chosen_change },
    })),
    checks: (checks.data ?? []).map((row): StoredCheck => {
      const detail = row.audit_check_details;
      return {
        id: row.id,
        programId: row.program_id,
        pillar: row.pillar,
        key: row.check_key,
        result: row.result,
        pointsAwarded: Number(row.points_awarded),
        pointsMax: row.points_max,
        strengthRank: row.strength_rank,
        fixRank: row.fix_rank,
        previousResult: row.previous_result,
        checkedAt: row.checked_at,
        teamCheckedAt: row.team_checked_at,
        detail: detail
          ? {
              finding: detail.finding,
              whyItMatters: detail.why_it_matters,
              howToFix: detail.how_to_fix,
              fixSteps: detail.fix_steps ?? [],
              difficulty: detail.difficulty,
              sourceUrl: detail.source_url,
              readyFix: parseReadyFix(detail.ready_fix),
              fixTitle: detail.fix_title,
            }
          : null,
      };
    }),
  };
}

/**
 * The institution's latest own Audit (or of the given kinds, such as a team Audit), before
 * `before` when given, with every check the reader may see. Own Audits are approved ones only.
 */
export async function latestStoredAudit(db: Db, institutionId: string, before?: Date, kinds: readonly AuditKind[] = OWN_KINDS): Promise<StoredAudit | null> {
  let query = db.from('audits').select(AUDIT_FIELDS).eq('institution_id', institutionId).in('kind', [...kinds]).eq('review', 'approved');
  if (before) query = query.lt('run_at', before.toISOString());
  const { data: audit, error } = await query.order('run_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new AuditReadError(`Could not load the Audit: ${error.message}`);
  return audit ? withChecks(db, audit) : null;
}

/** One Audit by its id, waiting or approved: the team's review. Null when the reader may not see it. */
export async function storedAuditById(db: Db, auditId: string): Promise<(StoredAudit & { institutionId: string; review: 'waiting' | 'approved' }) | null> {
  const { data: audit, error } = await db.from('audits').select(`${AUDIT_FIELDS}, institution_id`).eq('id', auditId).maybeSingle();
  if (error) throw new AuditReadError(`Could not load the Audit: ${error.message}`);
  if (!audit) return null;
  return { ...(await withChecks(db, audit)), institutionId: audit.institution_id, review: audit.review };
}

/** Own Audits the reader may see, approved ones, oldest first, before `before` when given. */
export async function ownHistory(db: Db, institutionId: string, before?: Date): Promise<Array<HistoryRow & { trigger: string; kind: string }>> {
  let query = db
    .from('audits')
    .select('id, run_at, kind, trigger, overall, discovered, trusted, chosen')
    .eq('institution_id', institutionId)
    .in('kind', [...OWN_KINDS])
    .eq('review', 'approved');
  if (before) query = query.lt('run_at', before.toISOString());
  const { data, error } = await query.order('run_at', { ascending: true });
  if (error) throw new AuditReadError(`Could not load score history: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    runAt: row.run_at,
    kind: row.kind,
    trigger: row.trigger,
    scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen },
  }));
}

const FINDING_FIELDS = 'id, audit_id, place, kind, finding_key, line, source_name, source_url, checked_at, repeats, listing, fix_title, fix_why, fix_steps, ready_fix, effort, impact, fix_rank, removed_at';

type FindingRow = Pick<
  Database['public']['Tables']['audit_findings']['Row'],
  | 'id'
  | 'audit_id'
  | 'place'
  | 'kind'
  | 'finding_key'
  | 'line'
  | 'source_name'
  | 'source_url'
  | 'checked_at'
  | 'repeats'
  | 'listing'
  | 'fix_title'
  | 'fix_why'
  | 'fix_steps'
  | 'ready_fix'
  | 'effort'
  | 'impact'
  | 'fix_rank'
  | 'removed_at'
>;

function toStoredFinding(row: FindingRow): StoredFinding {
  return {
    id: row.id,
    place: row.place,
    kind: row.kind,
    findingKey: row.finding_key,
    line: row.line,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    checkedAt: row.checked_at,
    repeats: row.repeats,
    listing: (row.listing as ListingProblem | null) ?? null,
    fix:
      row.fix_title && row.effort && row.impact
        ? { title: row.fix_title, why: row.fix_why, steps: row.fix_steps ?? [], readyFix: parseReadyFix(row.ready_fix), effort: row.effort, impact: row.impact }
        : null,
    fixRank: row.fix_rank,
    removed: row.removed_at !== null,
  };
}

/**
 * An Audit's findings the reader may see (Free: the ones among its top 3 fixes), in the order
 * they were found. Findings the team took out come back only when `withRemoved` (the team's review).
 */
export async function storedFindings(db: Db, auditId: string, options: { withRemoved?: boolean } = {}): Promise<StoredFinding[]> {
  let query = db.from('audit_findings').select(FINDING_FIELDS).eq('audit_id', auditId);
  if (!options.withRemoved) query = query.is('removed_at', null);
  const { data, error } = await query.order('place').order('checked_at').order('finding_key');
  if (error) throw new AuditReadError(`Could not load what was found: ${error.message}`);
  return (data ?? []).map(toStoredFinding);
}

/** The findings of several Audits the reader may see, by Audit: you and your rivals, side by side. Never one taken out. */
export async function findingsByAudit(db: Db, auditIds: readonly string[]): Promise<Map<string, StoredFinding[]>> {
  const byAudit = new Map<string, StoredFinding[]>(auditIds.map((id) => [id, []]));
  if (auditIds.length === 0) return byAudit;
  const { data, error } = await db.from('audit_findings').select(FINDING_FIELDS).in('audit_id', [...auditIds]).is('removed_at', null).order('checked_at').order('finding_key');
  if (error) throw new AuditReadError(`Could not load what was found: ${error.message}`);
  for (const row of data ?? []) byAudit.get(row.audit_id)?.push(toStoredFinding(row));
  return byAudit;
}

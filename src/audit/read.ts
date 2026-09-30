// Reads a stored Audit back, for the Audit screens (as the signed-in user, so row level security
// decides what comes back) and for the monthly report (service key, as of the end of a month).
// Nothing here decides who may see what; the database does.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import type { AuditKind } from '../domain/types.ts';
import type { HistoryRow, StoredAudit, StoredCheck } from './view.ts';

type Db = SupabaseClient<Database>;

export class AuditReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditReadError';
  }
}

const OWN_KINDS: readonly AuditKind[] = ['free', 'paid', 'client'];

/**
 * The institution's latest own Audit (or of the given kinds, such as a team Audit), before
 * `before` when given, with every check the reader may see.
 */
export async function latestStoredAudit(db: Db, institutionId: string, before?: Date, kinds: readonly AuditKind[] = OWN_KINDS): Promise<StoredAudit | null> {
  let query = db
    .from('audits')
    .select('id, run_at, kind, trigger, program_count, previous_audit_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change')
    .eq('institution_id', institutionId)
    .in('kind', [...kinds]);
  if (before) query = query.lt('run_at', before.toISOString());
  const { data: audit, error } = await query.order('run_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new AuditReadError(`Could not load the Audit: ${error.message}`);
  if (!audit) return null;

  const [programs, checks] = await Promise.all([
    db
      .from('audit_program_scores')
      .select('program_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change')
      .eq('audit_id', audit.id),
    db
      .from('audit_checks')
      .select(
        'id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, previous_result, checked_at, audit_check_details(finding, why_it_matters, how_to_fix, difficulty, source_url)',
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
        detail: detail
          ? { finding: detail.finding, whyItMatters: detail.why_it_matters, howToFix: detail.how_to_fix, difficulty: detail.difficulty, sourceUrl: detail.source_url }
          : null,
      };
    }),
  };
}

/** Own Audits the reader may see, oldest first, before `before` when given. */
export async function ownHistory(db: Db, institutionId: string, before?: Date): Promise<Array<HistoryRow & { trigger: string; kind: string }>> {
  let query = db.from('audits').select('id, run_at, kind, trigger, overall, discovered, trusted, chosen').eq('institution_id', institutionId).in('kind', [...OWN_KINDS]);
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

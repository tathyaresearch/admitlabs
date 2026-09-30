// Loads what the Audit screens need, as the signed-in user: row level security decides what
// comes back (Free gets its latest Audit, one program and the top 3 details; Paid and
// Client get everything). Nothing here widens what the database returns.

import { cache } from 'react';
import type { HistoryRow, StoredAudit, StoredCheck } from '@/audit/view';
import type { ProgramEntry } from '@/components/audit/Programs';
import { monthKey } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import { refreshesLeft, refreshResetsOn, upcomingAudit } from '@/domain/schedule';
import type { Tier } from '@/domain/types';
import type { Viewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

export interface ProgramRow {
  id: string;
  name: string;
  programKey: string | null;
  archived: boolean;
}

export interface AuditPageData {
  audit: StoredAudit | null;
  programs: ProgramRow[];
  names: Map<string, string>;
  history: Array<HistoryRow & { trigger: string; kind: string }>;
  nextAudit: { on: Date; tier: Tier } | null;
  /** Paid owners only: the extra refresh this calendar month. */
  refresh: { left: number; resetsOn: Date } | null;
}

const OWN_KINDS = ['free', 'paid', 'client'] as const;

export const loadPrograms = cache(async (institutionId: string): Promise<ProgramRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('programs').select('id, name, program_key, archived_at').eq('institution_id', institutionId).order('name');
  if (error) throw new Error(`Could not load programs: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, programKey: row.program_key, archived: row.archived_at !== null }));
});

export const loadLatestAudit = cache(async (institutionId: string): Promise<StoredAudit | null> => {
  const supabase = await createClient();
  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, run_at, kind, trigger, program_count, previous_audit_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change')
    .eq('institution_id', institutionId)
    .in('kind', [...OWN_KINDS])
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the Audit: ${error.message}`);
  if (!audit) return null;

  const [programs, checks] = await Promise.all([
    supabase
      .from('audit_program_scores')
      .select('program_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change')
      .eq('audit_id', audit.id),
    supabase
      .from('audit_checks')
      .select(
        'id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, previous_result, checked_at, audit_check_details(finding, why_it_matters, how_to_fix, difficulty, source_url)',
      )
      .eq('audit_id', audit.id),
  ]);
  if (programs.error) throw new Error(`Could not load program scores: ${programs.error.message}`);
  if (checks.error) throw new Error(`Could not load check results: ${checks.error.message}`);

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
});

/** Own Audits the viewer may see: every one on Paid and Client, the latest only on Free. */
export const loadHistory = cache(async (institutionId: string): Promise<Array<HistoryRow & { trigger: string; kind: string }>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audits')
    .select('id, run_at, kind, trigger, overall, discovered, trusted, chosen')
    .eq('institution_id', institutionId)
    .in('kind', [...OWN_KINDS])
    .order('run_at', { ascending: true });
  if (error) throw new Error(`Could not load score history: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    runAt: row.run_at,
    kind: row.kind,
    trigger: row.trigger,
    scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen },
  }));
});

/** One program's scores across the Audits the viewer may see (Paid and Client: all of them). */
export const loadProgramHistory = cache(async (programId: string): Promise<Array<HistoryRow & { trigger: string }>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_program_scores')
    .select('overall, discovered, trusted, chosen, audits!inner(id, run_at, trigger)')
    .eq('program_id', programId);
  if (error) throw new Error(`Could not load program history: ${error.message}`);
  return (data ?? [])
    .map((row) => ({
      id: row.audits.id,
      runAt: row.audits.run_at,
      trigger: row.audits.trigger,
      scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen },
    }))
    .sort((a, b) => a.runAt.localeCompare(b.runAt));
});

/** Programs for the switcher and the by-program list: scored, locked (Free) or in the next Audit. */
export function programEntries(data: AuditPageData, tier: Tier, freeProgramId: string | null): ProgramEntry[] {
  const scored = new Map((data.audit?.programs ?? []).map((program) => [program.programId, program]));
  return data.programs
    .filter((program) => !program.archived || scored.has(program.id))
    .map((program): ProgramEntry => {
      const score = scored.get(program.id);
      if (score) return { id: program.id, name: program.name, state: 'scored', score: { overall: score.scores.overall, change: score.changes.overall } };
      if (tier === 'free' && program.id !== freeProgramId) return { id: program.id, name: program.name, state: 'locked' };
      return { id: program.id, name: program.name, state: 'next' };
    })
    .sort((a, b) => Number(b.state === 'scored') - Number(a.state === 'scored'));
}

/** "Next Audit on 15 Oct 2026", or "Next free Audit on ..." once a plan has ended. */
export function nextAuditText(data: AuditPageData): string {
  if (!data.nextAudit) return 'In your next Audit';
  return `${data.nextAudit.tier === 'free' ? 'Next free Audit' : 'Next Audit'} on ${formatDate(data.nextAudit.on)}`;
}

/** The one small caption under the Audit title: when it was checked, when it runs next, the plan. */
export function auditCaption(data: AuditPageData, viewer: Pick<Viewer, 'tier' | 'plan'>): string[] {
  const caption = data.audit ? [`Checked ${formatDate(data.audit.runAt)}`] : [];
  caption.push(nextAuditText(data));
  if (viewer.tier === 'paid' && viewer.plan?.endsAt) caption.push(`Paid until ${formatDate(viewer.plan.endsAt)}`);
  if (viewer.tier === 'client') caption.push('Your AdmitLabs team can refresh it at any time');
  return caption;
}

export async function loadAuditPage(viewer: Viewer & { membership: NonNullable<Viewer['membership']> }): Promise<AuditPageData> {
  const institutionId = viewer.membership.institution.id;
  const [audit, programs, history] = await Promise.all([loadLatestAudit(institutionId), loadPrograms(institutionId), loadHistory(institutionId)]);
  const now = new Date();

  const lastScheduled = [...history].reverse().find((row) => row.trigger === 'signup' || row.trigger === 'scheduled');
  const nextAudit = upcomingAudit(viewer.plan, lastScheduled ? new Date(lastScheduled.runAt) : null, now);

  let refresh: AuditPageData['refresh'] = null;
  if (viewer.tier === 'paid' && viewer.membership.role === 'owner') {
    const used = history.filter((row) => row.kind === 'paid' && row.trigger === 'manual' && monthKey(new Date(row.runAt)) === monthKey(now)).length;
    refresh = { left: refreshesLeft('paid', used), resetsOn: refreshResetsOn(now) };
  }

  return {
    audit,
    programs,
    names: new Map(programs.map((program) => [program.id, program.name])),
    history,
    nextAudit,
    refresh,
  };
}

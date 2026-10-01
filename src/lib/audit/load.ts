// Loads what the Audit screens need, as the signed-in user: row level security decides what
// comes back (Free gets its latest Audit, one program and the top 3 details; Paid and
// Client get everything). Nothing here widens what the database returns.

import { cache } from 'react';
import { latestStoredAudit, ownHistory } from '@/audit/read';
import type { HistoryRow, StoredAudit } from '@/audit/view';
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

export const loadPrograms = cache(async (institutionId: string): Promise<ProgramRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('programs').select('id, name, program_key, archived_at').eq('institution_id', institutionId).order('name');
  if (error) throw new Error(`Could not load programs: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, programKey: row.program_key, archived: row.archived_at !== null }));
});

export const loadLatestAudit = cache(async (institutionId: string): Promise<StoredAudit | null> => latestStoredAudit(await createClient(), institutionId));

/** Own Audits the viewer may see: every one on Paid and Client, the latest only on Free. */
export const loadHistory = cache(async (institutionId: string): Promise<Array<HistoryRow & { trigger: string; kind: string }>> => ownHistory(await createClient(), institutionId));

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

/**
 * The quiet line under the score: the next Audit, but only when it runs on the plan you are on.
 * A Paid plan that ends before its next Audit says so in the plan notice instead.
 */
export function auditNote(data: AuditPageData, tier: Tier): string | null {
  return data.nextAudit && data.nextAudit.tier === tier ? `${nextAuditText(data)}.` : null;
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

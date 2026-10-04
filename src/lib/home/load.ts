// What Home and the Audit read beyond the Audit, Rivals and Demand loaders: the things marked
// done, the rival moves since the last Audit, this month's big jumps in searches, and whether this
// person closed Start here. Read as the signed-in user, so row level security decides what comes back.

import type { DoneMark } from '@/audit/marks';
import { DEMAND_RULES } from '@/config/demand';
import { formatDate } from '@/domain/format';
import type { CheckKey } from '@/domain/types';
import type { AuditPageData } from '@/lib/audit/load';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadDemandSignals } from '@/lib/demand/load';
import { loadRivalList, type MoveRow } from '@/lib/rivals/load';
import { createClient } from '@/lib/supabase/server';

/** The marks still waiting (and the month's other things), plus those the Audit `checkedBy` checked. */
export async function loadMarks(institutionId: string, checkedBy: string | null): Promise<DoneMark[]> {
  const supabase = await createClient();
  let query = supabase.from('done_marks').select('id, check_key, finding_key, thing, month, marked_at, checked_by_audit').eq('institution_id', institutionId);
  query = checkedBy ? query.or(`checked_by_audit.is.null,checked_by_audit.eq.${checkedBy}`) : query.is('checked_by_audit', null);
  const { data, error } = await query.order('marked_at', { ascending: false });
  if (error) throw new Error(`Could not load what was marked done: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    checkKey: row.check_key,
    findingKey: row.finding_key,
    thing: row.thing,
    month: row.month ? row.month.slice(0, 7) : null,
    markedAt: row.marked_at,
    checkedBy: row.checked_by_audit,
  }));
}

/**
 * What the check panel needs for Mark as done: whether this person can mark (the owner, as
 * themselves), the checks waiting for the next Audit, and when it runs on this plan.
 */
export async function loadMarkState(viewer: InstitutionViewer, data: Pick<AuditPageData, 'nextAudit'>): Promise<{ canMark: boolean; marked: CheckKey[]; nextAudit: string | null }> {
  const marks = await loadMarks(viewer.membership.institution.id, null);
  return {
    canMark: viewer.membership.role === 'owner' && !viewer.viewingAs,
    marked: marks.flatMap((mark) => (mark.checkKey ? [mark.checkKey] : [])),
    nextAudit: data.nextAudit && data.nextAudit.tier === viewer.tier ? formatDate(data.nextAudit.on) : null,
  };
}

export type RivalMove = MoveRow & { rivalName: string };

/** Your rivals' moves after a moment, newest first. */
export async function loadMovesSince(institutionId: string, since: string): Promise<RivalMove[]> {
  const rivals = await loadRivalList(institutionId);
  if (rivals.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rival_moves')
    .select('id, rival_institution_id, kind, description, source_url, detected_at')
    .in(
      'rival_institution_id',
      rivals.map((rival) => rival.id),
    )
    .gt('detected_at', since)
    .order('detected_at', { ascending: false });
  if (error) throw new Error(`Could not load your rivals' moves: ${error.message}`);
  const names = new Map(rivals.map((rival) => [rival.id, rival.name]));
  return (data ?? []).map((row) => ({
    id: row.id,
    rivalId: row.rival_institution_id,
    rivalName: names.get(row.rival_institution_id) ?? 'A rival',
    kind: row.kind,
    description: row.description,
    sourceUrl: row.source_url,
    detectedAt: row.detected_at,
  }));
}

export interface Spike {
  text: string;
  programName: string;
  changePct: number;
  sourceUrl: string;
}

/** This month's big jumps in what students search for in your city (the ones Paid and Client are alerted to). */
export async function loadSpikes(viewer: InstitutionViewer): Promise<Spike[]> {
  const signals = await loadDemandSignals(viewer);
  return (signals?.trends ?? [])
    .filter((row) => row.kind === 'rising' && row.region === viewer.membership.institution.city && (row.changePct ?? 0) >= DEMAND_RULES.spikeMinChangePct)
    .map((row) => ({ text: row.text, programName: row.programName, changePct: row.changePct ?? 0, sourceUrl: row.sourceUrl }));
}

/** Whether this person has closed Start here. The AdmitLabs team viewing an institution never sees it. */
export async function loadGuideClosed(viewer: InstitutionViewer): Promise<boolean> {
  if (viewer.viewingAs) return true;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memberships')
    .select('guide_closed_at')
    .eq('user_id', viewer.userId)
    .eq('institution_id', viewer.membership.institution.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load Start here: ${error.message}`);
  return Boolean(data?.guide_closed_at);
}

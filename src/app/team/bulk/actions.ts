'use server';

// Bulk Audit (spec section 13): check a pasted list or CSV, add each institution as a prospect
// (or reuse its record), and run a team Audit for each, one row at a time so the page can show
// progress. Team only. The list is checked again on the server; the page is never trusted.

import { revalidatePath } from 'next/cache';
import { AuditRunError, runAudit } from '@/audit/run';
import { checkName as checkNameLabel } from '@/domain/checks';
import { websiteHost } from '@/domain/onboarding';
import { scoreLabel } from '@/domain/scores';
import type { CheckKey, InstitutionType } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkList, type ProspectDetails } from '@/team/bulk';

export interface BulkCheckRow {
  position: number;
  label: string;
  status: 'ready' | 'fix' | 'skip';
  problems: string[];
  note: string | null;
  place: string | null;
}

export interface BulkCheck {
  rows: BulkCheckRow[];
  error: string | null;
}

export interface BulkResult {
  position: number;
  name: string;
  status: 'audited' | 'failed';
  institutionId: string | null;
  overall: number | null;
  label: string | null;
  pillars: { discovered: number; trusted: number; chosen: number } | null;
  topFix: string | null;
  reused: boolean;
  message: string | null;
}

const NOT_TEAM = 'Only the AdmitLabs team can run a bulk Audit.';

async function teamUser() {
  const viewer = await getViewer();
  return viewer?.teamRole ? viewer : null;
}

type Checked = { position: number; label: string; status: BulkCheckRow['status']; problems: string[]; note: string | null; details: ProspectDetails | null };

/** The list checked, with rows whose website is already in Drishti marked: skipped if signed up, reused otherwise. */
async function checkWithRecords(text: string): Promise<{ rows: Checked[]; error: string | null }> {
  const checked = checkList(text);
  if (checked.error) return { rows: [], error: checked.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from('institutions').select('website, institution_status(claimed)');
  if (error) throw new Error(`Could not read institutions: ${error.message}`);
  const known = new Map((data ?? []).map((row) => [websiteHost(row.website), Boolean(row.institution_status?.claimed)]));
  return {
    error: null,
    rows: checked.rows.map((row): Checked => {
      if (row.status === 'fix') return { position: row.position, label: row.label, status: 'fix', problems: row.problems, note: null, details: null };
      const claimed = known.get(websiteHost(row.details.website));
      if (claimed) return { position: row.position, label: row.label, status: 'skip', problems: [], note: 'Already on Drishti: this institution has signed up, so it is skipped.', details: null };
      return {
        position: row.position,
        label: row.label,
        status: 'ready',
        problems: [],
        note: claimed === false ? 'Already in Drishti. Its record is reused.' : null,
        details: row.details,
      };
    }),
  };
}

export async function checkListAction(text: string): Promise<BulkCheck> {
  if (!(await teamUser())) return { rows: [], error: NOT_TEAM };
  const { rows, error } = await checkWithRecords(text);
  return {
    error,
    rows: rows.map(({ details, ...row }) => ({ ...row, place: details ? `${details.city}, ${details.state}` : null })),
  };
}

/** Saves the run and its ready rows. Returns the rows to audit, in order. */
export async function startRunAction(text: string, source: 'paste' | 'csv'): Promise<{ runId: string | null; positions: number[]; error: string | null }> {
  const viewer = await teamUser();
  if (!viewer) return { runId: null, positions: [], error: NOT_TEAM };
  const { rows, error } = await checkWithRecords(text);
  if (error) return { runId: null, positions: [], error };
  const ready = rows.filter((row) => row.status === 'ready' && row.details);
  if (!ready.length) return { runId: null, positions: [], error: 'No row is ready to audit yet. Fix the rows marked above first.' };

  const supabase = await createClient();
  const run = await supabase.from('bulk_runs').insert({ created_by: viewer.userId, source, total: ready.length }).select('id').single();
  if (run.error) return { runId: null, positions: [], error: 'The run could not be started. Try again.' };
  const saved = await supabase.from('bulk_run_rows').insert(
    ready.map((row) => ({ run_id: run.data.id, position: row.position, details: JSON.parse(JSON.stringify(row.details)) })),
  );
  if (saved.error) return { runId: null, positions: [], error: 'The run could not be started. Try again.' };
  return { runId: run.data.id, positions: ready.map((row) => row.position), error: null };
}

/** Adds one row's institution as a prospect and runs its team Audit. */
export async function runRowAction(runId: string, position: number): Promise<BulkResult> {
  const viewer = await teamUser();
  const failed = (name: string, message: string): BulkResult => ({
    position,
    name,
    status: 'failed',
    institutionId: null,
    overall: null,
    label: null,
    pillars: null,
    topFix: null,
    reused: false,
    message,
  });
  if (!viewer) return failed('Row', NOT_TEAM);
  const supabase = await createClient();
  const { data: row, error } = await supabase.from('bulk_run_rows').select('details, outcome').eq('run_id', runId).eq('position', position).maybeSingle();
  if (error || !row) return failed('Row', 'This row could not be found.');
  const details = row.details as unknown as ProspectDetails;
  if (row.outcome !== 'waiting') return failed(details.name, 'This row has already run.');

  const added = await supabase.rpc('add_prospect', { p_details: JSON.parse(JSON.stringify(details)) });
  const prospect = added.data?.[0];
  if (added.error || !prospect) {
    const message = added.error?.message.includes('signed_up') ? 'This institution has signed up since the list was checked, so it is skipped.' : 'It could not be added.';
    await supabase.from('bulk_run_rows').update({ outcome: 'failed', message }).eq('run_id', runId).eq('position', position);
    return failed(details.name, message);
  }

  try {
    const result = await runAudit(createAdminClient(), { institutionId: prospect.prospect_id, asOf: new Date(), trigger: 'manual', kind: 'team', createdBy: viewer.userId });
    await supabase
      .from('bulk_run_rows')
      .update({ outcome: 'audited', institution_id: prospect.prospect_id, audit_id: result.auditId, reused: prospect.reused })
      .eq('run_id', runId)
      .eq('position', position);
    const top = result.record.checks.find((check) => check.fix_rank === 1);
    return {
      position,
      name: details.name,
      status: 'audited',
      institutionId: prospect.prospect_id,
      overall: result.record.overall,
      label: scoreLabel(result.record.overall),
      pillars: { discovered: result.record.discovered, trusted: result.record.trusted, chosen: result.record.chosen },
      topFix: top ? checkNameLabel(top.check_key as CheckKey, details.type as InstitutionType) : null,
      reused: prospect.reused,
      message: null,
    };
  } catch (caught) {
    if (!(caught instanceof AuditRunError)) throw caught;
    await supabase.from('bulk_run_rows').update({ outcome: 'failed', institution_id: prospect.prospect_id, reused: prospect.reused, message: caught.message }).eq('run_id', runId).eq('position', position);
    return { ...failed(details.name, caught.message), institutionId: prospect.prospect_id, reused: prospect.reused };
  } finally {
    revalidatePath('/team');
  }
}

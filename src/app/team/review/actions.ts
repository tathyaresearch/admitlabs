'use server';

// The team's review (spec section 25): a change to a waiting Audit or a line of a waiting monthly
// summary, and Approve and send. Team only: checked here, and again by row level security and
// inside record_review(), record_summary_edit(), approve_audit() and approve_report(), which also
// refuse what is no longer waiting. Every change is kept. Once an Audit is approved, the month's
// rival line and lessons are worked out again from it; once a summary is, its PDF is made again
// with the lines as fixed and the email goes.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { applyReviewChange, approveAudit, ReviewError } from '@/audit/review-jobs';
import type { ReviewChange } from '@/audit/review';
import { isFullTeam, RESULTS } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { approveReport, fixSummaryLine, ReportJobError } from '@/report/jobs';
import { SUMMARY_TARGETS, type SummaryTarget } from '@/report/summary';
import { RivalJobError, writeRivalActions } from '@/rivals/jobs';
import { RivalReadError } from '@/rivals/read';

export interface ReviewActionResult {
  ok: boolean;
  error: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECK_FIELDS = ['finding', 'fix_title', 'fix_steps', 'ready_fix'] as const;
const FINDING_FIELDS = ['line', 'fix_title', 'fix_steps', 'ready_fix'] as const;

/** Only well formed changes reach the database. */
function cleanChange(change: ReviewChange): ReviewChange | null {
  const text = (value: unknown, max: number) => (typeof value === 'string' && value.trim() && value.length <= max ? value : null);
  switch (change.kind) {
    case 'result': {
      const reason = text(change.reason, 500);
      return UUID.test(change.checkId) && (RESULTS as readonly string[]).includes(change.result) && reason ? { ...change, reason } : null;
    }
    case 'line': {
      const value = text(change.value, change.field === 'ready_fix' ? 4000 : 1000);
      if (!value) return null;
      if (change.on === 'check') return UUID.test(change.checkId) && (CHECK_FIELDS as readonly string[]).includes(change.field) ? { ...change, value } : null;
      return UUID.test(change.findingId) && (FINDING_FIELDS as readonly string[]).includes(change.field) ? { ...change, value } : null;
    }
    case 'remove': {
      const reason = text(change.reason, 500);
      return UUID.test(change.findingId) && reason ? { ...change, reason } : null;
    }
  }
}

export async function reviewChangeAction(auditId: string, change: ReviewChange): Promise<ReviewActionResult> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { ok: false, error: 'Only the AdmitLabs team reviews Audits.' };
  const clean = UUID.test(auditId) ? cleanChange(change) : null;
  if (!clean) return { ok: false, error: 'That change is not complete. Fill in each box and try again.' };
  try {
    await applyReviewChange(await createClient(), auditId, clean);
  } catch (error) {
    if (error instanceof ReviewError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/team/review/${auditId}`);
  revalidatePath('/team/review');
  return { ok: true, error: null };
}

export async function approveAuditAction(auditId: string): Promise<ReviewActionResult> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { ok: false, error: 'Only the AdmitLabs team approves Audits.' };
  if (!UUID.test(auditId)) return { ok: false, error: 'That Audit is not there.' };
  const db = await createClient();
  try {
    await approveAudit(db, auditId);
  } catch (error) {
    if (error instanceof ReviewError) return { ok: false, error: error.message };
    throw error;
  }
  // The rival line and lessons from the Audit the college sees now. The approval stands either way.
  const { data: approved } = await db.from('audits').select('institution_id').eq('id', auditId).maybeSingle();
  if (approved) {
    try {
      await writeRivalActions(createAdminClient(), approved.institution_id, new Date());
    } catch (error) {
      if (!(error instanceof RivalJobError || error instanceof RivalReadError)) throw error;
      console.error(`The rival line after approval did not finish: ${error.message}`);
    }
  }
  revalidatePath('/team', 'layout');
  revalidatePath('/', 'layout');
  // A Client manager has no To review list: back to the Client's page.
  redirect(isFullTeam(viewer.teamRole) || !approved ? '/team/review?approved=1' : `/team/institutions/${approved.institution_id}`);
}

export async function fixSummaryLineAction(reportId: string, target: SummaryTarget, value: string, reason: string): Promise<ReviewActionResult> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { ok: false, error: 'Only the AdmitLabs team reviews summaries.' };
  if (!UUID.test(reportId) || !SUMMARY_TARGETS.includes(target)) return { ok: false, error: 'That line is not there.' };
  const line = typeof value === 'string' ? value.trim() : '';
  if (!line || line.length > 400) return { ok: false, error: 'Write the line, in 400 characters or fewer.' };
  const why = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 500) : null;
  try {
    await fixSummaryLine(await createClient(), reportId, target, line, { reason: why });
  } catch (error) {
    if (error instanceof ReportJobError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/team/review/summary/${reportId}`);
  revalidatePath('/team/review');
  return { ok: true, error: null };
}

export async function approveSummaryAction(reportId: string): Promise<ReviewActionResult> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { ok: false, error: 'Only the AdmitLabs team approves summaries.' };
  if (!UUID.test(reportId)) return { ok: false, error: 'That summary is not there.' };
  // Checked as the team first; the PDF and the emails need the server's key.
  const { data: visible } = await (await createClient()).from('reports').select('id, institution_id').eq('id', reportId).maybeSingle();
  if (!visible) return { ok: false, error: 'That summary is not there.' };
  try {
    await approveReport(createAdminClient(), reportId, { by: viewer.userId });
  } catch (error) {
    if (error instanceof ReportJobError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath('/team', 'layout');
  revalidatePath('/', 'layout');
  redirect(isFullTeam(viewer.teamRole) ? '/team/review?approved=summary' : `/team/institutions/${visible.institution_id}`);
}

'use server';

// The team's review (spec section 25): a change to a waiting Audit, and Approve and send. Team
// only: checked here, and again by row level security and inside record_review() and
// approve_audit(), which also refuse an Audit that is no longer waiting. Every change is kept.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { applyReviewChange, approveAudit, ReviewError } from '@/audit/review-jobs';
import type { ReviewChange } from '@/audit/review';
import { RESULTS } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

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
  try {
    await approveAudit(await createClient(), auditId);
  } catch (error) {
    if (error instanceof ReviewError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath('/team', 'layout');
  redirect('/team/review?approved=1');
}

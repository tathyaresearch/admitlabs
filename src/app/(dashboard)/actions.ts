'use server';

// Mark as done (owner only, on Home and in the Audit's check panel) and taking it back: checked
// here and again in mark_done() and undo_done(), which also check the latest own Audit. Closing
// Start here: anyone at the institution, for themselves. Asking AdmitLabs for Paid: the owner.

import { revalidatePath } from 'next/cache';
import { CHECK_KEYS, type CheckKey } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

export interface MarkInput {
  /** A check, which the next Audit checks. */
  check: CheckKey | null;
  /** Or another thing, by its words, with its month ('YYYY-MM'). */
  thing: string | null;
  month: string | null;
  done: boolean;
}

export interface MarkResult {
  ok: boolean;
  error: string | null;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function markDoneAction(input: MarkInput): Promise<MarkResult> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs || viewer.membership.role !== 'owner') {
    return { ok: false, error: 'Only the owner of this account can mark things done.' };
  }
  const check = input.check && (CHECK_KEYS as readonly string[]).includes(input.check) ? input.check : null;
  const thing = check ? null : typeof input.thing === 'string' && input.thing.trim() && input.thing.length <= 300 ? input.thing : null;
  const month = check ? null : typeof input.month === 'string' && MONTH.test(input.month) ? `${input.month}-01` : null;
  if (!check && (!thing || !month)) return { ok: false, error: 'That could not be marked. Reload the page and try again.' };

  const supabase = await createClient();
  const args = { p_institution: viewer.membership.institution.id, p_check: check ?? undefined, p_thing: thing ?? undefined, p_month: month ?? undefined };
  const { error } = input.done ? await supabase.rpc('mark_done', args) : await supabase.rpc('undo_done', args);
  if (error) {
    if (error.message.includes('nothing_to_fix')) return { ok: false, error: 'Your latest Audit already finds this Strong.' };
    return { ok: false, error: 'That did not save. Try again.' };
  }
  // Home, the Audit and each program show it.
  revalidatePath('/', 'layout');
  return { ok: true, error: null };
}

export async function closeStartGuideAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc('close_start_guide', { p_institution: viewer.membership.institution.id });
  if (!error) revalidatePath('/');
}

export interface AskResult {
  ok: boolean;
  /** When the request was sent: now, or when an open one was sent before. */
  askedAt: string | null;
  error: string | null;
}

/**
 * The owner asks AdmitLabs for Paid, or to continue it (C2). It lands in the team's Enquiries;
 * ask_for_paid() checks the owner and the plan again and never sends a second open request.
 * No payment and no email.
 */
export async function askForPaidAction(): Promise<AskResult> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs || viewer.membership.role !== 'owner') {
    return { ok: false, askedAt: null, error: 'Only the owner of this account can ask for Paid.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ask_for_paid', { p_institution: viewer.membership.institution.id });
  if (error) {
    if (error.message.includes('nothing_to_ask')) return { ok: false, askedAt: null, error: 'There is nothing to ask for on your plan right now.' };
    return { ok: false, askedAt: null, error: 'That did not send. Try again.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, askedAt: data, error: null };
}

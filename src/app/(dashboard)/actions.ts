'use server';

// Mark as done (owner only, on Home and in the Audit's fix panel) and taking it back: checked
// here and again in mark_done() and undo_done(), which also check the latest approved own Audit.
// Closing Start here: anyone at the institution, for themselves. Asking AdmitLabs for Paid, and to
// fix one thing: the owner.

import { revalidatePath } from 'next/cache';
import { parseFixKey } from '@/domain/fix-key';
import { CHECK_KEYS, type CheckKey } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

export interface MarkInput {
  /** A check, which the next Audit checks. */
  check: CheckKey | null;
  /** Or a finding with something to do, by its key, which the next Audit checks too. */
  finding?: string | null;
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
  const finding = !check && typeof input.finding === 'string' && input.finding.trim() && input.finding.length <= 200 ? input.finding : null;
  const thing = check || finding ? null : typeof input.thing === 'string' && input.thing.trim() && input.thing.length <= 300 ? input.thing : null;
  const month = check || finding ? null : typeof input.month === 'string' && MONTH.test(input.month) ? `${input.month}-01` : null;
  if (!check && !finding && (!thing || !month)) return { ok: false, error: 'That could not be marked. Reload the page and try again.' };

  const supabase = await createClient();
  const args = { p_institution: viewer.membership.institution.id, p_check: check ?? undefined, p_finding: finding ?? undefined, p_thing: thing ?? undefined, p_month: month ?? undefined };
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
 * Subscribe now, or Renew now (C2): the owner's request lands in the team's Enquiries, and the
 * team writes back to complete payment. ask_for_paid() checks the owner and the plan again and
 * never sends a second open request. No online payment yet, and no email.
 */
export async function askForPaidAction(): Promise<AskResult> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs || viewer.membership.role !== 'owner') {
    return { ok: false, askedAt: null, error: 'Only the owner of this account can subscribe or renew.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ask_for_paid', { p_institution: viewer.membership.institution.id });
  if (error) {
    if (error.message.includes('nothing_to_ask')) return { ok: false, askedAt: null, error: 'There is nothing to subscribe to or renew on your plan right now.' };
    return { ok: false, askedAt: null, error: 'That did not send. Try again.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, askedAt: data, error: null };
}

/**
 * Talk to AdmitLabs, from the sidebar's services card (Free and Paid): the owner or a member asks
 * the team about its services. ask_admitlabs_services() checks the plan again and keeps one open
 * request per institution. No email.
 */
export async function askServicesAction(): Promise<AskResult> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs) return { ok: false, askedAt: null, error: 'That did not send. Reload the page and try again.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ask_admitlabs_services', { p_institution: viewer.membership.institution.id });
  if (error) {
    if (error.message.includes('already_client')) return { ok: false, askedAt: null, error: 'You already work with AdmitLabs: write to your team any time.' };
    return { ok: false, askedAt: null, error: 'That did not send. Try again.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, askedAt: data, error: null };
}

/** A fix marked done or taken back, by its id as the Audit names it: 'check:fees_shown' or 'finding:<key>'. */
export async function markFixAction(input: { fixId: string; done: boolean }): Promise<MarkResult> {
  const fix = parseFixKey(input.fixId);
  if (!fix) return { ok: false, error: 'That could not be marked. Reload the page and try again.' };
  return markDoneAction(fix.kind === 'check' ? { check: fix.checkKey, thing: null, month: null, done: input.done } : { check: null, finding: fix.findingKey, thing: null, month: null, done: input.done });
}

/**
 * The owner asks AdmitLabs to fix one thing (spec 7.7). It lands in the team's Enquiries with the
 * institution and the fix; ask_admitlabs_fix() checks the owner, the plan and the latest approved
 * Audit again, and never sends a second open request for the same fix. No price, no email.
 */
export async function askFixAction(input: { fixId: string; title: string }): Promise<AskResult> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs || viewer.membership.role !== 'owner') {
    return { ok: false, askedAt: null, error: 'Only the owner of this account can ask AdmitLabs to fix something.' };
  }
  if (!parseFixKey(input.fixId) || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200) {
    return { ok: false, askedAt: null, error: 'That did not send. Reload the page and try again.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ask_admitlabs_fix', { p_institution: viewer.membership.institution.id, p_fix_key: input.fixId, p_fix_title: input.title });
  if (error) {
    if (error.message.includes('nothing_to_fix')) return { ok: false, askedAt: null, error: 'Your latest Audit no longer has this to fix.' };
    if (error.message.includes('team_works_on_it')) return { ok: false, askedAt: null, error: 'Your AdmitLabs team already works on this.' };
    return { ok: false, askedAt: null, error: 'That did not send. Try again.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, askedAt: data, error: null };
}

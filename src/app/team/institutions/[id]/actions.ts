'use server';

// The team's actions on one institution. Each checks the team role (and Admin for plans) here,
// and the database checks again: notes, links and plans are written as the signed-in team user,
// so row level security and the database functions apply. Audits run with the service key, the
// one path every Audit takes, only after those checks.

import { revalidatePath } from 'next/cache';
import { AuditRunError, runAudit } from '@/audit/run';
import { LEAD_RULES } from '@/config/leads';
import { TEAM_RULES } from '@/config/team';
import { LEAD_SOURCES, type LeadSource } from '@/domain/types';
import { istParts } from '@/domain/dates';
import { effectiveTier, type PlanRecord } from '@/domain/tiers';
import { tidyText } from '@/domain/onboarding';
import { ANY_COURSE_VALUE } from '@/leads/text';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { writeRivalActions } from '@/rivals/jobs';
import { paidStartFrom } from '@/team/plans';
import { checkWork } from '@/team/work';

export interface ActionState {
  status: 'idle' | 'done' | 'error';
  message: string | null;
  /** Changes on every reply, so a form can reset after a success. */
  attempt: number;
}

const reply = (previous: ActionState, status: ActionState['status'], message: string | null): ActionState => ({ status, message, attempt: previous.attempt + 1 });

async function teamUser() {
  const viewer = await getViewer();
  return viewer?.teamRole ? viewer : null;
}

const NOT_TEAM = 'Only the AdmitLabs team can do this.';
const NOT_ADMIN = 'Only an Admin changes plans.';

const pagePath = (institutionId: string) => `/team/institutions/${institutionId}`;

// Notes -------------------------------------------------------------------------------------------

export async function addNoteAction(institutionId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_TEAM);
  const body = String(formData.get('body') ?? '').replace(/\r\n/g, '\n').trim();
  if (!body) return reply(previous, 'error', 'Write the note first.');
  if (body.length > 2000) return reply(previous, 'error', 'Keep a note under 2,000 characters.');
  const supabase = await createClient();
  const { error } = await supabase.from('notes').insert({ institution_id: institutionId, body: tidyNote(body) });
  if (error) return reply(previous, 'error', 'The note could not be saved. Try again.');
  revalidatePath(pagePath(institutionId));
  return reply(previous, 'done', 'Note added.');
}

/** Plain text, without em or en dashes, keeping line breaks. */
function tidyNote(body: string): string {
  return body
    .split('\n')
    .map((line) => (line.trim() ? tidyText(line) : ''))
    .join('\n');
}

export async function removeNoteAction(institutionId: string, noteId: string): Promise<void> {
  if (!(await teamUser())) return;
  const supabase = await createClient();
  await supabase.from('notes').delete().eq('id', noteId);
  revalidatePath(pagePath(institutionId));
}

// Work log (a Client's) -----------------------------------------------------------------------------

/** What the team did, or does next, for a Client. The Client sees it on Home and in their work list. */
export async function addWorkAction(institutionId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_TEAM);
  const field = (name: string) => String(formData.get(name) ?? '');
  const work = checkWork({ kind: field('kind'), text: field('text'), on: field('on'), link: field('link') }, new Date());
  if (!work.ok) return reply(previous, 'error', work.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from('team_work')
    .insert({ institution_id: institutionId, kind: work.value.kind, body: work.value.text, work_on: work.value.on, link: work.value.link });
  // Row level security only lets the team add to a Client's log.
  if (error) return reply(previous, 'error', error.code === '42501' ? 'Only a Client has a work log.' : 'It could not be saved. Try again.');
  revalidatePath(pagePath(institutionId));
  return reply(previous, 'done', work.value.kind === 'done' ? 'Added. They see it on their Home now.' : 'Added to Next. They see it on their Home now.');
}

/** Next is done: it moves to what was done, dated today (India time). */
export async function markWorkDoneAction(institutionId: string, workId: string): Promise<void> {
  if (!(await teamUser())) return;
  const supabase = await createClient();
  await supabase.from('team_work').update({ kind: 'done', work_on: todayInIndia() }).eq('id', workId).eq('kind', 'next');
  revalidatePath(pagePath(institutionId));
}

export async function removeWorkAction(institutionId: string, workId: string): Promise<void> {
  if (!(await teamUser())) return;
  const supabase = await createClient();
  await supabase.from('team_work').delete().eq('id', workId);
  revalidatePath(pagePath(institutionId));
}

function todayInIndia(): string {
  const { year, month, day } = istParts(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Leads tracking links (a Client's) ------------------------------------------------------------------

/** A tracking link for a Client's content: a name, where it is used, one program or any course. Counts only come back. */
export async function createLeadLinkAction(institutionId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_TEAM);
  const name = tidyText(String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim());
  const usedOn = String(formData.get('used_on') ?? '');
  const program = String(formData.get('program') ?? '');
  if (name.length < 2) return reply(previous, 'error', 'Name the link, like "Reel: BBA placements".');
  if (name.length > LEAD_RULES.linkNameMax) return reply(previous, 'error', `Keep the name under ${LEAD_RULES.linkNameMax} characters.`);
  if (!(LEAD_SOURCES as readonly string[]).includes(usedOn)) return reply(previous, 'error', 'Say where the link will be used.');
  if (!program) return reply(previous, 'error', 'Choose the program the link is for, or any course.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_lead_link', { p_institution: institutionId, p_name: name, p_used_on: usedOn as LeadSource, p_program: program === ANY_COURSE_VALUE ? undefined : program });
  if (error) {
    const message = error.message.includes('not_client')
      ? 'Only an AdmitLabs Client has tracking links.'
      : error.message.includes('bad_program')
        ? 'Choose one of their programs.'
        : 'The link could not be made. Try again.';
    return reply(previous, 'error', message);
  }
  revalidatePath(pagePath(institutionId));
  return reply(previous, 'done', 'Link made. Copy it below.');
}

/** Its form says it is closed from now on. The enquiries it brought stay with the college. */
export async function archiveLeadLinkAction(institutionId: string, linkId: string): Promise<void> {
  if (!(await teamUser())) return;
  const supabase = await createClient();
  await supabase.rpc('archive_lead_link', { p_link: linkId });
  revalidatePath(pagePath(institutionId));
}

// Share links ------------------------------------------------------------------------------------

export async function shareAuditAction(institutionId: string, auditId: string, previous: ActionState): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_TEAM);
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_share_link', { p_audit: auditId, p_days: TEAM_RULES.shareLinkDays });
  if (error) {
    const message = error.message.includes('signed_up')
      ? 'This institution has signed up, so it has its own dashboard. Links are for prospects.'
      : error.message.includes('not_team_audit')
        ? 'Only a team Audit can be shared. Run one first.'
        : 'The link could not be made. Try again.';
    return reply(previous, 'error', message);
  }
  revalidatePath(pagePath(institutionId));
  return reply(previous, 'done', `Link ready. It works for ${TEAM_RULES.shareLinkDays} days.`);
}

export async function stopLinkAction(institutionId: string, token: string): Promise<void> {
  const viewer = await teamUser();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from('share_links').update({ stopped_at: new Date().toISOString(), stopped_by: viewer.userId }).eq('token', token).is('stopped_at', null);
  revalidatePath(pagePath(institutionId));
}

// Audit now -----------------------------------------------------------------------------------------

function planRecord(row: { tier: PlanRecord['tier']; starts_at: string; ends_at: string | null } | null): PlanRecord | null {
  return row ? { tier: row.tier, startsAt: new Date(row.starts_at), endsAt: row.ends_at ? new Date(row.ends_at) : null } : null;
}

/**
 * A Client's own Audit, refreshed by the team at any time (they see it, with the usual notice).
 * For anyone else a private team Audit: a Paid owner's once-a-month refresh stays theirs.
 */
export async function auditNowAction(institutionId: string, previous: ActionState): Promise<ActionState> {
  const viewer = await teamUser();
  if (!viewer) return reply(previous, 'error', NOT_TEAM);
  const supabase = await createClient();
  const [status, plan] = await Promise.all([
    supabase.from('institution_status').select('claimed').eq('institution_id', institutionId).maybeSingle(),
    supabase.from('plans').select('tier, starts_at, ends_at').eq('institution_id', institutionId).maybeSingle(),
  ]);
  const now = new Date();
  const client = Boolean(status.data?.claimed) && effectiveTier(planRecord(plan.data), now) === 'client';
  const admin = createAdminClient();
  let waits = false;
  try {
    if (client) {
      const run = await runAudit(admin, { institutionId, asOf: now, trigger: 'manual', createdBy: viewer.userId });
      waits = run.review === 'waiting';
      await writeRivalActions(admin, institutionId, now);
    } else {
      await runAudit(admin, { institutionId, asOf: now, trigger: 'manual', kind: 'team', createdBy: viewer.userId });
    }
  } catch (error) {
    if (error instanceof AuditRunError) return reply(previous, 'error', error.message);
    throw error;
  }
  revalidatePath(pagePath(institutionId));
  revalidatePath('/team');
  if (waits) revalidatePath('/team/review');
  const done = client
    ? waits
      ? 'Their new Audit waits in To review. They see it once it is approved.'
      : 'Their Audit is refreshed. They see it now, with the usual notice.'
    : status.data?.claimed
      ? 'Team Audit saved. Only the team sees it.'
      : 'Team Audit saved. It stays private until you share it.';
  return reply(previous, 'done', done);
}

// Review first --------------------------------------------------------------------------------------

/**
 * How a college's new Audits and monthly summaries go out (spec section 25): Review first, where
 * each waits in To review until the team approves it, or Send automatically. Team only: row level
 * security lets only the team write institution_status. An Audit already waiting still waits.
 */
export async function setReviewFirstAction(institutionId: string, on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await teamUser())) return { ok: false, error: NOT_TEAM };
  const supabase = await createClient();
  const { data, error } = await supabase.from('institution_status').update({ review_first: on === true }).eq('institution_id', institutionId).eq('claimed', true).select('institution_id');
  if (error || !data?.length) return { ok: false, error: 'The setting did not save. Try again.' };
  revalidatePath(pagePath(institutionId));
  revalidatePath('/team/review');
  return { ok: true };
}

// Plans (Admin) --------------------------------------------------------------------------------------

function planError(message: string): string {
  if (message.includes('plan_future')) return 'Paid starts on the day of payment, never in the future.';
  if (message.includes('plan_over')) return 'A Paid plan from that day would already have ended.';
  if (message.includes('not_signed_up')) return 'Only an institution that has signed up can have a plan.';
  if (message.includes('no_active_plan')) return 'There is no active plan to end.';
  if (message.includes('not_admin')) return NOT_ADMIN;
  return 'The plan could not be changed. Try again.';
}

/** The day a Paid or Client plan starts, its first Audit runs (spec section 11). With Review first on, it waits in To review. */
async function firstAudit(institutionId: string, userId: string): Promise<{ problem: string | null; waits: boolean }> {
  const admin = createAdminClient();
  const now = new Date();
  try {
    const run = await runAudit(admin, { institutionId, asOf: now, trigger: 'scheduled', createdBy: userId });
    await writeRivalActions(admin, institutionId, now);
    if (run.review === 'waiting') revalidatePath('/team/review');
    return { problem: null, waits: run.review === 'waiting' };
  } catch (error) {
    if (error instanceof AuditRunError) return { problem: error.message, waits: false };
    throw error;
  }
}

export async function startPaidAction(institutionId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await teamUser();
  if (viewer?.teamRole !== 'admin') return reply(previous, 'error', NOT_ADMIN);
  const now = new Date();
  const startsAt = paidStartFrom(String(formData.get('startsOn') ?? ''), now);
  if (!startsAt) return reply(previous, 'error', 'Pick the day of payment: today, or a day in the last 6 months.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_plan', { p_institution: institutionId, p_tier: 'paid', p_starts_at: startsAt.toISOString() });
  if (error) return reply(previous, 'error', planError(error.message));
  const { problem, waits } = await firstAudit(institutionId, viewer.userId);
  revalidatePath(pagePath(institutionId));
  revalidatePath('/team');
  return reply(
    previous,
    'done',
    problem
      ? `Paid has started. The first Paid Audit could not run: ${problem}`
      : waits
        ? 'Paid has started. The first Paid Audit waits in To review.'
        : 'Paid has started, and the first Paid Audit is ready.',
  );
}

export async function makeClientAction(institutionId: string, previous: ActionState): Promise<ActionState> {
  const viewer = await teamUser();
  if (viewer?.teamRole !== 'admin') return reply(previous, 'error', NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_plan', { p_institution: institutionId, p_tier: 'client', p_starts_at: new Date().toISOString() });
  if (error) return reply(previous, 'error', planError(error.message));
  const { problem, waits } = await firstAudit(institutionId, viewer.userId);
  revalidatePath(pagePath(institutionId));
  revalidatePath('/team');
  return reply(
    previous,
    'done',
    problem
      ? `They are a Client now. The first Client Audit could not run: ${problem}`
      : waits
        ? 'They are a Client now. Their first Client Audit waits in To review.'
        : 'They are a Client now, and their first Client Audit is ready.',
  );
}

export async function endPlanAction(institutionId: string, previous: ActionState): Promise<ActionState> {
  const viewer = await teamUser();
  if (viewer?.teamRole !== 'admin') return reply(previous, 'error', NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc('end_plan', { p_institution: institutionId });
  if (error) return reply(previous, 'error', planError(error.message));
  revalidatePath(pagePath(institutionId));
  revalidatePath('/team');
  return reply(previous, 'done', 'The plan has ended. They are on Free now, and keep their last Audit score and past reports.');
}

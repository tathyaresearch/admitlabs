'use server';

// The Blueprint's actions (spec section 26). The team (Admins, Team members and the Client's own
// managers) uploads versions and sets their status; the college's people approve the latest Shared
// version or ask for changes, and the team hears by email. Each checks the person here, and the
// database checks again (the blueprints migration). A PDF goes from the browser straight to the
// private bucket through a signed link made here; the server reads its words for Ask the brain.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { blueprintProblem, type BlueprintStatus } from '@/brain/blueprint';
import { blueprintReplyEmail } from '@/brain/blueprint-email';
import { UPLOAD_FAILED, isUploadPath, uploadPath } from '@/brain/files';
import { BRAIN_RULES } from '@/config/brain';
import { alertAfterEnquiry } from '@/enquiries/jobs';
import { canManage } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/urls';
import { getAnalysisProvider, getEmailProvider } from '@/providers/registry';
import type { BrainFormState, FormContext } from './actions';

const reply = (previous: BrainFormState, patch: Partial<BrainFormState>): BrainFormState => ({ status: 'idle', message: null, errors: {}, ...patch, attempt: previous.attempt + 1 });
const NOT_TEAM = 'Only Admins, Team members and this Client’s managers change the Blueprint.';
const FAILED = 'That could not be saved just now. Please try again.';

/** The team for this Client: Admins and Team members, or one of its own managers. */
async function teamFor(institutionId: string) {
  const viewer = await getViewer();
  return viewer?.teamRole && !viewer.viewingAs && (await canManage(viewer, institutionId)) ? viewer : null;
}

/** One of the college's own people (never the team viewing as them). */
async function collegeFor(institutionId: string) {
  const viewer = await getViewer();
  return viewer && !viewer.viewingAs && !viewer.teamRole && viewer.membership?.institution.id === institutionId && viewer.tier === 'client' ? viewer : null;
}

function done(ctx: FormContext): never {
  revalidatePath('/', 'layout');
  redirect(ctx.returnTo);
}

/** A signed link the browser uploads one PDF to, straight to the private bucket. The bucket's policy checks the person and the college again. */
export async function prepareBlueprintUploadAction(institutionId: string, file: { type: string; size: number }): Promise<{ url: string; path: string } | { error: string }> {
  if (!(await teamFor(institutionId))) return { error: NOT_TEAM };
  const problem = blueprintProblem(file.type, file.size);
  if (problem) return { error: problem };
  const path = uploadPath(institutionId, BRAIN_RULES.blueprint.type, crypto.randomUUID());
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BRAIN_RULES.blueprint.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return { error: UPLOAD_FAILED };
  return { url: data.signedUrl, path };
}

/** The uploaded PDF becomes the next version, a Draft: checked where it is, its words read for Ask the brain. */
export async function addBlueprintAction(ctx: FormContext, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  if (!(await teamFor(ctx.institutionId))) return reply(previous, { status: 'error', message: NOT_TEAM });
  const path = String(formData.get('file_path') ?? '');
  const name = String(formData.get('file_name') ?? '').trim().slice(0, 160) || 'Blueprint.pdf';
  if (!isUploadPath(ctx.institutionId, path) || !path.endsWith('.pdf')) return reply(previous, { status: 'error', message: 'Choose a PDF to upload.', errors: { file: 'Choose a PDF to upload.' } });
  const supabase = await createClient();
  const bucket = supabase.storage.from(BRAIN_RULES.blueprint.bucket);
  const info = await bucket.info(path);
  if (info.error || !info.data) return reply(previous, { status: 'error', message: UPLOAD_FAILED });
  const problem = blueprintProblem(info.data.contentType ?? '', Number(info.data.size ?? 0));
  if (problem) {
    await bucket.remove([path]);
    return reply(previous, { status: 'error', message: problem, errors: { file: problem } });
  }
  // The words, for Ask the brain: read on the server (a download is not limited like a request).
  let text: string | null = null;
  try {
    const file = await createAdminClient().storage.from(BRAIN_RULES.blueprint.bucket).download(path);
    if (file.data) text = await getAnalysisProvider().readPdf({ bytes: new Uint8Array(await file.data.arrayBuffer()) });
  } catch {
    text = null;
  }
  const { error } = await supabase.rpc('add_blueprint_version', { p_institution: ctx.institutionId, p_path: path, p_name: name, p_text: text?.slice(0, BRAIN_RULES.blueprint.textMax) ?? undefined });
  if (error) {
    await bucket.remove([path]);
    return reply(previous, { status: 'error', message: error.message.includes('not_allowed') ? NOT_TEAM : FAILED });
  }
  return done(ctx);
}

/** The team's status: Draft (the team only), Shared (the college sees it) or Approved. */
export async function setBlueprintStatusAction(ctx: FormContext & { blueprintId: string; status: BlueprintStatus }): Promise<void> {
  if (!(await teamFor(ctx.institutionId))) return;
  const supabase = await createClient();
  await supabase.rpc('set_blueprint_status', { p_blueprint: ctx.blueprintId, p_status: ctx.status });
  done(ctx);
}

/** The college approves the latest Shared version; its managers (or the Admins) hear by email. */
export async function approveBlueprintAction(ctx: FormContext & { blueprintId: string }): Promise<void> {
  if (!(await collegeFor(ctx.institutionId))) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_blueprint', { p_blueprint: ctx.blueprintId });
  if (!error) await alertAfterEnquiry(() => sendReply(ctx.institutionId, ctx.blueprintId, 'approved'));
  done(ctx);
}

/** The college asks for changes, with a short note; its managers (or the Admins) hear by email. */
export async function askBlueprintChangesAction(ctx: FormContext & { blueprintId: string }, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  if (!(await collegeFor(ctx.institutionId))) return reply(previous, { status: 'error', message: 'Only the college’s own people answer the Blueprint.' });
  const note = String(formData.get('note') ?? '').replace(/\s+/g, ' ').trim();
  if (!note) return reply(previous, { status: 'error', message: 'Say what to change, in a line or two.', errors: { note: 'Say what to change, in a line or two.' } });
  if (note.length > BRAIN_RULES.blueprint.noteMax) return reply(previous, { status: 'error', message: `Keep it under ${BRAIN_RULES.blueprint.noteMax} characters.`, errors: { note: 'Too long.' } });
  const supabase = await createClient();
  const { error } = await supabase.rpc('ask_blueprint_changes', { p_blueprint: ctx.blueprintId, p_note: note });
  if (error) {
    const message = error.message.includes('looks_like_login') ? 'No passwords or login details here. Use a password manager.' : error.message.includes('not_shared') || error.message.includes('not_latest') ? 'This version has changed since you opened it. Reload the page.' : FAILED;
    return reply(previous, { status: 'error', message });
  }
  await alertAfterEnquiry(() => sendReply(ctx.institutionId, ctx.blueprintId, 'changes'));
  return done(ctx);
}

/** The email to the Client's managers, or every Admin, logged like every email (never the message). */
async function sendReply(institutionId: string, blueprintId: string, kind: 'approved' | 'changes'): Promise<void> {
  const admin = createAdminClient();
  const [version, college, recipients] = await Promise.all([
    admin.from('brain_blueprints').select('version, file_name, approved_at, approved_by, changes_note, changes_at, changes_by').eq('id', blueprintId).single(),
    admin.from('institutions').select('name').eq('id', institutionId).single(),
    admin.rpc('blueprint_reply_recipients', { p_institution: institutionId }),
  ]);
  const to = (recipients.data ?? []) as string[];
  if (!version.data || !college.data || !to.length) return;
  const whoId = kind === 'approved' ? version.data.approved_by : version.data.changes_by;
  const [name, user] = whoId ? await Promise.all([admin.from('person_names').select('name').eq('user_id', whoId).maybeSingle(), admin.auth.admin.getUserById(whoId)]) : [null, null];
  const email = getEmailProvider();
  const results = await email.send(
    blueprintReplyEmail(
      {
        kind,
        college: college.data.name,
        version: version.data.version,
        fileName: version.data.file_name,
        who: name?.data?.name ?? user?.data.user?.email ?? 'The college',
        note: kind === 'changes' ? version.data.changes_note : null,
        at: (kind === 'approved' ? version.data.approved_at : version.data.changes_at) ?? new Date().toISOString(),
        url: `${APP_URL}/team/institutions/${institutionId}/brain?section=blueprint`,
      },
      to,
    ),
  );
  await admin.from('email_log').insert(results.map((result) => ({ kind: 'blueprint_reply' as const, institution_id: institutionId, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
}

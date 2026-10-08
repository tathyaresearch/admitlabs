'use server';

// Changing a Client's Brain (spec section 26): the college's people and the AdmitLabs team, from
// the Brain, Help us know you and the kickoff call. Everything is written as the signed-in person,
// so the database checks the plan, the person and the password guard again (the client_brain
// migration); a file goes from the browser to the private bucket through a link made here for the
// same person (src/brain/files.ts). The team's own actions (start
// onboarding, the checklist, Mark as Ready, what Drishti found) check the team role here too.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BRAIN_RULES, type BrainFileKind } from '@/config/brain';
import { FILE_EXTENSIONS, UPLOAD_FAILED, fileProblem, isUploadPath, uploadPath } from '@/brain/files';
import { CONTACT_MESSAGE, LOGIN_MESSAGE } from '@/brain/guard';
import { readFact, type FieldErrors } from '@/brain/forms';
import { institutionDetailsForm, programDetailsForm, withCurrent } from '@/brain/form-spec';
import { foundItems } from '@/brain/jobs';
import { loadBrain } from '@/brain/load';
import { readiness } from '@/brain/progress';
import { SINGLE_KINDS, STEPS, type BrainFields, type BrainFile, type BrainKind, type BrainStep } from '@/brain/model';
import { institutionDetailsToRow, programDetailsToRow, readInstitutionDetails, readProgramDetails, type FormRead, type InstitutionDetails } from '@/domain/details';
import { canManage } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';
import { checkWork } from '@/team/work';

export interface BrainFormState {
  status: 'idle' | 'done' | 'error';
  message: string | null;
  errors: FieldErrors;
  attempt: number;
}

/** Where a form sends people after a save, and whether it came from Help us know you. */
export interface FormContext {
  institutionId: string;
  returnTo: string;
  viaHelp?: boolean;
}

const reply = (previous: BrainFormState, patch: Partial<BrainFormState>): BrainFormState => ({ status: 'idle', message: null, errors: {}, ...patch, attempt: previous.attempt + 1 });
const CHECK = 'Check the fields marked below.';
const SAVE_FAILED = 'That could not be saved just now. Please try again.';

const MESSAGES: Readonly<Record<string, string>> = {
  looks_like_login: LOGIN_MESSAGE,
  student_contact: CONTACT_MESSAGE,
  not_allowed: 'Only the college’s own people and the AdmitLabs team change the Brain, while the college is a Client.',
  step_needs_fact: 'Add the fact this step needs to the Brain first.',
  checklist_open: 'Tick every step of the checklist first.',
  not_onboarding: 'This Brain is Ready already.',
  not_client: 'Only an AdmitLabs Client has a Brain.',
  bad_fields: 'That is too long to keep. Shorten it a little.',
};

function friendly(message: string | undefined): string {
  const code = Object.keys(MESSAGES).find((key) => message?.includes(key));
  return code ? (MESSAGES[code] as string) : SAVE_FAILED;
}

function reader(formData: FormData): FormRead & { has(name: string): boolean } {
  return {
    get: (name) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value : '';
    },
    all: (name) => formData.getAll(name).flatMap((value) => (typeof value === 'string' ? [value] : [])),
    has: (name) => formData.has(name),
  };
}

/** Someone who may change this college's Brain: the team, or its own people (not the team viewing as them). */
async function editor(institutionId: string) {
  const viewer = await getViewer();
  if (!viewer || viewer.viewingAs) return null;
  // The team: Admins and Team members for any Client, a Client manager for theirs (spec section 27).
  if (viewer.teamRole) return (await canManage(viewer, institutionId)) ? { userId: viewer.userId, team: true } : null;
  if (viewer.membership?.institution.id === institutionId && viewer.tier === 'client') return { userId: viewer.userId, team: false };
  return null;
}

async function teamEditor(institutionId: string) {
  const viewer = await getViewer();
  return viewer?.teamRole && !viewer.viewingAs && (await canManage(viewer, institutionId)) ? { userId: viewer.userId } : null;
}

function done(ctx: FormContext): never {
  revalidatePath('/', 'layout');
  redirect(ctx.returnTo);
}

// Files -------------------------------------------------------------------------------------------

/**
 * A signed link the browser uploads one file to, straight to the private bucket. Made only for
 * someone who may change this college's Brain, for a type and size the kind takes; the bucket's
 * own policy checks the person and the college again as the link is made.
 */
export async function prepareUploadAction(institutionId: string, kind: BrainFileKind, file: { type: string; size: number }): Promise<{ url: string; path: string } | { error: string }> {
  if (!(await editor(institutionId))) return { error: MESSAGES.not_allowed ?? UPLOAD_FAILED };
  if (kind !== 'logo' && kind !== 'guidelines') return { error: UPLOAD_FAILED };
  const problem = fileProblem(kind, file.type, file.size);
  if (problem) return { error: problem };
  const path = uploadPath(institutionId, file.type, crypto.randomUUID());
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BRAIN_RULES.files.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return { error: UPLOAD_FAILED };
  return { url: data.signedUrl, path };
}

/** The file the browser uploaded, checked where it is: this college's folder, and the kind's type and size. One that fails is taken out. */
async function uploaded(institutionId: string, kind: BrainFileKind, path: string, name: string): Promise<{ file: BrainFile } | { error: string }> {
  if (!isUploadPath(institutionId, path)) return { error: UPLOAD_FAILED };
  const bucket = (await createClient()).storage.from(BRAIN_RULES.files.bucket);
  const { data, error } = await bucket.info(path);
  if (error || !data) return { error: UPLOAD_FAILED };
  const type = data.contentType ?? '';
  const size = Number(data.size ?? 0);
  const problem = fileProblem(kind, type, size);
  if (problem) {
    await bucket.remove([path]);
    return { error: problem };
  }
  return { file: { path, name: (name.trim() || `${kind}.${FILE_EXTENSIONS[type] ?? 'file'}`).slice(0, 120), type, size } };
}

// One fact ----------------------------------------------------------------------------------------

/** Saves one fact, new or changed. A fact Drishti found is confirmed by saving it. */
export async function saveFactAction(ctx: FormContext & { kind: Exclude<BrainKind, 'found'>; itemId: string | null }, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  const who = await editor(ctx.institutionId);
  if (!who) return reply(previous, { status: 'error', message: MESSAGES.not_allowed ?? SAVE_FAILED });
  const read = readFact(ctx.kind, reader(formData));
  if (!read.fields) return reply(previous, { status: 'error', message: read.errors.form ?? CHECK, errors: read.errors });
  let fields = read.fields as BrainFields[typeof ctx.kind];

  // A file is in the bucket already (the browser sent it through prepareUploadAction): the form
  // says only where it went.
  const sentPath = formData.get('file_path');
  const newFile = typeof sentPath === 'string' && sentPath ? sentPath : null;
  if (ctx.kind === 'logo' || ctx.kind === 'guidelines') {
    const supabase = await createClient();
    const existing = ctx.itemId || SINGLE_KINDS.has(ctx.kind) ? await supabase.from('brain_items').select('fields').eq('institution_id', ctx.institutionId).eq('kind', ctx.kind).maybeSingle() : null;
    const kept = (existing?.data?.fields as { file?: BrainFile | null } | undefined)?.file ?? null;
    let file: BrainFile | null = kept;
    if (newFile) {
      const checked = await uploaded(ctx.institutionId, ctx.kind, newFile, String(formData.get('file_name') ?? ''));
      if ('error' in checked) return reply(previous, { status: 'error', message: checked.error, errors: { file: checked.error } });
      file = checked.file;
    }
    const link = (fields as BrainFields['logo']).link;
    if (!file && !link) return reply(previous, { status: 'error', message: 'Upload a file, or paste a Drive link.', errors: { file: 'Upload a file, or paste a Drive link.' } });
    fields = { link, file } as typeof fields;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_brain_item', {
    p_institution: ctx.institutionId,
    // A new fact has no id yet: null tells the database to add it (or replace a single kind).
    p_item: ctx.itemId as string,
    p_kind: ctx.kind,
    p_fields: fields as unknown as Json,
    p_via_help: Boolean(ctx.viaHelp),
  });
  if (error) {
    // Not kept: the file the browser just sent goes too, so nothing sits in the bucket unused.
    if (newFile && isUploadPath(ctx.institutionId, newFile)) await supabase.storage.from(BRAIN_RULES.files.bucket).remove([newFile]);
    return reply(previous, { status: 'error', message: friendly(error.message) });
  }
  return done(ctx);
}

export async function removeFactAction(ctx: FormContext & { itemId: string }): Promise<void> {
  if (!(await editor(ctx.institutionId))) return;
  const supabase = await createClient();
  await supabase.rpc('remove_brain_item', { p_item: ctx.itemId });
  done(ctx);
}

/** "Still right": a fact checked, with nothing to change. */
export async function stillRightAction(ctx: FormContext & { fact: string }): Promise<void> {
  if (!(await editor(ctx.institutionId))) return;
  const supabase = await createClient();
  await supabase.rpc('check_brain_fact', { p_institution: ctx.institutionId, p_fact: ctx.fact });
  done(ctx);
}

// The details added by you --------------------------------------------------------------------------

/** About the college (approvals, address, admissions contact), as the Settings form saves it. A partial form keeps the rest. */
export async function saveAboutAction(ctx: FormContext, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  const who = await editor(ctx.institutionId);
  if (!who) return reply(previous, { status: 'error', message: MESSAGES.not_allowed ?? SAVE_FAILED });
  const brain = await loadBrain(await createClient(), ctx.institutionId);
  if (!brain) return reply(previous, { status: 'error', message: SAVE_FAILED });
  const form = reader(formData);
  // An unticked box is not sent: the form says it had the skilling boxes, so none ticked means none.
  const sent = { ...form, has: (name: string) => form.has(name) || (name === 'skilling_recognition' && form.has('has_skilling')) };
  const { values, errors } = readInstitutionDetails(withCurrent(sent, institutionDetailsForm(brain.details)), new Date());
  if (Object.keys(errors).length) return reply(previous, { status: 'error', message: CHECK, errors: errors as Record<string, string> });
  const supabase = await createClient();
  const { error } = await supabase
    .from('institution_details')
    .upsert({ institution_id: ctx.institutionId, ...institutionDetailsToRow(values), updated_at: new Date().toISOString(), updated_by: who.userId });
  if (error) return reply(previous, { status: 'error', message: friendly(error.message) });
  return done(ctx);
}

/** One program's details (or just its placements), as the Settings form saves them. A partial form keeps the rest. */
export async function saveProgramAction(ctx: FormContext & { programId: string }, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  const who = await editor(ctx.institutionId);
  if (!who) return reply(previous, { status: 'error', message: MESSAGES.not_allowed ?? SAVE_FAILED });
  const supabase = await createClient();
  const brain = await loadBrain(supabase, ctx.institutionId);
  const program = brain?.programs.find((entry) => entry.id === ctx.programId);
  if (!brain || !program) return reply(previous, { status: 'error', message: SAVE_FAILED });
  const form = reader(formData);
  const { values, errors } = readProgramDetails(withCurrent(form, programDetailsForm(program.details)), brain.institution.website);
  if (Object.keys(errors).length) return reply(previous, { status: 'error', message: CHECK, errors: errors as Record<string, string> });
  const push = form.has('has_push') ? form.get('push') === 'on' : program.push;
  const { error } = await supabase
    .from('program_details')
    .upsert({ program_id: ctx.programId, institution_id: ctx.institutionId, ...programDetailsToRow(values), push, updated_at: new Date().toISOString(), updated_by: who.userId });
  if (error) return reply(previous, { status: 'error', message: friendly(error.message) });
  return done(ctx);
}

// The team ----------------------------------------------------------------------------------------

/** Start onboarding: the Brain opens, and what the latest Audit found waits for the team to confirm. */
export async function startOnboardingAction(institutionId: string): Promise<void> {
  if (!(await teamEditor(institutionId))) return;
  const supabase = await createClient();
  const started = await supabase.rpc('start_brain', { p_institution: institutionId });
  if (started.error) throw new Error(friendly(started.error.message));
  if (started.data) {
    const found = await foundItems(supabase, institutionId);
    if (found.length) {
      await supabase.rpc('add_found_brain_items', {
        p_institution: institutionId,
        p_items: found.map((item) => ({ kind: item.kind, fields: item.fields, source_url: item.sourceUrl, found_at: item.foundAt })) as unknown as Json,
      });
    }
  }
  revalidatePath('/', 'layout');
  redirect(`/team/institutions/${institutionId}/brain`);
}

/** Confirms what Drishti found. One for the details is written into them as it was found, in the same step. */
export async function confirmFoundAction(ctx: FormContext & { itemId: string }): Promise<void> {
  const team = await teamEditor(ctx.institutionId);
  if (!team) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from('brain_items').select('kind, fields').eq('id', ctx.itemId).maybeSingle();
  if (!item) return done(ctx);
  if (item.kind !== 'found') {
    await supabase.rpc('confirm_brain_item', { p_item: ctx.itemId });
    return done(ctx);
  }
  const brain = await loadBrain(supabase, ctx.institutionId);
  const values = brain ? foundValues(item.fields as unknown as BrainFields['found'], brain.details) : null;
  if (values) await supabase.rpc('close_found_item', { p_item: ctx.itemId, p_outcome: 'confirmed', p_values: values as unknown as Json });
  done(ctx);
}

/** Corrects what Drishti found for the details: the team's value goes into them, and History says it. */
export async function correctFoundAction(ctx: FormContext & { itemId: string }, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  const team = await teamEditor(ctx.institutionId);
  if (!team) return reply(previous, { status: 'error', message: MESSAGES.not_allowed ?? SAVE_FAILED });
  const supabase = await createClient();
  const { data: item } = await supabase.from('brain_items').select('fields').eq('id', ctx.itemId).eq('kind', 'found').maybeSingle();
  if (!item) return done(ctx);
  const fields = item.fields as unknown as BrainFields['found'];
  const brain = await loadBrain(supabase, ctx.institutionId);
  if (!brain) return reply(previous, { status: 'error', message: SAVE_FAILED });
  const form = reader(formData);
  let values: Record<string, unknown>;
  if (fields.target.startsWith('program:')) {
    const programId = fields.target.split(':')[1] ?? '';
    const program = brain.programs.find((entry) => entry.id === programId);
    if (!program) return reply(previous, { status: 'error', message: SAVE_FAILED });
    const read = readProgramDetails(withCurrent(form, programDetailsForm(program.details)), brain.institution.website);
    const errors: Record<string, string> = { ...read.errors };
    if (fields.target.endsWith(':fees') && read.values.feesAmount === null) errors.fees_amount ??= 'Add the fee, in rupees.';
    if (fields.target.endsWith(':page') && !read.values.pageUrl) errors.page_url ??= 'Add the program page’s link.';
    if (Object.keys(errors).length) return reply(previous, { status: 'error', message: CHECK, errors });
    values = pick(programDetailsToRow(read.values), FOUND_COLUMNS[fields.target.endsWith(':fees') ? 'fees' : 'page']);
  } else {
    const read = readInstitutionDetails(withCurrent(form, institutionDetailsForm(brain.details)), new Date());
    if (Object.keys(read.errors).length) return reply(previous, { status: 'error', message: CHECK, errors: read.errors as Record<string, string> });
    values = pick(institutionDetailsToRow(read.values), FOUND_COLUMNS.approvals);
  }
  const { error } = await supabase.rpc('close_found_item', { p_item: ctx.itemId, p_outcome: 'corrected', p_values: values as unknown as Json });
  if (error) return reply(previous, { status: 'error', message: friendly(error.message) });
  return done(ctx);
}

/** What Drishti found is not right: taken out, and History says so. */
export async function notRightAction(ctx: FormContext & { itemId: string }): Promise<void> {
  if (!(await teamEditor(ctx.institutionId))) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from('brain_items').select('kind').eq('id', ctx.itemId).maybeSingle();
  if (item?.kind === 'found') await supabase.rpc('close_found_item', { p_item: ctx.itemId, p_outcome: 'not_right' });
  else if (item) await supabase.rpc('remove_brain_item', { p_item: ctx.itemId });
  done(ctx);
}

/** The columns of the details each kind of suggestion sets (close_found_item takes only these). */
const FOUND_COLUMNS = {
  fees: ['fees_amount', 'fees_period'],
  page: ['page_url'],
  approvals: ['naac_grade', 'ugc_recognised', 'aicte_approved', 'other_approvals', 'skilling_recognition'],
} as const;

function pick<Row extends object>(row: Row, columns: ReadonlyArray<keyof Row & string>): Record<string, unknown> {
  return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
}

/** A suggestion as it was found, as the details' columns: approvals add to the ones the college has. */
function foundValues(found: BrainFields['found'], details: InstitutionDetails): Record<string, unknown> | null {
  if (found.target.endsWith(':fees')) return found.feesAmount !== null && found.feesPeriod ? { fees_amount: found.feesAmount, fees_period: found.feesPeriod } : null;
  if (found.target.endsWith(':page')) return found.pageUrl ? { page_url: found.pageUrl } : null;
  if (!found.approvals) return null;
  return {
    ugc_recognised: found.approvals.ugc ? true : details.ugcRecognised,
    aicte_approved: found.approvals.aicte ? true : details.aicteApproved,
    other_approvals: details.otherApprovals ?? (found.approvals.other.length ? found.approvals.other.join(', ').slice(0, 100) : null),
  };
}

export async function setStepAction(ctx: FormContext & { step: BrainStep; done: boolean }): Promise<void> {
  if (!(await teamEditor(ctx.institutionId)) || !STEPS.includes(ctx.step)) return;
  const supabase = await createClient();
  await supabase.rpc('set_brain_step', { p_institution: ctx.institutionId, p_step: ctx.step, p_done: ctx.done });
  done(ctx);
}

/** Mark as Ready: only once every must-have fact is in and the checklist is done. */
export async function markReadyAction(ctx: FormContext): Promise<void> {
  if (!(await teamEditor(ctx.institutionId))) return;
  const supabase = await createClient();
  const brain = await loadBrain(supabase, ctx.institutionId);
  if (!brain || !readiness(brain).ready) return done(ctx);
  await supabase.rpc('mark_brain_ready', { p_institution: ctx.institutionId });
  done(ctx);
}

/** An approved script, once posted, goes into the work log the Client reads. */
export async function logScriptAction(ctx: FormContext & { itemId: string }): Promise<void> {
  if (!(await teamEditor(ctx.institutionId))) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from('brain_items').select('fields').eq('id', ctx.itemId).eq('kind', 'script').maybeSingle();
  const script = item?.fields as unknown as BrainFields['script'] | undefined;
  if (!script) return done(ctx);
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const work = checkWork({ kind: 'done', text: `Posted: ${script.title}`, on: today, link: script.link ?? '' }, new Date());
  if (work.ok) await supabase.from('team_work').insert({ institution_id: ctx.institutionId, kind: 'done', body: work.value.text, work_on: work.value.on, link: work.value.link });
  done(ctx);
}

/** The team's private notes, from the Brain's Team only notes. */
export async function addTeamNoteAction(ctx: FormContext, previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  if (!(await teamEditor(ctx.institutionId))) return reply(previous, { status: 'error', message: MESSAGES.not_allowed ?? SAVE_FAILED });
  const body = String(formData.get('body') ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!body) return reply(previous, { status: 'error', message: 'Write the note first.', errors: { body: 'Write the note first.' } });
  if (body.length > 2000) return reply(previous, { status: 'error', message: 'Keep a note under 2,000 characters.', errors: { body: 'Keep a note under 2,000 characters.' } });
  if (/(password|passwd|pwd|otp)\s*(is|:|=)/i.test(body)) return reply(previous, { status: 'error', message: LOGIN_MESSAGE, errors: { body: LOGIN_MESSAGE } });
  const supabase = await createClient();
  const { error } = await supabase.from('notes').insert({ institution_id: ctx.institutionId, body: body.replace(/[\u2013\u2014]/g, ',') });
  if (error) return reply(previous, { status: 'error', message: SAVE_FAILED });
  return done(ctx);
}

export async function removeTeamNoteAction(ctx: FormContext & { noteId: string }): Promise<void> {
  if (!(await teamEditor(ctx.institutionId))) return;
  const supabase = await createClient();
  await supabase.from('notes').delete().eq('id', ctx.noteId);
  done(ctx);
}

// Names -------------------------------------------------------------------------------------------

export async function setMyNameAction(previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  const viewer = await getViewer();
  if (!viewer || viewer.viewingAs) return reply(previous, { status: 'error', message: 'Sign in again to change your name.' });
  const name = String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim();
  if (name.length > 80) return reply(previous, { status: 'error', message: 'Keep it under 80 characters.', errors: { name: 'Keep it under 80 characters.' } });
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_my_name', { p_name: name });
  if (error) return reply(previous, { status: 'error', message: SAVE_FAILED });
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: name ? 'Saved. History shows this name.' : 'Taken out. History shows your email.' });
}

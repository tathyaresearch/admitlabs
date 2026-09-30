'use server';

// Settings (spec section 13): institution details, programs, the Free program and people.
// Owners only; every change goes through a database function that checks the caller again.
// Changes to details and programs apply from the next Audit.

import { revalidatePath } from 'next/cache';
import { checkInstitution, checkPrograms, type InstitutionFields } from '@/domain/onboarding';
import { getViewer } from '@/lib/auth/viewer';
import { pullDemandFirst } from '@/lib/demand/first';
import { friendlyError } from '@/lib/institution/errors';
import { createClient } from '@/lib/supabase/server';

export interface FormState {
  attempt: number;
  status: 'idle' | 'done' | 'error';
  message: string | null;
  errors: Partial<Record<keyof InstitutionFields | 'programs' | 'email' | 'program', string>>;
  values: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

async function ownerOnly() {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.membership.role !== 'owner') return null;
  return viewer as typeof viewer & { membership: NonNullable<typeof viewer.membership> };
}

function reply(previous: FormState, patch: Partial<FormState>): FormState {
  return { attempt: previous.attempt + 1, status: 'idle', message: null, errors: {}, values: previous.values, ...patch };
}

const NOT_OWNER = 'Only the owner of this account can change settings.';

export async function updateDetailsAction(previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return reply(previous, { status: 'error', message: NOT_OWNER });
  const values = Object.fromEntries(
    ['name', 'type', 'city', 'state', 'website', 'instagram', 'youtube', 'facebook', 'linkedin'].map((name) => [name, field(formData, name)]),
  ) as unknown as InstitutionFields;
  const { details, errors } = checkInstitution(values);
  if (!details) return reply(previous, { status: 'error', message: 'Check the fields marked below.', errors, values: { ...values } });

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_institution', {
    p_name: details.name,
    p_type: details.type,
    p_city: details.city,
    p_state: details.state,
    p_website: details.website,
    p_instagram: details.instagram,
    p_youtube: details.youtube ?? '',
    p_other_links: details.otherLinks,
  });
  if (error) return reply(previous, { status: 'error', message: friendlyError(error.message), values: { ...values } });
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: 'Saved. Changes apply from your next Audit.', values: { ...values } });
}

/** The owner's program list wins: new names are added, missing ones are removed from future Audits. */
export async function saveProgramsAction(previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await ownerOnly();
  if (!viewer) return reply(previous, { status: 'error', message: NOT_OWNER });
  const programs = checkPrograms(formData.getAll('program').map(String), formData.getAll('other').map(String));
  if (!programs.ok) return reply(previous, { status: 'error', message: programs.error, errors: { programs: programs.error } });

  const supabase = await createClient();
  const { data: active, error: readError } = await supabase
    .from('programs')
    .select('id, name')
    .eq('institution_id', viewer.membership.institution.id)
    .is('archived_at', null);
  if (readError) return reply(previous, { status: 'error', message: friendlyError(readError.message) });

  const wanted = new Set(programs.value.map((program) => program.name.toLowerCase()));
  const current = new Set((active ?? []).map((program) => program.name.toLowerCase()));
  let added = 0;
  for (const program of programs.value) {
    if (current.has(program.name.toLowerCase())) continue;
    const { error } = await supabase.rpc('add_program', { p_name: program.name, p_program_key: program.programKey ?? '' });
    if (error) return reply(previous, { status: 'error', message: friendlyError(error.message) });
    added += 1;
  }
  // A new program gets its Demand straight away, if nobody in the region needed it before.
  if (added) await pullDemandFirst(viewer.membership.institution.id);
  for (const program of active ?? []) {
    if (wanted.has(program.name.toLowerCase())) continue;
    const { error } = await supabase.rpc('archive_program', { p_program: program.id });
    if (error) {
      revalidatePath('/', 'layout');
      return reply(previous, { status: 'error', message: `${program.name}: ${friendlyError(error.message)}` });
    }
  }
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: 'Programs saved. Your next Audit uses this list; past Audits keep theirs.' });
}

export async function setFreeProgramAction(previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return reply(previous, { status: 'error', message: NOT_OWNER });
  const programId = field(formData, 'program');
  if (!programId) return reply(previous, { status: 'error', message: 'Choose one program.', errors: { program: 'Choose one program.' } });
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_free_program', { p_program: programId });
  if (error) return reply(previous, { status: 'error', message: friendlyError(error.message) });
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: 'Saved. Your next free Audit covers this program.' });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteAction(previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return reply(previous, { status: 'error', message: NOT_OWNER });
  const email = field(formData, 'email').trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return reply(previous, { status: 'error', message: null, errors: { email: 'Enter an email address, like name@college.edu.' }, values: { email } });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('invite_member', { p_email: email });
  if (error) return reply(previous, { status: 'error', message: null, errors: { email: friendlyError(error.message) }, values: { email } });
  revalidatePath('/settings');
  return reply(previous, { status: 'done', message: `Invited ${email}. They join when they sign in with this address.`, values: {} });
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  if (!(await ownerOnly())) return;
  const supabase = await createClient();
  await supabase.rpc('revoke_invite', { p_invite: field(formData, 'invite') });
  revalidatePath('/settings');
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  if (!(await ownerOnly())) return;
  const supabase = await createClient();
  await supabase.rpc('remove_member', { p_user: field(formData, 'user') });
  revalidatePath('/settings');
}

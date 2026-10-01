'use server';

// Settings: what an institution adds about itself and each program ("Added by you"). Owners
// only; row level security checks the owner again. Never part of the score.

import { revalidatePath } from 'next/cache';
import {
  institutionDetailsToRow,
  programDetailsToRow,
  readInstitutionDetails,
  readProgramDetails,
  type FormRead,
} from '@/domain/details';
import { getViewer } from '@/lib/auth/viewer';
import { friendlyError } from '@/lib/institution/errors';
import { createClient } from '@/lib/supabase/server';

export interface DetailsFormState {
  attempt: number;
  status: 'idle' | 'done' | 'error';
  message: string | null;
  errors: Record<string, string>;
}

const NOT_OWNER = 'Only the owner of this account can change these.';
const CHECK_FIELDS = 'Check the fields marked below.';
const SAVED = 'Saved. Drishti shows these as added by you. They never change your score.';

function reader(formData: FormData): FormRead {
  return {
    get: (name) => String(formData.get(name) ?? ''),
    all: (name) => formData.getAll(name).map(String),
  };
}

function reply(previous: DetailsFormState, patch: Partial<DetailsFormState>): DetailsFormState {
  return { attempt: previous.attempt + 1, status: 'idle', message: null, errors: {}, ...patch };
}

async function owner() {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.membership.role !== 'owner') return null;
  return { userId: viewer.userId, institution: viewer.membership.institution };
}

export async function saveInstitutionDetailsAction(previous: DetailsFormState, formData: FormData): Promise<DetailsFormState> {
  const me = await owner();
  if (!me) return reply(previous, { status: 'error', message: NOT_OWNER });
  const { values, errors } = readInstitutionDetails(reader(formData), new Date());
  if (Object.keys(errors).length) return reply(previous, { status: 'error', message: CHECK_FIELDS, errors: errors as Record<string, string> });

  const supabase = await createClient();
  const { error } = await supabase
    .from('institution_details')
    .upsert({ institution_id: me.institution.id, ...institutionDetailsToRow(values), updated_at: new Date().toISOString(), updated_by: me.userId });
  if (error) return reply(previous, { status: 'error', message: friendlyError(error.message) });
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: SAVED });
}

export async function saveProgramDetailsAction(programId: string, previous: DetailsFormState, formData: FormData): Promise<DetailsFormState> {
  const me = await owner();
  if (!me) return reply(previous, { status: 'error', message: NOT_OWNER });
  const { values, errors } = readProgramDetails(reader(formData), me.institution.website);
  if (Object.keys(errors).length) return reply(previous, { status: 'error', message: CHECK_FIELDS, errors: errors as Record<string, string> });

  const supabase = await createClient();
  const { error } = await supabase
    .from('program_details')
    .upsert({ program_id: programId, institution_id: me.institution.id, ...programDetailsToRow(values), updated_at: new Date().toISOString(), updated_by: me.userId });
  if (error) return reply(previous, { status: 'error', message: friendlyError(error.message) });
  revalidatePath('/', 'layout');
  return reply(previous, { status: 'done', message: SAVED });
}

'use server';

// Rival ads, entered by the AdmitLabs team. Team only: row level security keeps rival_ads
// writable by the team alone, and each action checks the team role again.

import { revalidatePath } from 'next/cache';
import { istDate, istParts } from '@/domain/dates';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { checkAdEntry, type AdErrors, type AdFields } from '@/rivals/ads';

export interface AdFormState {
  attempt: number;
  status: 'idle' | 'done' | 'error';
  message: string | null;
  errors: AdErrors;
  values: Partial<AdFields>;
}

function indiaToday(): string {
  const { year, month, day } = istParts(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function trackedRivalIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('rivals').select('rival_institution_id');
  return [...new Set((data ?? []).map((row) => row.rival_institution_id))];
}

export async function addRivalAdAction(previous: AdFormState, formData: FormData): Promise<AdFormState> {
  const viewer = await getViewer();
  const next = (patch: Partial<AdFormState>): AdFormState => ({ ...previous, attempt: previous.attempt + 1, message: null, errors: {}, ...patch });
  if (!viewer?.teamRole) return next({ status: 'error', message: 'Only the AdmitLabs team can enter ads.' });

  const values: AdFields = {
    rival: String(formData.get('rival') ?? ''),
    promise: String(formData.get('promise') ?? ''),
    source: String(formData.get('source') ?? ''),
    seenOn: String(formData.get('seenOn') ?? ''),
  };
  const { entry, errors } = checkAdEntry(values, await trackedRivalIds(), indiaToday());
  if (!entry) return next({ status: 'error', message: 'Check the fields marked below.', errors, values });

  const supabase = await createClient();
  const { error } = await supabase.from('rival_ads').insert({
    rival_institution_id: entry.rival,
    promise: entry.promise,
    source_url: entry.sourceUrl,
    entered_by: viewer.userId,
    entered_at: istDate(entry.seenOn, 12).toISOString(),
  });
  if (error) return next({ status: 'error', message: 'That did not save just now. Please try again.', values });
  revalidatePath('/team/ads');
  revalidatePath('/rivals', 'layout');
  return next({ status: 'done', message: 'Saved. Paid and Client institutions tracking this rival see it now.', values: { seenOn: values.seenOn } });
}

export async function deleteRivalAdAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return;
  const supabase = await createClient();
  await supabase.from('rival_ads').delete().eq('id', String(formData.get('ad') ?? ''));
  revalidatePath('/team/ads');
  revalidatePath('/rivals', 'layout');
}

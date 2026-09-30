'use server';

// Saving the rival list. Owners only; the plan rules (3 to 5 rivals, Free picks once, Paid
// changes once a calendar month, Client any time) are checked again inside save_rivals(),
// whatever the page shows. Newly picked rivals get their first look straight away.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { RIVAL_RULES } from '@/config/rivals';
import { formatDate } from '@/domain/format';
import { refreshResetsOn } from '@/domain/schedule';
import { getViewer } from '@/lib/auth/viewer';
import { friendlyError } from '@/lib/institution/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AuditRunError } from '@/audit/run';
import { checkRivalEntry, type RivalEntry } from '@/rivals/entry';
import { firstLook, RivalJobError, writeRivalActions } from '@/rivals/jobs';
import { RivalReadError } from '@/rivals/read';

export interface SaveRivalsState {
  status: 'idle' | 'error';
  message: string | null;
}

function parseAdded(raw: FormDataEntryValue | null): unknown[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function saveRivalsAction(_previous: SaveRivalsState, formData: FormData): Promise<SaveRivalsState> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.membership.role !== 'owner') return { status: 'error', message: 'Only the owner of this account can choose rivals.' };
  const institution = viewer.membership.institution;

  const supabase = await createClient();
  const { data: programs, error: programError } = await supabase.from('programs').select('id').eq('institution_id', institution.id).is('archived_at', null);
  if (programError) return { status: 'error', message: friendlyError(programError.message) };

  const picked = [...new Set(formData.getAll('picked').map(String).filter(Boolean))];
  const added: RivalEntry[] = [];
  for (const raw of parseAdded(formData.get('added'))) {
    const fields = (raw ?? {}) as Record<string, unknown>;
    const { entry } = checkRivalEntry(
      {
        name: String(fields.name ?? ''),
        type: String(fields.type ?? ''),
        city: String(fields.city ?? ''),
        state: String(fields.state ?? ''),
        website: String(fields.website ?? ''),
        instagram: String(fields.instagram ?? ''),
        programs: Array.isArray(fields.programs) ? fields.programs.map(String) : [],
      },
      { ownPrograms: (programs ?? []).map((program) => program.id), ownWebsite: institution.website, listed: added.map((item) => item.website) },
    );
    if (!entry) return { status: 'error', message: 'One of the rivals you added needs another look. Remove it and add it again.' };
    added.push(entry);
  }

  const total = picked.length + added.length;
  if (total < RIVAL_RULES.min || total > RIVAL_RULES.max) return { status: 'error', message: `Pick ${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals.` };

  const { data: saved, error } = await supabase.rpc('save_rivals', { p_picked: picked, p_added: JSON.parse(JSON.stringify(added)) });
  if (error) {
    if (error.message.includes('change_used')) {
      return { status: 'error', message: `You have changed your rivals this month. You can change them again from ${formatDate(refreshResetsOn(new Date()))}.` };
    }
    return { status: 'error', message: friendlyError(error.message) };
  }

  // A first look at anything new: a rival Audit if none this month, and a first weekly check.
  // The list is saved either way; a rival that could not be checked yet shows "Checking now"
  // and is picked up by the next scheduled run.
  const now = new Date();
  const admin = createAdminClient();
  try {
    await firstLook(admin, saved ?? [], now);
    await writeRivalActions(admin, institution.id, now);
  } catch (error) {
    if (!(error instanceof AuditRunError || error instanceof RivalJobError || error instanceof RivalReadError)) throw error;
    console.error(`First look at new rivals did not finish: ${error.message}`);
  }

  revalidatePath('/', 'layout');
  redirect('/rivals?saved=1');
}

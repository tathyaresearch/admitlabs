'use server';

// Leads tracking links, made by the Client's own people, the owner or a member (spec section 23),
// beside the ones the AdmitLabs team makes: a name, where it is used, and one program or any
// course (a general form, where the student picks). Checked here and again in create_lead_link()
// and archive_lead_link(). The team in "view as" makes them from the team area instead.

import { revalidatePath } from 'next/cache';
import { LEAD_RULES } from '@/config/leads';
import { tidyText } from '@/domain/onboarding';
import { LEAD_SOURCES, type LeadSource } from '@/domain/types';
import { ANY_COURSE_VALUE } from '@/leads/text';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

export interface LinkFormState {
  status: 'idle' | 'done' | 'error';
  message: string | null;
  attempt: number;
}

const NOT_ALLOWED = 'Only people in this account can make or archive its links.';

async function ownInstitution() {
  const viewer = await getViewer();
  return viewer?.membership && !viewer.viewingAs ? viewer.membership.institution : null;
}

export async function createLinkAction(previous: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const reply = (status: LinkFormState['status'], message: string) => ({ status, message, attempt: previous.attempt + 1 });
  const institution = await ownInstitution();
  if (!institution) return reply('error', NOT_ALLOWED);
  const name = tidyText(String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim());
  const usedOn = String(formData.get('used_on') ?? '');
  const program = String(formData.get('program') ?? '');
  if (name.length < 2) return reply('error', 'Name the link, like "Reel: BBA placements".');
  if (name.length > LEAD_RULES.linkNameMax) return reply('error', `Keep the name under ${LEAD_RULES.linkNameMax} characters.`);
  if (!(LEAD_SOURCES as readonly string[]).includes(usedOn)) return reply('error', 'Say where the link will be used.');
  if (!program) return reply('error', 'Choose a course, or any course for a general form.');

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_lead_link', {
    p_institution: institution.id,
    p_name: name,
    p_used_on: usedOn as LeadSource,
    p_program: program === ANY_COURSE_VALUE ? undefined : program,
  });
  if (error) {
    const message = error.message.includes('not_client')
      ? 'Tracking links come with an AdmitLabs service.'
      : error.message.includes('bad_program')
        ? 'Choose one of your courses.'
        : 'The link could not be made. Try again.';
    return reply('error', message);
  }
  revalidatePath('/leads');
  return reply('done', 'Link made. Copy it from the list below.');
}

/** Its form says it is closed from now on. The enquiries it brought stay. */
export async function archiveLinkAction(linkId: string): Promise<{ ok: boolean; error: string | null }> {
  if (!(await ownInstitution())) return { ok: false, error: NOT_ALLOWED };
  const supabase = await createClient();
  const { error } = await supabase.rpc('archive_lead_link', { p_link: linkId });
  if (error) return { ok: false, error: 'That did not archive. Try again.' };
  revalidatePath('/leads');
  return { ok: true, error: null };
}

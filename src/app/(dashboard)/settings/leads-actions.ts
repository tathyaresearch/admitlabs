'use server';

// Settings, Leads (spec section 23): who gets the email for each new enquiry and how long
// enquiries are kept, and deleting one student's data on request. The owner only: checked here and
// again in save_lead_settings() and delete_leads(). Finding a student reads the enquiries as the
// owner, so row level security applies.

import { revalidatePath } from 'next/cache';
import { LEAD_RULES, type KeepMonths } from '@/config/leads';
import { contactKey } from '@/leads/form';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';

export interface LeadSettingsState {
  status: 'idle' | 'done' | 'error';
  message: string | null;
  attempt: number;
}

export interface FoundStudent {
  /** What was searched, as stored: '+919876543210' or an email. */
  contact: string | null;
  matches: Array<{ id: string; name: string; sentAt: string; course: string | null }>;
  message: string | null;
  attempt: number;
}

const NOT_OWNER = 'Only the owner of this account can change Leads.';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function owner() {
  const viewer = await getViewer();
  return viewer?.membership && !viewer.viewingAs && viewer.membership.role === 'owner' ? viewer.membership.institution : null;
}

export async function saveLeadSettingsAction(previous: LeadSettingsState, formData: FormData): Promise<LeadSettingsState> {
  const reply = (status: LeadSettingsState['status'], message: string) => ({ status, message, attempt: previous.attempt + 1 });
  const institution = await owner();
  if (!institution) return reply('error', NOT_OWNER);

  const emails = Array.from({ length: LEAD_RULES.alertEmailsMax }, (_, index) => String(formData.get(`alert_email_${index + 1}`) ?? '').trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return reply('error', 'Add at least one email, so each new enquiry reaches someone.');
  const wrong = emails.find((email) => email.length > 254 || !EMAIL.test(email));
  if (wrong) return reply('error', `${wrong} doesn’t look like an email. Check it and save again.`);
  const keep = Number(formData.get('keep_months'));
  if (!(LEAD_RULES.keepMonths as readonly number[]).includes(keep)) return reply('error', 'Choose how long to keep enquiries.');

  const supabase = await createClient();
  const { data: deleted, error } = await supabase.rpc('save_lead_settings', { p_institution: institution.id, p_alert_emails: emails, p_keep_months: keep as KeepMonths });
  if (error) return reply('error', 'That did not save. Try again.');
  revalidatePath('/leads');
  revalidatePath('/settings');
  return reply('done', deleted ? `Saved. ${deleted === 1 ? '1 enquiry' : `${deleted} enquiries`} older than ${keep} months ${deleted === 1 ? 'was' : 'were'} deleted for good.` : 'Saved.');
}

export async function findStudentAction(previous: FoundStudent, formData: FormData): Promise<FoundStudent> {
  const attempt = previous.attempt + 1;
  const institution = await owner();
  if (!institution) return { contact: null, matches: [], message: NOT_OWNER, attempt };
  const contact = contactKey(String(formData.get('contact') ?? ''));
  if (!contact) return { contact: null, matches: [], message: 'Enter the phone number or the email the student used.', attempt };

  const supabase = await createClient();
  const column = contact.includes('@') ? 'email' : 'phone';
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, created_at, program:programs(name)')
    .eq('institution_id', institution.id)
    .eq(column, contact)
    .order('created_at', { ascending: false });
  if (error) return { contact, matches: [], message: 'That did not work. Try again.', attempt };
  const matches = (data ?? []).map((row) => ({ id: row.id, name: row.name, sentAt: row.created_at, course: row.program?.name ?? null }));
  return { contact, matches, message: matches.length ? null : 'No enquiry was sent from that phone number or email.', attempt };
}

/** Every enquiry from one phone number or email, or one enquiry, deleted for good. */
export async function deleteStudentAction(input: { contact: string | null; leadId: string | null }): Promise<{ ok: boolean; deleted: number; error: string | null }> {
  const institution = await owner();
  if (!institution) return { ok: false, deleted: 0, error: NOT_OWNER };
  const contact = input.contact ? contactKey(input.contact) : null;
  if (!contact && !input.leadId) return { ok: false, deleted: 0, error: 'Find the student first.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('delete_leads', { p_institution: institution.id, ...(input.leadId ? { p_lead: input.leadId } : { p_contact: contact ?? '' }) });
  if (error) return { ok: false, deleted: 0, error: 'That did not delete. Try again.' };
  revalidatePath('/leads');
  return { ok: true, deleted: data ?? 0, error: null };
}

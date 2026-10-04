'use server';

// An enquiry sent through a tracking link's form (spec section 23). Bots are turned away here (a
// hidden field, a minimum time to fill the form), the answer is checked (src/leads/form.ts), and
// submit_lead(), the one way in, checks again with its own limits. Then the admissions team gets
// an email straight away, with the service key; a failed email never fails the student's enquiry.

import { LEAD_RULES } from '@/config/leads';
import { LEAD_TRAP_FIELD, parseLead, type LeadErrors, type LeadField } from '@/leads/form';
import { sendLeadAlert } from '@/leads/jobs';
import { tooQuick } from '@/leads/token';
import { loadLeadForm, readFormStart } from '@/lib/leads/form';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN, APP_URL } from '@/lib/urls';

export interface LeadFormState {
  status: 'idle' | 'error' | 'sent';
  errors: LeadErrors;
  /** A problem with sending as a whole, not with one field. */
  message: string | null;
  /** What was typed, so a form that comes back with errors keeps it. */
  values: Partial<Record<LeadField, string>>;
  /** The course asked about, for the thanks. */
  course: string | null;
  /** This phone or email already sent one today: the college has it. */
  already: boolean;
  /** Changes on every reply, so the form shows what came back. */
  attempt: number;
}

const FIELDS: readonly LeadField[] = ['name', 'phone', 'email', 'city', 'program'];
const FAILED = 'That did not send. Try again in a moment.';

export async function submitLeadAction(code: string, previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const attempt = previous.attempt + 1;
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? '')])) as Record<LeadField, string>;
  const reply = (patch: Partial<LeadFormState>): LeadFormState => ({ status: 'error', errors: {}, message: null, values, course: null, already: false, attempt, ...patch });

  // Only a bot fills in the hidden field: it is told the enquiry went, and nothing is kept.
  if (String(formData.get(LEAD_TRAP_FIELD) ?? '').trim()) return reply({ status: 'sent', values: {} });
  if (!APP_OPEN) return reply({ message: FAILED });
  if (tooQuick(readFormStart(String(formData.get('started') ?? '')), Date.now(), LEAD_RULES.minSeconds)) {
    return reply({ message: 'That was very quick. Check your details, then send again.' });
  }

  const form = await loadLeadForm(code);
  if (!form || !form.open) return reply({ message: 'This form is closed. It no longer takes enquiries.' });
  const parsed = parseLead(values, form.programs.map((program) => program.id));
  if (!parsed.ok) return reply({ errors: parsed.errors });

  const { lead } = parsed;
  const course = form.programs.find((program) => program.id === lead.programId)?.name ?? form.programName;
  const supabase = await createClient();
  const { data: leadId, error } = await supabase.rpc('submit_lead', {
    p_code: code,
    p_name: lead.name,
    p_phone: lead.phone,
    p_email: lead.email ?? undefined,
    p_city: lead.city ?? undefined,
    p_program: lead.programId,
  });
  if (error) {
    if (error.message.includes('already_sent')) return reply({ status: 'sent', values: {}, course, already: true });
    if (error.message.includes('link_closed')) return reply({ message: 'This form is closed. It no longer takes enquiries.' });
    if (error.message.includes('link_busy')) return reply({ message: 'Many enquiries came through this link in the last hour. Please try again a little later.' });
    if (error.message.includes('bad_program')) return reply({ errors: { program: 'Please choose a course.' } });
    return reply({ message: FAILED });
  }

  try {
    await sendLeadAlert(createAdminClient(), leadId, { leadsUrl: `${APP_URL}/leads` });
  } catch (problem) {
    console.error(`The enquiry alert did not go: ${problem instanceof Error ? problem.message : String(problem)}`);
  }
  return reply({ status: 'sent', values: {}, course });
}

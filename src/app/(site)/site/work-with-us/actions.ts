'use server';

// The "Work with us" form, sent: checked here (src/site/enquiry.ts), then added through the one
// database function visitors may call, which checks again and turns away a fourth enquiry from
// one email in a day. Nothing is emailed; the team reads enquiries in the team area.

import { createClient } from '@/lib/supabase/server';
import { ENQUIRY } from '@/site/content';
import { parseEnquiry, TRAP_FIELD, type EnquiryErrors, type EnquiryField } from '@/site/enquiry';

export interface EnquiryState {
  status: 'idle' | 'error' | 'sent';
  errors: EnquiryErrors;
  /** A problem with sending as a whole, not with one field. */
  message: string | null;
  /** What was typed, so a form that comes back with errors keeps it. */
  values: Partial<Record<EnquiryField, string>>;
  /** Changes on every reply, so the form shows what came back. */
  attempt: number;
}

const FIELDS: readonly EnquiryField[] = ['name', 'institution', 'role', 'email', 'phone', 'program', 'message'];

export async function submitEnquiryAction(previous: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const attempt = previous.attempt + 1;
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? '')])) as Record<EnquiryField, string>;
  if (String(formData.get(TRAP_FIELD) ?? '').trim()) return { status: 'sent', errors: {}, message: null, values: {}, attempt };

  const parsed = parseEnquiry(values);
  if (!parsed.ok) return { status: 'error', errors: parsed.errors, message: null, values, attempt };

  const { enquiry } = parsed;
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_enquiry', {
    p_name: enquiry.name,
    p_institution: enquiry.institution,
    p_role: enquiry.role,
    p_email: enquiry.email,
    p_phone: enquiry.phone,
    p_program: enquiry.program ?? '',
    p_message: enquiry.message ?? '',
  });
  if (error) return { status: 'error', errors: {}, message: error.message.includes('enquiry_limit') ? ENQUIRY.limit : ENQUIRY.failed, values, attempt };
  return { status: 'sent', errors: {}, message: null, values: {}, attempt };
}

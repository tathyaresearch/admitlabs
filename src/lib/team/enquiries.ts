// Enquiries for the team area: the website's "Work with us" form, and requests for Paid from
// an owner's dashboard. Row level security lets only team users read them
// (supabase/migrations/20261007120000_enquiries.sql and 20261010120000_ask_paid_attention.sql).

import { createClient } from '@/lib/supabase/server';
import type { EnquiryRole } from '@/site/enquiry';

interface EnquiryBase {
  id: string;
  createdAt: string;
  institution: string;
  email: string;
  handledAt: string | null;
}

/** From the website's form: who wrote, how to reach them and what they need. */
export interface FormEnquiry extends EnquiryBase {
  kind: 'work_with_us';
  name: string;
  role: EnquiryRole;
  phone: string;
  program: string | null;
  message: string | null;
}

/** From the dashboard: an owner asks for Paid, or to continue it. */
export interface PaidAsk extends EnquiryBase {
  kind: 'ask_paid' | 'continue_paid';
  institutionId: string;
}

export type EnquiryRow = FormEnquiry | PaidAsk;

/** Newest first. */
export async function loadEnquiries(): Promise<EnquiryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, created_at, kind, institution_id, name, institution, role, email, phone, program, message, handled_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);
  return (data ?? []).flatMap((row): EnquiryRow[] => {
    const base = { id: row.id, createdAt: row.created_at, institution: row.institution, email: row.email, handledAt: row.handled_at };
    if (row.kind !== 'work_with_us') return row.institution_id ? [{ ...base, kind: row.kind, institutionId: row.institution_id }] : [];
    // The database requires these for the form (the enquiries_form constraint).
    if (!row.name || !row.role || !row.phone) return [];
    return [{ ...base, kind: 'work_with_us', name: row.name, role: row.role, phone: row.phone, program: row.program, message: row.message }];
  });
}

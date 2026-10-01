// Enquiries from the website's "Work with us" form, for the team area. Row level security lets
// only team users read them (supabase/migrations/20261007120000_enquiries.sql).

import { createClient } from '@/lib/supabase/server';
import type { EnquiryRole } from '@/site/enquiry';

export interface EnquiryRow {
  id: string;
  createdAt: string;
  name: string;
  institution: string;
  role: EnquiryRole;
  email: string;
  phone: string;
  program: string | null;
  message: string | null;
  handledAt: string | null;
}

/** Newest first. */
export async function loadEnquiries(): Promise<EnquiryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, created_at, name, institution, role, email, phone, program, message, handled_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    institution: row.institution,
    role: row.role,
    email: row.email,
    phone: row.phone,
    program: row.program,
    message: row.message,
    handledAt: row.handled_at,
  }));
}

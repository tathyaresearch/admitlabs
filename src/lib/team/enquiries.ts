// Enquiries for the team area: the website's "Work with us" form, and requests from a dashboard:
// to subscribe or renew, to talk about the services, and to let AdmitLabs fix something in their
// Audit. Row level security lets only team users read them
// (supabase/migrations/20261007120000_enquiries.sql and 20261010120000_ask_paid_attention.sql).

import { getCheck } from '@/domain/checks';
import { parseFixKey } from '@/domain/fix-key';
import type { Place } from '@/domain/types';
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

/** From the sidebar's services card: someone at a Free or Paid institution asks to talk about the services. */
export interface ServicesAsk extends EnquiryBase {
  kind: 'ask_services';
  institutionId: string;
}

/** From the Audit: an owner asks AdmitLabs to fix one thing, named as they saw it, with its place. */
export interface FixAsk extends EnquiryBase {
  kind: 'fix_request';
  institutionId: string;
  fixKey: string;
  fixTitle: string;
  /** Where the fix is: a check's place, or the place its finding was on. Null if that finding is gone. */
  place: Place | null;
}

export type EnquiryRow = FormEnquiry | PaidAsk | ServicesAsk | FixAsk;

/** Newest first. */
export async function loadEnquiries(): Promise<EnquiryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, created_at, kind, institution_id, name, institution, role, email, phone, program, message, fix_key, fix_title, handled_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);
  const places = await findingPlaces(supabase, data ?? []);
  return (data ?? []).flatMap((row): EnquiryRow[] => {
    const base = { id: row.id, createdAt: row.created_at, institution: row.institution, email: row.email, handledAt: row.handled_at };
    if (row.kind === 'fix_request') {
      if (!row.institution_id || !row.fix_key || !row.fix_title) return [];
      const fix = parseFixKey(row.fix_key);
      const place = !fix ? null : fix.kind === 'check' ? getCheck(fix.checkKey).place : (places.get(`${row.institution_id}:${fix.findingKey}`) ?? null);
      return [{ ...base, kind: 'fix_request', institutionId: row.institution_id, fixKey: row.fix_key, fixTitle: row.fix_title, place }];
    }
    if (row.kind === 'ask_services') return row.institution_id ? [{ ...base, kind: 'ask_services', institutionId: row.institution_id }] : [];
    if (row.kind !== 'work_with_us') return row.institution_id ? [{ ...base, kind: row.kind, institutionId: row.institution_id }] : [];
    // The database requires these for the form (the enquiries_form constraint).
    if (!row.name || !row.role || !row.phone) return [];
    return [{ ...base, kind: 'work_with_us', name: row.name, role: row.role, phone: row.phone, program: row.program, message: row.message }];
  });
}

/** The place of each finding a request names, by institution and finding: what people say, or other places. */
async function findingPlaces(supabase: Awaited<ReturnType<typeof createClient>>, rows: ReadonlyArray<{ kind: string; institution_id: string | null; fix_key: string | null }>): Promise<Map<string, Place>> {
  const asked = rows.flatMap((row) => {
    const fix = row.kind === 'fix_request' && row.fix_key ? parseFixKey(row.fix_key) : null;
    return fix?.kind === 'finding' && row.institution_id ? [{ institutionId: row.institution_id, findingKey: fix.findingKey }] : [];
  });
  const places = new Map<string, Place>();
  if (!asked.length) return places;
  const { data, error } = await supabase
    .from('audit_findings')
    .select('institution_id, finding_key, place')
    .in('institution_id', [...new Set(asked.map((item) => item.institutionId))])
    .in('finding_key', [...new Set(asked.map((item) => item.findingKey))]);
  if (error) throw new Error(`Could not load where each fix is: ${error.message}`);
  for (const row of data ?? []) places.set(`${row.institution_id}:${row.finding_key}`, row.place);
  return places;
}

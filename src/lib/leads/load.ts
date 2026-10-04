// Loads what the Leads screens need, as the signed-in user: row level security decides what comes
// back. The college's own people read every enquiry; the AdmitLabs team, in "view as" too, gets
// counts by link only (lead_link_counts), never a student's details (spec section 23).

import { cache } from 'react';
import { LEAD_RULES } from '@/config/leads';
import type { LeadSource } from '@/domain/types';
import type { LinkCount } from '@/leads/summary';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadPrograms } from '@/lib/audit/load';
import { createClient } from '@/lib/supabase/server';

export interface LeadRow {
  id: string;
  sentAt: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  course: string | null;
  linkName: string | null;
  usedOn: LeadSource | null;
}

export interface LeadsPageData {
  links: LinkCount[];
  /** The college's own people only: null for the team, which never sees a student's details. */
  leads: LeadRow[] | null;
  /** Every enquiry kept, for "Showing 50 of 63". */
  leadCount: number;
  keepMonths: number;
  /** Who gets the email for each new enquiry. Empty for the team. */
  recipients: string[];
  /** The forms take enquiries: the college is a Client. */
  open: boolean;
}

/** Whether this institution has Leads: a Client, or one that was, with its links and enquiries still kept. */
export const loadHasLeads = cache(async (viewer: InstitutionViewer): Promise<boolean> => {
  if (viewer.tier === 'client') return true;
  const supabase = await createClient();
  const { count, error } = await supabase.from('lead_links').select('id', { count: 'exact', head: true }).eq('institution_id', viewer.membership.institution.id);
  if (error) throw new Error(`Could not load the tracking links: ${error.message}`);
  return (count ?? 0) > 0;
});

/** Each link's enquiries this month, last month and in all. Counts only: the team reads these too. */
export async function loadLinkCounts(institutionId: string, now?: Date): Promise<LinkCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('lead_link_counts', { p_institution: institutionId, ...(now ? { p_now: now.toISOString() } : {}) });
  if (error) throw new Error(`Could not load the enquiries by link: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.link_id,
    code: row.code,
    name: row.name,
    usedOn: row.used_on,
    programName: row.program_name,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
    thisMonth: row.this_month,
    lastMonthToDate: row.last_month_to_date,
    lastMonth: row.last_month,
    monthBefore: row.month_before,
    total: row.total,
  }));
}

/** Every enquiry kept, newest first: the list and the CSV. The college's own people only. */
export async function loadLeads(viewer: InstitutionViewer, limit: number | null): Promise<{ leads: LeadRow[]; count: number }> {
  const institution = viewer.membership.institution;
  const supabase = await createClient();
  let query = supabase
    .from('leads')
    .select('id, created_at, name, phone, email, city, program_id, link:lead_links(name, used_on)', { count: 'exact' })
    .eq('institution_id', institution.id)
    .order('created_at', { ascending: false });
  if (limit !== null) query = query.limit(limit);
  const [{ data, error, count }, programs] = await Promise.all([query, loadPrograms(institution.id)]);
  if (error) throw new Error(`Could not load the enquiries: ${error.message}`);
  const names = new Map(programs.map((program) => [program.id, program.name]));
  return {
    count: count ?? 0,
    leads: (data ?? []).map((row) => ({
      id: row.id,
      sentAt: row.created_at,
      name: row.name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      course: row.program_id ? (names.get(row.program_id) ?? null) : null,
      linkName: row.link?.name ?? null,
      usedOn: row.link?.used_on ?? null,
    })),
  };
}

export async function loadLeadsPage(viewer: InstitutionViewer, options: { all: boolean }): Promise<LeadsPageData> {
  const institution = viewer.membership.institution;
  const supabase = await createClient();
  const team = viewer.viewingAs;
  const [links, settings, recipients, list] = await Promise.all([
    loadLinkCounts(institution.id),
    supabase.from('lead_settings').select('keep_months').eq('institution_id', institution.id).maybeSingle(),
    team ? Promise.resolve({ data: [] as string[], error: null }) : supabase.rpc('lead_alert_recipients', { p_institution: institution.id }),
    team ? Promise.resolve(null) : loadLeads(viewer, options.all ? null : LEAD_RULES.listShown),
  ]);
  if (settings.error) throw new Error(`Could not load the Leads settings: ${settings.error.message}`);
  if (recipients.error) throw new Error(`Could not load who gets the alerts: ${recipients.error.message}`);
  return {
    links,
    leads: list?.leads ?? null,
    leadCount: list?.count ?? links.reduce((sum, link) => sum + link.total, 0),
    keepMonths: settings.data?.keep_months ?? LEAD_RULES.keepMonthsDefault,
    recipients: recipients.data ?? [],
    open: viewer.tier === 'client',
  };
}

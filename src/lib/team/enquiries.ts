// Enquiries for the team area (spec section 27): AdmitLabs' own leads, as the signed-in team user.
// Row level security decides who sees what: Admins and Team members every lead, a Client manager
// the leads they own (supabase/migrations/20261023120100_team_leads.sql). What came in for a lead
// keeps its own shape: the website's form, a request from a dashboard, a new Free college.

import { getCheck } from '@/domain/checks';
import { parseFixKey } from '@/domain/fix-key';
import { effectiveTier, parsePaidMonths, type PaidMonths } from '@/domain/tiers';
import type { Place, Tier } from '@/domain/types';
import type { LostReason, TeamLeadSource, TeamLeadStatus } from '@/enquiries/model';
import { viewStatuses, type ActivityRow, type LeadFilters } from '@/enquiries/view';
import { createClient } from '@/lib/supabase/server';
import type { EnquiryRole } from '@/site/enquiry';
import { loadTeamPeople } from './load';

type Db = Awaited<ReturnType<typeof createClient>>;

// What came in -------------------------------------------------------------------------------------

interface EnquiryBase {
  id: string;
  createdAt: string;
  institution: string;
  email: string;
  handledAt: string | null;
  /** The team tracking link it came through, by name. */
  linkName: string | null;
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

/** From the dashboard: an owner asks for Paid, or to continue it, Monthly or for 3 months. */
export interface PaidAsk extends EnquiryBase {
  kind: 'ask_paid' | 'continue_paid';
  institutionId: string;
  /** The period picked. Null on a request sent before there were two. */
  paidMonths: PaidMonths | null;
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

/** A new Free college: its owner signed up. */
export interface SignUp extends EnquiryBase {
  kind: 'free_signup';
  institutionId: string;
}

export type EnquiryRow = FormEnquiry | PaidAsk | ServicesAsk | FixAsk | SignUp;

const ENQUIRY_COLUMNS = 'id, created_at, kind, institution_id, name, institution, role, email, phone, program, message, fix_key, fix_title, paid_months, handled_at, team_lead_links(name)';

type EnquiryDbRow = {
  id: string;
  created_at: string;
  kind: string;
  institution_id: string | null;
  name: string | null;
  institution: string;
  role: EnquiryRole | null;
  email: string;
  phone: string | null;
  program: string | null;
  message: string | null;
  fix_key: string | null;
  fix_title: string | null;
  paid_months: number | null;
  handled_at: string | null;
  team_lead_links: { name: string } | null;
};

async function enquiryRows(supabase: Db, rows: readonly EnquiryDbRow[]): Promise<EnquiryRow[]> {
  const places = await findingPlaces(supabase, rows);
  return rows.flatMap((row): EnquiryRow[] => {
    const base = { id: row.id, createdAt: row.created_at, institution: row.institution, email: row.email, handledAt: row.handled_at, linkName: row.team_lead_links?.name ?? null };
    if (row.kind === 'fix_request') {
      if (!row.institution_id || !row.fix_key || !row.fix_title) return [];
      const fix = parseFixKey(row.fix_key);
      const place = !fix ? null : fix.kind === 'check' ? getCheck(fix.checkKey).place : (places.get(`${row.institution_id}:${fix.findingKey}`) ?? null);
      return [{ ...base, kind: 'fix_request', institutionId: row.institution_id, fixKey: row.fix_key, fixTitle: row.fix_title, place }];
    }
    if (row.kind === 'ask_services') return row.institution_id ? [{ ...base, kind: 'ask_services', institutionId: row.institution_id }] : [];
    if (row.kind === 'free_signup') return row.institution_id ? [{ ...base, kind: 'free_signup', institutionId: row.institution_id }] : [];
    if (row.kind === 'ask_paid' || row.kind === 'continue_paid') return row.institution_id ? [{ ...base, kind: row.kind, institutionId: row.institution_id, paidMonths: parsePaidMonths(row.paid_months) }] : [];
    // The database requires these for the form (the enquiries_form constraint).
    if (!row.name || !row.role || !row.phone) return [];
    return [{ ...base, kind: 'work_with_us', name: row.name, role: row.role, phone: row.phone, program: row.program, message: row.message }];
  });
}

/** The place of each finding a request names, by institution and finding: what people say, or other places. */
async function findingPlaces(supabase: Db, rows: ReadonlyArray<{ kind: string; institution_id: string | null; fix_key: string | null }>): Promise<Map<string, Place>> {
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

// Leads --------------------------------------------------------------------------------------------

export interface LeadRow {
  id: string;
  createdAt: string;
  lastInAt: string;
  name: string | null;
  institution: string | null;
  institutionId: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  wants: string | null;
  source: TeamLeadSource;
  sourceDetail: string | null;
  status: TeamLeadStatus;
  lostReason: LostReason | null;
  lostNote: string | null;
  ownerId: string | null;
  owner: string | null;
  nextFollowUp: string | null;
  madeClientAt: string | null;
  /** Something came in again after the first time. */
  cameBack: boolean;
}

const LEAD_COLUMNS = 'id, created_at, last_in_at, name, institution, institution_id, city, phone, email, wants, source, source_detail, status, lost_reason, lost_note, owner_id, next_follow_up, made_client_at';

type LeadDbRow = {
  id: string;
  created_at: string;
  last_in_at: string;
  name: string | null;
  institution: string | null;
  institution_id: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  wants: string | null;
  source: TeamLeadSource;
  source_detail: string | null;
  status: TeamLeadStatus;
  lost_reason: LostReason | null;
  lost_note: string | null;
  owner_id: string | null;
  next_follow_up: string | null;
  made_client_at: string | null;
};

/** Names of the people on the team, by id: their name, or their email. */
export async function teamNames(): Promise<Map<string, string>> {
  const people = await loadTeamPeople();
  return new Map(people.flatMap((person) => (person.userId ? [[person.userId, person.name ?? person.email] as const] : [])));
}

function leadRow(row: LeadDbRow, names: ReadonlyMap<string, string>): LeadRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastInAt: row.last_in_at,
    name: row.name,
    institution: row.institution,
    institutionId: row.institution_id,
    city: row.city,
    phone: row.phone,
    email: row.email,
    wants: row.wants,
    source: row.source,
    sourceDetail: row.source_detail,
    status: row.status,
    lostReason: row.lost_reason,
    lostNote: row.lost_note,
    ownerId: row.owner_id,
    owner: row.owner_id ? (names.get(row.owner_id) ?? 'Someone on the team') : null,
    nextFollowUp: row.next_follow_up,
    madeClientAt: row.made_client_at,
    // A minute apart at least: the first enquiry and the lead start together.
    cameBack: new Date(row.last_in_at).getTime() - new Date(row.created_at).getTime() > 60_000,
  };
}

const LIST_MAX = 500;

/**
 * The list: the filters' leads, the next follow-up first (the overdue at the top), then the latest
 * to come in. `me` is the signed-in person, for "Mine". `today`: India's date, for "Due".
 */
export async function loadLeadList(filters: LeadFilters, me: string, today: string): Promise<{ rows: LeadRow[]; total: number; capped: boolean }> {
  const supabase = await createClient();
  let query = supabase.from('team_leads').select(LEAD_COLUMNS, { count: 'exact' }).in('status', [...viewStatuses(filters.view)]);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.owner === 'me') query = query.eq('owner_id', me);
  else if (filters.owner === 'none') query = query.is('owner_id', null);
  else if (filters.owner) query = query.eq('owner_id', filters.owner);
  if (filters.due) query = query.lte('next_follow_up', today);
  const pattern = filters.q.replace(/[%_,().]/g, ' ').trim();
  if (pattern) query = query.or(`name.ilike.%${pattern}%,institution.ilike.%${pattern}%,email.ilike.%${pattern}%,phone.ilike.%${pattern.replace(/\D/g, '') || pattern}%`);
  const [result, names] = await Promise.all([
    query.order('next_follow_up', { ascending: true, nullsFirst: false }).order('last_in_at', { ascending: false }).order('id').limit(LIST_MAX),
    teamNames(),
  ]);
  if (result.error) throw new Error(`Could not load enquiries: ${result.error.message}`);
  const total = result.count ?? 0;
  return { rows: (result.data ?? []).map((row) => leadRow(row as LeadDbRow, names)), total, capped: total > LIST_MAX };
}

/** The counts above the list: open, new, and follow-ups due today or before. */
export async function loadLeadCounts(today: string): Promise<{ open: number; fresh: number; due: number }> {
  const supabase = await createClient();
  const head = () => supabase.from('team_leads').select('id', { count: 'exact', head: true });
  const [open, fresh, due] = await Promise.all([
    head().in('status', ['new', 'contacted', 'call_booked', 'proposal_sent']),
    head().eq('status', 'new'),
    head().in('status', ['new', 'contacted', 'call_booked', 'proposal_sent']).lte('next_follow_up', today),
  ]);
  for (const result of [open, fresh, due]) if (result.error) throw new Error(`Could not count enquiries: ${result.error.message}`);
  return { open: open.count ?? 0, fresh: fresh.count ?? 0, due: due.count ?? 0 };
}

export interface LeadInstitution {
  id: string;
  name: string;
  city: string;
  claimed: boolean;
  tier: Tier | null;
}

export interface LeadPage {
  lead: LeadRow;
  cameIn: EnquiryRow[];
  activity: ActivityRow[];
  linkName: string | null;
  institution: LeadInstitution | null;
  names: Map<string, string>;
}

/** One lead, or null when it is not there or not this person's to see. */
export async function loadLead(id: string): Promise<LeadPage | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from('team_leads').select(`${LEAD_COLUMNS}, team_lead_links(name)`).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load the enquiry: ${error.message}`);
  if (!row) return null;
  const [enquiries, activity, names, institution] = await Promise.all([
    supabase.from('enquiries').select(ENQUIRY_COLUMNS).eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('team_lead_activity').select('id, at, by, kind, body, data').eq('lead_id', id).order('at', { ascending: false }).order('id'),
    teamNames(),
    row.institution_id ? loadLeadInstitution(supabase, row.institution_id) : Promise.resolve(null),
  ]);
  if (enquiries.error) throw new Error(`Could not load what came in: ${enquiries.error.message}`);
  if (activity.error) throw new Error(`Could not load the enquiry's History: ${activity.error.message}`);
  return {
    lead: leadRow(row as LeadDbRow, names),
    cameIn: await enquiryRows(supabase, (enquiries.data ?? []) as unknown as EnquiryDbRow[]),
    activity: (activity.data ?? []) as unknown as ActivityRow[],
    linkName: (row as unknown as { team_lead_links: { name: string } | null }).team_lead_links?.name ?? null,
    institution,
    names,
  };
}

async function loadLeadInstitution(supabase: Db, id: string): Promise<LeadInstitution | null> {
  const { data, error } = await supabase.from('institutions').select('id, name, city, institution_status(claimed), plans(tier, starts_at, ends_at)').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load the college: ${error.message}`);
  if (!data) return null;
  const plan = Array.isArray(data.plans) ? data.plans[0] : data.plans;
  const claimed = Boolean(data.institution_status?.claimed);
  return {
    id: data.id,
    name: data.name,
    city: data.city,
    claimed,
    tier: claimed && plan ? effectiveTier({ tier: plan.tier, startsAt: new Date(plan.starts_at), endsAt: plan.ends_at ? new Date(plan.ends_at) : null }, new Date()) : null,
  };
}

/** Colleges in Drishti by name or website, for linking a lead: those signed up first. */
export async function findInstitutions(q: string): Promise<LeadInstitution[]> {
  const pattern = q.replace(/[%_,().]/g, ' ').trim();
  if (pattern.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, city, institution_status(claimed), plans(tier, starts_at, ends_at)')
    .or(`name.ilike.%${pattern}%,website.ilike.%${pattern}%`)
    .order('name')
    .limit(8);
  if (error) throw new Error(`Could not find colleges: ${error.message}`);
  return (data ?? [])
    .map((row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      const claimed = Boolean(row.institution_status?.claimed);
      return {
        id: row.id,
        name: row.name,
        city: row.city,
        claimed,
        tier: claimed && plan ? effectiveTier({ tier: plan.tier, startsAt: new Date(plan.starts_at), endsAt: plan.ends_at ? new Date(plan.ends_at) : null }, new Date()) : null,
      };
    })
    .sort((a, b) => Number(b.claimed) - Number(a.claimed));
}

/** Each lead's notes, newest first (the CSV). */
export async function loadLeadNotes(ids: readonly string[]): Promise<Map<string, string[]>> {
  const notes = new Map<string, string[]>();
  if (!ids.length) return notes;
  const supabase = await createClient();
  const { data, error } = await supabase.from('team_lead_activity').select('lead_id, body').in('lead_id', [...ids]).eq('kind', 'note').order('at', { ascending: false });
  if (error) throw new Error(`Could not load notes: ${error.message}`);
  for (const row of data ?? []) if (row.body) notes.set(row.lead_id, [...(notes.get(row.lead_id) ?? []), row.body]);
  return notes;
}

// Tracking links -----------------------------------------------------------------------------------

export interface TeamLink {
  id: string;
  code: string;
  name: string;
  source: TeamLeadSource;
  createdAt: string;
  archivedAt: string | null;
  thisMonth: number;
  total: number;
}

/** The team's own tracking links, newest first, with how many enquiries each brought (Admins and Team members). */
export async function loadTeamLinks(): Promise<TeamLink[]> {
  const supabase = await createClient();
  const [links, counts] = await Promise.all([
    supabase.from('team_lead_links').select('id, code, name, source, created_at, archived_at').order('created_at', { ascending: false }),
    supabase.rpc('team_lead_link_counts'),
  ]);
  if (links.error) throw new Error(`Could not load tracking links: ${links.error.message}`);
  if (counts.error) throw new Error(`Could not count tracking links: ${counts.error.message}`);
  const byLink = new Map((counts.data ?? []).map((row) => [row.link_id, row]));
  return (links.data ?? []).map((link) => ({
    id: link.id,
    code: link.code,
    name: link.name,
    source: link.source,
    createdAt: link.created_at,
    archivedAt: link.archived_at,
    thisMonth: byLink.get(link.id)?.this_month ?? 0,
    total: byLink.get(link.id)?.total ?? 0,
  }));
}

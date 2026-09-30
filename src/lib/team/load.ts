// Loads what the team screens need, as the signed-in team user. Row level security lets the team
// read everything; institution users get nothing from any of these (the list is a team-only view,
// notes and links are team only).

import { cache } from 'react';
import { latestStoredAudit, ownHistory } from '@/audit/read';
import type { StoredAudit } from '@/audit/view';
import { TEAM_RULES } from '@/config/team';
import { checkName } from '@/domain/checks';
import { INSTITUTION_TYPES, type CheckKey, type InstitutionType, type MembershipRole, type TeamRole, type Tier } from '@/domain/types';
import { createClient } from '@/lib/supabase/server';
import { pageRange, scoreRange, searchPattern, type TeamFilters, type TeamStatus } from '@/team/filters';

export interface TeamListRow {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  status: TeamStatus;
  tier: Tier | null;
  planEndsAt: string | null;
  programs: number;
  score: number | null;
  auditKind: string | null;
  checkedAt: string | null;
}

/** The end of the window for Paid plans ending soon. */
const endingSoonBy = (now: Date) => new Date(now.getTime() + TEAM_RULES.paidEndingSoonDays * 86_400_000).toISOString();

const LIST_COLUMNS = 'id, name, type, city, state, website, status, tier, plan_ends_at, programs, score, audit_kind, checked_at';

export async function loadInstitutionList(filters: TeamFilters, now: Date): Promise<{ rows: TeamListRow[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from('team_institutions').select(LIST_COLUMNS, { count: 'exact' });
  const pattern = searchPattern(filters.q);
  if (pattern) query = query.or(`name.ilike.${pattern},website.ilike.${pattern}`);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.state) query = query.eq('state', filters.state);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.tier === 'paid_ending') query = query.eq('tier', 'paid').gt('plan_ends_at', now.toISOString()).lte('plan_ends_at', endingSoonBy(now));
  else if (filters.tier) query = query.eq('tier', filters.tier);
  if (filters.score === 'none') query = query.is('score', null);
  else if (filters.score) {
    const { min, max } = scoreRange(filters.score);
    query = query.gte('score', min).lte('score', max);
  }
  if (filters.sort === 'score') query = query.order('score', { ascending: false, nullsFirst: false });
  if (filters.sort === 'checked') query = query.order('checked_at', { ascending: false, nullsFirst: false });
  query = query.order('name').order('id');
  const { from, to } = pageRange(filters.page);
  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(`Could not load institutions: ${error.message}`);
  return {
    total: count ?? 0,
    rows: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as InstitutionType,
      city: row.city as string,
      state: row.state as string,
      website: row.website as string,
      status: row.status as TeamStatus,
      tier: row.tier as Tier | null,
      planEndsAt: row.plan_ends_at,
      programs: row.programs ?? 0,
      score: row.score,
      auditKind: row.audit_kind,
      checkedAt: row.checked_at,
    })),
  };
}

export interface ListCounts {
  signedUp: number;
  clients: number;
  prospects: number;
  endingSoon: number;
}

export async function loadListCounts(now: Date): Promise<ListCounts> {
  const supabase = await createClient();
  const head = () => supabase.from('team_institutions').select('id', { count: 'exact', head: true });
  const [signedUp, clients, prospects, endingSoon] = await Promise.all([
    head().eq('status', 'signed_up'),
    head().eq('tier', 'client'),
    head().eq('status', 'prospect'),
    head().eq('tier', 'paid').gt('plan_ends_at', now.toISOString()).lte('plan_ends_at', endingSoonBy(now)),
  ]);
  for (const result of [signedUp, clients, prospects, endingSoon]) if (result.error) throw new Error(`Could not count institutions: ${result.error.message}`);
  return { signedUp: signedUp.count ?? 0, clients: clients.count ?? 0, prospects: prospects.count ?? 0, endingSoon: endingSoon.count ?? 0 };
}

/** The cities and states that have institutions, for the filters. */
export const loadPlaces = cache(async (): Promise<{ cities: string[]; states: string[] }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('institutions').select('city, state');
  if (error) throw new Error(`Could not load places: ${error.message}`);
  const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return { cities: sorted((data ?? []).map((row) => row.city)), states: sorted((data ?? []).map((row) => row.state)) };
});

// One institution ------------------------------------------------------------------------------

export interface TeamPerson {
  userId: string | null;
  email: string;
  role: TeamRole;
  since: string;
  pending: boolean;
}

export const loadTeamPeople = cache(async (): Promise<TeamPerson[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('team_people');
  if (error) throw new Error(`Could not load the team: ${error.message}`);
  return (data ?? []).map((row) => ({ userId: row.user_id, email: row.email, role: row.role, since: row.since, pending: row.pending }));
});

export interface NoteRow {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  author: string;
}

export interface LinkRow {
  token: string;
  auditId: string;
  createdAt: string;
  expiresAt: string;
  stoppedAt: string | null;
  createdBy: string;
}

export interface TeamInstitution {
  id: string;
  slug: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string | null;
  createdAt: string;
  claimed: boolean;
  claimedAt: string | null;
  isProspect: boolean;
  plan: { tier: Tier; startsAt: string; endsAt: string | null; setBy: string | null } | null;
  /** Their own latest Audit once signed up; otherwise the latest team Audit (or rival Audit). */
  audit: StoredAudit | null;
  history: Array<{ id: string; runAt: string; overall: number }>;
  /** Once signed up: the private team Audits, newest first. They never see these. */
  teamAudits: Array<{ id: string; runAt: string; overall: number; discovered: number; trusted: number; chosen: number; topFix: string | null }>;
  programNames: Map<string, string>;
  programs: Array<{ id: string; name: string; archived: boolean }>;
  people: Array<{ email: string; role: MembershipRole; joinedAt: string }>;
  invites: string[];
  notes: NoteRow[];
  links: LinkRow[];
  trackedBy: number;
}

export async function loadTeamInstitution(id: string): Promise<TeamInstitution | null> {
  const supabase = await createClient();
  const { data: institution, error } = await supabase
    .from('institutions')
    .select('id, slug, name, type, city, state, website, instagram, created_at, institution_status(claimed, claimed_at, is_prospect), plans(tier, starts_at, ends_at, set_by), programs(id, name, archived_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the institution: ${error.message}`);
  if (!institution) return null;
  const claimed = Boolean(institution.institution_status?.claimed);

  const [audit, teamAudit, rivalAudit, history, teamAudits, people, invites, notes, links, tracked, team] = await Promise.all([
    claimed ? latestStoredAudit(supabase, id) : Promise.resolve(null),
    claimed ? Promise.resolve(null) : latestStoredAudit(supabase, id, undefined, ['team']),
    claimed ? Promise.resolve(null) : latestStoredAudit(supabase, id, undefined, ['rival']),
    claimed ? ownHistory(supabase, id) : Promise.resolve([]),
    claimed
      ? supabase
          .from('audits')
          .select('id, run_at, overall, discovered, trusted, chosen, audit_checks(check_key, fix_rank)')
          .eq('institution_id', id)
          .eq('kind', 'team')
          .eq('audit_checks.fix_rank', 1)
          .order('run_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [], error: null }),
    claimed ? supabase.rpc('institution_people', { p_institution: id }) : Promise.resolve({ data: [], error: null }),
    supabase.from('invites').select('email').eq('institution_id', id).is('accepted_at', null).order('created_at'),
    supabase.from('notes').select('id, body, created_at, author_id').eq('institution_id', id).order('created_at', { ascending: false }),
    supabase.from('share_links').select('token, audit_id, created_at, expires_at, stopped_at, created_by').eq('institution_id', id).order('created_at', { ascending: false }),
    supabase.from('rivals').select('institution_id', { count: 'exact', head: true }).eq('rival_institution_id', id),
    loadTeamPeople(),
  ]);
  for (const result of [teamAudits, invites, notes, links, tracked]) if (result.error) throw new Error(`Could not load the institution: ${result.error.message}`);
  if (people.error) throw new Error(`Could not load people: ${people.error.message}`);

  const emails = new Map(team.flatMap((person) => (person.userId ? [[person.userId, person.email] as const] : [])));
  const programs = (institution.programs ?? []).map((program) => ({ id: program.id, name: program.name, archived: program.archived_at !== null })).sort((a, b) => a.name.localeCompare(b.name));
  const plan = institution.plans;
  return {
    id: institution.id,
    slug: institution.slug,
    name: institution.name,
    type: institution.type,
    city: institution.city,
    state: institution.state,
    website: institution.website,
    instagram: institution.instagram,
    createdAt: institution.created_at,
    claimed,
    claimedAt: institution.institution_status?.claimed_at ?? null,
    isProspect: Boolean(institution.institution_status?.is_prospect),
    plan: plan ? { tier: plan.tier, startsAt: plan.starts_at, endsAt: plan.ends_at, setBy: plan.set_by ? (emails.get(plan.set_by) ?? null) : null } : null,
    audit: audit ?? teamAudit ?? rivalAudit,
    history: history.map((row) => ({ id: row.id, runAt: row.runAt, overall: row.scores.overall })),
    teamAudits: (teamAudits.data ?? []).map((row) => {
      const top = row.audit_checks[0]?.check_key;
      return {
        id: row.id,
        runAt: row.run_at,
        overall: row.overall,
        discovered: row.discovered,
        trusted: row.trusted,
        chosen: row.chosen,
        topFix: top ? checkName(top as CheckKey, institution.type) : null,
      };
    }),
    programNames: new Map(programs.map((program) => [program.id, program.name])),
    programs,
    people: (people.data ?? []).map((row) => ({ email: row.email, role: row.role, joinedAt: row.joined_at })),
    invites: (invites.data ?? []).map((row) => row.email),
    notes: (notes.data ?? []).map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      author: row.author_id ? (emails.get(row.author_id) ?? 'A former team member') : 'A former team member',
    })),
    links: (links.data ?? []).map((row) => ({
      token: row.token,
      auditId: row.audit_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      stoppedAt: row.stopped_at,
      createdBy: row.created_by ? (emails.get(row.created_by) ?? 'A former team member') : 'A former team member',
    })),
    trackedBy: tracked.count ?? 0,
  };
}

// Bulk runs --------------------------------------------------------------------------------------

export interface BulkRunSummary {
  id: string;
  createdAt: string;
  createdBy: string;
  total: number;
  audited: number;
  failed: number;
}

export async function loadBulkRuns(): Promise<BulkRunSummary[]> {
  const supabase = await createClient();
  const [runs, team] = await Promise.all([
    supabase.from('bulk_runs').select('id, created_at, created_by, total, bulk_run_rows(outcome)').order('created_at', { ascending: false }).limit(10),
    loadTeamPeople(),
  ]);
  if (runs.error) throw new Error(`Could not load bulk runs: ${runs.error.message}`);
  const emails = new Map(team.flatMap((person) => (person.userId ? [[person.userId, person.email] as const] : [])));
  return (runs.data ?? []).map((run) => ({
    id: run.id,
    createdAt: run.created_at,
    createdBy: run.created_by ? (emails.get(run.created_by) ?? 'A former team member') : 'A former team member',
    total: run.total,
    audited: run.bulk_run_rows.filter((row) => row.outcome === 'audited').length,
    failed: run.bulk_run_rows.filter((row) => row.outcome === 'failed').length,
  }));
}

export interface BulkRunRow {
  position: number;
  name: string;
  place: string;
  outcome: 'waiting' | 'audited' | 'failed';
  message: string | null;
  reused: boolean;
  institutionId: string | null;
  overall: number | null;
  pillars: { discovered: number; trusted: number; chosen: number } | null;
  /** The name of the top fix, in the words for the institution's type. */
  topFix: string | null;
}

export async function loadBulkRun(id: string): Promise<{ run: BulkRunSummary; rows: BulkRunRow[] } | null> {
  const supabase = await createClient();
  const runs = await loadBulkRuns();
  const { data: run, error } = await supabase.from('bulk_runs').select('id, created_at, created_by, total').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load the run: ${error.message}`);
  if (!run) return null;
  const { data: rows, error: rowError } = await supabase
    .from('bulk_run_rows')
    .select('position, details, outcome, message, reused, institution_id, audit_id, audits(overall, discovered, trusted, chosen, audit_checks(check_key, fix_rank))')
    .eq('run_id', id)
    .order('position');
  if (rowError) throw new Error(`Could not load the run: ${rowError.message}`);
  const summary = runs.find((entry) => entry.id === id) ?? {
    id: run.id,
    createdAt: run.created_at,
    createdBy: 'A team member',
    total: run.total,
    audited: (rows ?? []).filter((row) => row.outcome === 'audited').length,
    failed: (rows ?? []).filter((row) => row.outcome === 'failed').length,
  };
  return {
    run: summary,
    rows: (rows ?? []).map((row) => {
      const details = row.details as { name?: string; city?: string; state?: string; type?: string };
      const type = INSTITUTION_TYPES.find((value) => value === details.type) ?? 'college';
      const topKey = row.audits?.audit_checks.find((check) => check.fix_rank === 1)?.check_key;
      const audit = row.audits;
      return {
        position: row.position,
        name: details.name ?? `Row ${row.position}`,
        place: [details.city, details.state].filter(Boolean).join(', '),
        outcome: row.outcome as BulkRunRow['outcome'],
        message: row.message,
        reused: row.reused,
        institutionId: row.institution_id,
        overall: audit?.overall ?? null,
        pillars: audit ? { discovered: audit.discovered, trusted: audit.trusted, chosen: audit.chosen } : null,
        topFix: topKey ? checkName(topKey as CheckKey, type) : null,
      };
    }),
  };
}

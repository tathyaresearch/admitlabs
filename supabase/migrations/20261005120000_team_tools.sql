-- Phase 6: the team tools (spec sections 5, 13 and 19), enforced in the database.
--
--   Share links   A private link to a prospect's team Audit. It works until it expires (the app
--                 sets 90 days from config) or the team stops it. Only a team Audit of an
--                 institution that has not signed up can be shared. Anyone with the link reads it
--                 through shared_audit(), which returns that one Audit and nothing else, with
--                 "how to fix" for the top 3 fixes only.
--   Notes         Team only. The author, or an Admin, removes a note.
--   Prospects     add_prospect() adds an institution for a team Audit, or reuses the record that
--                 already has its website. Never one that has signed up.
--   Bulk runs     Each bulk Audit, row by row, so its results can be opened again.
--   Plans         Admin only, through set_plan() and end_plan(): Paid is always 6 months.
--   Team users    Admin only: add by email (joins at sign in), change role, remove. There is
--                 always at least one Admin.
--   Team list     One row per institution for the team, with its latest score.

-- Share links -------------------------------------------------------------------------------

alter table public.share_links
  add column expires_at timestamptz,
  add column stopped_at timestamptz,
  add column stopped_by uuid references auth.users (id) on delete set null;
update public.share_links set expires_at = created_at + interval '90 days' where expires_at is null;
alter table public.share_links
  alter column expires_at set not null,
  add constraint share_links_expiry check (expires_at > created_at),
  add constraint share_links_stopped check (stopped_by is null or stopped_at is not null);

-- The team reads links and stops them. New links only come through create_share_link().
drop policy share_links_team_only on public.share_links;
create policy share_links_team_read on public.share_links
  for select to authenticated using ((select private.is_team()));
create policy share_links_team_stop on public.share_links
  for update to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- How many fixes a shared Audit explains in full. Mirrors TEAM_RULES.sharedFixesInFull in
-- src/config/team.ts; a test on each side checks they agree.
create function private.shared_fix_limit() returns integer
language sql immutable
set search_path = ''
as $$
  select 3;
$$;

-- A new link to a team Audit of an institution that has not signed up. Team only.
create function public.create_share_link(p_audit uuid, p_days integer) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  target record;
  v_token text;
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'share_days' using errcode = 'P0001';
  end if;
  select a.id, a.institution_id, a.kind, coalesce(s.claimed, false) as claimed into target
  from public.audits a
  left join public.institution_status s on s.institution_id = a.institution_id
  where a.id = p_audit;
  if not found then
    raise exception 'no_audit' using errcode = 'P0001';
  end if;
  if target.kind <> 'team' then
    raise exception 'not_team_audit' using errcode = 'P0001';
  end if;
  if target.claimed then
    raise exception 'signed_up' using errcode = 'P0001';
  end if;
  insert into public.share_links (institution_id, audit_id, created_by, expires_at)
  values (target.institution_id, target.id, (select auth.uid()), now() + make_interval(days => p_days))
  returning token into v_token;
  return v_token;
end;
$$;

-- What a share link shows, for anyone who has it (no sign in). Unknown links return nothing;
-- expired or stopped links return only that they have expired. A live link returns the one
-- team Audit: every check with its result, what was found, the source and the date, and how to
-- fix it for the top 3 fixes only. Never notes, rivals, Demand or who tracks the institution.
create function public.shared_audit(p_token text) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  link record;
begin
  select l.token, l.audit_id, l.institution_id, l.created_at, l.expires_at, l.stopped_at, a.kind, a.run_at
  into link
  from public.share_links l
  join public.audits a on a.id = l.audit_id and a.institution_id = l.institution_id
  where l.token = p_token;
  if not found or link.kind <> 'team' then
    return null;
  end if;
  if link.stopped_at is not null or link.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'live',
    'sharedAt', link.created_at,
    'expiresAt', link.expires_at,
    'institution', (
      select jsonb_build_object('name', i.name, 'type', i.type, 'city', i.city, 'state', i.state, 'website', i.website)
      from public.institutions i where i.id = link.institution_id
    ),
    'audit', (
      select jsonb_build_object(
        'id', a.id, 'runAt', a.run_at, 'programCount', a.program_count,
        'overall', a.overall, 'discovered', a.discovered, 'trusted', a.trusted, 'chosen', a.chosen
      )
      from public.audits a where a.id = link.audit_id
    ),
    'programs', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', ps.program_id, 'name', p.name, 'overall', ps.overall, 'discovered', ps.discovered, 'trusted', ps.trusted, 'chosen', ps.chosen)
        order by p.name
      )
      from public.audit_program_scores ps
      join public.programs p on p.id = ps.program_id
      where ps.audit_id = link.audit_id
    ), '[]'::jsonb),
    'checks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'programId', c.program_id, 'pillar', c.pillar, 'key', c.check_key, 'result', c.result,
          'pointsAwarded', c.points_awarded, 'pointsMax', c.points_max,
          'strengthRank', c.strength_rank, 'fixRank', c.fix_rank, 'checkedAt', c.checked_at,
          'finding', d.finding, 'sourceUrl', d.source_url,
          'howToFix', case when c.fix_rank <= private.shared_fix_limit() then d.how_to_fix end,
          'difficulty', case when c.fix_rank <= private.shared_fix_limit() then d.difficulty end
        )
        order by c.check_key, c.program_id
      )
      from public.audit_checks c
      left join public.audit_check_details d on d.audit_check_id = c.id
      where c.audit_id = link.audit_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Notes -------------------------------------------------------------------------------------

-- A note is always written in the name of whoever adds it.
alter table public.notes alter column author_id set default auth.uid();

drop policy notes_team_only on public.notes;
create policy notes_team_read on public.notes
  for select to authenticated using ((select private.is_team()));
create policy notes_team_add on public.notes
  for insert to authenticated with check ((select private.is_team()) and author_id = (select auth.uid()));
create policy notes_author_remove on public.notes
  for delete to authenticated using ((select private.is_team()) and (author_id = (select auth.uid()) or (select private.is_admin())));

-- Prospects ---------------------------------------------------------------------------------

-- An institution to audit as a prospect: the record that already has this website (a rival
-- record or an earlier prospect), or a new one. Its programs are added. Never an institution
-- that has signed up. Team only. Returns the institution (prospect_id) and whether it was already there.
create function public.add_prospect(p_details jsonb)
returns table (prospect_id uuid, reused boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_details ->> 'name', ''));
  v_website text := btrim(coalesce(p_details ->> 'website', ''));
  found_id uuid;
  was_there boolean := false;
  program jsonb;
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if v_name = '' or v_website = '' or jsonb_typeof(p_details -> 'programs') <> 'array' or jsonb_array_length(p_details -> 'programs') = 0 then
    raise exception 'prospect_details' using errcode = 'P0001';
  end if;

  select i.id into found_id from public.institutions i where private.website_host(i.website) = private.website_host(v_website) for update;
  if found_id is not null then
    if exists (select 1 from public.institution_status s where s.institution_id = found_id and s.claimed) then
      raise exception 'signed_up' using errcode = 'P0001';
    end if;
    was_there := true;
    insert into public.institution_status (institution_id, claimed, is_prospect, created_by)
    values (found_id, false, true, (select auth.uid()))
    on conflict on constraint institution_status_pkey do update set is_prospect = true;
  else
    insert into public.institutions (slug, name, type, city, state, website, instagram)
    values (
      private.unique_slug(v_name), v_name, (p_details ->> 'type')::public.institution_type, p_details ->> 'city', p_details ->> 'state',
      v_website, nullif(btrim(coalesce(p_details ->> 'instagram', '')), '')
    )
    returning id into found_id;
    insert into public.institution_status (institution_id, claimed, is_prospect, created_by)
    values (found_id, false, true, (select auth.uid()));
  end if;

  for program in select value from jsonb_array_elements(p_details -> 'programs') loop
    insert into public.programs (institution_id, name, program_key)
    values (found_id, btrim(program ->> 'name'), nullif(program ->> 'programKey', ''))
    on conflict (institution_id, name) do update set archived_at = null;
  end loop;

  prospect_id := found_id;
  reused := was_there;
  return next;
exception
  when foreign_key_violation or invalid_text_representation then
    raise exception 'prospect_details' using errcode = 'P0001';
end;
$$;

-- Bulk runs ---------------------------------------------------------------------------------

create table public.bulk_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  source text not null check (source in ('paste', 'csv')),
  total smallint not null check (total > 0)
);
create index bulk_runs_created_idx on public.bulk_runs (created_at desc);

-- One row per institution the run audits: the checked details, then what happened.
create table public.bulk_run_rows (
  run_id uuid not null references public.bulk_runs (id) on delete cascade,
  position smallint not null check (position > 0),
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  outcome text not null default 'waiting' check (outcome in ('waiting', 'audited', 'failed')),
  institution_id uuid references public.institutions (id) on delete set null,
  audit_id uuid references public.audits (id) on delete set null,
  reused boolean not null default false,
  message text,
  primary key (run_id, position)
);

grant select, insert, update, delete on public.bulk_runs, public.bulk_run_rows to authenticated;
grant all on public.bulk_runs, public.bulk_run_rows to service_role;

alter table public.bulk_runs enable row level security;
alter table public.bulk_run_rows enable row level security;
create policy bulk_runs_team_only on public.bulk_runs
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy bulk_run_rows_team_only on public.bulk_run_rows
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Plans -------------------------------------------------------------------------------------

-- Admin starts Paid or Client for an institution that has signed up. Paid runs 6 months from
-- its start, counted on the India calendar (31 August plus 6 months is 28 February), as
-- paidPlanEndsAt() does. Client runs until an Admin ends it. Never a start in the future.
create function public.set_plan(p_institution uuid, p_tier public.tier, p_starts_at timestamptz) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_start timestamptz := coalesce(p_starts_at, now());
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_tier not in ('paid', 'client') then
    raise exception 'plan_tier' using errcode = 'P0001';
  end if;
  if v_start > now() + interval '1 minute' then
    raise exception 'plan_future' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.institution_status s where s.institution_id = p_institution and s.claimed) then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
  if p_tier = 'paid' and ((v_start at time zone 'Asia/Kolkata') + interval '6 months') at time zone 'Asia/Kolkata' <= now() then
    raise exception 'plan_over' using errcode = 'P0001';
  end if;
  update public.plans
  set tier = p_tier,
      starts_at = v_start,
      ends_at = case when p_tier = 'paid' then ((v_start at time zone 'Asia/Kolkata') + interval '6 months') at time zone 'Asia/Kolkata' end,
      set_by = (select auth.uid())
  where institution_id = p_institution;
  if not found then
    raise exception 'no_plan' using errcode = 'P0001';
  end if;
end;
$$;

-- Admin ends an active Paid or Client plan now. The institution moves to Free, keeps its last
-- Audit score and its past reports.
create function public.end_plan(p_institution uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.plans
  -- A plan started a moment ago still ends after its start (the table requires it).
  set ends_at = greatest(now(), starts_at + interval '1 millisecond'), set_by = (select auth.uid())
  where institution_id = p_institution
    and tier in ('paid', 'client')
    and starts_at <= now()
    and (ends_at is null or ends_at > now());
  if not found then
    raise exception 'no_active_plan' using errcode = 'P0001';
  end if;
end;
$$;

-- Team users --------------------------------------------------------------------------------

-- Someone added by email before they have signed in. They join the team at sign in.
create table public.team_invites (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.team_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.team_invites to authenticated;
grant all on public.team_invites to service_role;
alter table public.team_invites enable row level security;
create policy team_invites_team_read on public.team_invites
  for select to authenticated using ((select private.is_team()));

-- The team, with emails, then the people added who have not signed in yet. Team only.
create function public.team_people()
returns table (user_id uuid, email text, role public.team_role, since timestamptz, pending boolean)
language sql stable security definer
set search_path = ''
as $$
  select * from (
    select t.user_id, u.email::text, t.role, t.created_at, false
    from public.team_users t
    join auth.users u on u.id = t.user_id
    union all
    select null::uuid, i.email, i.role, i.created_at, true
    from public.team_invites i
  ) people
  where private.is_team()
  order by 5, 3 desc, 2;
$$;

-- Admin adds someone to the team by email. Someone who has signed in before joins at once;
-- anyone else joins when they first sign in. Never someone who uses Drishti for an institution.
create function public.add_team_user(p_email text, p_role public.team_role) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  existing uuid;
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'team_email' using errcode = 'P0001';
  end if;
  select u.id into existing from auth.users u where lower(u.email) = v_email;
  if existing is not null then
    if exists (select 1 from public.memberships where user_id = existing) then
      raise exception 'institution_user' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_users where user_id = existing) then
      raise exception 'already_team' using errcode = 'P0001';
    end if;
    insert into public.team_users (user_id, role) values (existing, p_role);
    delete from public.team_invites where email = v_email;
    return 'added';
  end if;
  insert into public.team_invites (email, role, invited_by) values (v_email, p_role, (select auth.uid()))
  on conflict (email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
  return 'invited';
end;
$$;

-- Admin changes someone's team role. The last Admin stays an Admin.
create function public.set_team_role(p_user uuid, p_role public.team_role) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform 1 from public.team_users where role = 'admin' for update;
  if p_role <> 'admin'
    and exists (select 1 from public.team_users where user_id = p_user and role = 'admin')
    and (select count(*) from public.team_users where role = 'admin') = 1 then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  update public.team_users set role = p_role where user_id = p_user;
  if not found then
    raise exception 'not_team_user' using errcode = 'P0001';
  end if;
end;
$$;

-- Admin removes someone from the team. The last Admin stays.
create function public.remove_team_user(p_user uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform 1 from public.team_users where role = 'admin' for update;
  if exists (select 1 from public.team_users where user_id = p_user and role = 'admin')
    and (select count(*) from public.team_users where role = 'admin') = 1 then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  delete from public.team_users where user_id = p_user;
  if not found then
    raise exception 'not_team_user' using errcode = 'P0001';
  end if;
end;
$$;

create function public.remove_team_invite(p_email text) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  delete from public.team_invites where email = lower(btrim(coalesce(p_email, '')));
end;
$$;

-- At sign in: someone added to the team by email joins with that role. Returns the role, or
-- nothing when there is no invite (or they already use Drishti for an institution).
create function public.accept_team_invite() returns public.team_role
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  invite record;
begin
  if me is null or exists (select 1 from public.memberships where user_id = me) then
    return null;
  end if;
  if exists (select 1 from public.team_users where user_id = me) then
    return (select role from public.team_users where user_id = me);
  end if;
  select i.email, i.role into invite
  from public.team_invites i
  join auth.users u on lower(u.email) = i.email
  where u.id = me
  for update of i;
  if not found then
    return null;
  end if;
  insert into public.team_users (user_id, role) values (me, invite.role);
  delete from public.team_invites where email = invite.email;
  return invite.role;
end;
$$;

-- Team list ---------------------------------------------------------------------------------

-- Every institution, for the team's list and filters: its status, plan and latest score (its
-- own Audit once signed up; otherwise the newest team or rival Audit). Empty for anyone else.
create view public.team_institutions
with (security_invoker = true)
as
select
  i.id,
  i.slug,
  i.name,
  i.type,
  i.city,
  i.state,
  i.website,
  i.created_at,
  coalesce(s.claimed, false) as claimed,
  coalesce(s.is_prospect, false) as is_prospect,
  case when coalesce(s.claimed, false) then 'signed_up' when coalesce(s.is_prospect, false) then 'prospect' else 'rival_record' end as status,
  case when coalesce(s.claimed, false) then private.effective_tier(i.id) end as tier,
  p.tier as plan_tier,
  p.starts_at as plan_starts_at,
  p.ends_at as plan_ends_at,
  (select count(*) from public.programs pr where pr.institution_id = i.id and pr.archived_at is null)::integer as programs,
  latest.id as audit_id,
  latest.kind as audit_kind,
  latest.overall as score,
  latest.run_at as checked_at
from public.institutions i
left join public.institution_status s on s.institution_id = i.id
left join public.plans p on p.institution_id = i.id
left join lateral (
  select a.id, a.kind, a.overall, a.run_at
  from public.audits a
  where a.institution_id = i.id
    and case when coalesce(s.claimed, false) then a.kind in ('free', 'paid', 'client') else a.kind in ('team', 'rival') end
  order by a.run_at desc
  limit 1
) latest on true
where (select private.is_team());

revoke all on public.team_institutions from anon;
grant select on public.team_institutions to authenticated, service_role;

-- Grants ------------------------------------------------------------------------------------

revoke all on function private.shared_fix_limit() from public;

revoke all on function
  public.create_share_link(uuid, integer),
  public.shared_audit(text),
  public.add_prospect(jsonb),
  public.set_plan(uuid, public.tier, timestamptz),
  public.end_plan(uuid),
  public.team_people(),
  public.add_team_user(text, public.team_role),
  public.set_team_role(uuid, public.team_role),
  public.remove_team_user(uuid),
  public.remove_team_invite(text),
  public.accept_team_invite()
from public, anon;
grant execute on function
  public.create_share_link(uuid, integer),
  public.add_prospect(jsonb),
  public.set_plan(uuid, public.tier, timestamptz),
  public.end_plan(uuid),
  public.team_people(),
  public.add_team_user(text, public.team_role),
  public.set_team_role(uuid, public.team_role),
  public.remove_team_user(uuid),
  public.remove_team_invite(text),
  public.accept_team_invite()
to authenticated;
-- The shared Audit page has no sign in.
grant execute on function public.shared_audit(text) to anon, authenticated;

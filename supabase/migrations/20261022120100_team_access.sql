-- The team area's access levels (spec section 27), enforced here, not only in the menu.
--
--   Admin           everything, including the Team page: adds and removes people, sets levels.
--   Team member     everything except the Team page.
--   Client manager  only the Clients assigned to them: each Client's page, its Client Brain and
--                   the dashboard read only ("view as"), and what the team does for that Client.
--                   Their own Enquiries come with the Enquiries migration.
--
-- How: private.is_team() now means Admin or Team member, so every rule written for the team shuts
-- a Client manager out by default. They come back in only through private.manages() (a Client
-- assigned to them) and private.manages_rival() (a rival one of those Clients tracks): new read
-- rules beside the team's own, and the team's functions for a Client taking private.can_manage().

-- Who is who --------------------------------------------------------------------------------------

create or replace function private.is_team() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_users where user_id = (select auth.uid()) and role in ('team', 'admin')
  );
$$;

create function private.is_client_manager() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_users where user_id = (select auth.uid()) and role = 'client_manager'
  );
$$;

-- Which Clients a Client manager looks after. Admins and Team members assign them; one Client may
-- have more than one. A person who stops being a Client manager loses their Clients.
create table public.client_managers (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references public.team_users (user_id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);
create index client_managers_user_idx on public.client_managers (user_id);

alter table public.client_managers enable row level security;
grant select on public.client_managers to authenticated;
grant select, insert, delete on public.client_managers to service_role;
revoke all on public.client_managers from anon;
create policy client_managers_read on public.client_managers
  for select to authenticated using ((select private.is_team()) or user_id = (select auth.uid()));

create function private.manages(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_managers c
    join public.team_users t on t.user_id = c.user_id and t.role = 'client_manager'
    where c.user_id = (select auth.uid()) and c.institution_id = target
  );
$$;

-- A rival one of their Clients tracks: its record, Audits and moves, as the team sees them.
create function private.manages_rival(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rivals r
    join public.client_managers c on c.institution_id = r.institution_id
    join public.team_users t on t.user_id = c.user_id and t.role = 'client_manager'
    where c.user_id = (select auth.uid()) and r.rival_institution_id = target
  );
$$;

create function private.manages_any(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.manages(target) or private.manages_rival(target);
$$;

-- The team's own work for one institution: the full team for any, a Client manager for theirs.
create function private.can_manage(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_team() or private.manages(target);
$$;

create function private.manages_audit(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.audits a where a.id = target and private.manages_any(a.institution_id));
$$;

create function private.manages_check(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.audit_checks c join public.audits a on a.id = c.audit_id
    where c.id = target and private.manages_any(a.institution_id)
  );
$$;

grant execute on function
  private.manages_check(uuid),
  private.is_client_manager(),
  private.manages(uuid),
  private.manages_rival(uuid),
  private.manages_any(uuid),
  private.can_manage(uuid),
  private.manages_audit(uuid)
to authenticated, service_role;

-- Assigning ----------------------------------------------------------------------------------------

create function public.assign_client_manager(p_institution uuid, p_user uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if not exists (select 1 from public.team_users t where t.user_id = p_user and t.role = 'client_manager') then
    raise exception 'not_client_manager' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.institution_status s where s.institution_id = p_institution and s.claimed)
     or private.effective_tier(p_institution) <> 'client' then
    raise exception 'not_client' using errcode = 'P0001';
  end if;
  insert into public.client_managers (institution_id, user_id, assigned_by) values (p_institution, p_user, (select auth.uid()))
  on conflict (institution_id, user_id) do nothing;
end;
$$;

create function public.unassign_client_manager(p_institution uuid, p_user uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  delete from public.client_managers where institution_id = p_institution and user_id = p_user;
end;
$$;

-- How a college's new Audits and summaries go out, for the team and a Client's manager. Before,
-- the team wrote institution_status directly; a Client manager changes only this.
create function public.set_review_first(p_institution uuid, p_on boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_manage(p_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.institution_status set review_first = coalesce(p_on, false)
  where institution_id = p_institution and claimed;
  if not found then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function
  public.assign_client_manager(uuid, uuid),
  public.unassign_client_manager(uuid, uuid),
  public.set_review_first(uuid, boolean)
from public, anon;
grant execute on function
  public.assign_client_manager(uuid, uuid),
  public.unassign_client_manager(uuid, uuid),
  public.set_review_first(uuid, boolean)
to authenticated, service_role;

-- The team's functions for one Client: a Client manager too, for theirs ---------------------------

create or replace function public.audit_waiting(p_institution uuid)
returns TABLE(run_at timestamp with time zone, trigger audit_trigger, first boolean)
language sql stable security definer
set search_path = ''
as $$
  select a.run_at, a.trigger,
    not exists (
      select 1 from public.audits b
      where b.institution_id = a.institution_id and b.kind in ('free', 'paid', 'client') and b.review = 'approved' and b.run_at < a.run_at
    )
  from public.audits a
  where (private.is_member(p_institution) or private.can_manage(p_institution))
    and a.institution_id = p_institution
    and a.kind in ('free', 'paid', 'client')
    and a.review = 'waiting'
  order by a.run_at desc;
$$;

create or replace function public.demand_highlight(p_institution uuid)
returns TABLE(text text, change_pct numeric, count integer, count_source text, source_url text, found_at timestamp with time zone, program_name text, region text, month date)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  ),
  pulls as (
    select dp.program_id, dp.name, p.id as pull_id, p.region, p.month
    from me
    cross join private.demand_programs(me.id) dp
    join public.demand_pulls p on p.id = private.demand_pull_for(me.city, me.state, dp.program_key)
  )
  select d.text, d.change_pct, d.count, d.meta ->> 'countSource', d.source_url, d.found_at, pl.name, pl.region, pl.month
  from pulls pl
  join public.demand_items d on d.pull_id = pl.pull_id and d.kind = 'rising'
  order by d.change_pct desc nulls last, d.count desc nulls last, d.text
  limit 1;
$$;

create or replace function public.demand_teaser(p_institution uuid, OUT trends integer, OUT topics integer, OUT questions integer, OUT content integer, OUT ideas integer, OUT best_months integer)
returns record
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  ),
  pulls as (
    select private.demand_pull_for(me.city, me.state, dp.program_key) as pull_id
    from me cross join private.demand_programs(me.id) dp
  ),
  items as (
    select d.kind from public.demand_items d where d.pull_id in (select pull_id from pulls)
  )
  select
    (select count(*)::integer from items where kind in ('rising', 'falling')),
    (select count(*)::integer from items where kind = 'topic'),
    (select count(*)::integer from items where kind = 'question'),
    (select count(*)::integer from items where kind = 'content'),
    (select count(*)::integer from items where kind = 'idea'),
    (select count(*)::integer from items where kind = 'best_month');
$$;

create or replace function public.findings_teaser(p_institution uuid)
returns TABLE(place finding_place, found integer, to_fix integer)
language sql stable security definer
set search_path = ''
as $$
  select f.place, count(*)::integer, count(*) filter (where f.fix_title is not null)::integer
  from public.audit_findings f
  where (private.is_member(p_institution) or private.can_manage(p_institution))
    and f.audit_id = private.latest_own_audit(p_institution)
    and f.removed_at is null
  group by f.place;
$$;

create or replace function public.institution_people(p_institution uuid)
returns TABLE(user_id uuid, email text, role membership_role, joined_at timestamp with time zone, summary_email boolean, name text)
language sql stable security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at, m.summary_email, n.name
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.person_names n on n.user_id = m.user_id
  where m.institution_id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  order by m.role, m.created_at;
$$;

create or replace function public.lead_link_counts(p_institution uuid, p_now timestamp with time zone DEFAULT now())
returns TABLE(link_id uuid, code text, name text, used_on lead_source, program_id uuid, program_name text, created_at timestamp with time zone, archived_at timestamp with time zone, this_month integer, last_month_to_date integer, last_month integer, month_before integer, total integer)
language sql stable security definer
set search_path = ''
as $$
  with bounds as (
    select
      date_trunc('month', p_now at time zone 'Asia/Kolkata') as this_start,
      date_trunc('month', p_now at time zone 'Asia/Kolkata') - interval '1 month' as last_start,
      date_trunc('month', p_now at time zone 'Asia/Kolkata') - interval '2 months' as before_start,
      (p_now at time zone 'Asia/Kolkata') - interval '1 month' as last_to
  ),
  dated as (
    select d.link_id, d.created_at at time zone 'Asia/Kolkata' as local_at
    from public.leads d
    where d.institution_id = p_institution and d.created_at <= p_now
  )
  select l.id, l.code, l.name, l.used_on, l.program_id, g.name, l.created_at, l.archived_at,
    (count(d.link_id) filter (where d.local_at >= b.this_start))::integer,
    (count(d.link_id) filter (where d.local_at >= b.last_start and d.local_at < least(b.last_to, b.this_start)))::integer,
    (count(d.link_id) filter (where d.local_at >= b.last_start and d.local_at < b.this_start))::integer,
    (count(d.link_id) filter (where d.local_at >= b.before_start and d.local_at < b.last_start))::integer,
    (count(d.link_id))::integer
  from public.lead_links l
  left join public.programs g on g.id = l.program_id
  cross join bounds b
  left join dated d on d.link_id = l.id
  where l.institution_id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  group by l.id, g.name, b.this_start, b.last_start, b.before_start, b.last_to
  order by l.created_at, l.name;
$$;

create or replace function public.open_fix_asks(p_institution uuid)
returns TABLE(fix_key text, asked_at timestamp with time zone)
language sql stable security definer
set search_path = ''
as $$
  select e.fix_key, e.created_at
  from public.enquiries e
  where (private.is_member(p_institution) or private.can_manage(p_institution))
    and e.institution_id = p_institution
    and e.kind = 'fix_request'
    and e.handled_at is null
  order by e.created_at desc;
$$;

create or replace function public.rival_standings(p_institution uuid)
returns TABLE(rival_institution_id uuid, standing text)
language sql stable security definer
set search_path = ''
as $$
  with mine as (
    select a.overall from public.audits a where a.id = private.latest_own_audit(p_institution)
  ),
  theirs as (
    select r.rival_institution_id,
      (
        select a.overall from public.audits a
        where a.institution_id = r.rival_institution_id and a.kind = 'rival'
        order by a.run_at desc, a.id desc
        limit 1
      ) as overall
    from public.rivals r
    where r.institution_id = p_institution
  )
  select t.rival_institution_id,
    case
      when t.overall is null or (select m.overall from mine m) is null then 'unscored'
      when t.overall > (select m.overall from mine m) then 'ahead'
      when t.overall < (select m.overall from mine m) then 'behind'
      else 'level'
    end
  from theirs t
  where private.is_member(p_institution) or private.can_manage(p_institution);
$$;

create or replace function public.rival_suggestions(p_institution uuid)
returns TABLE(institution_id uuid, name text, type institution_type, city text, state text, website text, same_city boolean, shared_programs text[])
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state,
      (select c.near from public.cities c where c.name = i.city and c.state = i.state) as near
    from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  ),
  my_programs as (
    select p.name, coalesce(p.program_key, lower(p.name)) as match_key
    from public.programs p
    where p.institution_id = p_institution and p.archived_at is null
  ),
  candidates as (
    select c.id, c.name, c.type, c.city, c.state, c.website,
      c.city = me.city as same_city,
      exists (select 1 from public.rivals r where r.institution_id = me.id and r.rival_institution_id = c.id) as tracked,
      array(
        select mp.name from my_programs mp
        where exists (
          select 1 from public.programs cp
          where cp.institution_id = c.id and cp.archived_at is null and coalesce(cp.program_key, lower(cp.name)) = mp.match_key
        )
        order by mp.name
      ) as shared
    from public.institutions c
    cross join me
    left join public.institution_status s on s.institution_id = c.id
    where c.id <> me.id
      and c.state = me.state
      and (c.city = me.city or c.city = me.near)
      and not (coalesce(s.is_prospect, false) and not coalesce(s.claimed, false))
  ),
  offering as (
    select * from candidates c where cardinality(c.shared) > 0
  ),
  -- Your city's own, the ones you track included: under 3 brings in the nearest bigger city.
  local_count as (
    select count(*) as n from offering o where o.same_city
  )
  select o.id, o.name, o.type, o.city, o.state, o.website, o.same_city, o.shared
  from offering o
  where not o.tracked
    and (o.same_city or (select n from local_count) < 3)
  order by o.same_city desc, cardinality(o.shared) desc, o.name
  limit (select l.suggestions from private.rival_limits() l);
$$;

create or replace function public.rival_teaser(p_institution uuid, OUT moves integer, OUT posts integer, OUT ads integer)
returns record
language sql stable security definer
set search_path = ''
as $$
  with tracked as (
    select r.rival_institution_id as id from public.rivals r
    where r.institution_id = p_institution and (private.is_member(p_institution) or private.can_manage(p_institution))
  ),
  latest_month as (
    select max(c.month) as month from public.rival_content c where c.rival_institution_id in (select id from tracked)
  )
  select
    (select count(*)::integer from public.rival_moves m where m.rival_institution_id in (select id from tracked) and m.detected_at > now() - interval '30 days'),
    (select count(*)::integer from public.rival_content c where c.rival_institution_id in (select id from tracked) and c.month = (select month from latest_month)),
    (select count(*)::integer from public.rival_ads d where d.rival_institution_id in (select id from tracked));
$$;

create or replace function public.rival_review_trend(p_rival uuid)
returns TABLE(checked_at timestamp with time zone, rating numeric, review_count integer)
language sql stable security definer
set search_path = ''
as $$
  select s.fetched_at, (s.value ->> 'rating')::numeric, (s.value ->> 'reviewCount')::integer
  from public.signals s
  join public.audits a on a.institution_id = s.institution_id and a.kind = 'rival' and a.run_at = s.fetched_at
  where s.institution_id = p_rival
    and s.check_key = 'review_rating'
    and (private.tracks_in_full(p_rival) or private.is_team() or private.manages_any(p_rival))
  order by s.fetched_at desc
  limit 6;
$$;

create or replace function public.archive_lead_link(p_link uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := (select l.institution_id from public.lead_links l where l.id = p_link);
begin
  if v_institution is null or not (private.can_manage(v_institution) or private.is_member(v_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.lead_links l set archived_at = coalesce(l.archived_at, now()) where l.id = p_link;
end;
$$;

create or replace function public.create_lead_link(p_institution uuid, p_name text, p_used_on lead_source, p_program uuid DEFAULT NULL::uuid)
returns TABLE(id uuid, code text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), '');
  v_code text;
  v_id uuid;
begin
  if not (private.can_manage(p_institution) or private.is_member(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if private.effective_tier(p_institution) <> 'client' then
    raise exception 'not_client' using errcode = 'P0001';
  end if;
  if p_program is not null and not exists (select 1 from public.programs g where g.id = p_program and g.institution_id = p_institution and g.archived_at is null) then
    raise exception 'bad_program' using errcode = '22023';
  end if;
  for attempt in 1..5 loop
    v_code := substr(md5(gen_random_uuid()::text), 1, 8);
    begin
      insert into public.lead_links (institution_id, program_id, code, name, used_on, created_by)
      values (p_institution, p_program, v_code, v_name, p_used_on, (select auth.uid()))
      returning lead_links.id into v_id;
      return query select v_id, v_code;
      return;
    exception when unique_violation then
      -- Another link has this code: try another.
      null;
    end;
  end loop;
  raise exception 'no_code' using errcode = 'P0001';
end;
$$;

create or replace function public.start_brain(p_institution uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_manage(p_institution) then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if private.effective_tier(p_institution) <> 'client' then
    raise exception 'not_client' using errcode = 'P0001';
  end if;
  insert into public.brains (institution_id, started_by) values (p_institution, (select auth.uid()))
  on conflict (institution_id) do nothing;
  return found;
end;
$$;

create or replace function public.add_found_brain_items(p_institution uuid, p_items jsonb)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kind public.brain_kind;
  v_count integer := 0;
begin
  if not (private.can_manage(p_institution) and private.can_edit_brain(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'bad_items' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_kind := (v_item ->> 'kind')::public.brain_kind;
    if v_kind not in ('found', 'placement_list', 'link') then
      raise exception 'bad_kind' using errcode = '22023';
    end if;
    perform private.brain_fields_ok(v_kind, v_item -> 'fields');
    insert into public.brain_items (institution_id, kind, fields, to_confirm, source, source_url, found_at)
    values (p_institution, v_kind, v_item -> 'fields', true, 'drishti', v_item ->> 'source_url', (v_item ->> 'found_at')::timestamptz)
    on conflict do nothing;
    if found then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.close_found_item(p_item uuid, p_outcome text, p_values jsonb DEFAULT NULL::jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid;
  v_target text;
  v_fact text;
  v_program uuid;
  v_keys text[];
begin
  if p_outcome not in ('confirmed', 'corrected', 'not_right') then
    raise exception 'bad_outcome' using errcode = '22023';
  end if;
  select i.institution_id, i.fields ->> 'target' into v_institution, v_target from public.brain_items i where i.id = p_item and i.kind = 'found';
  if v_institution is null or not (private.can_manage(v_institution) and private.can_edit_brain(v_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_outcome <> 'not_right' then
    -- Only the columns of the fact Drishti suggested, and a fee or a page always has its value.
    v_fact := substring(v_target from ':(fees|page|approvals)$');
    v_keys := case v_fact
      when 'fees' then array['fees_amount', 'fees_period']
      when 'page' then array['page_url']
      when 'approvals' then array['naac_grade', 'ugc_recognised', 'aicte_approved', 'other_approvals', 'skilling_recognition']
    end;
    if v_keys is null or p_values is null or jsonb_typeof(p_values) <> 'object'
       or exists (select 1 from jsonb_object_keys(p_values) k where k <> all (v_keys))
       or (v_fact = 'fees' and (jsonb_typeof(p_values -> 'fees_amount') is distinct from 'number' or jsonb_typeof(p_values -> 'fees_period') is distinct from 'string'))
       or (v_fact = 'page' and jsonb_typeof(p_values -> 'page_url') is distinct from 'string') then
      raise exception 'bad_values' using errcode = '22023';
    end if;
    perform set_config('drishti.brain_closing', 'on', true);
    if v_fact = 'approvals' then
      insert into public.institution_details as d (institution_id, naac_grade, ugc_recognised, aicte_approved, other_approvals, skilling_recognition, updated_at, updated_by)
      values (
        v_institution,
        p_values ->> 'naac_grade',
        (p_values ->> 'ugc_recognised')::boolean,
        (p_values ->> 'aicte_approved')::boolean,
        p_values ->> 'other_approvals',
        array(select jsonb_array_elements_text(coalesce(p_values -> 'skilling_recognition', '[]'))),
        now(),
        (select auth.uid())
      )
      on conflict (institution_id) do update set
        naac_grade = case when p_values ? 'naac_grade' then excluded.naac_grade else d.naac_grade end,
        ugc_recognised = case when p_values ? 'ugc_recognised' then excluded.ugc_recognised else d.ugc_recognised end,
        aicte_approved = case when p_values ? 'aicte_approved' then excluded.aicte_approved else d.aicte_approved end,
        other_approvals = case when p_values ? 'other_approvals' then excluded.other_approvals else d.other_approvals end,
        skilling_recognition = case when p_values ? 'skilling_recognition' then excluded.skilling_recognition else d.skilling_recognition end,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;
    else
      v_program := split_part(v_target, ':', 2)::uuid;
      insert into public.program_details as d (program_id, institution_id, fees_amount, fees_period, page_url, updated_at, updated_by)
      values (v_program, v_institution, (p_values ->> 'fees_amount')::integer, p_values ->> 'fees_period', p_values ->> 'page_url', now(), (select auth.uid()))
      on conflict (program_id) do update set
        fees_amount = case when p_values ? 'fees_amount' then excluded.fees_amount else d.fees_amount end,
        fees_period = case when p_values ? 'fees_period' then excluded.fees_period else d.fees_period end,
        page_url = case when p_values ? 'page_url' then excluded.page_url else d.page_url end,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;
    end if;
    perform set_config('drishti.brain_closing', '', true);
  end if;
  perform set_config('drishti.brain_outcome', p_outcome, true);
  delete from public.brain_items where id = p_item;
  perform set_config('drishti.brain_outcome', '', true);
end;
$$;

create or replace function public.set_brain_step(p_institution uuid, p_step brain_step, p_done boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (private.can_manage(p_institution) and private.can_edit_brain(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not p_done then
    delete from public.brain_steps where institution_id = p_institution and step = p_step;
    return;
  end if;
  if (p_step = 'drive_shared' and not exists (
        select 1 from public.brain_items i where i.institution_id = p_institution and i.kind = 'link' and not i.to_confirm and i.fields ->> 'type' = 'drive'))
     or (p_step = 'approver_confirmed' and not exists (
        select 1 from public.brain_items i where i.institution_id = p_institution and i.kind = 'contact' and not i.to_confirm and i.fields ->> 'role' = 'approver'))
     or (p_step = 'plan_agreed' and not exists (
        select 1 from public.brain_items i where i.institution_id = p_institution and i.kind = 'plan' and not i.to_confirm and i.fields ->> 'status' = 'agreed')) then
    raise exception 'step_needs_fact' using errcode = 'P0001';
  end if;
  insert into public.brain_steps (institution_id, step, done_by) values (p_institution, p_step, (select auth.uid()))
  on conflict (institution_id, step) do nothing;
end;
$$;

create or replace function public.mark_brain_ready(p_institution uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (private.can_manage(p_institution) and private.can_edit_brain(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.brain_steps s where s.institution_id = p_institution) < 6 then
    raise exception 'checklist_open' using errcode = 'P0001';
  end if;
  update public.brains set status = 'ready', ready_at = now(), ready_by = (select auth.uid())
  where institution_id = p_institution and status = 'onboarding';
  if not found then
    raise exception 'not_onboarding' using errcode = 'P0001';
  end if;
  insert into public.notifications (institution_id, kind, text, link)
  values (p_institution, 'brain_ready', 'Your Brain is ready: what your AdmitLabs team knows about you, in one place.', '/brain');
end;
$$;

create or replace function private.can_read_brain(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_manage(target) or (private.is_member(target) and private.effective_tier(target) = 'client');
$$;

create or replace function private.can_edit_brain(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.effective_tier(target) = 'client'
    and (private.can_manage(target) or private.is_member(target))
    and exists (select 1 from public.brains b where b.institution_id = target);
$$;

-- Names: a Client manager sees the names of their Clients' people too.
create or replace function private.can_see_name(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select target = (select auth.uid())
    or private.is_team()
    or exists (select 1 from public.memberships m where m.user_id = target and private.manages(m.institution_id))
    or exists (select 1 from public.team_users t where t.user_id = target)
    or exists (
      select 1 from public.memberships a
      join public.memberships b on b.institution_id = a.institution_id
      where a.user_id = target and b.user_id = (select auth.uid())
    );
$$;

-- The team's names (who wrote a note, who changed the Brain): a Client manager sees the people on
-- the team, not the invitations waiting.
create or replace function public.team_people()
returns table(user_id uuid, email text, role team_role, since timestamp with time zone, pending boolean, name text)
language sql stable security definer
set search_path = ''
as $$
  select * from (
    select t.user_id, u.email::text as email, t.role, t.created_at as since, false as pending, n.name
    from public.team_users t
    join auth.users u on u.id = t.user_id
    left join public.person_names n on n.user_id = t.user_id
    union all
    select null::uuid, i.email, i.role, i.created_at, true, null::text
    from public.team_invites i
  ) people
  where private.is_team() or (private.is_client_manager() and not people.pending)
  order by 5, 3 desc, 2;
$$;

-- A person who is no longer a Client manager no longer looks after any Client.
create or replace function public.set_team_role(p_user uuid, p_role team_role)
returns void
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
  if p_role <> 'client_manager' then
    delete from public.client_managers where user_id = p_user;
  end if;
end;
$$;

-- Review: the team, or the Client's manager, for that Client's Audits and summaries ---------------

create function private.can_review(target uuid) returns boolean
language sql stable
set search_path = ''
as $$
  select private.can_manage(target) or coalesce((select auth.role()), '') = 'service_role';
$$;

create or replace function public.approve_audit(p_audit uuid, p_notice text, p_link text, p_by uuid DEFAULT NULL::uuid, p_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_server boolean := coalesce((select auth.role()), '') = 'service_role';
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_at timestamptz := case when v_server then coalesce(p_at, now()) else now() end;
  v_institution uuid;
  v_run_at timestamptz;
begin
  if not private.can_review((select a.institution_id from public.audits a where a.id = p_audit)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.audits a
  set review = 'approved', approved_at = v_at, approved_by = v_by
  where a.id = p_audit and a.review = 'waiting'
  returning a.institution_id, a.run_at into v_institution, v_run_at;
  if v_institution is null then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  update public.done_marks m
  set checked_by_audit = p_audit
  where m.institution_id = v_institution and m.thing is null and m.checked_by_audit is null and m.marked_at <= v_run_at;

  if coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'audit_ready', p_notice, p_link, v_at);
  end if;
end;
$$;

create or replace function public.approve_report(p_report uuid, p_pages smallint, p_size integer, p_notice text, p_by uuid DEFAULT NULL::uuid, p_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_server boolean := coalesce((select auth.role()), '') = 'service_role';
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_at timestamptz := case when v_server then coalesce(p_at, now()) else now() end;
  v_institution uuid;
begin
  if not private.can_review((select r.institution_id from public.reports r where r.id = p_report)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.reports r
  set review = 'approved', approved_at = v_at, approved_by = v_by, pages = coalesce(p_pages, r.pages), size_bytes = coalesce(p_size, r.size_bytes)
  where r.id = p_report and r.review = 'waiting'
  returning r.institution_id into v_institution;
  if v_institution is null then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  if coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'report_ready', p_notice, '/reports', v_at);
  end if;
end;
$$;

create or replace function public.record_review(payload jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_audit uuid := (payload ->> 'audit_id')::uuid;
  v_by uuid := coalesce((select auth.uid()), (payload ->> 'edited_by')::uuid);
  item jsonb;
begin
  if not private.can_review((select a.institution_id from public.audits a where a.id = v_audit)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform 1 from public.audits a where a.id = v_audit and a.review = 'waiting' for update;
  if not found then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  if jsonb_typeof(payload -> 'scores') = 'object' then
    update public.audits a set
      overall = (payload -> 'scores' ->> 'overall')::smallint,
      discovered = (payload -> 'scores' ->> 'discovered')::smallint,
      trusted = (payload -> 'scores' ->> 'trusted')::smallint,
      chosen = (payload -> 'scores' ->> 'chosen')::smallint,
      overall_change = (payload -> 'scores' ->> 'overall_change')::smallint,
      discovered_change = (payload -> 'scores' ->> 'discovered_change')::smallint,
      trusted_change = (payload -> 'scores' ->> 'trusted_change')::smallint,
      chosen_change = (payload -> 'scores' ->> 'chosen_change')::smallint
    where a.id = v_audit;
  end if;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'programs', '[]'::jsonb)) loop
    update public.audit_program_scores p set
      overall = (item ->> 'overall')::smallint,
      discovered = (item ->> 'discovered')::smallint,
      trusted = (item ->> 'trusted')::smallint,
      chosen = (item ->> 'chosen')::smallint,
      overall_change = (item ->> 'overall_change')::smallint,
      discovered_change = (item ->> 'discovered_change')::smallint,
      trusted_change = (item ->> 'trusted_change')::smallint,
      chosen_change = (item ->> 'chosen_change')::smallint
    where p.audit_id = v_audit and p.program_id = (item ->> 'program_id')::uuid;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'checks', '[]'::jsonb)) loop
    update public.audit_checks c set
      result = coalesce((item ->> 'result')::public.check_result, c.result),
      points_awarded = coalesce((item ->> 'points_awarded')::numeric, c.points_awarded),
      strength_rank = (item ->> 'strength_rank')::smallint,
      fix_rank = (item ->> 'fix_rank')::smallint,
      team_checked_at = case when coalesce((item ->> 'team_checked')::boolean, false) then now() else c.team_checked_at end
    where c.id = (item ->> 'id')::uuid and c.audit_id = v_audit;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'details', '[]'::jsonb)) loop
    update public.audit_check_details d set
      finding = coalesce(item ->> 'finding', d.finding),
      why_it_matters = case when item ? 'why_it_matters' then item ->> 'why_it_matters' else d.why_it_matters end,
      difficulty = case when item ? 'difficulty' then (item ->> 'difficulty')::public.difficulty else d.difficulty end,
      fix_title = case when item ? 'fix_title' then nullif(item ->> 'fix_title', '') else d.fix_title end,
      fix_steps = case when item ? 'fix_steps' then array(select jsonb_array_elements_text(item -> 'fix_steps')) else d.fix_steps end,
      how_to_fix = case when item ? 'fix_steps' then array_to_string(array(select jsonb_array_elements_text(item -> 'fix_steps')), ' ') else d.how_to_fix end,
      ready_fix = case when jsonb_typeof(item -> 'ready_fix') = 'object' then item -> 'ready_fix' else d.ready_fix end
    where d.audit_check_id = (item ->> 'audit_check_id')::uuid
      and exists (select 1 from public.audit_checks c where c.id = d.audit_check_id and c.audit_id = v_audit);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'findings', '[]'::jsonb)) loop
    update public.audit_findings f set
      line = coalesce(item ->> 'line', f.line),
      fix_title = case when item ? 'fix_title' and f.fix_title is not null then coalesce(nullif(item ->> 'fix_title', ''), f.fix_title) else f.fix_title end,
      fix_steps = case when item ? 'fix_steps' then array(select jsonb_array_elements_text(item -> 'fix_steps')) else f.fix_steps end,
      ready_fix = case when jsonb_typeof(item -> 'ready_fix') = 'object' then item -> 'ready_fix' else f.ready_fix end,
      fix_rank = case when item ? 'fix_rank' then (item ->> 'fix_rank')::smallint else f.fix_rank end,
      removed_at = case when coalesce((item ->> 'removed')::boolean, false) then coalesce(f.removed_at, now()) else f.removed_at end,
      removed_by = case when coalesce((item ->> 'removed')::boolean, false) then coalesce(f.removed_by, v_by) else f.removed_by end
    where f.id = (item ->> 'id')::uuid and f.audit_id = v_audit;
  end loop;

  insert into public.audit_edits (audit_id, what, target, before, after, reason, edited_by)
  select v_audit, (e ->> 'what')::public.edit_what, e ->> 'target', e ->> 'before', e ->> 'after', nullif(e ->> 'reason', ''), v_by
  from jsonb_array_elements(coalesce(payload -> 'edits', '[]'::jsonb)) as e;
end;
$$;

create or replace function public.record_summary_edit(p_report uuid, p_target text, p_after text, p_reason text DEFAULT NULL::text, p_by uuid DEFAULT NULL::uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_path text[];
  v_summary jsonb;
  v_before text;
  v_after text := btrim(coalesce(p_after, ''));
begin
  if not private.can_review((select r.institution_id from public.reports r where r.id = p_report)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(v_after) not between 1 and 400 then
    raise exception 'bad_line' using errcode = '22023';
  end if;
  v_path := case p_target
    when 'words' then array['lines', 'words']
    when 'move' then array['lines', 'move']
    when 'enquiries' then array['lines', 'enquiries']
    when 'things.1' then array['lines', 'things', '0']
    when 'things.2' then array['lines', 'things', '1']
    when 'things.3' then array['lines', 'things', '2']
  end;
  if v_path is null then
    raise exception 'bad_target' using errcode = '22023';
  end if;

  select r.summary into v_summary from public.reports r where r.id = p_report and r.review = 'waiting' for update;
  if not found then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;
  v_before := v_summary #>> v_path;
  if v_before is null then
    raise exception 'bad_target' using errcode = '22023';
  end if;

  update public.reports r set summary = jsonb_set(r.summary, v_path, to_jsonb(v_after)) where r.id = p_report;
  insert into public.audit_edits (report_id, what, target, before, after, reason, edited_by)
  values (p_report, 'summary_line', 'summary:' || p_target, v_before, v_after, nullif(btrim(coalesce(p_reason, '')), ''), v_by);
end;
$$;

drop function private.can_review();

-- What a Client manager reads: their Clients as the team sees them, and the rivals those track -----

create policy actions_manager_read on public.actions for select to authenticated using (private.manages(institution_id));
create policy audits_manager_read on public.audits for select to authenticated using (private.manages_any(institution_id));
create policy audit_checks_manager_read on public.audit_checks for select to authenticated using (private.manages_audit(audit_id));
create policy audit_check_details_manager_read on public.audit_check_details for select to authenticated using (private.manages_check(audit_check_id));
create policy audit_program_scores_manager_read on public.audit_program_scores for select to authenticated using (private.manages_audit(audit_id));
create policy audit_findings_manager_read on public.audit_findings for select to authenticated using (private.manages_any(institution_id));
create policy audit_edits_manager_read on public.audit_edits for select to authenticated
  using (private.manages_audit(audit_id) or exists (select 1 from public.reports r where r.id = report_id and private.manages(r.institution_id)));
create policy signals_manager_read on public.signals for select to authenticated using (private.manages_any(institution_id));
create policy content_picks_manager_read on public.content_picks for select to authenticated using (private.manages(institution_id));
create policy done_marks_manager_read on public.done_marks for select to authenticated using (private.manages(institution_id));
-- Demand is market data for a city or state, the same for every college there.
create policy demand_pulls_manager_read on public.demand_pulls for select to authenticated using ((select private.is_client_manager()));
create policy demand_items_manager_read on public.demand_items for select to authenticated
  using ((select private.is_client_manager()) and (institution_id is null or private.manages_any(institution_id)));
create policy email_log_manager_read on public.email_log for select to authenticated using (private.manages(institution_id));
create policy institutions_manager_read on public.institutions for select to authenticated using (private.manages_any(id));
create policy institution_status_manager_read on public.institution_status for select to authenticated using (private.manages_any(institution_id));
create policy institution_details_manager_read on public.institution_details for select to authenticated using (private.manages(institution_id));
create policy programs_manager_read on public.programs for select to authenticated using (private.manages_any(institution_id));
create policy program_details_manager_read on public.program_details for select to authenticated using (private.manages_any(institution_id));
create policy plans_manager_read on public.plans for select to authenticated using (private.manages(institution_id));
create policy memberships_manager_read on public.memberships for select to authenticated using (private.manages(institution_id));
create policy invites_manager_read on public.invites for select to authenticated using (private.manages(institution_id));
create policy notifications_manager_read on public.notifications for select to authenticated using (private.manages(institution_id));
create policy reports_manager_read on public.reports for select to authenticated using (private.manages(institution_id));
create policy share_links_manager_read on public.share_links for select to authenticated using (private.manages(institution_id));
create policy lead_links_manager_read on public.lead_links for select to authenticated using (private.manages(institution_id));
create policy lead_settings_manager_read on public.lead_settings for select to authenticated using (private.manages(institution_id));
create policy rivals_manager_read on public.rivals for select to authenticated using (private.manages(institution_id));
create policy rival_changes_manager_read on public.rival_changes for select to authenticated using (private.manages(institution_id));
create policy rival_lines_manager_read on public.rival_lines for select to authenticated using (private.manages(institution_id));
create policy rival_checks_manager_read on public.rival_checks for select to authenticated using (private.manages_rival(rival_institution_id));
create policy rival_content_manager_read on public.rival_content for select to authenticated using (private.manages_rival(rival_institution_id));
create policy rival_moves_manager_read on public.rival_moves for select to authenticated using (private.manages_rival(rival_institution_id));
create policy rival_ads_manager_read on public.rival_ads for select to authenticated using (private.manages_rival(rival_institution_id));
create policy scoring_config_manager_read on public.scoring_config for select to authenticated using ((select private.is_client_manager()));
-- The Client Brain: what Drishti found waiting to be confirmed, and History the team keeps to itself.
create policy brain_items_manager_read on public.brain_items for select to authenticated using (private.manages(institution_id));
create policy brain_changes_manager_read on public.brain_changes for select to authenticated using (private.manages(institution_id));
create policy reports_files_manager_read on storage.objects for select to authenticated
  using (bucket_id = 'reports' and exists (select 1 from public.reports r where r.storage_path = name and private.manages(r.institution_id)));

-- What a Client manager writes for their Clients: team notes and the work log --------------------

create policy notes_manager_read on public.notes for select to authenticated using (private.manages(institution_id));
create policy notes_manager_add on public.notes for insert to authenticated
  with check (private.manages(institution_id) and author_id = (select auth.uid()));
create policy notes_manager_remove on public.notes for delete to authenticated
  using (private.manages(institution_id) and author_id = (select auth.uid()));
create policy team_work_manager_read on public.team_work for select to authenticated using (private.manages(institution_id));
create policy team_work_manager_add on public.team_work for insert to authenticated
  with check (private.manages(institution_id) and added_by = (select auth.uid()) and private.effective_tier(institution_id) = 'client');
create policy team_work_manager_change on public.team_work for update to authenticated
  using (private.manages(institution_id)) with check (private.manages(institution_id));
create policy team_work_manager_remove on public.team_work for delete to authenticated using (private.manages(institution_id));

-- The team list: a Client manager sees their own Clients in it ----------------------------------

-- As in 20261021120100_client_brain.sql, with the Clients a Client manager looks after.
drop view public.team_institutions;
create view public.team_institutions
with (security_invoker = true)
as
with base as (
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
    latest.overall_change as score_change,
    latest.run_at as checked_at,
    (select count(*) from public.rivals r where r.institution_id = i.id)::integer as rivals,
    (
      select max(l.created_at) from public.share_links l
      where l.institution_id = i.id and l.stopped_at is null
    ) as shared_at,
    (
      select max(a.run_at) from public.audits a
      where a.institution_id = i.id and a.kind = 'client' and a.trigger = 'manual'
    ) as team_refreshed_at,
    p.paid_months as plan_months,
    (select b.status from public.brains b where b.institution_id = i.id) as brain_status
  from public.institutions i
  left join public.institution_status s on s.institution_id = i.id
  left join public.plans p on p.institution_id = i.id
  left join lateral (
    select a.id, a.kind, a.overall, a.overall_change, a.run_at
    from public.audits a
    where a.institution_id = i.id
      and case when coalesce(s.claimed, false) then a.kind in ('free', 'paid', 'client') else a.kind in ('team', 'rival') end
    order by a.run_at desc
    limit 1
  ) latest on true
  where (select private.is_team()) or private.manages(i.id)
)
select
  base.*,
  case
    when tier = 'paid' and plan_ends_at > now() and plan_ends_at <= now() + make_interval(days => private.paid_reminder_days(plan_months)) then 1
    when tier = 'client' and (team_refreshed_at is null or team_refreshed_at < private.month_start_india()) then 2
    when claimed and score_change <= -private.attention_score_drop() then 3
    when claimed and rivals = 0 then 4
    when not claimed and shared_at is not null and (now() at time zone 'Asia/Kolkata')::date - (shared_at at time zone 'Asia/Kolkata')::date >= private.attention_follow_up_days() then 5
    when tier = 'client' and brain_status is distinct from 'ready' then 6
  end as attention,
  case
    when tier = 'paid' and plan_ends_at > now() and plan_ends_at <= now() + make_interval(days => private.paid_reminder_days(plan_months)) then extract(epoch from plan_ends_at)
    when tier = 'client' and (team_refreshed_at is null or team_refreshed_at < private.month_start_india()) then null
    when claimed and score_change <= -private.attention_score_drop() then score_change
    when claimed and rivals = 0 then null
    when not claimed and shared_at is not null and (now() at time zone 'Asia/Kolkata')::date - (shared_at at time zone 'Asia/Kolkata')::date >= private.attention_follow_up_days() then extract(epoch from shared_at)
    when tier = 'client' and brain_status is distinct from 'ready' then null
  end as attention_order
from base;

revoke all on public.team_institutions from anon;
grant select on public.team_institutions to authenticated, service_role;

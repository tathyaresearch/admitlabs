-- Phase 4: Demand. Shared pulls by region and program, with the plan rules from spec section 10
-- enforced in the database:
--
--   Pulls and items   Paid and Client: their own city, state and All India, for their own
--                     programs. Free reads none directly.
--   1 rising trend    Every tier, through demand_highlight(): Free gets its Free program in its
--                     city; Paid and Client get the top across their programs.
--   Free unlock card  Counts only, through demand_teaser().
--   Mentions          Paid and Client, through demand_mentions(): grouped topics about the
--                     institution and the rivals it tracks, from their state. Never anyone else,
--                     never a person.
--   Spike alerts      Written with the monthly pull, for Paid and Client institutions in that
--                     city that offer the program.

-- City names repeat across states (Udaipur in Rajasthan and in Tripura), so a city pull also
-- records its state. A state pull records its own state; All India has none.
alter table public.demand_pulls add column state text;
update public.demand_pulls set state = region where scope = 'state';
alter table public.demand_pulls
  drop constraint demand_pulls_scope_region_program_key_month_key,
  add constraint demand_pulls_unique unique nulls not distinct (scope, region, state, program_key, month),
  add constraint demand_pulls_state_matches check (
    (scope = 'india' and state is null) or (scope = 'state' and state = region) or (scope = 'city' and state is not null)
  );
create index demand_pulls_region_idx on public.demand_pulls (scope, region, state, program_key, month desc);

-- The pull a signed-in person may read: Paid or Client, their own city, state or All India,
-- and one of their own programs.
create function private.can_read_demand_pull(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.demand_pulls p
    join public.memberships m on m.user_id = (select auth.uid())
    join public.institutions i on i.id = m.institution_id
    where p.id = target
      and private.effective_tier(i.id) <> 'free'
      and (
        p.scope = 'india'
        or (p.scope = 'state' and p.region = i.state)
        or (p.scope = 'city' and p.region = i.city and p.state = i.state)
      )
      and exists (
        select 1 from public.programs g
        where g.institution_id = i.id and g.archived_at is null and g.program_key = p.program_key
      )
  );
$$;

revoke all on function private.can_read_demand_pull(uuid) from public;
grant execute on function private.can_read_demand_pull(uuid) to authenticated;

create policy demand_pulls_member_read on public.demand_pulls
  for select to authenticated using (private.can_read_demand_pull(id));
-- Mentions are about institutions, so they are read only through demand_mentions().
create policy demand_items_member_read on public.demand_items
  for select to authenticated using (kind <> 'mention' and private.can_read_demand_pull(pull_id));

-- The latest pull for a region and program.
create function private.latest_demand_pull(p_scope public.demand_scope, p_region text, p_state text, p_program text) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.id from public.demand_pulls p
  where p.scope = p_scope and p.region = p_region and p.state is not distinct from p_state and p.program_key = p_program
  order by p.month desc
  limit 1;
$$;
revoke all on function private.latest_demand_pull(public.demand_scope, text, text, text) from public;

-- The programs Demand covers for an institution: every active program with a key on Paid and
-- Client, the Free program on Free.
create function private.demand_programs(p_institution uuid)
returns table (program_id uuid, name text, program_key text)
language sql stable security definer
set search_path = ''
as $$
  select g.id, g.name, g.program_key
  from public.programs g
  left join public.plans pl on pl.institution_id = g.institution_id
  where g.institution_id = p_institution
    and g.archived_at is null
    and g.program_key is not null
    and (private.effective_tier(p_institution) <> 'free' or g.id = pl.free_program_id);
$$;
revoke all on function private.demand_programs(uuid) from public;

-- One rising trend, for every tier (spec section 10): the fastest rise in the institution's
-- city this month. Free: its Free program. Paid and Client: across their programs.
create function public.demand_highlight(p_institution uuid)
returns table (
  text text,
  change_pct numeric,
  count integer,
  source_url text,
  found_at timestamptz,
  program_name text,
  region text,
  month date
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
  ),
  pulls as (
    select dp.program_id, dp.name, p.id as pull_id, p.region, p.month
    from me
    cross join private.demand_programs(me.id) dp
    join public.demand_pulls p on p.id = private.latest_demand_pull('city', me.city, me.state, dp.program_key)
  )
  select d.text, d.change_pct, d.count, d.source_url, d.found_at, pl.name, pl.region, pl.month
  from pulls pl
  join public.demand_items d on d.pull_id = pl.pull_id and d.kind = 'rising'
  order by d.change_pct desc nulls last, d.count desc, d.text
  limit 1;
$$;

-- Counts for Free's unlock card, from its Free program's latest city pull. Shows the data is
-- real without showing the data.
create function public.demand_teaser(
  p_institution uuid,
  out questions integer,
  out worries integer,
  out new_worries integer,
  out ideas integer,
  out trends integer
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
  ),
  pulls as (
    select private.latest_demand_pull('city', me.city, me.state, dp.program_key) as pull_id
    from me cross join private.demand_programs(me.id) dp
  ),
  items as (
    select d.* from public.demand_items d where d.pull_id in (select pull_id from pulls)
  )
  select
    (select count(*)::integer from items where kind = 'question'),
    (select count(*)::integer from items where kind = 'worry'),
    (select count(*)::integer from items where kind = 'worry' and coalesce((meta ->> 'isNew')::boolean, false)),
    (select count(*)::integer from items where kind = 'idea'),
    (select count(*)::integer from items where kind in ('rising', 'falling'));
$$;

-- What students say about the institution and the rivals it tracks: grouped topics with counts
-- and sources, from each one's state, latest month. Paid and Client only. Never a person, and
-- never about an institution the viewer does not track.
create function public.demand_mentions(p_institution uuid)
returns table (
  institution_id uuid,
  sentiment public.sentiment,
  text text,
  count integer,
  source_url text,
  found_at timestamptz,
  month date
)
language sql stable security definer
set search_path = ''
as $$
  with allowed as (
    select p_institution as id
    where (private.is_member(p_institution) and private.effective_tier(p_institution) <> 'free') or private.is_team()
  ),
  subjects as (
    select a.id from allowed a
    union
    select r.rival_institution_id from public.rivals r join allowed a on r.institution_id = a.id
  ),
  latest as (
    select s.id, i.state,
      (select max(p.month) from public.demand_pulls p where p.scope = 'state' and p.region = i.state) as month
    from subjects s
    join public.institutions i on i.id = s.id
  )
  select d.institution_id, d.sentiment, d.text, d.count, d.source_url, d.found_at, p.month
  from latest l
  join public.demand_pulls p on p.scope = 'state' and p.region = l.state and p.month = l.month
  join public.demand_items d on d.pull_id = p.id and d.kind = 'mention' and d.institution_id = l.id
  order by d.institution_id, d.sentiment, d.count desc, d.text;
$$;

-- Saves one pull in one transaction: the pull, its grouped items (replacing any earlier ones
-- for the same month), and for a city pull an alert for each big spike to every Paid and
-- Client institution there that offers the program. Server only (service key).
create function public.record_demand_pull(payload jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_scope public.demand_scope := (payload ->> 'scope')::public.demand_scope;
  v_region text := payload ->> 'region';
  v_state text := nullif(payload ->> 'state', '');
  v_program text := payload ->> 'program_key';
  v_month date := (payload ->> 'month')::date;
  v_pulled_at timestamptz := (payload ->> 'pulled_at')::timestamptz;
  v_pull uuid;
  spike jsonb;
begin
  insert into public.demand_pulls (scope, region, state, program_key, month, pulled_at)
  values (v_scope, v_region, v_state, v_program, v_month, v_pulled_at)
  on conflict on constraint demand_pulls_unique do update set pulled_at = excluded.pulled_at
  returning id into v_pull;

  delete from public.demand_items d where d.pull_id = v_pull;
  insert into public.demand_items (
    pull_id, kind, text, original_text, language, count, change_pct, rank, institution_id, sentiment, source_url, found_at, meta
  )
  select v_pull, (i ->> 'kind')::public.demand_kind, i ->> 'text', i ->> 'original_text',
    coalesce((i ->> 'language')::public.language, 'en'), coalesce((i ->> 'count')::integer, 0), (i ->> 'change_pct')::numeric,
    (i ->> 'rank')::smallint, (i ->> 'institution_id')::uuid, (i ->> 'sentiment')::public.sentiment,
    i ->> 'source_url', (i ->> 'found_at')::timestamptz, coalesce(i -> 'meta', '{}'::jsonb)
  from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) as i;

  if v_scope = 'city' then
    for spike in select value from jsonb_array_elements(coalesce(payload -> 'spikes', '[]'::jsonb)) loop
      insert into public.notifications (institution_id, kind, text, link, created_at)
      select i.id, 'demand_spike', spike ->> 'notice', '/demand', v_pulled_at
      from public.institutions i
      join public.institution_status s on s.institution_id = i.id and s.claimed and s.claimed_at <= v_pulled_at
      where i.city = v_region
        and i.state = v_state
        and private.effective_tier(i.id, v_pulled_at) <> 'free'
        and exists (
          select 1 from public.programs g
          where g.institution_id = i.id and g.archived_at is null and g.program_key = v_program
        )
        and not exists (
          select 1 from public.notifications n
          where n.institution_id = i.id and n.kind = 'demand_spike' and n.text = spike ->> 'notice'
        );
    end loop;
  end if;

  return v_pull;
end;
$$;

revoke all on function
  public.demand_highlight(uuid),
  public.demand_teaser(uuid),
  public.demand_mentions(uuid),
  public.record_demand_pull(jsonb)
from public, anon, authenticated;

grant execute on function
  public.demand_highlight(uuid),
  public.demand_teaser(uuid),
  public.demand_mentions(uuid)
to authenticated;

grant execute on function public.record_demand_pull(jsonb) to service_role;

-- Version 2, Part 4: Demand (spec sections 9 and 10).
--
--   Too little     demand_pulls.too_little: the city had too little data for the program (search
--                  trends gave nothing, or too few questions were counted: src/config/demand.ts),
--                  so its state fills in, and the page says so. Set with each city pull.
--   The pull       private.demand_pull_for(): a program's latest city pull, or its state's when
--                  the city has too little (or nothing yet).
--   1 program      demand_highlight(): the fastest rise, as before, now from that pull, with where
--                  its count came from (the keyword tool). Free: its Free program. Paid and Client:
--                  across their programs.
--   Free preview   demand_teaser(): counts only, from the Free program's pull, for what Paid adds.
--   Make these 3   content_picks (version 2 data), written by the monthly job with the service key;
--                  Free reads the first. Mark as made is a done mark on the idea and its month.
--   Mentions       version 1's demand_mentions() is gone: what is said about you is in the Audit.

alter table public.demand_pulls
  add column too_little boolean not null default false,
  add constraint demand_pulls_too_little_city check (not too_little or scope = 'city');

-- A program's pull for an institution's page: its city's latest, or its state's latest when the
-- city has too little data (or no pull yet).
create function private.demand_pull_for(p_city text, p_state text, p_program text) returns uuid
language sql stable security definer
set search_path = ''
as $$
  with city as (
    select p.id, p.too_little from public.demand_pulls p
    where p.scope = 'city' and p.region = p_city and p.state = p_state and p.program_key = p_program
    order by p.month desc
    limit 1
  ),
  state as (
    select p.id from public.demand_pulls p
    where p.scope = 'state' and p.region = p_state and p.state = p_state and p.program_key = p_program
    order by p.month desc
    limit 1
  )
  select case
    when not exists (select 1 from city) or (select c.too_little from city c) then coalesce((select s.id from state s), (select c.id from city c))
    else (select c.id from city c)
  end;
$$;
revoke all on function private.demand_pull_for(text, text, text) from public;

-- As before, with too little: set on a city pull, never on a state one.
create or replace function public.record_demand_pull(payload jsonb) returns uuid
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
  v_too_little boolean := v_scope = 'city' and coalesce((payload ->> 'too_little')::boolean, false);
  v_pull uuid;
  spike jsonb;
begin
  insert into public.demand_pulls (scope, region, state, program_key, month, pulled_at, too_little)
  values (v_scope, v_region, v_state, v_program, v_month, v_pulled_at, v_too_little)
  on conflict on constraint demand_pulls_unique do update set pulled_at = excluded.pulled_at, too_little = excluded.too_little
  returning id into v_pull;

  delete from public.demand_items d where d.pull_id = v_pull;
  insert into public.demand_items (
    pull_id, kind, text, original_text, language, count, change_pct, rank, institution_id, sentiment, source_url, found_at, meta
  )
  select v_pull, (i ->> 'kind')::public.demand_kind, i ->> 'text', i ->> 'original_text',
    coalesce((i ->> 'language')::public.language, 'en'), (i ->> 'count')::integer, (i ->> 'change_pct')::numeric,
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

-- The fastest rise, as before, from each program's pull: the city's, or the state's filling in.
-- With where its count came from, when the keyword tool counted it.
drop function public.demand_highlight(uuid);
create function public.demand_highlight(p_institution uuid)
returns table (
  text text,
  change_pct numeric,
  count integer,
  count_source text,
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
    join public.demand_pulls p on p.id = private.demand_pull_for(me.city, me.state, dp.program_key)
  )
  select d.text, d.change_pct, d.count, d.meta ->> 'countSource', d.source_url, d.found_at, pl.name, pl.region, pl.month
  from pulls pl
  join public.demand_items d on d.pull_id = pl.pull_id and d.kind = 'rising'
  order by d.change_pct desc nulls last, d.count desc nulls last, d.text
  limit 1;
$$;

-- Counts for what Paid adds on Free's Demand page, from its Free program's pull. Shows the data is
-- real without showing the data.
drop function public.demand_teaser(uuid);
create function public.demand_teaser(
  p_institution uuid,
  out trends integer,
  out topics integer,
  out questions integer,
  out content integer,
  out ideas integer,
  out best_months integer
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
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

drop function public.demand_mentions(uuid);

revoke all on function public.demand_highlight(uuid), public.demand_teaser(uuid) from public, anon, authenticated;
grant execute on function public.demand_highlight(uuid), public.demand_teaser(uuid) to authenticated;

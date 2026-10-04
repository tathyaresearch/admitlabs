-- Version 2, Part 3 (October 2026): Rivals in your city (spec sections 8, 10 and 13).
--
--   Suggestions      rival_suggestions(): institutions in your city, of any type, that offer at
--                    least one of your programs, most shared programs first (up to 6). When your
--                    city has fewer than 3 of them (counting the ones you already track), the
--                    nearest bigger city's (cities.near) are suggested too, with same_city false:
--                    "Nearby city" wherever they show. Never yourself, a rival you track, or a team
--                    prospect.
--   The month's      rival_lines: one line a month, "This month, Silverline College is ahead on
--   one line         Instagram and Google reviews.", written by the AI writer with the rival job
--                    for every plan, so Free reads its line without reading any rival data.
--                    Members and the team read it; only the server writes it.

-- Suggestions ---------------------------------------------------------------------------------

create or replace function public.rival_suggestions(p_institution uuid)
returns table (
  institution_id uuid,
  name text,
  type public.institution_type,
  city text,
  state text,
  website text,
  same_city boolean,
  shared_programs text[]
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state,
      (select c.near from public.cities c where c.name = i.city and c.state = i.state) as near
    from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
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

-- The month's one line --------------------------------------------------------------------------

create table public.rival_lines (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  -- As the writer wrote it.
  line text not null check (char_length(line) between 1 and 300),
  -- Who it names and on which checks (none when no rival is ahead anywhere), so a page can tell
  -- the rivals changed since it was written.
  rival_institution_id uuid references public.institutions (id) on delete set null,
  check_keys public.check_key[] not null default '{}' check (cardinality(check_keys) <= 2),
  written_at timestamptz not null default now(),
  primary key (institution_id, month)
);

alter table public.rival_lines enable row level security;

create policy rival_lines_read on public.rival_lines
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));

grant select on public.rival_lines to authenticated;
grant all on public.rival_lines to service_role;
revoke all on public.rival_lines from anon;

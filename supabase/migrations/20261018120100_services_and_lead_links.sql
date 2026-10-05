-- Version 2 review (October 2026):
--
--   Talk to AdmitLabs   ask_admitlabs_services(): the sidebar's "Want us to do it for you?" card,
--                       on Free and Paid. The owner or a member asks; the request lands in the
--                       team's Enquiries, one open request per institution.
--                       open_services_ask(): when the open one was sent, for its own people.
--   Leads links         A Client's owner makes and archives tracking links too, beside the team
--                       (create_lead_link(), archive_lead_link()). A link may name no program: a
--                       general form, where the student picks the course (lead_form(),
--                       lead_link_counts(); submit_lead() already needs a course either way).

-- Talk to AdmitLabs -------------------------------------------------------------------------------

-- One open request per institution, even when two people click at once.
create unique index enquiries_open_services on public.enquiries (institution_id) where kind = 'ask_services' and handled_at is null;

create function public.ask_admitlabs_services(p_institution uuid) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_at timestamptz;
begin
  if not private.is_member(p_institution) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  -- A Client already works with AdmitLabs.
  if private.effective_tier(p_institution) = 'client' then
    raise exception 'already_client' using errcode = 'P0001';
  end if;

  insert into public.enquiries (kind, institution_id, asked_by, institution, email)
  select 'ask_services', p_institution, u.id, i.name, lower(u.email)
  from auth.users u, public.institutions i
  where u.id = (select auth.uid()) and i.id = p_institution
  on conflict (institution_id) where kind = 'ask_services' and handled_at is null do nothing
  returning created_at into v_at;
  if v_at is null then
    select e.created_at into v_at
    from public.enquiries e
    where e.institution_id = p_institution and e.kind = 'ask_services' and e.handled_at is null;
  end if;
  return v_at;
end;
$$;

create function public.open_services_ask(p_institution uuid) returns timestamptz
language sql stable security definer
set search_path = ''
as $$
  select e.created_at
  from public.enquiries e
  where private.is_member(p_institution)
    and e.institution_id = p_institution
    and e.kind = 'ask_services'
    and e.handled_at is null
  order by e.created_at desc
  limit 1;
$$;

revoke all on function public.ask_admitlabs_services(uuid), public.open_services_ask(uuid) from public, anon;
grant execute on function public.ask_admitlabs_services(uuid), public.open_services_ask(uuid) to authenticated;

-- Leads links ---------------------------------------------------------------------------------------

-- A general link names no program: the student picks the course on its form.
alter table public.lead_links alter column program_id drop not null;

create or replace function public.lead_form(p_code text)
returns table (
  link_id uuid,
  institution_name text,
  program_id uuid,
  program_name text,
  programs jsonb,
  open boolean,
  closed_reason text
)
language sql stable security definer
set search_path = ''
as $$
  select l.id, i.name, l.program_id, g.name,
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
       from public.programs p where p.institution_id = i.id and p.archived_at is null),
      '[]'::jsonb
    ),
    l.archived_at is null and private.effective_tier(i.id) = 'client',
    case when l.archived_at is not null then 'archived' when private.effective_tier(i.id) <> 'client' then 'not_client' end
  from public.lead_links l
  join public.institutions i on i.id = l.institution_id
  left join public.programs g on g.id = l.program_id
  where l.code = lower(coalesce(p_code, ''));
$$;

-- A tracking link for a Client: by the team, or by the Client's owner. A name, where it is used,
-- and one of its programs, or none for a general form.
create or replace function public.create_lead_link(p_institution uuid, p_name text, p_used_on public.lead_source, p_program uuid default null)
returns table (id uuid, code text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), '');
  v_code text;
  v_id uuid;
begin
  if not (private.is_team() or private.is_owner(p_institution)) then
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

-- Archive a link, by the team or the Client's owner: its form says it is closed. Its enquiries stay.
create or replace function public.archive_lead_link(p_link uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := (select l.institution_id from public.lead_links l where l.id = p_link);
begin
  if v_institution is null or not (private.is_team() or private.is_owner(v_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.lead_links l set archived_at = coalesce(l.archived_at, now()) where l.id = p_link;
end;
$$;

create or replace function public.lead_link_counts(p_institution uuid, p_now timestamptz default now())
returns table (
  link_id uuid,
  code text,
  name text,
  used_on public.lead_source,
  program_id uuid,
  program_name text,
  created_at timestamptz,
  archived_at timestamptz,
  this_month integer,
  last_month_to_date integer,
  last_month integer,
  month_before integer,
  total integer
)
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
  where l.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  group by l.id, g.name, b.this_start, b.last_start, b.before_start, b.last_to
  order by l.created_at, l.name;
$$;

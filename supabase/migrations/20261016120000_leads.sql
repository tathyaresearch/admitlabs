-- Version 2, Part 5: Leads (spec section 23), the one place in Drishti with a student's own
-- details, sent by the student to that college through its form, with a consent line. The
-- tables and who reads them came with the version 2 data (20261012120100). Here, the functions:
--
--   The form       lead_form(): what a tracking link's form shows (the college, the program and
--                  its other programs) and whether it takes enquiries: a live link of a Client.
--                  submit_lead(): the only way in, for anyone: a live link of a Client, one of
--                  the college's programs, one enquiry per phone or email per college a day
--                  (India time), at most 20 a link an hour (src/config/leads.ts). It keeps the
--                  consent line exactly as the form shows it.
--   Alerts         lead_alert_recipients(): who gets the email for each new enquiry: the saved
--                  addresses, else the admissions email added in Settings, else the owner's.
--   Links          create_lead_link() and archive_lead_link(): the team, for a Client.
--                  lead_link_counts(): each link's enquiries this month, last month to the same
--                  day and in all, the month before, and in all. Counts only: for the team and
--                  the college's own people.
--   Keeping        save_lead_settings(): the owner. Shortening the keeping time deletes older
--                  enquiries straight away. delete_leads(): the owner, one enquiry, or every
--                  enquiry from one phone or email. purge_old_leads(): the daily job, service key.

-- The form -------------------------------------------------------------------------------------

-- What the form at admitlabs.in/enquire/<code> shows. Anyone may ask: it holds no student's data.
create function public.lead_form(p_code text)
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
  join public.programs g on g.id = l.program_id
  where l.code = lower(coalesce(p_code, ''));
$$;

-- One enquiry, from anyone, through a tracking link's form. The server turns bots away first
-- (a hidden field, a minimum time to fill the form); this checks everything again that can be.
create function public.submit_lead(p_code text, p_name text, p_phone text, p_email text default null, p_city text default null, p_program uuid default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_link public.lead_links;
  v_college text;
  v_program uuid;
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_city text := nullif(regexp_replace(trim(coalesce(p_city, '')), '[[:space:]]+', ' ', 'g'), '');
  -- Today, in India.
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  v_lead uuid;
begin
  select * into v_link from public.lead_links l where l.code = lower(coalesce(p_code, ''));
  if v_link.id is null or v_link.archived_at is not null or private.effective_tier(v_link.institution_id) <> 'client' then
    raise exception 'link_closed' using errcode = 'P0001';
  end if;
  select i.name into v_college from public.institutions i where i.id = v_link.institution_id;

  v_program := coalesce(p_program, v_link.program_id);
  if not exists (
    select 1 from public.programs g
    where g.id = v_program and g.institution_id = v_link.institution_id and (g.archived_at is null or g.id = v_link.program_id)
  ) then
    raise exception 'bad_program' using errcode = '22023';
  end if;

  -- One at a time per link, so the hourly cap holds.
  perform pg_advisory_xact_lock(hashtextextended(v_link.id::text, 0));
  if (
    select count(*) from public.leads l
    where l.institution_id = v_link.institution_id and l.created_at >= v_day and (l.phone = v_phone or (v_email is not null and l.email = v_email))
  ) >= 1 then
    raise exception 'already_sent' using errcode = 'P0001';
  end if;
  if (select count(*) from public.leads l where l.link_id = v_link.id and l.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'link_busy' using errcode = 'P0001';
  end if;

  insert into public.leads (institution_id, link_id, program_id, name, phone, email, city, consent)
  values (
    v_link.institution_id, v_link.id, v_program, v_name, v_phone, v_email, v_city,
    'Your details go to ' || v_college || ' so they can contact you about admission.'
  )
  returning id into v_lead;
  return v_lead;
end;
$$;

-- Alerts -----------------------------------------------------------------------------------------

-- Who gets the email for each new enquiry: the addresses saved in Settings, else the admissions
-- email added in Settings, else the owner's. For the college's own people and the server.
create function public.lead_alert_recipients(p_institution uuid) returns text[]
language sql stable security definer
set search_path = ''
as $$
  select case
    when not (private.is_member(p_institution) or coalesce((select auth.role()), '') = 'service_role') then '{}'::text[]
    when exists (select 1 from public.lead_settings s where s.institution_id = p_institution and cardinality(s.alert_emails) > 0)
      then (select s.alert_emails from public.lead_settings s where s.institution_id = p_institution)
    when exists (select 1 from public.institution_details d where d.institution_id = p_institution and d.admissions_email is not null)
      then (select array[d.admissions_email] from public.institution_details d where d.institution_id = p_institution)
    else coalesce(
      (select array[u.email::text] from public.memberships m join auth.users u on u.id = m.user_id
       where m.institution_id = p_institution and m.role = 'owner' order by m.created_at limit 1),
      '{}'::text[]
    )
  end;
$$;

-- Links ------------------------------------------------------------------------------------------

-- The team makes a tracking link for a Client: a name, where it is used, one of its programs.
create function public.create_lead_link(p_institution uuid, p_name text, p_used_on public.lead_source, p_program uuid)
returns table (id uuid, code text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), '');
  v_code text;
  v_id uuid;
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if private.effective_tier(p_institution) <> 'client' then
    raise exception 'not_client' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.programs g where g.id = p_program and g.institution_id = p_institution and g.archived_at is null) then
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

-- The team archives a link: its form says it is closed. Its enquiries stay.
create function public.archive_lead_link(p_link uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  update public.lead_links l set archived_at = coalesce(l.archived_at, now()) where l.id = p_link;
end;
$$;

-- Each link's enquiries: this month, last month up to the same moment, last month in all, the
-- month before, and in all (months in India time). Counts only, never a student's details: for
-- the team and the college's own people.
create function public.lead_link_counts(p_institution uuid, p_now timestamptz default now())
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
  join public.programs g on g.id = l.program_id
  cross join bounds b
  left join dated d on d.link_id = l.id
  where l.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  group by l.id, g.name, b.this_start, b.last_start, b.before_start, b.last_to
  order by l.created_at, l.name;
$$;

-- Keeping and deleting ---------------------------------------------------------------------------

-- The owner saves who gets the alert email (1 to 3 addresses) and how long enquiries are kept.
-- Enquiries older than the new keeping time are deleted for good straight away. Returns how many.
create function public.save_lead_settings(p_institution uuid, p_alert_emails text[], p_keep_months smallint) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_emails text[];
  v_deleted integer;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  select coalesce(array_agg(t.email order by t.first_at), '{}'::text[]) into v_emails
  from (
    select lower(trim(e.value)) as email, min(e.position) as first_at
    from unnest(coalesce(p_alert_emails, '{}'::text[])) with ordinality as e(value, position)
    where trim(e.value) <> ''
    group by lower(trim(e.value))
  ) t;
  if cardinality(v_emails) = 0 then
    raise exception 'no_email' using errcode = '22023';
  end if;
  if cardinality(v_emails) > 3 then
    raise exception 'too_many_emails' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_emails) as e(value) where char_length(e.value) > 254 or e.value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception 'bad_email' using errcode = '22023';
  end if;
  if p_keep_months is null or p_keep_months not in (6, 12, 24) then
    raise exception 'bad_keep_months' using errcode = '22023';
  end if;

  insert into public.lead_settings (institution_id, alert_emails, keep_months, updated_by)
  values (p_institution, v_emails, p_keep_months, (select auth.uid()))
  on conflict (institution_id) do update
  set alert_emails = excluded.alert_emails, keep_months = excluded.keep_months, updated_by = excluded.updated_by;

  delete from public.leads l where l.institution_id = p_institution and l.created_at < now() - make_interval(months => p_keep_months);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- The owner deletes one student's data on request: one enquiry, or every enquiry sent from one
-- phone number or email. Returns how many were deleted.
create function public.delete_leads(p_institution uuid, p_lead uuid default null, p_contact text default null) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_contact text := nullif(trim(coalesce(p_contact, '')), '');
  v_deleted integer;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if (p_lead is null) = (v_contact is null) then
    raise exception 'one_thing' using errcode = '22023';
  end if;
  delete from public.leads l
  where l.institution_id = p_institution
    and ((p_lead is not null and l.id = p_lead) or (p_lead is null and (l.phone = v_contact or l.email = lower(v_contact))));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- The daily job: every enquiry older than its college's keeping time (12 months when it never
-- chose), deleted for good. Server only. Returns how many.
create function public.purge_old_leads(p_now timestamptz default now()) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.leads l
  where l.created_at < p_now - make_interval(months => coalesce((select s.keep_months from public.lead_settings s where s.institution_id = l.institution_id), 12)::integer);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function
  public.lead_form(text),
  public.submit_lead(text, text, text, text, text, uuid),
  public.lead_alert_recipients(uuid),
  public.create_lead_link(uuid, text, public.lead_source, uuid),
  public.archive_lead_link(uuid),
  public.lead_link_counts(uuid, timestamptz),
  public.save_lead_settings(uuid, text[], smallint),
  public.delete_leads(uuid, uuid, text),
  public.purge_old_leads(timestamptz)
from public, anon, authenticated;

grant execute on function public.lead_form(text), public.submit_lead(text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function
  public.lead_alert_recipients(uuid),
  public.create_lead_link(uuid, text, public.lead_source, uuid),
  public.archive_lead_link(uuid),
  public.lead_link_counts(uuid, timestamptz),
  public.save_lead_settings(uuid, text[], smallint),
  public.delete_leads(uuid, uuid, text)
to authenticated;
grant execute on function public.lead_alert_recipients(uuid), public.purge_old_leads(timestamptz) to service_role;

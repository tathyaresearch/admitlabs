-- Enquiries: AdmitLabs' own leads (spec section 27). Not student data: people at colleges who may
-- work with AdmitLabs.
--
--   team_leads          One row per lead: who, the institution, city, phone, email, what they
--                       want, where they came from, status (New, Contacted, Call booked, Proposal
--                       sent, Won, Lost with a reason), owner and next follow-up.
--   enquiries           What came in, as before (the website's Talk to us form, Paid asks, fix
--                       requests, the services card) and now a new Free college too: each one
--                       joins its lead. The same email or phone joins the lead there is, never a
--                       second one.
--   team_lead_activity  What happened to a lead: it came in, came back, notes, status, owner and
--                       follow-up changes, made a Client. Who and when.
--   team_lead_links     The team's own tracking links, per source: admitlabs.in/talk/<code> opens
--                       the Talk to us form, and what comes in through it is tagged that source.
--   team_lead_alerts    The emails to send: each new lead to its owner, or every Admin when it has
--                       none; a lead that comes back, the same. The server sends them
--                       (src/enquiries/jobs.ts) and marks them sent.
--
-- Who sees them: Admins and Team members, every lead; a Client manager, the leads they own. Every
-- change goes through the functions below, which check the same.

create type public.team_lead_source as enum (
  'website', 'free_signup', 'fix_request', 'services', 'ask_paid', 'continue_paid',
  'instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'referral', 'event', 'other'
);
create type public.team_lead_status as enum ('new', 'contacted', 'call_booked', 'proposal_sent', 'won', 'lost');
create type public.team_lead_lost_reason as enum ('price', 'timing', 'chose_someone_else', 'no_reply', 'not_a_fit', 'other');

-- The sources a person picks: adding a lead by hand, or a tracking link. The rest come in on their own.
create function private.is_social_source(p_source public.team_lead_source) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_source in ('instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'referral', 'event', 'other');
$$;

create table public.team_lead_links (
  id uuid primary key default gen_random_uuid(),
  -- The form's address: admitlabs.in/talk/<code>.
  code text not null unique check (code ~ '^[a-z0-9]{6,16}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  source public.team_lead_source not null check (private.is_social_source(source)),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.team_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- When something last came in: the first enquiry, or the latest return.
  last_in_at timestamptz not null default now(),
  name text check (name is null or char_length(btrim(name)) between 2 and 120),
  institution text check (institution is null or char_length(btrim(institution)) between 2 and 160),
  institution_id uuid references public.institutions (id) on delete set null,
  city text check (city is null or char_length(btrim(city)) between 2 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  email text check (email is null or (char_length(email) <= 254 and email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  wants text check (wants is null or char_length(btrim(wants)) between 1 and 500),
  source public.team_lead_source not null,
  -- The link it came through, or the fix it asked for.
  source_detail text check (source_detail is null or char_length(source_detail) between 1 and 200),
  link_id uuid references public.team_lead_links (id) on delete set null,
  status public.team_lead_status not null default 'new',
  lost_reason public.team_lead_lost_reason,
  lost_note text check (lost_note is null or char_length(btrim(lost_note)) between 1 and 300),
  owner_id uuid references public.team_users (user_id) on delete set null,
  next_follow_up date,
  made_client_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint team_leads_contact check (email is not null or phone is not null),
  constraint team_leads_who check (name is not null or institution is not null),
  constraint team_leads_lost check ((status = 'lost') = (lost_reason is not null)),
  constraint team_leads_lost_note check (lost_note is null or status = 'lost')
);
create index team_leads_email_idx on public.team_leads (email) where email is not null;
create index team_leads_owner_idx on public.team_leads (owner_id, status);
create index team_leads_last_in_idx on public.team_leads (last_in_at desc);

create table public.team_lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.team_leads (id) on delete cascade,
  at timestamptz not null default now(),
  by uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('created', 'came_back', 'note', 'status', 'owner', 'follow_up', 'edited', 'made_client')),
  -- A note's words.
  body text check (body is null or char_length(btrim(body)) between 1 and 2000),
  -- The rest: { enquiry_id, source } when one came in, { from, to } for a change, { fields } for an edit.
  data jsonb not null default '{}'::jsonb,
  constraint team_lead_activity_note check ((kind = 'note') = (body is not null))
);
create index team_lead_activity_lead_idx on public.team_lead_activity (lead_id, at desc);

create table public.team_lead_alerts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.team_leads (id) on delete cascade,
  kind text not null check (kind in ('new', 'returning')),
  -- The person who added it by hand: they know already.
  skip_user uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index team_lead_alerts_waiting_idx on public.team_lead_alerts (created_at) where sent_at is null;

alter table public.enquiries
  add column lead_id uuid references public.team_leads (id) on delete set null,
  add column team_link_id uuid references public.team_lead_links (id) on delete set null;
create index enquiries_lead_idx on public.enquiries (lead_id, created_at desc);

-- Who works a lead: Admins and Team members any, a Client manager the ones they own.
create function private.works_lead(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_team() or exists (
    select 1 from public.team_leads l where l.id = target and l.owner_id = (select auth.uid())
  );
$$;

-- The same person, by email or by phone: the last 10 digits, so +91 98765 43210 and 9876543210 match.
create function private.phone_key(p_phone text) returns text
language sql immutable
set search_path = ''
as $$
  select case when length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 10
    then right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10) end;
$$;
create index team_leads_phone_idx on public.team_leads (private.phone_key(phone)) where phone is not null;

create function private.same_lead(p_email text, p_phone text) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select l.id from public.team_leads l
  where (nullif(lower(btrim(p_email)), '') is not null and l.email = lower(btrim(p_email)))
     or (private.phone_key(p_phone) is not null and private.phone_key(l.phone) = private.phone_key(p_phone))
  order by l.created_at, l.id
  limit 1;
$$;

grant execute on function private.works_lead(uuid), private.phone_key(text), private.is_social_source(public.team_lead_source) to authenticated, service_role;

alter table public.team_leads enable row level security;
alter table public.team_lead_activity enable row level security;
alter table public.team_lead_links enable row level security;
alter table public.team_lead_alerts enable row level security;
revoke all on public.team_leads, public.team_lead_activity, public.team_lead_links, public.team_lead_alerts from anon;
grant select on public.team_leads, public.team_lead_activity, public.team_lead_links to authenticated;
grant select, insert, update, delete on public.team_leads, public.team_lead_activity, public.team_lead_links, public.team_lead_alerts to service_role;

create policy team_leads_read on public.team_leads
  for select to authenticated using ((select private.is_team()) or owner_id = (select auth.uid()));
create policy team_lead_activity_read on public.team_lead_activity
  for select to authenticated using (private.works_lead(lead_id));
create policy team_lead_links_read on public.team_lead_links
  for select to authenticated using ((select private.is_team()));
-- What came in for a lead a Client manager owns.
create policy enquiries_lead_owner_read on public.enquiries
  for select to authenticated using (lead_id is not null and private.works_lead(lead_id));

-- What came in joins its lead ----------------------------------------------------------------------

-- One enquiry joins its lead: the lead with the same email or phone gets it, or a new lead starts
-- from it. Either way the alert waits to be sent.
create function private.join_lead(p_enquiry uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  e public.enquiries%rowtype;
  v_lead uuid;
  v_link public.team_lead_links%rowtype;
  v_source public.team_lead_source;
  v_name text;
  v_city text;
  v_wants text;
  v_detail text;
begin
  select * into e from public.enquiries where id = p_enquiry;
  if e.team_link_id is not null then
    select * into v_link from public.team_lead_links where id = e.team_link_id;
  end if;
  v_source := case e.kind
    when 'work_with_us' then coalesce(v_link.source, 'website')
    when 'ask_paid' then 'ask_paid'
    when 'continue_paid' then 'continue_paid'
    when 'fix_request' then 'fix_request'
    when 'ask_services' then 'services'
    when 'free_signup' then 'free_signup'
  end::public.team_lead_source;
  v_name := coalesce(e.name, (select n.name from public.person_names n where n.user_id = e.asked_by));
  v_city := (select i.city from public.institutions i where i.id = e.institution_id);
  v_detail := coalesce(v_link.name, e.fix_title);
  v_wants := left(case e.kind
    when 'work_with_us' then nullif(concat_ws('. ', e.program, e.message), '')
    when 'ask_paid' then case e.paid_months when 1 then 'Asked for Paid, Monthly' when 3 then 'Asked for Paid, 3 months' else 'Asked for Paid' end
    when 'continue_paid' then case e.paid_months when 1 then 'Asked to renew Paid, Monthly' when 3 then 'Asked to renew Paid, 3 months' else 'Asked to renew Paid' end
    when 'fix_request' then 'Asked AdmitLabs to fix: ' || e.fix_title
    when 'ask_services' then 'Asked AdmitLabs to do it for them'
    when 'free_signup' then 'Signed up for Free'
  end, 500);

  v_lead := private.same_lead(e.email, e.phone);
  if v_lead is null then
    insert into public.team_leads (created_at, last_in_at, name, institution, institution_id, city, phone, email, wants, source, source_detail, link_id, updated_at)
    values (e.created_at, e.created_at, v_name, e.institution, e.institution_id, v_city, e.phone, e.email, v_wants, v_source, v_detail, e.team_link_id, e.created_at)
    returning id into v_lead;
    insert into public.team_lead_activity (lead_id, at, kind, data)
    values (v_lead, e.created_at, 'created', jsonb_build_object('enquiry_id', e.id, 'source', v_source));
    insert into public.team_lead_alerts (lead_id, kind, created_at) values (v_lead, 'new', e.created_at);
  else
    -- What the lead did not know yet is filled in; nothing the team wrote is replaced.
    update public.team_leads l set
      last_in_at = greatest(l.last_in_at, e.created_at),
      name = coalesce(l.name, v_name),
      institution = coalesce(l.institution, e.institution),
      institution_id = coalesce(l.institution_id, e.institution_id),
      city = coalesce(l.city, v_city),
      phone = coalesce(l.phone, e.phone),
      email = coalesce(l.email, e.email),
      wants = coalesce(l.wants, v_wants)
    where l.id = v_lead;
    insert into public.team_lead_activity (lead_id, at, kind, data)
    values (v_lead, e.created_at, 'came_back', jsonb_build_object('enquiry_id', e.id, 'source', v_source));
    insert into public.team_lead_alerts (lead_id, kind, created_at) values (v_lead, 'returning', e.created_at);
  end if;
  update public.enquiries set lead_id = v_lead where id = e.id;
  return v_lead;
end;
$$;

-- Each enquiry, as it is added (and only when it is: a request already open is not added again).
create function private.enquiry_joins_lead() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.join_lead(new.id);
  return null;
end;
$$;

create trigger enquiries_join_lead after insert on public.enquiries
  for each row execute function private.enquiry_joins_lead();

-- A new Free college comes in too: the day its owner signs up, as an enquiry from the owner.
create function private.free_signup_enquiry() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.tier <> 'free' then
    return null;
  end if;
  insert into public.enquiries (kind, institution_id, asked_by, institution, email, created_at)
  select 'free_signup', new.institution_id, m.user_id, i.name, lower(u.email), new.starts_at
  from public.memberships m
  join public.institutions i on i.id = m.institution_id
  join auth.users u on u.id = m.user_id
  where m.institution_id = new.institution_id and m.role = 'owner' and u.email is not null
  order by m.created_at
  limit 1;
  return null;
end;
$$;

create trigger plans_free_signup after insert on public.plans
  for each row execute function private.free_signup_enquiry();

-- What happens to a lead, kept: status, owner, follow-up and edits. Moving on from New handles
-- what came in, so a college can ask again later (one open request at a time).
create function private.team_lead_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_by uuid := coalesce((select auth.uid()), new.updated_by);
  v_at timestamptz := coalesce(new.updated_at, now());
  v_fields text[] := array[]::text[];
begin
  if new.status is distinct from old.status then
    insert into public.team_lead_activity (lead_id, at, by, kind, data)
    values (new.id, v_at, v_by, 'status', jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.lost_reason, 'note', new.lost_note));
    if old.status = 'new' then
      update public.enquiries set handled_at = v_at, handled_by = v_by where lead_id = new.id and handled_at is null;
    end if;
  end if;
  if new.owner_id is distinct from old.owner_id then
    insert into public.team_lead_activity (lead_id, at, by, kind, data)
    values (new.id, v_at, v_by, 'owner', jsonb_build_object('from', old.owner_id, 'to', new.owner_id));
  end if;
  if new.next_follow_up is distinct from old.next_follow_up then
    insert into public.team_lead_activity (lead_id, at, by, kind, data)
    values (new.id, v_at, v_by, 'follow_up', jsonb_build_object('from', old.next_follow_up, 'to', new.next_follow_up));
  end if;
  if new.made_client_at is not null and old.made_client_at is null then
    insert into public.team_lead_activity (lead_id, at, by, kind, data)
    values (new.id, v_at, v_by, 'made_client', jsonb_build_object('institution_id', new.institution_id));
  end if;
  if new.name is distinct from old.name then v_fields := v_fields || 'name'; end if;
  if new.institution is distinct from old.institution then v_fields := v_fields || 'institution'; end if;
  if new.city is distinct from old.city then v_fields := v_fields || 'city'; end if;
  if new.phone is distinct from old.phone then v_fields := v_fields || 'phone'; end if;
  if new.email is distinct from old.email then v_fields := v_fields || 'email'; end if;
  if new.wants is distinct from old.wants then v_fields := v_fields || 'wants'; end if;
  -- An enquiry coming back fills in what was missing: that is its own line already.
  if cardinality(v_fields) > 0 and new.last_in_at = old.last_in_at then
    insert into public.team_lead_activity (lead_id, at, by, kind, data)
    values (new.id, v_at, v_by, 'edited', jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

create trigger team_leads_history after update on public.team_leads
  for each row execute function private.team_lead_changed();

-- Changing a lead ----------------------------------------------------------------------------------

-- A lead from the fields a person can set: who, the institution, city, phone, email, what they want.
create function private.lead_fields_ok(p_fields jsonb) returns void
language plpgsql immutable
set search_path = ''
as $$
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_fields) k where k <> all (array['name', 'institution', 'city', 'phone', 'email', 'wants', 'next_follow_up'])) then
    raise exception 'bad_fields' using errcode = '22023';
  end if;
end;
$$;

-- Added by hand, from a call, an event or a message: a social source, picked. The same email or
-- phone joins the lead there is. Says which lead, and whether it joined one.
create function public.add_team_lead(p_fields jsonb, p_source public.team_lead_source, p_owner uuid default null, p_note text default null)
returns table (lead_id uuid, joined boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_lead uuid;
  v_owner uuid := p_owner;
  v_email text := nullif(lower(btrim(coalesce(p_fields ->> 'email', ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_fields ->> 'phone', ''), '[[:space:]().-]', '', 'g'), '');
begin
  if not (private.is_team() or private.is_client_manager()) then
    raise exception 'not_team' using errcode = '42501';
  end if;
  perform private.lead_fields_ok(p_fields);
  if not private.is_social_source(p_source) then
    raise exception 'bad_source' using errcode = '22023';
  end if;
  -- A Client manager's leads are their own.
  if not private.is_team() then
    v_owner := v_me;
  elsif v_owner is not null and not exists (select 1 from public.team_users t where t.user_id = v_owner) then
    raise exception 'bad_owner' using errcode = '22023';
  end if;

  v_lead := private.same_lead(v_email, v_phone);
  if v_lead is not null then
    insert into public.team_lead_activity (lead_id, by, kind, data)
    values (v_lead, v_me, 'came_back', jsonb_build_object('source', p_source, 'by_hand', true));
    update public.team_leads set last_in_at = now() where id = v_lead;
    insert into public.team_lead_alerts (lead_id, kind, skip_user) values (v_lead, 'returning', v_me);
    if nullif(btrim(coalesce(p_note, '')), '') is not null then
      insert into public.team_lead_activity (lead_id, by, kind, body) values (v_lead, v_me, 'note', btrim(p_note));
    end if;
    return query select v_lead, true;
    return;
  end if;

  insert into public.team_leads (name, institution, city, phone, email, wants, source, owner_id, next_follow_up, created_by, updated_by)
  values (
    nullif(regexp_replace(btrim(coalesce(p_fields ->> 'name', '')), '[[:space:]]+', ' ', 'g'), ''),
    nullif(regexp_replace(btrim(coalesce(p_fields ->> 'institution', '')), '[[:space:]]+', ' ', 'g'), ''),
    nullif(btrim(coalesce(p_fields ->> 'city', '')), ''),
    v_phone,
    v_email,
    nullif(btrim(coalesce(p_fields ->> 'wants', '')), ''),
    p_source,
    v_owner,
    (p_fields ->> 'next_follow_up')::date,
    v_me,
    v_me
  )
  returning id into v_lead;
  insert into public.team_lead_activity (lead_id, by, kind, data) values (v_lead, v_me, 'created', jsonb_build_object('source', p_source, 'by_hand', true));
  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.team_lead_activity (lead_id, by, kind, body) values (v_lead, v_me, 'note', btrim(p_note));
  end if;
  insert into public.team_lead_alerts (lead_id, kind, skip_user) values (v_lead, 'new', v_me);
  return query select v_lead, false;
end;
$$;

-- The lead's details: only the fields given change. A follow-up of null clears it.
create function public.save_team_lead(p_lead uuid, p_fields jsonb) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.works_lead(p_lead) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform private.lead_fields_ok(p_fields);
  update public.team_leads l set
    name = case when p_fields ? 'name' then nullif(regexp_replace(btrim(coalesce(p_fields ->> 'name', '')), '[[:space:]]+', ' ', 'g'), '') else l.name end,
    institution = case when p_fields ? 'institution' then nullif(regexp_replace(btrim(coalesce(p_fields ->> 'institution', '')), '[[:space:]]+', ' ', 'g'), '') else l.institution end,
    city = case when p_fields ? 'city' then nullif(btrim(coalesce(p_fields ->> 'city', '')), '') else l.city end,
    phone = case when p_fields ? 'phone' then nullif(regexp_replace(coalesce(p_fields ->> 'phone', ''), '[[:space:]().-]', '', 'g'), '') else l.phone end,
    email = case when p_fields ? 'email' then nullif(lower(btrim(coalesce(p_fields ->> 'email', ''))), '') else l.email end,
    wants = case when p_fields ? 'wants' then nullif(btrim(coalesce(p_fields ->> 'wants', '')), '') else l.wants end,
    next_follow_up = case when p_fields ? 'next_follow_up' then (p_fields ->> 'next_follow_up')::date else l.next_follow_up end,
    updated_at = now(),
    updated_by = (select auth.uid())
  where l.id = p_lead;
end;
$$;

-- Status: Lost needs a reason (and may have a short note); any other status clears them.
create function public.set_team_lead_status(p_lead uuid, p_status public.team_lead_status, p_reason public.team_lead_lost_reason default null, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.works_lead(p_lead) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status = 'lost' and p_reason is null then
    raise exception 'lost_reason' using errcode = '22023';
  end if;
  update public.team_leads set
    status = p_status,
    lost_reason = case when p_status = 'lost' then p_reason end,
    lost_note = case when p_status = 'lost' then nullif(btrim(coalesce(p_note, '')), '') end,
    updated_at = now(),
    updated_by = (select auth.uid())
  where id = p_lead;
end;
$$;

-- The owner: Admins and Team members give a lead to anyone on the team, or to nobody.
create function public.set_team_lead_owner(p_lead uuid, p_owner uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if p_owner is not null and not exists (select 1 from public.team_users t where t.user_id = p_owner) then
    raise exception 'bad_owner' using errcode = '22023';
  end if;
  update public.team_leads set owner_id = p_owner, updated_at = now(), updated_by = (select auth.uid()) where id = p_lead;
  if not found then
    raise exception 'no_lead' using errcode = 'P0002';
  end if;
end;
$$;

create function public.add_team_lead_note(p_lead uuid, p_body text) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.works_lead(p_lead) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'bad_note' using errcode = '22023';
  end if;
  insert into public.team_lead_activity (lead_id, by, kind, body) values (p_lead, (select auth.uid()), 'note', btrim(p_body));
end;
$$;

-- Tracking links --------------------------------------------------------------------------------------

create function public.create_team_lead_link(p_name text, p_source public.team_lead_source)
returns table (id uuid, code text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code text;
  v_id uuid;
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  if not private.is_social_source(p_source) then
    raise exception 'bad_source' using errcode = '22023';
  end if;
  for attempt in 1..5 loop
    v_code := substr(md5(gen_random_uuid()::text), 1, 8);
    begin
      insert into public.team_lead_links (code, name, source, created_by)
      values (v_code, regexp_replace(btrim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), p_source, (select auth.uid()))
      returning team_lead_links.id into v_id;
      return query select v_id, v_code;
      return;
    exception when unique_violation then
      null;
    end;
  end loop;
  raise exception 'no_code' using errcode = 'P0001';
end;
$$;

create function public.archive_team_lead_link(p_link uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  update public.team_lead_links set archived_at = coalesce(archived_at, now()) where id = p_link;
end;
$$;

-- What the Talk to us form needs to know about a link, without signing in: whether it is live.
create function public.team_link_live(p_code text) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_lead_links l where l.code = lower(btrim(p_code)) and l.archived_at is null);
$$;

-- Each link with how many enquiries came through it: this month (India time) and in all.
create function public.team_lead_link_counts(p_now timestamptz default now())
returns table (link_id uuid, this_month integer, total integer)
language sql stable security definer
set search_path = ''
as $$
  select l.id,
    (count(e.id) filter (where (e.created_at at time zone 'Asia/Kolkata') >= date_trunc('month', p_now at time zone 'Asia/Kolkata')))::integer,
    count(e.id)::integer
  from public.team_lead_links l
  left join public.enquiries e on e.team_link_id = l.id and e.created_at <= p_now
  where private.is_team()
  group by l.id;
$$;

-- The website's form, now with the link it came through (a live one only) ----------------------

drop function public.submit_enquiry(text, text, public.enquiry_role, text, text, text, text);
create function public.submit_enquiry(
  p_name text,
  p_institution text,
  p_role public.enquiry_role,
  p_email text,
  p_phone text,
  p_program text,
  p_message text,
  p_link text default null
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_link uuid;
begin
  if (
    select count(*) from public.enquiries
    where email = v_email and created_at > now() - interval '1 day'
  ) >= private.enquiries_per_email_per_day() then
    raise exception 'enquiry_limit' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_link, '')), '') is not null then
    select l.id into v_link from public.team_lead_links l where l.code = lower(btrim(p_link)) and l.archived_at is null;
  end if;

  insert into public.enquiries (name, institution, role, email, phone, program, message, team_link_id)
  values (
    regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'),
    regexp_replace(trim(coalesce(p_institution, '')), '[[:space:]]+', ' ', 'g'),
    p_role,
    v_email,
    regexp_replace(coalesce(p_phone, ''), '[[:space:]().-]', '', 'g'),
    nullif(regexp_replace(trim(coalesce(p_program, '')), '[[:space:]]+', ' ', 'g'), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_link
  );
end;
$$;

-- Who an alert goes to: the owner, or every Admin when it has none; never the person who added it.
create function public.team_lead_alert_recipients(p_lead uuid, p_skip uuid default null) returns setof text
language sql stable security definer
set search_path = ''
as $$
  select lower(u.email::text)
  from auth.users u
  where u.email is not null
    and (p_skip is null or u.id <> p_skip)
    and case
      when (select l.owner_id from public.team_leads l where l.id = p_lead) is not null
        then u.id = (select l.owner_id from public.team_leads l where l.id = p_lead)
      else exists (select 1 from public.team_users t where t.user_id = u.id and t.role = 'admin')
    end
  order by 1;
$$;

-- The alerts waiting, each taken once (two sends at the same moment never send one twice).
create function public.claim_team_lead_alerts() returns setof public.team_lead_alerts
language sql volatile security definer
set search_path = ''
as $$
  update public.team_lead_alerts a set sent_at = now()
  where a.id in (select w.id from public.team_lead_alerts w where w.sent_at is null order by w.created_at for update skip locked)
  returning a.*;
$$;

revoke all on function public.claim_team_lead_alerts() from public, anon, authenticated;
grant execute on function public.claim_team_lead_alerts() to service_role;

revoke all on function
  public.add_team_lead(jsonb, public.team_lead_source, uuid, text),
  public.save_team_lead(uuid, jsonb),
  public.set_team_lead_status(uuid, public.team_lead_status, public.team_lead_lost_reason, text),
  public.set_team_lead_owner(uuid, uuid),
  public.add_team_lead_note(uuid, text),
  public.create_team_lead_link(text, public.team_lead_source),
  public.archive_team_lead_link(uuid),
  public.team_lead_link_counts(timestamptz),
  public.team_lead_alert_recipients(uuid, uuid),
  public.team_link_live(text),
  public.submit_enquiry(text, text, public.enquiry_role, text, text, text, text, text)
from public, anon;
grant execute on function
  public.add_team_lead(jsonb, public.team_lead_source, uuid, text),
  public.save_team_lead(uuid, jsonb),
  public.set_team_lead_status(uuid, public.team_lead_status, public.team_lead_lost_reason, text),
  public.set_team_lead_owner(uuid, uuid),
  public.add_team_lead_note(uuid, text),
  public.create_team_lead_link(text, public.team_lead_source),
  public.archive_team_lead_link(uuid),
  public.team_lead_link_counts(timestamptz)
to authenticated, service_role;
grant execute on function public.team_lead_alert_recipients(uuid, uuid) to service_role;
grant execute on function public.team_link_live(text), public.submit_enquiry(text, text, public.enquiry_role, text, text, text, text, text) to anon, authenticated, service_role;

-- Every enquiry already here joins its lead, oldest first; their alerts count as sent.
do $$
declare
  r record;
begin
  for r in select e.id from public.enquiries e where e.lead_id is null order by e.created_at, e.id loop
    perform private.join_lead(r.id);
  end loop;
  -- Nobody is emailed about what came in before Enquiries existed.
  update public.team_lead_alerts set sent_at = created_at where sent_at is null;
  -- What was handled already is past New.
  update public.team_leads l set status = 'contacted'
  where l.status = 'new' and not exists (select 1 from public.enquiries e where e.lead_id = l.id and e.handled_at is null);
end;
$$;

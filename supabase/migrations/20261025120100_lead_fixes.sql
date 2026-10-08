-- Enquiries, two fixes (spec section 27).
--
--   Make Client for a college not in Drishti   On a Won lead with no college, Admins and Team
--                     members add it (name, type, city, website, the owner's email):
--                     make_client_with_college() makes it a Client and starts onboarding, and the
--                     owner is invited to sign in (an owner invite: invites.role). If the email
--                     already belongs to a college in Drishti (a member, or an invitation waiting),
--                     or the website is a college that has signed up, that college is linked
--                     instead: never a duplicate. A record with the same website that has not
--                     signed up (a prospect, a rival record) becomes the college.
--   A Lost lead that comes back                It is New again. History keeps the Lost reason
--                     (the status line says what it was), and the alert says it came back after
--                     Lost, to the owner or every Admin.

-- Owner invitations ------------------------------------------------------------------------------

alter table public.invites add column role public.membership_role not null default 'member';

-- As before, with the invite's role: an owner invite makes the owner, unless the college has one.
create or replace function public.accept_invites()
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  address text;
  invite record;
begin
  if me is null
    or exists (select 1 from public.memberships where user_id = me)
    or exists (select 1 from public.team_users where user_id = me) then
    return null;
  end if;
  select lower(u.email) into address from auth.users u where u.id = me;
  select i.id, i.institution_id, i.role into invite
  from public.invites i
  where i.email = address and i.accepted_at is null
  order by i.created_at
  limit 1
  for update;
  if not found then
    return null;
  end if;
  insert into public.memberships (user_id, institution_id, role)
  values (
    me,
    invite.institution_id,
    case when invite.role = 'owner' and not exists (select 1 from public.memberships m where m.institution_id = invite.institution_id and m.role = 'owner') then 'owner' else 'member' end::public.membership_role
  );
  update public.invites set accepted_at = now(), accepted_by = me where id = invite.id;
  return invite.institution_id;
end;
$$;

-- Make Client for a college not in Drishti --------------------------------------------------------

create function public.make_client_with_college(
  p_lead uuid,
  p_name text,
  p_type public.institution_type,
  p_city text,
  p_state text,
  p_website text,
  p_owner_email text
) returns table (institution_id uuid, outcome text, invited boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_lead public.team_leads%rowtype;
  v_email text := lower(btrim(coalesce(p_owner_email, '')));
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
  v_user uuid;
  v_inst uuid;
  v_outcome text;
  v_invited boolean := false;
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  select * into v_lead from public.team_leads where id = p_lead for update;
  if v_lead.id is null then
    raise exception 'no_lead' using errcode = 'P0002';
  end if;
  if v_lead.status <> 'won' then
    raise exception 'not_won' using errcode = 'P0001';
  end if;
  if v_lead.made_client_at is not null then
    raise exception 'made_client' using errcode = 'P0001';
  end if;
  -- Linked to a college that has signed up: Make Client (make_client_from_lead) is the way.
  if v_lead.institution_id is not null and exists (select 1 from public.institution_status s where s.institution_id = v_lead.institution_id and s.claimed) then
    raise exception 'linked' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'bad_email' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'bad_name' using errcode = '22023';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = v_email;
  if v_user is not null and exists (select 1 from public.team_users t where t.user_id = v_user) then
    raise exception 'team_email' using errcode = 'P0001';
  end if;

  -- 0. Linked to a record that has not signed up (a prospect): that one becomes the college.
  if v_lead.institution_id is not null then
    v_inst := v_lead.institution_id;
    v_outcome := 'claimed';
    update public.institutions set name = v_name, type = p_type, city = p_city, state = p_state, website = p_website where id = v_inst;
  end if;
  -- 1. The email belongs to a college in Drishti: its own, or the one waiting for it.
  if v_inst is null and v_user is not null then
    select m.institution_id into v_inst from public.memberships m where m.user_id = v_user order by (m.role = 'owner') desc, m.created_at limit 1;
  end if;
  if v_inst is null then
    select i.institution_id into v_inst from public.invites i where i.email = v_email and i.accepted_at is null order by i.created_at limit 1;
  end if;
  if v_outcome is not null then
    null;
  elsif v_inst is not null then
    v_outcome := 'linked';
  else
    -- 2. The website: a college that has signed up is linked; a record that has not becomes it.
    select i.id into v_inst from public.institutions i where private.website_host(i.website) = private.website_host(p_website) for update;
    if v_inst is not null and exists (select 1 from public.institution_status s where s.institution_id = v_inst and s.claimed) then
      v_outcome := 'linked';
    elsif v_inst is not null then
      v_outcome := 'claimed';
      update public.institutions set name = v_name, type = p_type, city = p_city, state = p_state, website = p_website where id = v_inst;
    else
      -- 3. A new college.
      v_outcome := 'created';
      insert into public.institutions (slug, name, type, city, state, website)
      values (private.unique_slug(v_name), v_name, p_type, p_city, p_state, p_website)
      returning id into v_inst;
    end if;
  end if;

  -- Signed up by the team, for the owner who comes in through the invitation.
  insert into public.institution_status (institution_id, claimed, claimed_at, created_by)
  values (v_inst, true, now(), v_me)
  on conflict on constraint institution_status_pkey do update set claimed = true, claimed_at = coalesce(public.institution_status.claimed_at, now());

  -- The plan, as set_plan sets a Client's (a college already a Client keeps its plan).
  if exists (select 1 from public.plans p where p.institution_id = v_inst) then
    if private.effective_tier(v_inst) <> 'client' then
      update public.plans set tier = 'client', starts_at = now(), ends_at = null, paid_months = null, set_by = v_me where plans.institution_id = v_inst;
    end if;
  else
    insert into public.plans (institution_id, tier, starts_at, set_by) values (v_inst, 'client', now(), v_me);
  end if;

  -- Onboarding starts: the Client Brain.
  insert into public.brains (institution_id, started_by) values (v_inst, v_me)
  on conflict on constraint brains_pkey do nothing;

  -- The owner's invitation, unless they are in the college already or have one waiting.
  if not exists (select 1 from public.memberships m where m.institution_id = v_inst and m.user_id = v_user)
     and not exists (select 1 from public.invites i where i.institution_id = v_inst and i.email = v_email and i.accepted_at is null) then
    insert into public.invites (institution_id, email, invited_by, role) values (v_inst, v_email, v_me, 'owner');
    v_invited := true;
  end if;

  update public.team_leads set institution_id = v_inst, made_client_at = now(), updated_at = now(), updated_by = v_me where id = p_lead;
  return query select v_inst, v_outcome, v_invited;
end;
$$;

revoke all on function public.make_client_with_college(uuid, text, public.institution_type, text, text, text, text) from public, anon;
grant execute on function public.make_client_with_college(uuid, text, public.institution_type, text, text, text, text) to authenticated, service_role;

-- A Lost lead that comes back ---------------------------------------------------------------------

alter table public.team_lead_alerts drop constraint team_lead_alerts_kind_check;
alter table public.team_lead_alerts add constraint team_lead_alerts_kind_check check (kind in ('new', 'returning', 'reopened'));
-- Why it had been lost, for the email.
alter table public.team_lead_alerts add column was_lost public.team_lead_lost_reason;

-- A Lost lead is New again. Says what it had been lost for, or null when it was not Lost.
create function private.reopen_if_lost(p_lead uuid, p_at timestamptz, p_by uuid) returns public.team_lead_lost_reason
language plpgsql security definer
set search_path = ''
as $$
declare
  v_reason public.team_lead_lost_reason;
begin
  select l.lost_reason into v_reason from public.team_leads l where l.id = p_lead and l.status = 'lost' for update;
  if v_reason is null then
    return null;
  end if;
  update public.team_leads set status = 'new', lost_reason = null, lost_note = null, updated_at = p_at, updated_by = p_by where id = p_lead;
  return v_reason;
end;
$$;

-- As before: a Lost lead that comes back is New again, and its alert says so.
create or replace function private.join_lead(p_enquiry uuid)
returns uuid
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
  v_was public.team_lead_lost_reason;
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
    v_was := private.reopen_if_lost(v_lead, e.created_at, null);
    insert into public.team_lead_alerts (lead_id, kind, created_at, was_lost) values (v_lead, case when v_was is null then 'returning' else 'reopened' end, e.created_at, v_was);
  end if;
  update public.enquiries set lead_id = v_lead where id = e.id;
  return v_lead;
end;
$$;

create or replace function public.add_team_lead(p_fields jsonb, p_source team_lead_source, p_owner uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
returns TABLE(lead_id uuid, joined boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_lead uuid;
  v_was public.team_lead_lost_reason;
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
    v_was := private.reopen_if_lost(v_lead, now(), v_me);
    insert into public.team_lead_alerts (lead_id, kind, skip_user, was_lost) values (v_lead, case when v_was is null then 'returning' else 'reopened' end, v_me, v_was);
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

-- As before, with what a lead had been lost for when it moves on from Lost; and an edit lists its
-- fields with array_append (text[] || 'name' reads the word as an array, and failed).
create or replace function private.team_lead_changed()
returns trigger
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
    values (new.id, v_at, v_by, 'status', jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.lost_reason, 'note', new.lost_note, 'was_reason', case when old.status = 'lost' then old.lost_reason end, 'was_note', case when old.status = 'lost' then old.lost_note end));
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
  -- An enquiry coming back fills in what was missing: that is its own line already.
  if new.last_in_at = old.last_in_at then
    if new.institution_id is distinct from old.institution_id and new.made_client_at is not distinct from old.made_client_at then
      insert into public.team_lead_activity (lead_id, at, by, kind, data)
      values (new.id, v_at, v_by, 'linked', jsonb_build_object('from', old.institution_id, 'to', new.institution_id));
    end if;
    if new.name is distinct from old.name then v_fields := array_append(v_fields, 'name'); end if;
    if new.institution is distinct from old.institution then v_fields := array_append(v_fields, 'institution'); end if;
    if new.city is distinct from old.city then v_fields := array_append(v_fields, 'city'); end if;
    if new.phone is distinct from old.phone then v_fields := array_append(v_fields, 'phone'); end if;
    if new.email is distinct from old.email then v_fields := array_append(v_fields, 'email'); end if;
    if new.wants is distinct from old.wants then v_fields := array_append(v_fields, 'wants'); end if;
    if cardinality(v_fields) > 0 then
      insert into public.team_lead_activity (lead_id, at, by, kind, data)
      values (new.id, v_at, v_by, 'edited', jsonb_build_object('fields', to_jsonb(v_fields)));
    end if;
  end if;
  return null;
end;
$$;

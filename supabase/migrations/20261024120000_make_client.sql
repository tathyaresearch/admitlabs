-- Enquiries, step 3 (spec section 27): a lead linked to its college in Drishti, and Make Client.
--
--   link_team_lead()         Whoever works a lead links it to an institution in Drishti (or takes
--                            the link off). History says so.
--   make_client_from_lead()  A Won lead whose college has signed up becomes a Client: its plan is
--                            set to Client (as set_plan does) and its onboarding starts (the Client
--                            Brain). Admins and Team members only, never a Client manager. The
--                            server then runs the first Client Audit and what Drishti found
--                            (src/brain/jobs.ts), as the institution page's Make them a Client does.

alter table public.team_lead_activity drop constraint team_lead_activity_kind_check;
alter table public.team_lead_activity add constraint team_lead_activity_kind_check
  check (kind in ('created', 'came_back', 'note', 'status', 'owner', 'follow_up', 'edited', 'linked', 'made_client'));

-- As in 20261023120100_team_leads.sql, with the college a lead is linked to.
create or replace function private.team_lead_changed() returns trigger
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
  -- An enquiry coming back fills in what was missing: that is its own line already.
  if new.last_in_at = old.last_in_at then
    if new.institution_id is distinct from old.institution_id and new.made_client_at is not distinct from old.made_client_at then
      insert into public.team_lead_activity (lead_id, at, by, kind, data)
      values (new.id, v_at, v_by, 'linked', jsonb_build_object('from', old.institution_id, 'to', new.institution_id));
    end if;
    if new.name is distinct from old.name then v_fields := v_fields || 'name'; end if;
    if new.institution is distinct from old.institution then v_fields := v_fields || 'institution'; end if;
    if new.city is distinct from old.city then v_fields := v_fields || 'city'; end if;
    if new.phone is distinct from old.phone then v_fields := v_fields || 'phone'; end if;
    if new.email is distinct from old.email then v_fields := v_fields || 'email'; end if;
    if new.wants is distinct from old.wants then v_fields := v_fields || 'wants'; end if;
    if cardinality(v_fields) > 0 then
      insert into public.team_lead_activity (lead_id, at, by, kind, data)
      values (new.id, v_at, v_by, 'edited', jsonb_build_object('fields', to_jsonb(v_fields)));
    end if;
  end if;
  return null;
end;
$$;

create function public.link_team_lead(p_lead uuid, p_institution uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.works_lead(p_lead) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_institution is not null and not exists (select 1 from public.institutions i where i.id = p_institution) then
    raise exception 'no_institution' using errcode = 'P0002';
  end if;
  update public.team_leads set institution_id = p_institution, updated_at = now(), updated_by = (select auth.uid())
  where id = p_lead and made_client_at is null;
  if not found then
    raise exception 'made_client' using errcode = 'P0001';
  end if;
end;
$$;

-- Says the institution it made a Client.
create function public.make_client_from_lead(p_lead uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_lead public.team_leads%rowtype;
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
  if v_lead.institution_id is null then
    raise exception 'no_institution' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.institution_status s where s.institution_id = v_lead.institution_id and s.claimed) then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
  -- The plan, as set_plan sets a Client's (a college already a Client keeps its plan).
  if private.effective_tier(v_lead.institution_id) <> 'client' then
    update public.plans
    set tier = 'client', starts_at = now(), ends_at = null, paid_months = null, set_by = (select auth.uid())
    where institution_id = v_lead.institution_id;
    if not found then
      raise exception 'no_plan' using errcode = 'P0001';
    end if;
  end if;
  -- Onboarding starts: the Client Brain (start_brain).
  insert into public.brains (institution_id, started_by) values (v_lead.institution_id, (select auth.uid()))
  on conflict (institution_id) do nothing;
  update public.team_leads set made_client_at = now(), updated_at = now(), updated_by = (select auth.uid()) where id = p_lead;
  return v_lead.institution_id;
end;
$$;

revoke all on function public.link_team_lead(uuid, uuid), public.make_client_from_lead(uuid) from public, anon;
grant execute on function public.link_team_lead(uuid, uuid), public.make_client_from_lead(uuid) to authenticated, service_role;

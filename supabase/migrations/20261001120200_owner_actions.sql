-- Owner actions and the Audit writer.
--
-- Institution users cannot write to institution tables directly (row level security keeps
-- those team only). These functions check who is calling and change only what that person
-- may change. Errors carry a short code in the message (for example 'already_claimed') that
-- the app turns into plain words.

create function private.slugify(input text) returns text
language sql immutable
set search_path = ''
as $$
  select coalesce(
    nullif(regexp_replace(left(regexp_replace(regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), 60), '-+$', ''), ''),
    'institution'
  );
$$;

create function private.unique_slug(input text) returns text
language plpgsql stable
set search_path = ''
as $$
declare
  base text := private.slugify(input);
  candidate text := base;
  attempt integer := 1;
begin
  while exists (select 1 from public.institutions where slug = candidate) loop
    attempt := attempt + 1;
    candidate := base || '-' || attempt;
  end loop;
  return candidate;
end;
$$;

-- The institution the caller owns, or an error.
create function private.owned_institution() returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select m.institution_id into target
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.role = 'owner'
  order by m.created_at
  limit 1;
  if target is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return target;
end;
$$;

revoke all on function private.slugify(text), private.unique_slug(text), private.owned_institution() from public;

-- Signup: create the institution, or claim the record that already has this website (a rival
-- someone tracks, or a team prospect). The new owner's entries win. Earlier rival and team
-- Audits of a claimed record stay private: the owner only ever sees their own Audits.
create function public.onboard_institution(
  p_name text,
  p_type public.institution_type,
  p_city text,
  p_state text,
  p_website text,
  p_instagram text,
  p_youtube text,
  p_other_links jsonb,
  p_programs jsonb
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target uuid;
  already_claimed boolean;
  program jsonb;
  kept text[] := array[]::text[];
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if exists (select 1 from public.team_users where user_id = me) then
    raise exception 'team_user' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.memberships where user_id = me) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;
  if p_programs is null or jsonb_typeof(p_programs) <> 'array' or jsonb_array_length(p_programs) = 0 then
    raise exception 'no_programs' using errcode = 'P0001';
  end if;

  select i.id into target
  from public.institutions i
  where private.website_host(i.website) = private.website_host(p_website)
  for update;

  if target is not null then
    select coalesce(s.claimed, false) into already_claimed from public.institution_status s where s.institution_id = target;
    if coalesce(already_claimed, false) then
      raise exception 'already_claimed' using errcode = 'P0001';
    end if;
    update public.institutions
    set name = p_name, type = p_type, city = p_city, state = p_state, website = p_website,
        instagram = nullif(btrim(p_instagram), ''), youtube = nullif(btrim(p_youtube), ''), other_links = coalesce(p_other_links, '{}'::jsonb)
    where id = target;
    insert into public.institution_status (institution_id, claimed, claimed_at, created_by)
    values (target, true, now(), me)
    on conflict (institution_id) do update set claimed = true, claimed_at = now();
  else
    insert into public.institutions (slug, name, type, city, state, website, instagram, youtube, other_links)
    values (
      private.unique_slug(p_name), p_name, p_type, p_city, p_state, p_website,
      nullif(btrim(p_instagram), ''), nullif(btrim(p_youtube), ''), coalesce(p_other_links, '{}'::jsonb)
    )
    returning id into target;
    insert into public.institution_status (institution_id, claimed, claimed_at, created_by)
    values (target, true, now(), me);
  end if;

  -- The owner's program list wins: matching programs are kept (or brought back), others archived.
  for program in select value from jsonb_array_elements(p_programs) loop
    insert into public.programs (institution_id, name, program_key)
    values (target, btrim(program ->> 'name'), nullif(program ->> 'program_key', ''))
    on conflict (institution_id, name) do update set archived_at = null, program_key = excluded.program_key;
    kept := kept || btrim(program ->> 'name');
  end loop;
  update public.programs
  set archived_at = now()
  where institution_id = target and archived_at is null and not (name = any (kept));

  insert into public.memberships (user_id, institution_id, role) values (me, target, 'owner');
  insert into public.plans (institution_id, tier, starts_at) values (target, 'free', now())
  on conflict (institution_id) do nothing;
  return target;
exception
  when unique_violation then
    raise exception 'already_claimed' using errcode = 'P0001';
end;
$$;

-- The one program a Free Audit covers. Can change at any time; it applies at the next free Audit.
create function public.set_free_program(p_program uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select p.institution_id into target from public.programs p where p.id = p_program and p.archived_at is null;
  if target is null or not private.is_owner(target) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.plans set free_program_id = p_program where institution_id = target;
  if not found then
    insert into public.plans (institution_id, tier, starts_at, free_program_id) values (target, 'free', now(), p_program);
  end if;
end;
$$;

-- Institution details and links. Changes apply from the next Audit.
create function public.update_institution(
  p_name text,
  p_type public.institution_type,
  p_city text,
  p_state text,
  p_website text,
  p_instagram text,
  p_youtube text,
  p_other_links jsonb
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid := private.owned_institution();
begin
  update public.institutions
  set name = p_name, type = p_type, city = p_city, state = p_state, website = p_website,
      instagram = nullif(btrim(p_instagram), ''), youtube = nullif(btrim(p_youtube), ''), other_links = coalesce(p_other_links, '{}'::jsonb)
  where id = target;
exception
  when unique_violation then
    raise exception 'website_taken' using errcode = 'P0001';
end;
$$;

-- Add a program, or bring back an archived one with the same name.
create function public.add_program(p_name text, p_program_key text) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid := private.owned_institution();
  created uuid;
begin
  insert into public.programs (institution_id, name, program_key)
  values (target, btrim(p_name), nullif(p_program_key, ''))
  on conflict (institution_id, name) do update set archived_at = null
  returning id into created;
  return created;
end;
$$;

-- Remove a program from future Audits. Past Audits keep it.
create function public.archive_program(p_program uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select p.institution_id into target from public.programs p where p.id = p_program and p.archived_at is null;
  if target is null or not private.is_owner(target) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.programs where institution_id = target and archived_at is null) <= 1 then
    raise exception 'last_program' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.plans where institution_id = target and free_program_id = p_program) then
    if private.effective_tier(target) = 'free' then
      raise exception 'free_program' using errcode = 'P0001';
    end if;
    update public.plans set free_program_id = null where institution_id = target;
  end if;
  update public.programs set archived_at = now() where id = p_program;
end;
$$;

-- Invite someone by email. No email is sent in this build: they join when they sign in.
create function public.invite_member(p_email text) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid := private.owned_institution();
  address text := lower(btrim(p_email));
  created uuid;
begin
  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
    where m.institution_id = target and lower(u.email) = address
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  insert into public.invites (institution_id, email, invited_by)
  values (target, address, (select auth.uid()))
  on conflict (institution_id, email) where accepted_at is null do update set invited_by = excluded.invited_by
  returning id into created;
  return created;
end;
$$;

create function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.invites i where i.id = p_invite and i.accepted_at is null and private.is_owner(i.institution_id);
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

create function public.remove_member(p_user uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid := private.owned_institution();
begin
  delete from public.memberships m where m.user_id = p_user and m.institution_id = target and m.role = 'member';
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

-- At sign in: someone with no institution who has been invited joins as a Member.
create function public.accept_invites() returns uuid
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
  select i.id, i.institution_id into invite
  from public.invites i
  where i.email = address and i.accepted_at is null
  order by i.created_at
  limit 1
  for update;
  if not found then
    return null;
  end if;
  insert into public.memberships (user_id, institution_id, role) values (me, invite.institution_id, 'member');
  update public.invites set accepted_at = now(), accepted_by = me where id = invite.id;
  return invite.institution_id;
end;
$$;

-- The people at an institution, with their emails, for Settings.
create function public.institution_people(p_institution uuid)
returns table (user_id uuid, email text, role public.membership_role, joined_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  order by m.role, m.created_at;
$$;

create function public.mark_notifications_read(p_ids uuid[] default null) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications n
  set read = true
  where not n.read and private.is_member(n.institution_id) and (p_ids is null or n.id = any (p_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Saves a finished Audit in one transaction: scores, program scores, every check with its
-- details, and the "Your new Audit is ready" notification. Server only (service key): scores
-- always come from the scoring engine, never from a browser.
create function public.record_audit(payload jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_institution uuid := (payload ->> 'institution_id')::uuid;
  v_kind public.audit_kind := (payload ->> 'kind')::public.audit_kind;
  v_trigger public.audit_trigger := (payload ->> 'trigger')::public.audit_trigger;
  v_run_at timestamptz := (payload ->> 'run_at')::timestamptz;
  v_audit uuid;
  v_check uuid;
  item jsonb;
begin
  -- One Audit at a time per institution, so two refreshes cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtextextended(v_institution::text, 0));

  -- Paid gets one extra manual refresh each calendar month, India time (spec section 11).
  if v_trigger = 'manual' and v_kind = 'paid' and exists (
    select 1 from public.audits a
    where a.institution_id = v_institution and a.kind = 'paid' and a.trigger = 'manual'
      and date_trunc('month', a.run_at at time zone 'Asia/Kolkata') = date_trunc('month', v_run_at at time zone 'Asia/Kolkata')
  ) then
    raise exception 'refresh_used' using errcode = 'P0001';
  end if;

  insert into public.audits (
    institution_id, run_at, kind, trigger, program_count, overall, discovered, trusted, chosen,
    overall_change, discovered_change, trusted_change, chosen_change, config_version, created_by, previous_audit_id
  ) values (
    v_institution, v_run_at, v_kind, v_trigger, greatest(1, jsonb_array_length(coalesce(payload -> 'programs', '[]'::jsonb))),
    (payload ->> 'overall')::smallint, (payload ->> 'discovered')::smallint, (payload ->> 'trusted')::smallint, (payload ->> 'chosen')::smallint,
    (payload ->> 'overall_change')::smallint, (payload ->> 'discovered_change')::smallint,
    (payload ->> 'trusted_change')::smallint, (payload ->> 'chosen_change')::smallint,
    (payload ->> 'config_version')::integer, (payload ->> 'created_by')::uuid, (payload ->> 'previous_audit_id')::uuid
  ) returning id into v_audit;

  insert into public.audit_program_scores (
    audit_id, program_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change
  )
  select v_audit, (p ->> 'program_id')::uuid,
    (p ->> 'overall')::smallint, (p ->> 'discovered')::smallint, (p ->> 'trusted')::smallint, (p ->> 'chosen')::smallint,
    (p ->> 'overall_change')::smallint, (p ->> 'discovered_change')::smallint, (p ->> 'trusted_change')::smallint, (p ->> 'chosen_change')::smallint
  from jsonb_array_elements(payload -> 'programs') as p;

  for item in select value from jsonb_array_elements(payload -> 'checks') loop
    insert into public.audit_checks (
      audit_id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, previous_result, checked_at
    ) values (
      v_audit, (item ->> 'program_id')::uuid, (item ->> 'pillar')::public.pillar, (item ->> 'check_key')::public.check_key,
      (item ->> 'result')::public.check_result, (item ->> 'points_awarded')::numeric, (item ->> 'points_max')::smallint,
      (item ->> 'strength_rank')::smallint, (item ->> 'fix_rank')::smallint, (item ->> 'previous_result')::public.check_result,
      (item ->> 'checked_at')::timestamptz
    ) returning id into v_check;
    insert into public.audit_check_details (audit_check_id, finding, why_it_matters, how_to_fix, difficulty, source_url)
    values (v_check, item ->> 'finding', item ->> 'why_it_matters', item ->> 'how_to_fix', (item ->> 'difficulty')::public.difficulty, item ->> 'source_url');
  end loop;

  if jsonb_typeof(payload -> 'notification') = 'object' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'audit_ready', payload -> 'notification' ->> 'text', payload -> 'notification' ->> 'link', v_run_at);
  end if;

  return v_audit;
end;
$$;

revoke all on function
  public.onboard_institution(text, public.institution_type, text, text, text, text, text, jsonb, jsonb),
  public.set_free_program(uuid),
  public.update_institution(text, public.institution_type, text, text, text, text, text, jsonb),
  public.add_program(text, text),
  public.archive_program(uuid),
  public.invite_member(text),
  public.revoke_invite(uuid),
  public.remove_member(uuid),
  public.accept_invites(),
  public.institution_people(uuid),
  public.mark_notifications_read(uuid[]),
  public.record_audit(jsonb)
from public, anon, authenticated;

grant execute on function
  public.onboard_institution(text, public.institution_type, text, text, text, text, text, jsonb, jsonb),
  public.set_free_program(uuid),
  public.update_institution(text, public.institution_type, text, text, text, text, text, jsonb),
  public.add_program(text, text),
  public.archive_program(uuid),
  public.invite_member(text),
  public.revoke_invite(uuid),
  public.remove_member(uuid),
  public.accept_invites(),
  public.institution_people(uuid),
  public.mark_notifications_read(uuid[])
to authenticated;

grant execute on function public.record_audit(jsonb) to service_role;

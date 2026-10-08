-- Client Brain (spec section 26): one living knowledge base per Client college, shared by its
-- owner, its members and the AdmitLabs team, plus the team's own notes that the college never
-- sees. Started by the team ("Start onboarding"), pre-filled from the latest Audit, filled on
-- the kickoff call and through Help us know you, then marked Ready.
--
--   Names        person_names: each person's name, set once (set_my_name). History shows it,
--                or the email when there is none. institution_people() and team_people() say it.
--   The Brain    brains (onboarding or ready), brain_items (one fact each, by kind), brain_steps
--                (the onboarding checklist), brain_checks (when each fact of the details added by
--                you was last checked), brain_changes (every change: who, when, before, after).
--   One source   Facts that live elsewhere stay there: the institution record, the details
--                added by you (now edited by a Client's members and the team too, and with a
--                program's level, highlights and "push most") and the team's private notes.
--   Writes       Only through the functions below, which check the plan (Client), the person
--                (the team, or the college's own people once onboarding has started) and that no
--                password or login is in the text. A Client that ends: the college no longer sees
--                its Brain; the team still reads it, and nobody changes it.
--   Files        A logo and brand guidelines, in the private bucket brain-files.
--   Team list    A Client whose Brain is not Ready needs attention (reason 6).

-- Names -------------------------------------------------------------------------------------------

create table public.person_names (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  constraint person_names_name check (char_length(name) between 1 and 80 and name = btrim(name))
);

alter table public.person_names enable row level security;
grant select on public.person_names to authenticated;
grant all on public.person_names to service_role;
revoke all on public.person_names from anon;

-- A name shows to its person, the team, the people of the same institution, and, for a team
-- user, to everyone signed in: it says who changed a Client's Brain.
create function private.can_see_name(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select target = (select auth.uid())
    or private.is_team()
    or exists (select 1 from public.team_users t where t.user_id = target)
    or exists (
      select 1 from public.memberships a
      join public.memberships b on b.institution_id = a.institution_id
      where a.user_id = target and b.user_id = (select auth.uid())
    );
$$;

create policy person_names_read on public.person_names
  for select to authenticated using (private.can_see_name(user_id));

-- Each person sets their own name; an empty one takes it away.
create function public.set_my_name(p_name text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'), '');
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if v_name is null then
    delete from public.person_names where user_id = (select auth.uid());
    return;
  end if;
  if char_length(v_name) > 80 then
    raise exception 'name_too_long' using errcode = '22023';
  end if;
  insert into public.person_names (user_id, name, updated_at) values ((select auth.uid()), v_name, now())
  on conflict (user_id) do update set name = excluded.name, updated_at = excluded.updated_at;
end;
$$;

drop function public.institution_people(uuid);
create function public.institution_people(p_institution uuid)
returns table (user_id uuid, email text, role public.membership_role, joined_at timestamptz, summary_email boolean, name text)
language sql stable security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at, m.summary_email, n.name
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.person_names n on n.user_id = m.user_id
  where m.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  order by m.role, m.created_at;
$$;

drop function public.team_people();
create function public.team_people()
returns table (user_id uuid, email text, role public.team_role, since timestamptz, pending boolean, name text)
language sql stable security definer
set search_path = ''
as $$
  select * from (
    select t.user_id, u.email::text, t.role, t.created_at, false, n.name
    from public.team_users t
    join auth.users u on u.id = t.user_id
    left join public.person_names n on n.user_id = t.user_id
    union all
    select null::uuid, i.email, i.role, i.created_at, true, null::text
    from public.team_invites i
  ) people
  where private.is_team()
  order by 5, 3 desc, 2;
$$;

revoke all on function public.set_my_name(text), public.institution_people(uuid), public.team_people() from public, anon;
grant execute on function public.set_my_name(text), public.institution_people(uuid), public.team_people() to authenticated;
grant execute on function public.institution_people(uuid), public.team_people() to service_role;
grant execute on function private.can_see_name(uuid) to authenticated, service_role;

-- A program's level, its highlights, and the programs to push most ------------------------------

alter table public.program_details
  add column level text,
  add column highlights text,
  add column push boolean not null default false,
  add constraint program_details_level check (level is null or level in ('certificate', 'diploma', 'ug', 'pg', 'doctorate')),
  add constraint program_details_highlights check (highlights is null or char_length(highlights) between 1 and 280);

-- The Brain ---------------------------------------------------------------------------------------

create type public.brain_status as enum ('onboarding', 'ready');
create type public.brain_kind as enum (
  'contact', 'talk', 'goals', 'target', 'rivals', 'regions',
  'logo', 'colours', 'fonts', 'tagline', 'tone', 'avoid', 'dos', 'guidelines',
  'award', 'placement_list', 'alumnus', 'review',
  'link', 'date', 'plan', 'script', 'worked', 'note',
  'skip', 'found'
);
create type public.brain_source as enum ('drishti', 'college', 'team');
create type public.brain_step as enum ('drive_shared', 'brand_kit', 'social_access', 'media_received', 'approver_confirmed', 'plan_agreed');

create table public.brains (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  status public.brain_status not null default 'onboarding',
  started_at timestamptz not null default now(),
  started_by uuid references auth.users (id) on delete set null,
  ready_at timestamptz,
  ready_by uuid references auth.users (id) on delete set null,
  constraint brains_ready check ((status = 'ready') = (ready_at is not null))
);

create table public.brain_items (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.brains (institution_id) on delete cascade,
  kind public.brain_kind not null,
  fields jsonb not null,
  -- Drishti pre-filled it and nobody has confirmed it yet (the team only sees these).
  to_confirm boolean not null default false,
  source public.brain_source not null,
  -- Saved from Help us know you.
  via_help boolean not null default false,
  source_url text,
  found_at timestamptz,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- BRAIN_RULES.factMax is 4000 characters of JSON; stored JSON spells it a little longer.
  constraint brain_items_fields check (jsonb_typeof(fields) = 'object' and char_length(fields::text) <= 5000),
  constraint brain_items_found check (kind <> 'found' or to_confirm),
  constraint brain_items_source_url check (source_url is null or source_url ~* '^https?://')
);
create index brain_items_institution_idx on public.brain_items (institution_id, kind);
-- One of each of these per college (SINGLE_KINDS in src/brain/model.ts).
create unique index brain_items_single_idx on public.brain_items (institution_id, kind)
  where kind in ('talk', 'goals', 'target', 'rivals', 'regions', 'logo', 'colours', 'fonts', 'tagline', 'tone', 'avoid', 'dos', 'guidelines');
-- One main contact, one who approves content; one mark per missing fact; one suggestion per fact.
create unique index brain_items_contact_role_idx on public.brain_items (institution_id, (fields ->> 'role'))
  where kind = 'contact' and fields ->> 'role' in ('main', 'approver');
create unique index brain_items_skip_idx on public.brain_items (institution_id, (fields ->> 'slot')) where kind = 'skip';
create unique index brain_items_found_idx on public.brain_items (institution_id, (fields ->> 'target')) where kind = 'found';

create table public.brain_steps (
  institution_id uuid not null references public.brains (institution_id) on delete cascade,
  step public.brain_step not null,
  done_at timestamptz not null default now(),
  done_by uuid references auth.users (id) on delete set null,
  primary key (institution_id, step)
);

-- When each fact of the details added by you was last changed, or said to be still right.
create table public.brain_checks (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  fact text not null,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users (id) on delete set null,
  primary key (institution_id, fact),
  constraint brain_checks_fact check (fact ~ '^(about|program:[0-9a-f-]{36}:(fees|dates|details))$')
);

create table public.brain_changes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  at timestamptz not null default now(),
  by uuid references auth.users (id) on delete set null,
  what text not null,
  -- 'item:<id>', 'about', 'program:<id>', 'step:<step>', 'brain', 'team-note:<id>'.
  target text not null,
  kind text,
  field text,
  before jsonb,
  after jsonb,
  team_only boolean not null default false,
  constraint brain_changes_what check (what in ('added', 'found', 'changed', 'confirmed', 'corrected', 'not_right', 'removed', 'checked', 'started', 'ready', 'step_done', 'step_undone'))
);
create index brain_changes_institution_idx on public.brain_changes (institution_id, at desc);
create index brain_changes_target_idx on public.brain_changes (institution_id, target, at desc);

-- Who reads a college's Brain: the AdmitLabs team, and the college's own people while it is a Client.
create function private.can_read_brain(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_team() or (private.is_member(target) and private.effective_tier(target) = 'client');
$$;

-- Who changes it: the same people, once onboarding has started, while the college is a Client.
create function private.can_edit_brain(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.effective_tier(target) = 'client'
    and (private.is_team() or private.is_member(target))
    and exists (select 1 from public.brains b where b.institution_id = target);
$$;

alter table public.brains enable row level security;
alter table public.brain_items enable row level security;
alter table public.brain_steps enable row level security;
alter table public.brain_checks enable row level security;
alter table public.brain_changes enable row level security;
grant select on public.brains, public.brain_items, public.brain_steps, public.brain_checks, public.brain_changes to authenticated;
grant all on public.brains, public.brain_items, public.brain_steps, public.brain_checks, public.brain_changes to service_role;
revoke all on public.brains, public.brain_items, public.brain_steps, public.brain_checks, public.brain_changes from anon;

create policy brains_read on public.brains for select to authenticated using (private.can_read_brain(institution_id));
-- What Drishti pre-filled waits for the team; the college sees facts once confirmed.
create policy brain_items_read on public.brain_items
  for select to authenticated using (private.can_read_brain(institution_id) and (not to_confirm or private.is_team()));
create policy brain_steps_read on public.brain_steps for select to authenticated using (private.can_read_brain(institution_id));
create policy brain_checks_read on public.brain_checks for select to authenticated using (private.can_read_brain(institution_id));
create policy brain_changes_read on public.brain_changes
  for select to authenticated using (private.is_team() or (not team_only and private.can_read_brain(institution_id)));

-- A Client's members and the team edit the details added by you too (the owner always could).
create policy institution_details_brain_insert on public.institution_details
  for insert to authenticated with check (private.can_edit_brain(institution_id));
create policy institution_details_brain_update on public.institution_details
  for update to authenticated using (private.can_edit_brain(institution_id)) with check (private.can_edit_brain(institution_id));
create policy program_details_brain_insert on public.program_details
  for insert to authenticated with check (private.can_edit_brain(institution_id));
create policy program_details_brain_update on public.program_details
  for update to authenticated using (private.can_edit_brain(institution_id)) with check (private.can_edit_brain(institution_id));

-- The guards (src/brain/guard.ts) --------------------------------------------------------------

-- No passwords or logins in any text of a fact, however deep.
create function private.brain_text_ok(p_fields jsonb) returns boolean
language sql immutable
set search_path = ''
as $$
  select not exists (
    select 1
    from jsonb_path_query(p_fields, 'lax $.**') as node (value)
    where jsonb_typeof(node.value) = 'string'
      and (
        (node.value #>> '{}') ~* '\m(pass ?words?|passwd|pwd|pass ?codes?)\s*(is|was|:|=|-)\s*\S'
        or (node.value #>> '{}') ~* '\motp\s*(is|:|=)\s*[0-9]{4,8}\M'
        or (node.value #>> '{}') ~* '\m(user ?names?|user ?ids?|login ?ids?|log ?ins?|logins?)\s*[:=]\s*\S'
        or (node.value #>> '{}') ~* '\m(credentials|log ?in details|login details)\M'
        or (node.value #>> '{}') ~* '[a-z][a-z0-9+.-]*://[^[:space:]/@:]+:[^[:space:]/@]+@'
      )
  );
$$;

-- Alumni and student reviews: a line and a link, never a phone number or an email.
create function private.brain_contact_free(p_kind public.brain_kind, p_fields jsonb) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_kind not in ('alumnus', 'review')
    or not exists (
      select 1 from jsonb_each_text(p_fields) as entry (key, value)
      where entry.key in ('name', 'line', 'program', 'quote', 'by')
        and (entry.value ~ '(\+?[0-9][ -]?){8,}[0-9]' or entry.value ~ '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+')
    );
$$;

create function private.brain_fields_ok(p_kind public.brain_kind, p_fields jsonb) returns void
language plpgsql immutable
set search_path = ''
as $$
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or char_length(p_fields::text) > 5000 then
    raise exception 'bad_fields' using errcode = '22023';
  end if;
  if not private.brain_text_ok(p_fields) then
    raise exception 'looks_like_login' using errcode = '22023';
  end if;
  if not private.brain_contact_free(p_kind, p_fields) then
    raise exception 'student_contact' using errcode = '22023';
  end if;
end;
$$;

-- History --------------------------------------------------------------------------------------

-- What Drishti found for the details ('program:<id>:fees', 'about:approvals') is about the fact it
-- suggests, so its History is that fact's: 'program:<id>' or 'about'.
create function private.found_target(p_target text) returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(p_target, ':(fees|page|approvals)$', '');
$$;

-- The details added by you as they are now, the way History keeps them ('about' or 'program:<id>').
create function private.brain_details_now(p_institution uuid, p_target text) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case
    when p_target = 'about' then
      (select to_jsonb(d) - array['institution_id', 'program_id', 'updated_at', 'updated_by'] from public.institution_details d where d.institution_id = p_institution)
    when p_target ~ '^program:[0-9a-f-]{36}$' then
      (select to_jsonb(d) - array['institution_id', 'program_id', 'updated_at', 'updated_by'] from public.program_details d where d.program_id = substring(p_target from 9)::uuid and d.institution_id = p_institution)
  end;
$$;

-- Who made a change: the signed-in person, else the person the row records (only the server's
-- jobs and the seed write rows directly). What Drishti pre-filled has nobody.
create function private.brain_item_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_what text;
  v_by uuid := (select auth.uid());
  v_target text;
begin
  if tg_op <> 'DELETE' then
    v_by := coalesce(v_by, new.updated_by);
    v_target := case when new.kind = 'found' then private.found_target(new.fields ->> 'target') else 'item:' || new.id end;
  else
    v_target := case when old.kind = 'found' then private.found_target(old.fields ->> 'target') else 'item:' || old.id end;
  end if;
  if tg_op = 'INSERT' then
    insert into public.brain_changes (institution_id, at, by, what, target, kind, before, after)
    values (new.institution_id, new.created_at, case when new.source = 'drishti' then null else v_by end, case when new.to_confirm then 'found' else 'added' end, v_target, new.kind::text, null, new.fields);
  elsif tg_op = 'UPDATE' then
    if old.to_confirm and not new.to_confirm then
      v_what := case when old.fields = new.fields then 'confirmed' else 'corrected' end;
    elsif old.fields is distinct from new.fields then
      v_what := 'changed';
    elsif old.checked_at is distinct from new.checked_at then
      v_what := 'checked';
    else
      return null;
    end if;
    insert into public.brain_changes (institution_id, at, by, what, target, kind, before, after)
    values (new.institution_id, case when v_what = 'checked' then new.checked_at else coalesce(new.updated_at, now()) end, case when v_what = 'checked' then coalesce((select auth.uid()), new.checked_by) else v_by end, v_what, v_target, new.kind::text, old.fields, new.fields);
  else
    -- A suggestion closed by the team says how (close_found_item); otherwise taken out or removed.
    -- One for the details keeps the fact as it is now, so History says the value it was confirmed
    -- or corrected to, not only what Drishti had found.
    v_what := coalesce(nullif(current_setting('drishti.brain_outcome', true), ''), case when old.to_confirm then 'not_right' else 'removed' end);
    insert into public.brain_changes (institution_id, by, what, target, kind, before, after)
    values (old.institution_id, v_by, v_what, v_target, old.kind::text, old.fields, case when old.kind = 'found' then private.brain_details_now(old.institution_id, v_target) end);
  end if;
  return null;
end;
$$;

create trigger brain_items_history
  after insert or update or delete on public.brain_items
  for each row execute function private.brain_item_changed();

-- The details added by you: when each fact was last changed, and, for a Client with a Brain, the
-- change itself.
create function private.brain_details_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid;
  v_by uuid := (select auth.uid());
  v_at timestamptz := now();
  v_skip text[] := array['institution_id', 'program_id', 'updated_at', 'updated_by'];
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_target text;
  v_facts text[] := array[]::text[];
  v_fact text;
begin
  -- Never read NEW on a delete or OLD on an insert.
  if tg_op <> 'INSERT' then
    v_before := to_jsonb(old) - v_skip;
    v_row := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    v_after := to_jsonb(new) - v_skip;
    v_row := to_jsonb(new);
    v_by := coalesce(v_by, (v_row ->> 'updated_by')::uuid);
    v_at := coalesce((v_row ->> 'updated_at')::timestamptz, now());
  end if;
  v_institution := (v_row ->> 'institution_id')::uuid;
  if v_before is not distinct from v_after then
    return null;
  end if;
  if tg_table_name = 'institution_details' then
    v_target := 'about';
    v_facts := array['about'];
  else
    v_target := 'program:' || (v_row ->> 'program_id');
    if (v_before -> 'fees_amount', v_before -> 'fees_period') is distinct from (v_after -> 'fees_amount', v_after -> 'fees_period') then
      v_facts := v_facts || (v_target || ':fees');
    end if;
    if (v_before -> 'applications_open', v_before -> 'applications_close') is distinct from (v_after -> 'applications_open', v_after -> 'applications_close') then
      v_facts := v_facts || (v_target || ':dates');
    end if;
    if (coalesce(v_before, '{}') - array['fees_amount', 'fees_period', 'applications_open', 'applications_close', 'push'])
       is distinct from (coalesce(v_after, '{}') - array['fees_amount', 'fees_period', 'applications_open', 'applications_close', 'push']) then
      v_facts := v_facts || (v_target || ':details');
    end if;
  end if;
  if v_after is not null then
    foreach v_fact in array v_facts loop
      insert into public.brain_checks (institution_id, fact, checked_at, checked_by)
      values (v_institution, v_fact, v_at, v_by)
      on conflict (institution_id, fact) do update set checked_at = excluded.checked_at, checked_by = excluded.checked_by;
    end loop;
  end if;
  -- A suggestion confirmed or corrected writes the details and says so in one History line of its
  -- own (close_found_item), with the value: the change to the details adds none.
  if exists (select 1 from public.brains b where b.institution_id = v_institution)
     and coalesce(current_setting('drishti.brain_closing', true), '') = '' then
    insert into public.brain_changes (institution_id, at, by, what, target, kind, before, after)
    values (v_institution, v_at, v_by, case when v_before is null then 'added' when v_after is null then 'removed' else 'changed' end, v_target, 'details', v_before, v_after);
  end if;
  return null;
end;
$$;

create trigger institution_details_brain
  after insert or update or delete on public.institution_details
  for each row execute function private.brain_details_changed();
create trigger program_details_brain
  after insert or update or delete on public.program_details
  for each row execute function private.brain_details_changed();

create function private.brain_status_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.brain_changes (institution_id, at, by, what, target) values (new.institution_id, new.started_at, new.started_by, 'started', 'brain');
  elsif new.status = 'ready' and old.status <> 'ready' then
    insert into public.brain_changes (institution_id, at, by, what, target) values (new.institution_id, new.ready_at, new.ready_by, 'ready', 'brain');
  end if;
  return null;
end;
$$;

create trigger brains_history after insert or update on public.brains
  for each row execute function private.brain_status_changed();

create function private.brain_step_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.brain_changes (institution_id, at, by, what, target) values (new.institution_id, new.done_at, new.done_by, 'step_done', 'step:' || new.step);
  else
    insert into public.brain_changes (institution_id, by, what, target) values (old.institution_id, (select auth.uid()), 'step_undone', 'step:' || old.step);
  end if;
  return null;
end;
$$;

create trigger brain_steps_history after insert or delete on public.brain_steps
  for each row execute function private.brain_step_changed();

-- The team's private notes are the Brain's Team only notes: their changes are team only too.
create function private.brain_note_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := coalesce(new.institution_id, old.institution_id);
begin
  if not exists (select 1 from public.brains b where b.institution_id = v_institution) then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.brain_changes (institution_id, at, by, what, target, after, team_only)
    values (new.institution_id, new.created_at, new.author_id, 'added', 'team-note:' || new.id, to_jsonb(new.body), true);
  else
    insert into public.brain_changes (institution_id, by, what, target, before, team_only)
    values (old.institution_id, (select auth.uid()), 'removed', 'team-note:' || old.id, to_jsonb(old.body), true);
  end if;
  return null;
end;
$$;

create trigger notes_brain_history after insert or delete on public.notes
  for each row execute function private.brain_note_changed();

-- Writing to the Brain -----------------------------------------------------------------------------

-- The team starts onboarding for a Client. Says whether it started now (false: it had started).
create function public.start_brain(p_institution uuid) returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
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

-- What Drishti found in the latest Audit, waiting for the team to confirm (src/brain/prefill.ts).
create function public.add_found_brain_items(p_institution uuid, p_items jsonb) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kind public.brain_kind;
  v_count integer := 0;
begin
  if not (private.is_team() and private.can_edit_brain(p_institution)) then
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

-- Saves one fact, new or changed. A single kind (and the main contact, the one who approves
-- content, a mark that something doesn't apply) replaces the one there is. Saving a fact Drishti
-- found confirms it. Says which fact it saved.
create function public.save_brain_item(p_institution uuid, p_item uuid, p_kind public.brain_kind, p_fields jsonb, p_via_help boolean default false)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := p_item;
  v_by uuid := (select auth.uid());
begin
  if not private.can_edit_brain(p_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_kind = 'found' then
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  perform private.brain_fields_ok(p_kind, p_fields);
  if v_id is null then
    if p_kind in ('talk', 'goals', 'target', 'rivals', 'regions', 'logo', 'colours', 'fonts', 'tagline', 'tone', 'avoid', 'dos', 'guidelines') then
      select i.id into v_id from public.brain_items i where i.institution_id = p_institution and i.kind = p_kind;
    elsif p_kind = 'contact' and p_fields ->> 'role' in ('main', 'approver') then
      select i.id into v_id from public.brain_items i where i.institution_id = p_institution and i.kind = 'contact' and i.fields ->> 'role' = p_fields ->> 'role';
    elsif p_kind = 'skip' then
      select i.id into v_id from public.brain_items i where i.institution_id = p_institution and i.kind = 'skip' and i.fields ->> 'slot' = p_fields ->> 'slot';
    end if;
  end if;
  if v_id is null then
    insert into public.brain_items (institution_id, kind, fields, source, via_help, checked_by, created_by, updated_by)
    values (p_institution, p_kind, p_fields, case when private.is_team() then 'team' else 'college' end::public.brain_source, coalesce(p_via_help, false), v_by, v_by, v_by)
    returning id into v_id;
  else
    update public.brain_items i
    set fields = p_fields,
        to_confirm = false,
        via_help = i.via_help or coalesce(p_via_help, false),
        checked_at = now(),
        checked_by = v_by,
        updated_at = now(),
        updated_by = v_by
    where i.id = v_id and i.institution_id = p_institution and i.kind = p_kind;
    if not found then
      raise exception 'no_item' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.remove_brain_item(p_item uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid;
begin
  select i.institution_id into v_institution from public.brain_items i where i.id = p_item;
  if v_institution is null or not private.can_edit_brain(v_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.brain_items where id = p_item;
end;
$$;

-- Confirms what Drishti found, as it was. (A correction saves it through save_brain_item.)
create function public.confirm_brain_item(p_item uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid;
begin
  select i.institution_id into v_institution from public.brain_items i where i.id = p_item and i.kind <> 'found';
  if v_institution is null or not private.can_edit_brain(v_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.brain_items
  set to_confirm = false, checked_at = now(), checked_by = (select auth.uid()), updated_at = now(), updated_by = (select auth.uid())
  where id = p_item;
end;
$$;

-- The team closes a suggestion for the details added by you, in one step: confirmed or corrected
-- (p_values: the fact's columns as the server read them, written into the details here), or not
-- right. History gets one line, with the value the fact has now.
create function public.close_found_item(p_item uuid, p_outcome text, p_values jsonb default null) returns void
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
  if v_institution is null or not (private.is_team() and private.can_edit_brain(v_institution)) then
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

-- "Still right": a fact checked without a change. 'item:<id>' for a Brain fact; 'about' or
-- 'program:<id>:fees|dates|details' for the details added by you.
create function public.check_brain_fact(p_institution uuid, p_fact text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_by uuid := (select auth.uid());
  v_program uuid;
begin
  if not private.can_edit_brain(p_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_fact ~ '^item:[0-9a-f-]{36}$' then
    update public.brain_items i set checked_at = now(), checked_by = v_by
    where i.id = substring(p_fact from 6)::uuid and i.institution_id = p_institution and not i.to_confirm;
    if not found then
      raise exception 'no_item' using errcode = 'P0002';
    end if;
    return;
  end if;
  if p_fact !~ '^(about|program:[0-9a-f-]{36}:(fees|dates|details))$' then
    raise exception 'bad_fact' using errcode = '22023';
  end if;
  if p_fact <> 'about' then
    v_program := split_part(p_fact, ':', 2)::uuid;
    if not exists (select 1 from public.programs g where g.id = v_program and g.institution_id = p_institution) then
      raise exception 'bad_program' using errcode = '22023';
    end if;
  end if;
  insert into public.brain_checks (institution_id, fact, checked_at, checked_by) values (p_institution, p_fact, now(), v_by)
  on conflict (institution_id, fact) do update set checked_at = excluded.checked_at, checked_by = excluded.checked_by;
  insert into public.brain_changes (institution_id, by, what, target, field)
  values (p_institution, v_by, 'checked', case when p_fact = 'about' then 'about' else 'program:' || v_program end, case when p_fact = 'about' then null else split_part(p_fact, ':', 3) end);
end;
$$;

-- The team ticks a step of the onboarding checklist, or takes the tick back. Three steps need
-- their fact in the Brain first: a shared Drive folder, who approves content, an agreed plan.
create function public.set_brain_step(p_institution uuid, p_step public.brain_step, p_done boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (private.is_team() and private.can_edit_brain(p_institution)) then
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

-- The team marks the Brain Ready once the checklist is done (the server checks every must-have
-- fact first, src/brain/progress.ts). The college gets "Your Brain is ready" in Notifications.
create function public.mark_brain_ready(p_institution uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (private.is_team() and private.can_edit_brain(p_institution)) then
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

-- Everyone who may appear in a college's History: its people, and the team users who worked on it.
create function public.brain_people(p_institution uuid)
returns table (user_id uuid, name text, email text, team boolean)
language sql stable security definer
set search_path = ''
as $$
  with ids as (
    select m.user_id from public.memberships m where m.institution_id = p_institution
    union
    select c.by from public.brain_changes c where c.institution_id = p_institution and c.by is not null
    union
    select b.started_by from public.brains b where b.institution_id = p_institution and b.started_by is not null
    union
    select b.ready_by from public.brains b where b.institution_id = p_institution and b.ready_by is not null
  )
  select ids.user_id, n.name, u.email::text, exists (select 1 from public.team_users t where t.user_id = ids.user_id)
  from ids
  join auth.users u on u.id = ids.user_id
  left join public.person_names n on n.user_id = ids.user_id
  where private.can_read_brain(p_institution);
$$;

revoke all on function
  public.start_brain(uuid),
  public.add_found_brain_items(uuid, jsonb),
  public.save_brain_item(uuid, uuid, public.brain_kind, jsonb, boolean),
  public.remove_brain_item(uuid),
  public.confirm_brain_item(uuid),
  public.close_found_item(uuid, text, jsonb),
  public.check_brain_fact(uuid, text),
  public.set_brain_step(uuid, public.brain_step, boolean),
  public.mark_brain_ready(uuid),
  public.brain_people(uuid)
from public, anon;
grant execute on function
  public.start_brain(uuid),
  public.add_found_brain_items(uuid, jsonb),
  public.save_brain_item(uuid, uuid, public.brain_kind, jsonb, boolean),
  public.remove_brain_item(uuid),
  public.confirm_brain_item(uuid),
  public.close_found_item(uuid, text, jsonb),
  public.check_brain_fact(uuid, text),
  public.set_brain_step(uuid, public.brain_step, boolean),
  public.mark_brain_ready(uuid),
  public.brain_people(uuid)
to authenticated, service_role;
grant execute on function
  private.can_read_brain(uuid),
  private.can_edit_brain(uuid),
  private.brain_text_ok(jsonb),
  private.brain_contact_free(public.brain_kind, jsonb),
  private.brain_fields_ok(public.brain_kind, jsonb)
to authenticated, service_role;

-- Files: a logo and brand guidelines, kept under the college's id ----------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brain-files', 'brain-files', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create function private.brain_folder(object_name text) returns uuid
language sql immutable
set search_path = ''
as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(object_name, '/', 1)::uuid end;
$$;
grant execute on function private.brain_folder(text) to authenticated, service_role;

create policy brain_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'brain-files' and private.can_read_brain(private.brain_folder(name)));
create policy brain_files_add on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brain-files' and private.can_edit_brain(private.brain_folder(name)));
create policy brain_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'brain-files' and private.can_edit_brain(private.brain_folder(name)));

-- The team list: a Client whose Brain is not Ready ------------------------------------------------

-- As in 20261020120000_paid_periods.sql, with brain_status, and reason 6: a Client whose Brain
-- has not started or is still onboarding (src/team/attention.ts says it in words).
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
  where (select private.is_team())
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

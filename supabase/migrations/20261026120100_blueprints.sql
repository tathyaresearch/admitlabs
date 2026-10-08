-- The Blueprint (spec section 26): the plan AdmitLabs makes for a Client, as PDF versions, first in
-- the Client Brain.
--
--   brain_blueprints   One row per version: the file in the private bucket brain-blueprints, its
--                      number (1, 2, ...), who uploaded it and when, its status (Draft: the team
--                      only; Shared: the college sees it; Approved), who shared and who approved it
--                      and when, the college's request for changes, and the PDF's words for Ask the
--                      brain (read when it is uploaded).
--
-- Who does what: Admins, Team members and the Client's own managers upload versions and set their
-- status (while the college is a Client with a Brain). The college's people see only Shared and
-- Approved versions of their own college, and approve the latest Shared one or ask for changes. The
-- same rules hold for the files: a college's people can open a file only through a version they see.

create type public.blueprint_status as enum ('draft', 'shared', 'approved');

create table public.brain_blueprints (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  version integer not null check (version >= 1),
  -- In the bucket brain-blueprints: <institution id>/<uuid>.pdf.
  file_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 160),
  size_bytes integer not null check (size_bytes between 1 and 20971520),
  status public.blueprint_status not null default 'draft',
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  shared_at timestamptz,
  shared_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  changes_note text check (changes_note is null or char_length(btrim(changes_note)) between 1 and 500),
  changes_at timestamptz,
  changes_by uuid references auth.users (id) on delete set null,
  -- The PDF's words, as the reader found them (null when it could not read them).
  text text check (text is null or char_length(text) <= 20000),
  constraint brain_blueprints_version unique (institution_id, version),
  constraint brain_blueprints_approved check ((status = 'approved') = (approved_at is not null)),
  constraint brain_blueprints_changes check ((changes_at is null) = (changes_note is null))
);
create index brain_blueprints_latest_idx on public.brain_blueprints (institution_id, version desc);

-- A version, for this person: the team and the Client's managers see every one; the college's own
-- people only Shared and Approved ones, while the college is a Client.
create function private.sees_blueprint(p_institution uuid, p_status public.blueprint_status) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_manage(p_institution)
    or (p_status <> 'draft' and private.is_member(p_institution) and private.effective_tier(p_institution) = 'client');
$$;

-- A file in the bucket, through the version it belongs to.
create function private.can_see_blueprint_file(p_name text) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.brain_blueprints b where b.file_path = p_name and private.sees_blueprint(b.institution_id, b.status));
$$;

grant execute on function private.sees_blueprint(uuid, public.blueprint_status), private.can_see_blueprint_file(text) to authenticated, service_role;

alter table public.brain_blueprints enable row level security;
revoke all on public.brain_blueprints from anon;
grant select on public.brain_blueprints to authenticated;
grant select, insert, update, delete on public.brain_blueprints to service_role;
create policy brain_blueprints_read on public.brain_blueprints
  for select to authenticated using (private.sees_blueprint(institution_id, status));

-- The private bucket: PDFs up to 20 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brain-blueprints', 'brain-blueprints', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy brain_blueprints_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'brain-blueprints' and (private.can_manage(private.brain_folder(name)) or private.can_see_blueprint_file(name)));
create policy brain_blueprints_files_add on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brain-blueprints' and private.can_manage(private.brain_folder(name)) and private.can_edit_brain(private.brain_folder(name)));
-- An upload that never became a version (it failed its checks) can go; a version's file stays.
create policy brain_blueprints_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'brain-blueprints' and private.can_manage(private.brain_folder(name)) and not exists (select 1 from public.brain_blueprints b where b.file_path = name));

-- History: the Brain's own, with three more kinds of change ------------------------------------------

alter table public.brain_changes drop constraint brain_changes_what;
alter table public.brain_changes add constraint brain_changes_what
  check (what in ('added', 'found', 'changed', 'confirmed', 'corrected', 'not_right', 'removed', 'checked', 'started', 'ready', 'step_done', 'step_undone', 'shared', 'approved', 'changes_asked'));

-- A version uploaded (team only while it is a Draft), shared, approved, back to Draft, or changes
-- asked for. 'blueprint:<id>' is its target.
create function private.blueprint_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_about jsonb := jsonb_build_object('version', new.version, 'file_name', new.file_name, 'status', new.status);
begin
  if tg_op = 'INSERT' then
    insert into public.brain_changes (institution_id, at, by, what, target, kind, after, team_only)
    values (new.institution_id, new.uploaded_at, new.uploaded_by, 'added', 'blueprint:' || new.id, 'blueprint', v_about, new.status = 'draft');
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.brain_changes (institution_id, at, by, what, target, kind, before, after, team_only)
    values (
      new.institution_id,
      case new.status when 'approved' then new.approved_at when 'shared' then coalesce(new.shared_at, now()) else now() end,
      coalesce((select auth.uid()), case new.status when 'approved' then new.approved_by else new.shared_by end),
      case new.status when 'shared' then 'shared' when 'approved' then 'approved' else 'changed' end,
      'blueprint:' || new.id,
      'blueprint',
      jsonb_build_object('status', old.status),
      v_about,
      new.status = 'draft'
    );
  end if;
  if new.changes_at is distinct from old.changes_at and new.changes_at is not null then
    insert into public.brain_changes (institution_id, at, by, what, target, kind, after)
    values (new.institution_id, new.changes_at, new.changes_by, 'changes_asked', 'blueprint:' || new.id, 'blueprint', v_about || jsonb_build_object('note', new.changes_note));
  end if;
  return null;
end;
$$;

create trigger brain_blueprints_history after insert or update on public.brain_blueprints
  for each row execute function private.blueprint_changed();

-- Changing the Blueprint ---------------------------------------------------------------------------

-- A new version from a file already in the bucket (the browser uploaded it through a signed link):
-- the next number, a Draft. The file is checked here too: this college's folder, a PDF, 20 MB at most.
create function public.add_blueprint_version(p_institution uuid, p_path text, p_name text, p_text text default null)
returns table (id uuid, version integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_size bigint;
  v_type text;
  v_version integer;
  v_id uuid;
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
begin
  if not (private.can_manage(p_institution) and private.can_edit_brain(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_path !~ ('^' || p_institution::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$') then
    raise exception 'bad_path' using errcode = '22023';
  end if;
  select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype' into v_size, v_type
  from storage.objects o where o.bucket_id = 'brain-blueprints' and o.name = p_path;
  if not found then
    raise exception 'no_file' using errcode = 'P0002';
  end if;
  if v_type is distinct from 'application/pdf' then
    raise exception 'not_pdf' using errcode = '22023';
  end if;
  if v_size is null or v_size < 1 or v_size > 20971520 then
    raise exception 'too_big' using errcode = '22023';
  end if;
  if char_length(v_name) not between 1 and 160 then
    v_name := 'Blueprint.pdf';
  end if;
  -- One upload at a time per college, so two never take the same number.
  perform 1 from public.brains b where b.institution_id = p_institution for update;
  select coalesce(max(b.version), 0) + 1 into v_version from public.brain_blueprints b where b.institution_id = p_institution;
  insert into public.brain_blueprints (institution_id, version, file_path, file_name, size_bytes, uploaded_by, text)
  values (p_institution, v_version, p_path, v_name, v_size, (select auth.uid()), left(nullif(btrim(coalesce(p_text, '')), ''), 20000))
  returning brain_blueprints.id into v_id;
  return query select v_id, v_version;
end;
$$;

-- The team's status: Draft (the team only), Shared (the college sees it) or Approved.
create function public.set_blueprint_status(p_blueprint uuid, p_status public.blueprint_status) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid;
  v_me uuid := (select auth.uid());
begin
  select b.institution_id into v_institution from public.brain_blueprints b where b.id = p_blueprint;
  if v_institution is null or not (private.can_manage(v_institution) and private.can_edit_brain(v_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.brain_blueprints b set
    status = p_status,
    shared_at = case when p_status <> 'draft' then coalesce(b.shared_at, now()) else b.shared_at end,
    shared_by = case when p_status <> 'draft' then coalesce(b.shared_by, v_me) else b.shared_by end,
    approved_at = case when p_status = 'approved' then coalesce(b.approved_at, now()) end,
    approved_by = case when p_status = 'approved' then coalesce(b.approved_by, v_me) end
  where b.id = p_blueprint and b.status is distinct from p_status;
end;
$$;

-- The college's people answer the latest Shared version: approve it, or ask for changes.
create function private.blueprint_to_answer(p_blueprint uuid) returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_row public.brain_blueprints%rowtype;
begin
  select * into v_row from public.brain_blueprints b where b.id = p_blueprint;
  if v_row.id is null or not private.is_member(v_row.institution_id) or private.effective_tier(v_row.institution_id) <> 'client' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_row.version <> (select max(b.version) from public.brain_blueprints b where b.institution_id = v_row.institution_id) then
    raise exception 'not_latest' using errcode = 'P0001';
  end if;
  if v_row.status <> 'shared' then
    raise exception 'not_shared' using errcode = 'P0001';
  end if;
  return v_row.institution_id;
end;
$$;

create function public.approve_blueprint(p_blueprint uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := private.blueprint_to_answer(p_blueprint);
begin
  update public.brain_blueprints set status = 'approved', approved_at = now(), approved_by = (select auth.uid()) where id = p_blueprint;
  return v_institution;
end;
$$;

create function public.ask_blueprint_changes(p_blueprint uuid, p_note text) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := private.blueprint_to_answer(p_blueprint);
  v_note text := btrim(coalesce(p_note, ''));
begin
  if char_length(v_note) not between 1 and 500 then
    raise exception 'bad_note' using errcode = '22023';
  end if;
  if not private.brain_text_ok(jsonb_build_object('note', v_note)) then
    raise exception 'looks_like_login' using errcode = '22023';
  end if;
  update public.brain_blueprints set changes_note = v_note, changes_at = now(), changes_by = (select auth.uid()) where id = p_blueprint;
  return v_institution;
end;
$$;

-- Who hears when the college answers: the Client's managers, or every Admin when it has none.
create function public.blueprint_reply_recipients(p_institution uuid) returns setof text
language sql stable security definer
set search_path = ''
as $$
  with managers as (
    select lower(u.email::text) as email
    from public.client_managers c
    join public.team_users t on t.user_id = c.user_id and t.role = 'client_manager'
    join auth.users u on u.id = c.user_id
    where c.institution_id = p_institution and u.email is not null
  )
  select email from managers
  union
  select lower(u.email::text)
  from public.team_users t
  join auth.users u on u.id = t.user_id
  where t.role = 'admin' and u.email is not null and not exists (select 1 from managers)
  order by 1;
$$;

revoke all on function
  public.add_blueprint_version(uuid, text, text, text),
  public.set_blueprint_status(uuid, public.blueprint_status),
  public.approve_blueprint(uuid),
  public.ask_blueprint_changes(uuid, text),
  public.blueprint_reply_recipients(uuid)
from public, anon;
grant execute on function
  public.add_blueprint_version(uuid, text, text, text),
  public.set_blueprint_status(uuid, public.blueprint_status),
  public.approve_blueprint(uuid),
  public.ask_blueprint_changes(uuid, text)
to authenticated, service_role;
grant execute on function public.blueprint_reply_recipients(uuid) to service_role;

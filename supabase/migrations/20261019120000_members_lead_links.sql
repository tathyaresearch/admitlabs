-- Version 2 review (October 2026): a Client's members make and archive Leads tracking links too,
-- not just its owner, beside the team (create_lead_link(), archive_lead_link()). Everything else
-- on Leads stays with the owner: the settings (save_lead_settings()) and deleting a student's data
-- (delete_leads()).

-- A tracking link for a Client: by the team, or by anyone in the Client's account. A name, where
-- it is used, and one of its programs, or none for a general form.
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
  if not (private.is_team() or private.is_member(p_institution)) then
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

-- Archive a link, by the team or anyone in the Client's account: its form says it is closed. Its
-- enquiries stay.
create or replace function public.archive_lead_link(p_link uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_institution uuid := (select l.institution_id from public.lead_links l where l.id = p_link);
begin
  if v_institution is null or not (private.is_team() or private.is_member(v_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.lead_links l set archived_at = coalesce(l.archived_at, now()) where l.id = p_link;
end;
$$;

-- Version 2, Part 6 (October 2026): the monthly summary and the Audit ready email (spec sections
-- 11, 12, 13, 24 and 25).
--
--   Reports      record_report() keeps the month's summary with its report, and its review state:
--                with Review first on, the two wait for the team and nothing reaches the college;
--                sent automatically, they are approved when made, with "Your September report is
--                ready." in Notifications.
--   Review       record_summary_edit(): the team fixes a line of a waiting summary, kept in
--                audit_edits like every change in a review. approve_report(): Approve and send. The
--                summary and its report show on Reports, with the notice; the server sends the email.
--   Emails       institution_people() says who keeps the email on (memberships.summary_email).
--                set_summary_email(): each person turns their own email on or off; the owner can
--                for anyone. summary_recipients(): who gets it, for the server only.

-- Reports ---------------------------------------------------------------------------------------

drop function public.record_report(uuid, date, text, smallint, integer, timestamptz, text);

create function public.record_report(
  p_institution uuid,
  p_month date,
  p_storage_path text,
  p_pages smallint,
  p_size integer,
  p_made_at timestamptz,
  p_summary jsonb,
  p_review public.review_state,
  p_notice text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_report uuid;
begin
  if p_summary is not null and jsonb_typeof(p_summary) <> 'object' then
    raise exception 'bad_summary' using errcode = '22023';
  end if;
  -- Making a month again replaces its file, its summary and its review state.
  insert into public.reports (institution_id, month, storage_path, pages, size_bytes, created_at, summary, review, approved_at, approved_by)
  values (p_institution, p_month, p_storage_path, p_pages, p_size, p_made_at, p_summary, p_review, case when p_review = 'approved' then p_made_at end, null)
  on conflict (institution_id, month) do update
    set storage_path = excluded.storage_path,
        pages = excluded.pages,
        size_bytes = excluded.size_bytes,
        created_at = excluded.created_at,
        summary = excluded.summary,
        review = excluded.review,
        approved_at = excluded.approved_at,
        approved_by = excluded.approved_by
  returning id into v_report;

  -- A waiting report tells nobody until it is approved.
  if p_review = 'approved' and coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (p_institution, 'report_ready', p_notice, '/reports', p_made_at);
  end if;
  return v_report;
end;
$$;

revoke all on function public.record_report(uuid, date, text, smallint, integer, timestamptz, jsonb, public.review_state, text) from public, anon, authenticated;
grant execute on function public.record_report(uuid, date, text, smallint, integer, timestamptz, jsonb, public.review_state, text) to service_role;

-- Review ------------------------------------------------------------------------------------------

-- A line of a waiting summary, fixed by the team: 'words', 'things.1' to 'things.3', 'move' or
-- 'enquiries'. What it was, what it became, why and who: kept in audit_edits.
create function public.record_summary_edit(p_report uuid, p_target text, p_after text, p_reason text default null, p_by uuid default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_path text[];
  v_summary jsonb;
  v_before text;
  v_after text := btrim(coalesce(p_after, ''));
begin
  if not private.can_review() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(v_after) not between 1 and 400 then
    raise exception 'bad_line' using errcode = '22023';
  end if;
  v_path := case p_target
    when 'words' then array['lines', 'words']
    when 'move' then array['lines', 'move']
    when 'enquiries' then array['lines', 'enquiries']
    when 'things.1' then array['lines', 'things', '0']
    when 'things.2' then array['lines', 'things', '1']
    when 'things.3' then array['lines', 'things', '2']
  end;
  if v_path is null then
    raise exception 'bad_target' using errcode = '22023';
  end if;

  select r.summary into v_summary from public.reports r where r.id = p_report and r.review = 'waiting' for update;
  if not found then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;
  v_before := v_summary #>> v_path;
  if v_before is null then
    raise exception 'bad_target' using errcode = '22023';
  end if;

  update public.reports r set summary = jsonb_set(r.summary, v_path, to_jsonb(v_after)) where r.id = p_report;
  insert into public.audit_edits (report_id, what, target, before, after, reason, edited_by)
  values (p_report, 'summary_line', 'summary:' || p_target, v_before, v_after, nullif(btrim(coalesce(p_reason, '')), ''), v_by);
end;
$$;

-- Approve and send: the summary and its report (made again with any fixed line) show on Reports,
-- and the college hears it is ready. The server alone may give the moment (the sample world's past).
create function public.approve_report(p_report uuid, p_pages smallint, p_size integer, p_notice text, p_by uuid default null, p_at timestamptz default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_server boolean := coalesce((select auth.role()), '') = 'service_role';
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_at timestamptz := case when v_server then coalesce(p_at, now()) else now() end;
  v_institution uuid;
begin
  if not private.can_review() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.reports r
  set review = 'approved', approved_at = v_at, approved_by = v_by, pages = coalesce(p_pages, r.pages), size_bytes = coalesce(p_size, r.size_bytes)
  where r.id = p_report and r.review = 'waiting'
  returning r.institution_id into v_institution;
  if v_institution is null then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  if coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'report_ready', p_notice, '/reports', v_at);
  end if;
end;
$$;

-- Emails ------------------------------------------------------------------------------------------

-- The people at an institution, with their emails and whether they get the monthly summary (or,
-- on Free, the Audit ready email), for Settings.
drop function public.institution_people(uuid);

create function public.institution_people(p_institution uuid)
returns table (user_id uuid, email text, role public.membership_role, joined_at timestamptz, summary_email boolean)
language sql stable security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at, m.summary_email
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  order by m.role, m.created_at;
$$;

-- Each person turns their own email on or off; the owner can for anyone at the institution. The
-- AdmitLabs team, viewing a dashboard, changes nothing here.
create function public.set_summary_email(p_institution uuid, p_user uuid, p_on boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not ((p_user = (select auth.uid()) and private.is_member(p_institution)) or private.is_owner(p_institution)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.memberships m set summary_email = coalesce(p_on, true) where m.institution_id = p_institution and m.user_id = p_user;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Who gets the monthly summary or the Audit ready email: the owner and the members who keep it on.
-- For the server only, which sends it.
create function public.summary_recipients(p_institution uuid) returns text[]
language sql stable security definer
set search_path = ''
as $$
  select case
    when coalesce((select auth.role()), '') <> 'service_role' then '{}'::text[]
    else coalesce(
      (select array_agg(u.email::text order by m.role, m.created_at)
       from public.memberships m join auth.users u on u.id = m.user_id
       where m.institution_id = p_institution and m.summary_email),
      '{}'::text[]
    )
  end;
$$;

revoke all on function
  public.record_summary_edit(uuid, text, text, text, uuid),
  public.approve_report(uuid, smallint, integer, text, uuid, timestamptz),
  public.institution_people(uuid),
  public.set_summary_email(uuid, uuid, boolean),
  public.summary_recipients(uuid)
from public, anon;

grant execute on function
  public.record_summary_edit(uuid, text, text, text, uuid),
  public.approve_report(uuid, smallint, integer, text, uuid, timestamptz),
  public.institution_people(uuid),
  public.set_summary_email(uuid, uuid, boolean)
to authenticated, service_role;

revoke all on function public.summary_recipients(uuid) from authenticated;
grant execute on function public.summary_recipients(uuid) to service_role;

-- Version 2, Part 2 (October 2026): the Audit by place, with review before sending (spec
-- sections 7, 13 and 25).
--
--   Waiting Audits      audit_waiting(): the college learns that a new Audit waits for the team's
--                       review (when it ran, and whether it is its first), never what it found.
--   Marks               mark_done() and undo_done() take a finding too: a finding marked done waits
--                       for the next approved own Audit, as a check does.
--   Let AdmitLabs       ask_admitlabs_fix(): the owner, on Free or Paid, asks for one fix in the
--   fix this            latest approved Audit (Free: one of its top 3); one open request per fix.
--                       open_fix_asks(): the open requests, so each fix says when it was sent.
--   Review              record_review(): the team's changes to a waiting Audit (results with the
--                       scores and ranks the engine worked out again, lines, findings taken out),
--                       each kept in audit_edits. approve_audit(): Approve and send. The Audit shows,
--                       the marks done before it ran are checked and the college hears it is ready.
--                       The team sets Review first on institution_status (its existing write rule).
--   A fix's name        audit_check_details.fix_title: a name the team gave a check's fix in a review.
--   Asking for Paid     open_paid_ask() reads requests for Paid only, not requests to fix something.
--   Free's preview      findings_teaser(): how much What people say and Other places hold, counts
--                       only, so Free's preview proves the data is real without showing it.
--   Shared Audit        shared_audit() sends the findings too, and why it matters, the steps and the
--                       ready fix for the top 3 fixes by the one ranking of checks and findings.

alter table public.audit_check_details add column fix_title text check (fix_title is null or char_length(fix_title) between 1 and 200);

-- Waiting Audits ------------------------------------------------------------------------------------

create function public.audit_waiting(p_institution uuid)
returns table (run_at timestamptz, trigger public.audit_trigger, first boolean)
language sql stable security definer
set search_path = ''
as $$
  select a.run_at, a.trigger,
    not exists (
      select 1 from public.audits b
      where b.institution_id = a.institution_id and b.kind in ('free', 'paid', 'client') and b.review = 'approved' and b.run_at < a.run_at
    )
  from public.audits a
  where (private.is_member(p_institution) or private.is_team())
    and a.institution_id = p_institution
    and a.kind in ('free', 'paid', 'client')
    and a.review = 'waiting'
  order by a.run_at desc;
$$;

-- Counts only, for every plan: how many findings each unscored place holds in the latest approved
-- own Audit, and how many have something to do. Free cannot read the findings themselves. The team
-- reads the same counts when it views the college's dashboard.
create function public.findings_teaser(p_institution uuid)
returns table (place public.finding_place, found integer, to_fix integer)
language sql stable security definer
set search_path = ''
as $$
  select f.place, count(*)::integer, count(*) filter (where f.fix_title is not null)::integer
  from public.audit_findings f
  where (private.is_member(p_institution) or private.is_team())
    and f.audit_id = private.latest_own_audit(p_institution)
    and f.removed_at is null
  group by f.place;
$$;

-- Marks done, on findings too -----------------------------------------------------------------------

drop function public.mark_done(uuid, public.check_key, text, date);
drop function public.undo_done(uuid, public.check_key, text, date);

-- Owner only. A check or a finding must have something to fix in the latest approved own Audit;
-- marking it again while it waits changes nothing. A thing needs its words and its month.
create function public.mark_done(
  p_institution uuid,
  p_check public.check_key default null,
  p_thing text default null,
  p_month date default null,
  p_finding text default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thing text := nullif(regexp_replace(trim(coalesce(p_thing, '')), '[[:space:]]+', ' ', 'g'), '');
  v_finding text := nullif(trim(coalesce(p_finding, '')), '');
  v_audit uuid := private.latest_own_audit(p_institution);
  v_mark uuid;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if num_nonnulls(p_check, v_thing, v_finding) <> 1 then
    raise exception 'one_thing' using errcode = '22023';
  end if;

  if p_check is not null then
    if not exists (select 1 from public.audit_checks c where c.audit_id = v_audit and c.check_key = p_check and c.result <> 'strong') then
      raise exception 'nothing_to_fix' using errcode = 'P0001';
    end if;
    insert into public.done_marks (institution_id, check_key, marked_by)
    values (p_institution, p_check, (select auth.uid()))
    on conflict (institution_id, check_key) where check_key is not null and checked_by_audit is null do nothing
    returning id into v_mark;
    if v_mark is null then
      select m.id into v_mark from public.done_marks m
      where m.institution_id = p_institution and m.check_key = p_check and m.checked_by_audit is null;
    end if;
    return v_mark;
  end if;

  if v_finding is not null then
    if not exists (
      select 1 from public.audit_findings f
      where f.audit_id = v_audit and f.finding_key = v_finding and f.fix_title is not null and f.removed_at is null
    ) then
      raise exception 'nothing_to_fix' using errcode = 'P0001';
    end if;
    insert into public.done_marks (institution_id, finding_key, marked_by)
    values (p_institution, v_finding, (select auth.uid()))
    on conflict (institution_id, finding_key) where finding_key is not null and checked_by_audit is null do nothing
    returning id into v_mark;
    if v_mark is null then
      select m.id into v_mark from public.done_marks m
      where m.institution_id = p_institution and m.finding_key = v_finding and m.checked_by_audit is null;
    end if;
    return v_mark;
  end if;

  if char_length(v_thing) > 300 then
    raise exception 'thing_too_long' using errcode = '22023';
  end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month > date_trunc('month', now() at time zone 'Asia/Kolkata')::date then
    raise exception 'bad_month' using errcode = '22023';
  end if;
  insert into public.done_marks (institution_id, thing, month, marked_by)
  values (p_institution, v_thing, p_month, (select auth.uid()))
  on conflict (institution_id, month, thing) where thing is not null do nothing
  returning id into v_mark;
  if v_mark is null then
    select m.id into v_mark from public.done_marks m
    where m.institution_id = p_institution and m.month = p_month and m.thing = v_thing;
  end if;
  return v_mark;
end;
$$;

-- Owner only. Takes back a mark that no Audit has checked yet.
create function public.undo_done(
  p_institution uuid,
  p_check public.check_key default null,
  p_thing text default null,
  p_month date default null,
  p_finding text default null
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thing text := nullif(regexp_replace(trim(coalesce(p_thing, '')), '[[:space:]]+', ' ', 'g'), '');
  v_finding text := nullif(trim(coalesce(p_finding, '')), '');
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  delete from public.done_marks m
  where m.institution_id = p_institution
    and m.checked_by_audit is null
    and (
      (p_check is not null and m.check_key = p_check)
      or (v_finding is not null and m.finding_key = v_finding)
      or (p_check is null and v_finding is null and m.thing = v_thing and m.month = p_month)
    );
end;
$$;

-- Let AdmitLabs fix this ----------------------------------------------------------------------------

-- The owner asks AdmitLabs to fix one thing in the latest approved own Audit: 'check:<key>' for a
-- check below Strong, or 'finding:<key>' for a finding with something to do. Free asks about the
-- fixes it sees, its top 3; a Client asks for nothing, the team already works on it. One open
-- request per fix: asking again returns when the open one was sent.
create function public.ask_admitlabs_fix(p_institution uuid, p_fix_key text, p_fix_title text) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_audit uuid := private.latest_own_audit(p_institution);
  v_tier public.tier := private.effective_tier(p_institution);
  v_kind text := split_part(coalesce(p_fix_key, ''), ':', 1);
  v_ref text := substr(coalesce(p_fix_key, ''), length(split_part(coalesce(p_fix_key, ''), ':', 1)) + 2);
  v_title text := nullif(regexp_replace(trim(coalesce(p_fix_title, '')), '[[:space:]]+', ' ', 'g'), '');
  v_limit integer := case when v_tier = 'free' then private.free_top_limit() else 32767 end;
  v_at timestamptz;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if v_tier = 'client' then
    raise exception 'team_works_on_it' using errcode = 'P0001';
  end if;
  if v_title is null or char_length(v_title) > 200 then
    raise exception 'bad_title' using errcode = '22023';
  end if;
  if v_audit is null or not (
    (v_kind = 'check' and exists (
      select 1 from public.audit_checks c
      where c.audit_id = v_audit and c.check_key::text = v_ref and c.result <> 'strong' and c.fix_rank <= v_limit
    ))
    or (v_kind = 'finding' and exists (
      select 1 from public.audit_findings f
      where f.audit_id = v_audit and f.finding_key = v_ref and f.fix_title is not null and f.removed_at is null and f.fix_rank <= v_limit
    ))
  ) then
    raise exception 'nothing_to_fix' using errcode = 'P0001';
  end if;

  select e.created_at into v_at
  from public.enquiries e
  where e.institution_id = p_institution and e.kind = 'fix_request' and e.fix_key = p_fix_key and e.handled_at is null;
  if v_at is not null then
    return v_at;
  end if;

  insert into public.enquiries (kind, institution_id, asked_by, institution, email, fix_key, fix_title)
  select 'fix_request', p_institution, u.id, i.name, lower(u.email), p_fix_key, v_title
  from auth.users u, public.institutions i
  where u.id = (select auth.uid()) and i.id = p_institution
  on conflict (institution_id, fix_key) where kind = 'fix_request' and handled_at is null do nothing
  returning created_at into v_at;
  if v_at is null then
    select e.created_at into v_at
    from public.enquiries e
    where e.institution_id = p_institution and e.kind = 'fix_request' and e.fix_key = p_fix_key and e.handled_at is null;
  end if;
  return v_at;
end;
$$;

-- The college's open requests to fix something, so each fix says when it was sent. People at the
-- institution and the team read them; only the team marks them handled.
create function public.open_fix_asks(p_institution uuid) returns table (fix_key text, asked_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select e.fix_key, e.created_at
  from public.enquiries e
  where (private.is_member(p_institution) or private.is_team())
    and e.institution_id = p_institution
    and e.kind = 'fix_request'
    and e.handled_at is null
  order by e.created_at desc;
$$;

-- Requests for Paid only: a request to fix something is not one.
create or replace function public.open_paid_ask(p_institution uuid) returns table (kind public.enquiry_kind, asked_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select e.kind, e.created_at
  from public.enquiries e
  where private.is_member(p_institution)
    and e.institution_id = p_institution
    and e.kind in ('ask_paid', 'continue_paid')
    and e.handled_at is null
  order by e.created_at desc
  limit 1;
$$;

-- Review before sending -------------------------------------------------------------------------------

-- Who may review: the team, or the server itself (the sample world), which names the team user.
create function private.can_review() returns boolean
language sql stable
set search_path = ''
as $$
  select private.is_team() or coalesce((select auth.role()), '') = 'service_role';
$$;

-- The team's changes to a waiting Audit, all at once: results with the scores and ranks the
-- engine worked out again (src/audit/review.ts), lines, findings taken out, and every change kept
-- in audit_edits with who made it. Nothing here reaches the college until approve_audit().
create function public.record_review(payload jsonb) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_audit uuid := (payload ->> 'audit_id')::uuid;
  v_by uuid := coalesce((select auth.uid()), (payload ->> 'edited_by')::uuid);
  item jsonb;
begin
  if not private.can_review() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform 1 from public.audits a where a.id = v_audit and a.review = 'waiting' for update;
  if not found then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  if jsonb_typeof(payload -> 'scores') = 'object' then
    update public.audits a set
      overall = (payload -> 'scores' ->> 'overall')::smallint,
      discovered = (payload -> 'scores' ->> 'discovered')::smallint,
      trusted = (payload -> 'scores' ->> 'trusted')::smallint,
      chosen = (payload -> 'scores' ->> 'chosen')::smallint,
      overall_change = (payload -> 'scores' ->> 'overall_change')::smallint,
      discovered_change = (payload -> 'scores' ->> 'discovered_change')::smallint,
      trusted_change = (payload -> 'scores' ->> 'trusted_change')::smallint,
      chosen_change = (payload -> 'scores' ->> 'chosen_change')::smallint
    where a.id = v_audit;
  end if;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'programs', '[]'::jsonb)) loop
    update public.audit_program_scores p set
      overall = (item ->> 'overall')::smallint,
      discovered = (item ->> 'discovered')::smallint,
      trusted = (item ->> 'trusted')::smallint,
      chosen = (item ->> 'chosen')::smallint,
      overall_change = (item ->> 'overall_change')::smallint,
      discovered_change = (item ->> 'discovered_change')::smallint,
      trusted_change = (item ->> 'trusted_change')::smallint,
      chosen_change = (item ->> 'chosen_change')::smallint
    where p.audit_id = v_audit and p.program_id = (item ->> 'program_id')::uuid;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'checks', '[]'::jsonb)) loop
    update public.audit_checks c set
      result = coalesce((item ->> 'result')::public.check_result, c.result),
      points_awarded = coalesce((item ->> 'points_awarded')::numeric, c.points_awarded),
      strength_rank = (item ->> 'strength_rank')::smallint,
      fix_rank = (item ->> 'fix_rank')::smallint,
      team_checked_at = case when coalesce((item ->> 'team_checked')::boolean, false) then now() else c.team_checked_at end
    where c.id = (item ->> 'id')::uuid and c.audit_id = v_audit;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'details', '[]'::jsonb)) loop
    update public.audit_check_details d set
      finding = coalesce(item ->> 'finding', d.finding),
      why_it_matters = case when item ? 'why_it_matters' then item ->> 'why_it_matters' else d.why_it_matters end,
      difficulty = case when item ? 'difficulty' then (item ->> 'difficulty')::public.difficulty else d.difficulty end,
      fix_title = case when item ? 'fix_title' then nullif(item ->> 'fix_title', '') else d.fix_title end,
      fix_steps = case when item ? 'fix_steps' then array(select jsonb_array_elements_text(item -> 'fix_steps')) else d.fix_steps end,
      how_to_fix = case when item ? 'fix_steps' then array_to_string(array(select jsonb_array_elements_text(item -> 'fix_steps')), ' ') else d.how_to_fix end,
      ready_fix = case when jsonb_typeof(item -> 'ready_fix') = 'object' then item -> 'ready_fix' else d.ready_fix end
    where d.audit_check_id = (item ->> 'audit_check_id')::uuid
      and exists (select 1 from public.audit_checks c where c.id = d.audit_check_id and c.audit_id = v_audit);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(payload -> 'findings', '[]'::jsonb)) loop
    update public.audit_findings f set
      line = coalesce(item ->> 'line', f.line),
      fix_title = case when item ? 'fix_title' and f.fix_title is not null then coalesce(nullif(item ->> 'fix_title', ''), f.fix_title) else f.fix_title end,
      fix_steps = case when item ? 'fix_steps' then array(select jsonb_array_elements_text(item -> 'fix_steps')) else f.fix_steps end,
      ready_fix = case when jsonb_typeof(item -> 'ready_fix') = 'object' then item -> 'ready_fix' else f.ready_fix end,
      fix_rank = case when item ? 'fix_rank' then (item ->> 'fix_rank')::smallint else f.fix_rank end,
      removed_at = case when coalesce((item ->> 'removed')::boolean, false) then coalesce(f.removed_at, now()) else f.removed_at end,
      removed_by = case when coalesce((item ->> 'removed')::boolean, false) then coalesce(f.removed_by, v_by) else f.removed_by end
    where f.id = (item ->> 'id')::uuid and f.audit_id = v_audit;
  end loop;

  insert into public.audit_edits (audit_id, what, target, before, after, reason, edited_by)
  select v_audit, (e ->> 'what')::public.edit_what, e ->> 'target', e ->> 'before', e ->> 'after', nullif(e ->> 'reason', ''), v_by
  from jsonb_array_elements(coalesce(payload -> 'edits', '[]'::jsonb)) as e;
end;
$$;

-- Approve and send: the waiting Audit shows, the marks done before it ran are checked, and the
-- college hears it is ready. The server alone may give the moment (the sample world's past).
create function public.approve_audit(p_audit uuid, p_notice text, p_link text, p_by uuid default null, p_at timestamptz default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_server boolean := coalesce((select auth.role()), '') = 'service_role';
  v_by uuid := coalesce((select auth.uid()), p_by);
  v_at timestamptz := case when v_server then coalesce(p_at, now()) else now() end;
  v_institution uuid;
  v_run_at timestamptz;
begin
  if not private.can_review() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.audits a
  set review = 'approved', approved_at = v_at, approved_by = v_by
  where a.id = p_audit and a.review = 'waiting'
  returning a.institution_id, a.run_at into v_institution, v_run_at;
  if v_institution is null then
    raise exception 'not_waiting' using errcode = 'P0001';
  end if;

  update public.done_marks m
  set checked_by_audit = p_audit
  where m.institution_id = v_institution and m.thing is null and m.checked_by_audit is null and m.marked_at <= v_run_at;

  if coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'audit_ready', p_notice, p_link, v_at);
  end if;
end;
$$;

revoke all on function
  public.audit_waiting(uuid),
  public.findings_teaser(uuid),
  public.mark_done(uuid, public.check_key, text, date, text),
  public.undo_done(uuid, public.check_key, text, date, text),
  public.ask_admitlabs_fix(uuid, text, text),
  public.open_fix_asks(uuid),
  public.record_review(jsonb),
  public.approve_audit(uuid, text, text, uuid, timestamptz),
  private.can_review()
from public, anon;

grant execute on function
  public.audit_waiting(uuid),
  public.findings_teaser(uuid),
  public.mark_done(uuid, public.check_key, text, date, text),
  public.undo_done(uuid, public.check_key, text, date, text),
  public.ask_admitlabs_fix(uuid, text, text),
  public.open_fix_asks(uuid),
  public.record_review(jsonb),
  public.approve_audit(uuid, text, text, uuid, timestamptz),
  private.can_review()
to authenticated, service_role;

-- Shared Audit ------------------------------------------------------------------------------

-- What a share link shows, now place by place (spec section 13): every check with its result,
-- what was found, the source and the date, and every finding on What people say and Other places
-- with its line and link. The fix's name for each; why it matters, the steps and the ready fix
-- for the top 3 fixes only, by the one ranking of checks and findings. Never notes, rivals,
-- Demand or who tracks the institution, and never a finding taken out in a review.
create or replace function public.shared_audit(p_token text) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  link record;
begin
  select l.token, l.audit_id, l.institution_id, l.created_at, l.expires_at, l.stopped_at, a.kind, a.run_at
  into link
  from public.share_links l
  join public.audits a on a.id = l.audit_id and a.institution_id = l.institution_id
  where l.token = p_token;
  if not found or link.kind <> 'team' then
    return null;
  end if;
  if link.stopped_at is not null or link.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'live',
    'sharedAt', link.created_at,
    'expiresAt', link.expires_at,
    'institution', (
      select jsonb_build_object('name', i.name, 'type', i.type, 'city', i.city, 'state', i.state, 'website', i.website)
      from public.institutions i where i.id = link.institution_id
    ),
    'audit', (
      select jsonb_build_object(
        'id', a.id, 'runAt', a.run_at, 'programCount', a.program_count,
        'overall', a.overall, 'discovered', a.discovered, 'trusted', a.trusted, 'chosen', a.chosen
      )
      from public.audits a where a.id = link.audit_id
    ),
    'programs', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', ps.program_id, 'name', p.name, 'overall', ps.overall, 'discovered', ps.discovered, 'trusted', ps.trusted, 'chosen', ps.chosen)
        order by p.name
      )
      from public.audit_program_scores ps
      join public.programs p on p.id = ps.program_id
      where ps.audit_id = link.audit_id
    ), '[]'::jsonb),
    'checks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'programId', c.program_id, 'pillar', c.pillar, 'key', c.check_key, 'result', c.result,
          'pointsAwarded', c.points_awarded, 'pointsMax', c.points_max,
          'strengthRank', c.strength_rank, 'fixRank', c.fix_rank, 'checkedAt', c.checked_at,
          'finding', d.finding, 'sourceUrl', d.source_url, 'fixTitle', d.fix_title,
          'whyItMatters', case when c.fix_rank <= private.shared_fix_limit() then d.why_it_matters end,
          'howToFix', case when c.fix_rank <= private.shared_fix_limit() then d.how_to_fix end,
          'fixSteps', case when c.fix_rank <= private.shared_fix_limit() then to_jsonb(d.fix_steps) end,
          'readyFix', case when c.fix_rank <= private.shared_fix_limit() then d.ready_fix end,
          'difficulty', case when c.fix_rank <= private.shared_fix_limit() then d.difficulty end
        )
        order by c.check_key, c.program_id
      )
      from public.audit_checks c
      left join public.audit_check_details d on d.audit_check_id = c.id
      where c.audit_id = link.audit_id
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id, 'place', f.place, 'kind', f.kind, 'findingKey', f.finding_key, 'line', f.line,
          'sourceName', f.source_name, 'sourceUrl', f.source_url, 'checkedAt', f.checked_at,
          'repeats', f.repeats, 'listing', f.listing,
          'fixTitle', f.fix_title, 'effort', f.effort, 'impact', f.impact, 'fixRank', f.fix_rank,
          'fixWhy', case when f.fix_rank <= private.shared_fix_limit() then f.fix_why end,
          'fixSteps', case when f.fix_rank <= private.shared_fix_limit() then to_jsonb(f.fix_steps) end,
          'readyFix', case when f.fix_rank <= private.shared_fix_limit() then f.ready_fix end
        )
        order by f.place, f.checked_at, f.finding_key
      )
      from public.audit_findings f
      where f.audit_id = link.audit_id and f.removed_at is null
    ), '[]'::jsonb)
  );
end;
$$;

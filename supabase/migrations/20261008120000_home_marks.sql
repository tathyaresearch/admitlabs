-- The new Home (October 2026 product review, part 2).
--
--   Mark as done (done_marks). The owner marks one of the month's things done. A check (an Audit
--   fix, or a rival lesson about a check) waits for the next own Audit: record_audit() links every
--   open check mark to the first own Audit after it, and the page reads what that Audit found. Any
--   other thing (a rival's post or move to learn from, a content idea) is kept with the month it
--   belongs to. People at the institution and the AdmitLabs team read the marks; only the owner
--   adds one or takes it back, through mark_done() and undo_done().
--   Start here (memberships.guide_closed_at). Home's first visit guide shows until the person
--   closes it, through close_start_guide().
--   Effort for the Rivals 3 things to do (actions.effort), written by the analysis provider.
--   The 0 to 39 score label "At risk" is now "Getting started" (scoring_config.labels).

create table public.done_marks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  -- A check: the next own Audit checks it.
  check_key public.check_key,
  -- Or any other thing to do, by its words, with the month it belongs to (the 1st).
  thing text check (thing is null or char_length(thing) between 1 and 300),
  month date check (month is null or extract(day from month) = 1),
  marked_by uuid references auth.users (id) on delete set null,
  marked_at timestamptz not null default now(),
  -- The first own Audit after a check was marked, which checked it.
  checked_by_audit uuid references public.audits (id) on delete cascade,
  constraint done_marks_one_thing check ((check_key is null) <> (thing is null)),
  constraint done_marks_month check ((thing is null) = (month is null)),
  constraint done_marks_checked check (checked_by_audit is null or check_key is not null)
);
-- One open mark per check, and one mark per thing and month.
create unique index done_marks_open_check on public.done_marks (institution_id, check_key) where check_key is not null and checked_by_audit is null;
create unique index done_marks_thing on public.done_marks (institution_id, month, thing) where thing is not null;
create index done_marks_institution_idx on public.done_marks (institution_id, marked_at desc);
create index done_marks_audit_idx on public.done_marks (checked_by_audit) where checked_by_audit is not null;

alter table public.done_marks enable row level security;
grant select on public.done_marks to authenticated;
grant all on public.done_marks to service_role;
revoke all on public.done_marks from anon;
create policy done_marks_read on public.done_marks
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));

alter table public.memberships add column guide_closed_at timestamptz;

alter table public.actions add column effort public.difficulty;

-- Owner only. A check must have something to fix in the latest own Audit; marking it again
-- while it waits changes nothing. A thing needs its words and its month (not a later one).
create function public.mark_done(p_institution uuid, p_check public.check_key default null, p_thing text default null, p_month date default null) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thing text := nullif(regexp_replace(trim(coalesce(p_thing, '')), '[[:space:]]+', ' ', 'g'), '');
  v_mark uuid;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if (p_check is null) = (v_thing is null) then
    raise exception 'one_thing' using errcode = '22023';
  end if;

  if p_check is not null then
    if not exists (
      select 1 from public.audit_checks c
      where c.audit_id = private.latest_own_audit(p_institution) and c.check_key = p_check and c.result <> 'strong'
    ) then
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
create function public.undo_done(p_institution uuid, p_check public.check_key default null, p_thing text default null, p_month date default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thing text := nullif(regexp_replace(trim(coalesce(p_thing, '')), '[[:space:]]+', ' ', 'g'), '');
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  delete from public.done_marks m
  where m.institution_id = p_institution
    and m.checked_by_audit is null
    and (
      (p_check is not null and m.check_key = p_check)
      or (p_check is null and m.thing = v_thing and m.month = p_month)
    );
end;
$$;

-- Anyone at the institution closes their own Start here.
create function public.close_start_guide(p_institution uuid) returns void
language sql security definer
set search_path = ''
as $$
  update public.memberships
  set guide_closed_at = coalesce(guide_closed_at, now())
  where user_id = (select auth.uid()) and institution_id = p_institution;
$$;

-- As before, plus: an own Audit checks every check marked done before it ran.
create or replace function public.record_audit(payload jsonb) returns uuid
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

  -- Mark as done: the first own Audit after a check was marked checks it. Team and rival runs never do.
  if v_kind in ('free', 'paid', 'client') then
    update public.done_marks
    set checked_by_audit = v_audit
    where institution_id = v_institution and check_key is not null and checked_by_audit is null and marked_at <= v_run_at;
  end if;

  if jsonb_typeof(payload -> 'notification') = 'object' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'audit_ready', payload -> 'notification' ->> 'text', payload -> 'notification' ->> 'link', v_run_at);
  end if;

  return v_audit;
end;
$$;

-- As before, plus how big a job each one is.
create or replace function public.record_actions(p_institution uuid, p_month date, p_feature public.feature, p_items jsonb) returns integer
language plpgsql
set search_path = ''
as $$
begin
  delete from public.actions a where a.institution_id = p_institution and a.month = p_month and a.feature = p_feature;
  insert into public.actions (institution_id, month, rank, text, detail, feature, rival_institution_id, check_key, effort)
  select p_institution, p_month, (item ->> 'rank')::smallint, item ->> 'text', item ->> 'detail', p_feature,
    (item ->> 'rival_institution_id')::uuid, (item ->> 'check_key')::public.check_key, (item ->> 'effort')::public.difficulty
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;
  return jsonb_array_length(coalesce(p_items, '[]'::jsonb));
end;
$$;

-- "At risk" reads as a failure on day one. The band keeps its range.
update public.scoring_config c
set labels = (
  select jsonb_agg(case when bands.band ->> 'label' = 'At risk' then jsonb_set(bands.band, '{label}', to_jsonb('Getting started'::text)) else bands.band end order by bands.position)
  from jsonb_array_elements(c.labels) with ordinality as bands(band, position)
)
where c.labels @> '[{"label": "At risk"}]'::jsonb;

revoke all on function
  public.mark_done(uuid, public.check_key, text, date),
  public.undo_done(uuid, public.check_key, text, date),
  public.close_start_guide(uuid)
from public, anon;
grant execute on function
  public.mark_done(uuid, public.check_key, text, date),
  public.undo_done(uuid, public.check_key, text, date),
  public.close_start_guide(uuid)
to authenticated;

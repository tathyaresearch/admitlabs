-- How to fix, in short steps (October 2026 product review, part 3). The analysis provider writes
-- the advice as steps, one thing each; the check panel numbers them. how_to_fix keeps the same
-- steps as one paragraph, for the monthly report, a shared Audit and Home. Older Audits have no
-- steps: their paragraph is the one step. Read with the details, so the plan rules are unchanged.

alter table public.audit_check_details add column fix_steps text[];

-- As before, plus how to fix in steps.
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
    insert into public.audit_check_details (audit_check_id, finding, why_it_matters, how_to_fix, fix_steps, difficulty, source_url)
    values (
      v_check, item ->> 'finding', item ->> 'why_it_matters', item ->> 'how_to_fix',
      (select array_agg(s.step order by s.position) from jsonb_array_elements_text(coalesce(item -> 'fix_steps', '[]'::jsonb)) with ordinality as s(step, position)),
      (item ->> 'difficulty')::public.difficulty, item ->> 'source_url'
    );
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

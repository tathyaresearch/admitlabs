-- The institution side of Rivals, with the plan rules from spec section 10, enforced in the
-- database. Rival data is only reachable through the viewer's own rivals link.
--
--   Rival list          Members of the tracking institution. Never the tracked side.
--   Ahead or behind     Every tier, through rival_standings(): one word per rival, no scores.
--   Full comparison     Paid and Client: rival Audits (scores, checks, what was found), moves,
--                       best content, ads, and when each rival was last checked.
--   3 things to do      Members read their own. Rivals' list is Paid and Client only.
--   Picking rivals      Owners, through save_rivals(): 3 to 5, from the suggestions, current
--                       rivals or ones they add. Free picks once, Paid changes once a calendar
--                       month (India time), Client any time.
--
-- Rivals never know: nothing here answers for the tracked side, and nothing says who tracks whom.

-- Limits shared with src/config/rivals.ts (a test on each side checks they agree).
create function private.rival_limits(out min_rivals integer, out max_rivals integer, out suggestions integer)
language sql immutable
set search_path = ''
as $$
  select 3, 5, 6;
$$;

-- The viewer tracks the target from an institution on Paid or Client.
create function private.tracks_in_full(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rivals r
    join public.memberships m on m.institution_id = r.institution_id
    where m.user_id = (select auth.uid())
      and r.rival_institution_id = target
      and private.effective_tier(r.institution_id) <> 'free'
  );
$$;

create function private.can_see_rival_audit(audit uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.audits a where a.id = audit and a.kind = 'rival' and private.tracks_in_full(a.institution_id)
  );
$$;

create function private.can_see_rival_check(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.audit_checks c where c.id = target and private.can_see_rival_audit(c.audit_id));
$$;

revoke all on function
  private.rival_limits(),
  private.tracks_in_full(uuid),
  private.can_see_rival_audit(uuid),
  private.can_see_rival_check(uuid)
from public;
grant execute on function
  private.rival_limits(),
  private.tracks_in_full(uuid),
  private.can_see_rival_audit(uuid),
  private.can_see_rival_check(uuid)
to authenticated;
-- The writers below run as the service role and check plans at the moment of the check.
grant execute on function private.effective_tier(uuid, timestamptz) to service_role;

create policy rivals_member_read on public.rivals
  for select to authenticated using (private.is_member(institution_id));

create policy rival_moves_tracker_read on public.rival_moves
  for select to authenticated using (private.tracks_in_full(rival_institution_id));
create policy rival_content_tracker_read on public.rival_content
  for select to authenticated using (private.tracks_in_full(rival_institution_id));
create policy rival_ads_tracker_read on public.rival_ads
  for select to authenticated using (private.tracks_in_full(rival_institution_id));

create policy rival_checks_read on public.rival_checks
  for select to authenticated using ((select private.is_team()) or private.tracks_in_full(rival_institution_id));
create policy rival_checks_team_write on public.rival_checks
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

create policy rival_changes_read on public.rival_changes
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));
create policy rival_changes_team_write on public.rival_changes
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

create policy audits_rival_read on public.audits
  for select to authenticated using (private.can_see_rival_audit(id));
create policy audit_program_scores_rival_read on public.audit_program_scores
  for select to authenticated using (private.can_see_rival_audit(audit_id));
create policy audit_checks_rival_read on public.audit_checks
  for select to authenticated using (private.can_see_rival_audit(audit_id));
create policy audit_check_details_rival_read on public.audit_check_details
  for select to authenticated using (private.can_see_rival_check(audit_check_id));

create policy actions_member_read on public.actions
  for select to authenticated
  using (private.is_member(institution_id) and (feature <> 'rivals' or private.effective_tier(institution_id) <> 'free'));

-- Ahead or behind, for every tier: one word per rival and no scores. 'ahead' means the rival
-- is ahead of you. Your latest own Audit against the rival's latest rival Audit, overall only.
create function public.rival_standings(p_institution uuid)
returns table (rival_institution_id uuid, standing text)
language sql stable security definer
set search_path = ''
as $$
  with mine as (
    select a.overall from public.audits a where a.id = private.latest_own_audit(p_institution)
  ),
  theirs as (
    select r.rival_institution_id,
      (
        select a.overall from public.audits a
        where a.institution_id = r.rival_institution_id and a.kind = 'rival'
        order by a.run_at desc, a.id desc
        limit 1
      ) as overall
    from public.rivals r
    where r.institution_id = p_institution
  )
  select t.rival_institution_id,
    case
      when t.overall is null or (select m.overall from mine m) is null then 'unscored'
      when t.overall > (select m.overall from mine m) then 'ahead'
      when t.overall < (select m.overall from mine m) then 'behind'
      else 'level'
    end
  from theirs t
  where private.is_member(p_institution) or private.is_team();
$$;

-- Counts for Free's unlock card, so it shows the data is real without showing the data.
create function public.rival_teaser(p_institution uuid, out moves integer, out posts integer, out ads integer)
language sql stable security definer
set search_path = ''
as $$
  with tracked as (
    select r.rival_institution_id as id from public.rivals r
    where r.institution_id = p_institution and (private.is_member(p_institution) or private.is_team())
  ),
  latest_month as (
    select max(c.month) as month from public.rival_content c where c.rival_institution_id in (select id from tracked)
  )
  select
    (select count(*)::integer from public.rival_moves m where m.rival_institution_id in (select id from tracked) and m.detected_at > now() - interval '30 days'),
    (select count(*)::integer from public.rival_content c where c.rival_institution_id in (select id from tracked) and c.month = (select month from latest_month)),
    (select count(*)::integer from public.rival_ads d where d.rival_institution_id in (select id from tracked));
$$;

-- A rival's Google rating and review count at each of its last rival Audits, for the review
-- trend. Paid and Client trackers only.
create function public.rival_review_trend(p_rival uuid)
returns table (checked_at timestamptz, rating numeric, review_count integer)
language sql stable security definer
set search_path = ''
as $$
  select s.fetched_at, (s.value ->> 'rating')::numeric, (s.value ->> 'reviewCount')::integer
  from public.signals s
  join public.audits a on a.institution_id = s.institution_id and a.kind = 'rival' and a.run_at = s.fetched_at
  where s.institution_id = p_rival
    and s.check_key = 'review_rating'
    and (private.tracks_in_full(p_rival) or private.is_team())
  order by s.fetched_at desc
  limit 6;
$$;

-- Suggested rivals (spec 8.2): same type, overlapping programs, same city first, then the same
-- state. Never the institution itself, a rival it already tracks, or a team prospect.
-- Shared programs are named from the institution's own list.
create function public.rival_suggestions(p_institution uuid)
returns table (
  institution_id uuid,
  name text,
  type public.institution_type,
  city text,
  state text,
  website text,
  same_city boolean,
  shared_programs text[]
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.type, i.city, i.state
    from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
  ),
  my_programs as (
    select p.name, coalesce(p.program_key, lower(p.name)) as match_key
    from public.programs p
    where p.institution_id = p_institution and p.archived_at is null
  ),
  candidates as (
    select c.id, c.name, c.type, c.city, c.state, c.website,
      c.city = me.city as same_city,
      array(
        select mp.name from my_programs mp
        where exists (
          select 1 from public.programs cp
          where cp.institution_id = c.id and cp.archived_at is null and coalesce(cp.program_key, lower(cp.name)) = mp.match_key
        )
        order by mp.name
      ) as shared
    from public.institutions c
    cross join me
    left join public.institution_status s on s.institution_id = c.id
    where c.id <> me.id
      and c.type = me.type
      and c.state = me.state
      and not (coalesce(s.is_prospect, false) and not coalesce(s.claimed, false))
      and not exists (select 1 from public.rivals r where r.institution_id = me.id and r.rival_institution_id = c.id)
  )
  select c.id, c.name, c.type, c.city, c.state, c.website, c.same_city, c.shared
  from candidates c
  where cardinality(c.shared) > 0
  order by c.same_city desc, cardinality(c.shared) desc, c.name
  limit (select l.suggestions from private.rival_limits() l);
$$;

-- A rival the owner adds: the record that already has this website, or a new unclaimed one.
-- Its programs are the ones the owner ticked from their own list, so both sides compare like
-- for like. An existing record is never changed.
create function private.rival_record(entry jsonb, tracker uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(entry ->> 'name', ''));
  v_website text := btrim(coalesce(entry ->> 'website', ''));
  found_id uuid;
begin
  if v_name = '' or v_website = '' then
    raise exception 'rival_details' using errcode = 'P0001';
  end if;
  select i.id into found_id from public.institutions i where private.website_host(i.website) = private.website_host(v_website);
  if found_id is not null then
    return found_id;
  end if;

  insert into public.institutions (slug, name, type, city, state, website, instagram)
  values (
    private.unique_slug(v_name), v_name, (entry ->> 'type')::public.institution_type, entry ->> 'city', entry ->> 'state',
    v_website, nullif(btrim(coalesce(entry ->> 'instagram', '')), '')
  )
  returning id into found_id;
  insert into public.institution_status (institution_id, claimed, is_prospect, created_by)
  values (found_id, false, false, (select auth.uid()));

  insert into public.programs (institution_id, name, program_key)
  select found_id, p.name, p.program_key
  from public.programs p
  where p.institution_id = tracker
    and p.archived_at is null
    and p.id in (select (value #>> '{}')::uuid from jsonb_array_elements(coalesce(entry -> 'programs', '[]'::jsonb)))
  on conflict (institution_id, name) do nothing;
  if not exists (select 1 from public.programs where institution_id = found_id) then
    raise exception 'rival_programs' using errcode = 'P0001';
  end if;
  return found_id;
exception
  when foreign_key_violation or invalid_text_representation then
    raise exception 'rival_details' using errcode = 'P0001';
end;
$$;

-- Save the owner's rival list: 3 to 5, from the suggestions, their current rivals, or ones they
-- add. The plan rules hold here, whatever the page shows. Saving the same list again is not a
-- change. Returns the saved list.
create function public.save_rivals(p_picked uuid[], p_added jsonb) returns uuid[]
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target uuid := private.owned_institution();
  v_tier public.tier := private.effective_tier(target);
  limits record;
  current_ids uuid[];
  suggested_ids uuid[];
  chosen uuid[] := array[]::uuid[];
  pick uuid;
  entry jsonb;
  first_setup boolean;
begin
  select * into limits from private.rival_limits();
  -- One save at a time per institution, so two changes cannot both slip under the monthly limit.
  perform pg_advisory_xact_lock(hashtextextended('rivals:' || target::text, 0));

  select coalesce(array_agg(r.rival_institution_id), array[]::uuid[]) into current_ids
  from public.rivals r where r.institution_id = target;
  first_setup := cardinality(current_ids) = 0;

  select coalesce(array_agg(s.institution_id), array[]::uuid[]) into suggested_ids
  from public.rival_suggestions(target) s;

  foreach pick in array coalesce(p_picked, array[]::uuid[]) loop
    if not (pick = any (current_ids) or pick = any (suggested_ids)) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if not (pick = any (chosen)) then
      chosen := chosen || pick;
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(coalesce(p_added, '[]'::jsonb)) loop
    pick := private.rival_record(entry, target);
    if pick = target then
      raise exception 'own_website' using errcode = 'P0001';
    end if;
    if not (pick = any (chosen)) then
      chosen := chosen || pick;
    end if;
  end loop;

  if cardinality(chosen) < limits.min_rivals or cardinality(chosen) > limits.max_rivals then
    raise exception 'rival_count' using errcode = 'P0001';
  end if;

  if not first_setup and chosen @> current_ids and current_ids @> chosen then
    return chosen;
  end if;

  if not first_setup then
    if v_tier = 'free' then
      raise exception 'rivals_locked' using errcode = 'P0001';
    end if;
    if v_tier = 'paid' and exists (
      select 1 from public.rival_changes c
      where c.institution_id = target
        and not c.first_setup
        and date_trunc('month', c.changed_at at time zone 'Asia/Kolkata') = date_trunc('month', now() at time zone 'Asia/Kolkata')
    ) then
      raise exception 'change_used' using errcode = 'P0001';
    end if;
  end if;

  delete from public.rivals r where r.institution_id = target and not (r.rival_institution_id = any (chosen));
  insert into public.rivals (institution_id, rival_institution_id, suggested)
  select target, picked, picked = any (suggested_ids)
  from unnest(chosen) as picked
  on conflict (institution_id, rival_institution_id) do nothing;
  insert into public.rival_changes (institution_id, changed_by, first_setup, rival_ids)
  values (target, me, first_setup, chosen);
  return chosen;
end;
$$;

-- Saves one weekly check of a rival in one transaction: the check itself, new moves, and the
-- best content for the months it covers. Each new move alerts every institution that tracks
-- the rival on Paid or Client (spec section 11). Server only (service key).
create function public.record_rival_check(payload jsonb) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rival uuid := (payload ->> 'rival_institution_id')::uuid;
  v_checked_at timestamptz := (payload ->> 'checked_at')::timestamptz;
  v_notify boolean := coalesce((payload ->> 'notify')::boolean, false);
  move jsonb;
  inserted uuid;
  new_moves integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('rival-check:' || v_rival::text, 0));

  insert into public.rival_checks (rival_institution_id, week, checked_at)
  values (v_rival, (payload ->> 'week')::date, v_checked_at)
  on conflict (rival_institution_id, week) do update set checked_at = excluded.checked_at;

  for move in select value from jsonb_array_elements(coalesce(payload -> 'moves', '[]'::jsonb)) loop
    inserted := null;
    insert into public.rival_moves (rival_institution_id, kind, description, source_url, detected_at)
    values (v_rival, (move ->> 'kind')::public.rival_move_kind, move ->> 'description', move ->> 'source_url', (move ->> 'detected_at')::timestamptz)
    on conflict (rival_institution_id, kind, description) do nothing
    returning id into inserted;
    if inserted is not null then
      new_moves := new_moves + 1;
      if v_notify then
        insert into public.notifications (institution_id, kind, text, link, created_at)
        select r.institution_id, 'rival_move', move ->> 'notice', '/rivals/' || v_rival::text, v_checked_at
        from public.rivals r
        where r.rival_institution_id = v_rival
          and r.added_at <= v_checked_at
          and private.effective_tier(r.institution_id, v_checked_at) <> 'free';
      end if;
    end if;
  end loop;

  if jsonb_typeof(payload -> 'content_months') = 'array' then
    delete from public.rival_content c
    where c.rival_institution_id = v_rival
      and c.month in (select (value #>> '{}')::date from jsonb_array_elements(payload -> 'content_months'));
    insert into public.rival_content (rival_institution_id, platform, url, title, metrics, why_it_worked, month, posted_at)
    select v_rival, (item ->> 'platform')::public.content_platform, item ->> 'url', item ->> 'title',
      coalesce(item -> 'metrics', '{}'::jsonb), item ->> 'why_it_worked', (item ->> 'month')::date, (item ->> 'posted_at')::timestamptz
    from jsonb_array_elements(coalesce(payload -> 'content', '[]'::jsonb)) as item;
  end if;

  return new_moves;
end;
$$;

-- Replaces one feature's 3 things to do for a month. Server only (service key).
create function public.record_actions(p_institution uuid, p_month date, p_feature public.feature, p_items jsonb) returns integer
language plpgsql
set search_path = ''
as $$
begin
  delete from public.actions a where a.institution_id = p_institution and a.month = p_month and a.feature = p_feature;
  insert into public.actions (institution_id, month, rank, text, detail, feature, rival_institution_id, check_key)
  select p_institution, p_month, (item ->> 'rank')::smallint, item ->> 'text', item ->> 'detail', p_feature,
    (item ->> 'rival_institution_id')::uuid, (item ->> 'check_key')::public.check_key
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;
  return jsonb_array_length(coalesce(p_items, '[]'::jsonb));
end;
$$;

revoke all on function
  public.rival_standings(uuid),
  public.rival_teaser(uuid),
  public.rival_review_trend(uuid),
  public.rival_suggestions(uuid),
  private.rival_record(jsonb, uuid),
  public.save_rivals(uuid[], jsonb),
  public.record_rival_check(jsonb),
  public.record_actions(uuid, date, public.feature, jsonb)
from public, anon, authenticated;

grant execute on function
  public.rival_standings(uuid),
  public.rival_teaser(uuid),
  public.rival_review_trend(uuid),
  public.rival_suggestions(uuid),
  public.save_rivals(uuid[], jsonb)
to authenticated;

grant execute on function
  public.record_rival_check(jsonb),
  public.record_actions(uuid, date, public.feature, jsonb)
to service_role;

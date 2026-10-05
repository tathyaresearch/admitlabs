-- Paid by period (October 2026, spec section 5): the same Paid plan, billed Monthly (₹9,999 + GST
-- per month) or for 3 months (₹24,999 + GST). The prices live in src/config/plans.ts only; the
-- database keeps the period.
--
--   plans.paid_months       1 or 3 on a Paid plan, set by set_plan(). Null elsewhere. A Paid plan
--                           without one (from before) counts as 3 months, as the app does.
--   enquiries.paid_months   which period Subscribe now or Renew now asked for.
--   set_plan()              the Admin gives the period: the plan ends 1 or 3 months after its start.
--   Reminders               Renew now opens 7 days before the end on Monthly, 30 days on 3 months
--                           (private.paid_reminder_days(), mirroring PLAN_RULES), and the team's
--                           "Paid ending soon" follows the same days.

-- The period ----------------------------------------------------------------------------------

alter table public.plans
  add column paid_months smallint check (paid_months in (1, 3)),
  add constraint paid_months_only_paid check (tier = 'paid' or paid_months is null);

-- Paid plans from before were one period of the old plan: they keep their dates and remind like 3 months.
update public.plans set paid_months = 3 where tier = 'paid';

alter table public.enquiries
  add column paid_months smallint check (paid_months in (1, 3)),
  add constraint enquiries_paid_months check (kind in ('ask_paid', 'continue_paid') or paid_months is null);

-- How many days before the end the first renewal reminder comes, by period
-- (PLAN_RULES.paid.periods in src/config/plans.ts; a test on each side checks they agree).
create function private.paid_reminder_days(p_months integer) returns integer
language sql immutable
set search_path = ''
as $$
  select case when coalesce(p_months, 3) = 1 then 7 else 30 end;
$$;

-- Asking to continue opens with the first reminder, and one day more, so a button shown on the
-- last such day is never turned away.
create function private.continue_paid_days(p_months integer) returns integer
language sql immutable
set search_path = ''
as $$
  select private.paid_reminder_days(p_months) + 1;
$$;

create or replace function private.paid_ask_kind(target uuid) returns public.enquiry_kind
language sql stable security definer
set search_path = ''
as $$
  select case
    when private.effective_tier(target) = 'free' then 'ask_paid'::public.enquiry_kind
    when private.effective_tier(target) = 'paid' and exists (
      select 1 from public.plans p
      where p.institution_id = target
        and p.ends_at is not null
        and p.ends_at <= now() + make_interval(days => private.continue_paid_days(p.paid_months))
    ) then 'continue_paid'::public.enquiry_kind
  end;
$$;

drop function private.continue_paid_days();

-- Subscribe now and Renew now, with the period picked ---------------------------------------

drop function public.ask_for_paid(uuid);

-- The owner's request, with the period they picked. Asking again while one is open adds nothing:
-- it keeps the open one, with the period picked last, and returns when it was sent.
create function public.ask_for_paid(p_institution uuid, p_months integer) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_kind public.enquiry_kind;
  v_at timestamptz;
begin
  if not private.is_owner(p_institution) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_months is null or p_months not in (1, 3) then
    raise exception 'bad_period' using errcode = '22023';
  end if;
  v_kind := private.paid_ask_kind(p_institution);
  if v_kind is null then
    raise exception 'nothing_to_ask' using errcode = 'P0001';
  end if;

  update public.enquiries e
  set paid_months = p_months
  where e.id = (
    select o.id from public.enquiries o
    where o.institution_id = p_institution and o.kind = v_kind and o.handled_at is null
    order by o.created_at desc
    limit 1
  )
  returning e.created_at into v_at;
  if v_at is not null then
    return v_at;
  end if;

  insert into public.enquiries (kind, institution_id, asked_by, institution, email, paid_months)
  select v_kind, p_institution, u.id, i.name, lower(u.email), p_months
  from auth.users u, public.institutions i
  where u.id = (select auth.uid()) and i.id = p_institution
  returning created_at into v_at;
  return v_at;
end;
$$;

drop function public.open_paid_ask(uuid);

-- The institution's open request, for its own people: what was asked, for which period, and when.
create function public.open_paid_ask(p_institution uuid) returns table (kind public.enquiry_kind, asked_at timestamptz, paid_months smallint)
language sql stable security definer
set search_path = ''
as $$
  select e.kind, e.created_at, e.paid_months
  from public.enquiries e
  where private.is_member(p_institution)
    and e.institution_id = p_institution
    and e.kind in ('ask_paid', 'continue_paid')
    and e.handled_at is null
  order by e.created_at desc
  limit 1;
$$;

revoke all on function
  private.paid_reminder_days(integer),
  private.continue_paid_days(integer),
  public.ask_for_paid(uuid, integer),
  public.open_paid_ask(uuid)
from public, anon;
grant execute on function public.ask_for_paid(uuid, integer), public.open_paid_ask(uuid) to authenticated;
-- The team list's view runs as the team user who reads it.
grant execute on function private.paid_reminder_days(integer) to authenticated, service_role;

-- The Admin's switch to Paid asks for the period ----------------------------------------------

drop function public.set_plan(uuid, public.tier, timestamptz);

-- Admin starts Paid or Client for an institution that has signed up. Paid runs 1 or 3 months
-- (p_months) from its start, counted on the India calendar (30 November plus 3 months is 28
-- February), as paidPlanEndsAt() does. Client runs until an Admin ends it. Never a start in the future.
create function public.set_plan(p_institution uuid, p_tier public.tier, p_starts_at timestamptz, p_months integer default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_start timestamptz := coalesce(p_starts_at, now());
  v_end timestamptz;
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_tier not in ('paid', 'client') then
    raise exception 'plan_tier' using errcode = 'P0001';
  end if;
  if p_tier = 'paid' and (p_months is null or p_months not in (1, 3)) then
    raise exception 'plan_period' using errcode = 'P0001';
  end if;
  if v_start > now() + interval '1 minute' then
    raise exception 'plan_future' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.institution_status s where s.institution_id = p_institution and s.claimed) then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
  if p_tier = 'paid' then
    v_end := ((v_start at time zone 'Asia/Kolkata') + make_interval(months => p_months)) at time zone 'Asia/Kolkata';
    if v_end <= now() then
      raise exception 'plan_over' using errcode = 'P0001';
    end if;
  end if;
  update public.plans
  set tier = p_tier,
      starts_at = v_start,
      ends_at = v_end,
      paid_months = case when p_tier = 'paid' then p_months end,
      set_by = (select auth.uid())
  where institution_id = p_institution;
  if not found then
    raise exception 'no_plan' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.set_plan(uuid, public.tier, timestamptz, integer) from public, anon;
grant execute on function public.set_plan(uuid, public.tier, timestamptz, integer) to authenticated;

-- The team list: "Paid ending soon" by the plan's period ---------------------------------------

-- As in 20261010120000_ask_paid_attention.sql, with the plan's period (plan_months), and reason 1
-- (a Paid plan ending soon) from the plan's first reminder: 7 days on Monthly, 30 days on 3 months.
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
    p.paid_months as plan_months
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
  end as attention,
  case
    when tier = 'paid' and plan_ends_at > now() and plan_ends_at <= now() + make_interval(days => private.paid_reminder_days(plan_months)) then extract(epoch from plan_ends_at)
    when tier = 'client' and (team_refreshed_at is null or team_refreshed_at < private.month_start_india()) then null
    when claimed and score_change <= -private.attention_score_drop() then score_change
    when claimed and rivals = 0 then null
    when not claimed and shared_at is not null and (now() at time zone 'Asia/Kolkata')::date - (shared_at at time zone 'Asia/Kolkata')::date >= private.attention_follow_up_days() then extract(epoch from shared_at)
  end as attention_order
from base;

revoke all on public.team_institutions from anon;
grant select on public.team_institutions to authenticated, service_role;

-- Part 5 of the product review: asking for Paid from the dashboard (C2), and the team's list of
-- institutions by the reason each one needs attention (B8).

-- Asking for Paid ---------------------------------------------------------------------------

-- The owner asks from the dashboard: on Free "Ask for Paid", in the last month of Paid "Ask to
-- continue Paid". The request lands in the team's Enquiries beside the website's form, with the
-- institution and the owner's email. No payment and no email: the team writes back and switches
-- the plan on, at the same price and terms.

create type public.enquiry_kind as enum ('work_with_us', 'ask_paid', 'continue_paid');

alter table public.enquiries
  add column kind public.enquiry_kind not null default 'work_with_us',
  add column institution_id uuid references public.institutions (id) on delete cascade,
  add column asked_by uuid references auth.users (id) on delete set null,
  alter column name drop not null,
  alter column role drop not null,
  alter column phone drop not null,
  -- The website's form gives a name, a role and a phone; a request from the dashboard comes from
  -- a signed-in owner of one institution instead.
  add constraint enquiries_form check (kind <> 'work_with_us' or (name is not null and role is not null and phone is not null)),
  add constraint enquiries_from_dashboard check (kind = 'work_with_us' or (institution_id is not null and asked_by is not null));

create index enquiries_open_asks on public.enquiries (institution_id, kind, created_at desc) where handled_at is null and kind <> 'work_with_us';

-- How many days before a Paid plan ends the owner can ask to continue it: the first renewal
-- reminder (PLAN_RULES.paid.reminderDaysBefore in src/config/plans.ts), and one day more, so a
-- button shown on the last such day is never turned away.
create function private.continue_paid_days() returns integer
language sql immutable
set search_path = ''
as $$
  select 31;
$$;

-- What the institution can ask for now: Paid on Free (a Paid plan that ended counts as Free),
-- to continue Paid in its last month, nothing on Client or earlier in Paid.
create function private.paid_ask_kind(target uuid) returns public.enquiry_kind
language sql stable security definer
set search_path = ''
as $$
  select case
    when private.effective_tier(target) = 'free' then 'ask_paid'::public.enquiry_kind
    when private.effective_tier(target) = 'paid' and exists (
      select 1 from public.plans p
      where p.institution_id = target and p.ends_at is not null and p.ends_at <= now() + make_interval(days => private.continue_paid_days())
    ) then 'continue_paid'::public.enquiry_kind
  end;
$$;

-- The owner's request. Asking again while one is open returns the open one's time and adds
-- nothing, so a second click never sends a second request.
create function public.ask_for_paid(p_institution uuid) returns timestamptz
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
  v_kind := private.paid_ask_kind(p_institution);
  if v_kind is null then
    raise exception 'nothing_to_ask' using errcode = 'P0001';
  end if;

  select e.created_at into v_at
  from public.enquiries e
  where e.institution_id = p_institution and e.kind = v_kind and e.handled_at is null
  order by e.created_at desc
  limit 1;
  if v_at is not null then
    return v_at;
  end if;

  insert into public.enquiries (kind, institution_id, asked_by, institution, email)
  select v_kind, p_institution, u.id, i.name, lower(u.email)
  from auth.users u, public.institutions i
  where u.id = (select auth.uid()) and i.id = p_institution
  returning created_at into v_at;
  return v_at;
end;
$$;

-- The institution's open request, for its own people: what was asked and when.
create function public.open_paid_ask(p_institution uuid) returns table (kind public.enquiry_kind, asked_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select e.kind, e.created_at
  from public.enquiries e
  where private.is_member(p_institution)
    and e.institution_id = p_institution
    and e.kind <> 'work_with_us'
    and e.handled_at is null
  order by e.created_at desc
  limit 1;
$$;

revoke all on function
  private.continue_paid_days(),
  private.paid_ask_kind(uuid),
  public.ask_for_paid(uuid),
  public.open_paid_ask(uuid)
from public, anon;
grant execute on function public.ask_for_paid(uuid), public.open_paid_ask(uuid) to authenticated;

-- The team list by reason -------------------------------------------------------------------

-- How far a score drops before it needs attention, and how long after sharing an Audit with a
-- prospect that has not signed up. Mirror TEAM_RULES in src/config/team.ts; a test on each side
-- checks they agree.
create function private.attention_score_drop() returns integer
language sql immutable
set search_path = ''
as $$
  select 3;
$$;

create function private.attention_follow_up_days() returns integer
language sql immutable
set search_path = ''
as $$
  select 7;
$$;

-- The first day of this month in India, where the team works.
create function private.month_start_india() returns timestamptz
language sql stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;

revoke all on function private.attention_score_drop(), private.attention_follow_up_days(), private.month_start_india() from public, anon;
-- The team list's view runs as the team user who reads it.
grant execute on function private.attention_score_drop(), private.attention_follow_up_days(), private.month_start_india() to authenticated, service_role;

-- The list as before, with what decides whether an institution needs attention and how urgently:
--   1. a Paid plan ending within 30 days (soonest first),
--   2. a Client with no Audit run by the team this month,
--   3. a score down by 3 or more at the latest Audit (biggest drop first),
--   4. signed up with no rivals picked,
--   5. a prospect whose team Audit was shared a week or more ago and who has not signed up (oldest first).
-- `attention` is the most urgent of these (null when none applies); `attention_order` orders
-- within it. The app says every reason that applies (src/team/attention.ts).
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
    ) as team_refreshed_at
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
    when tier = 'paid' and plan_ends_at > now() and plan_ends_at <= now() + interval '30 days' then 1
    when tier = 'client' and (team_refreshed_at is null or team_refreshed_at < private.month_start_india()) then 2
    when claimed and score_change <= -private.attention_score_drop() then 3
    when claimed and rivals = 0 then 4
    when not claimed and shared_at is not null and (now() at time zone 'Asia/Kolkata')::date - (shared_at at time zone 'Asia/Kolkata')::date >= private.attention_follow_up_days() then 5
  end as attention,
  case
    when tier = 'paid' and plan_ends_at > now() and plan_ends_at <= now() + interval '30 days' then extract(epoch from plan_ends_at)
    when tier = 'client' and (team_refreshed_at is null or team_refreshed_at < private.month_start_india()) then null
    when claimed and score_change <= -private.attention_score_drop() then score_change
    when claimed and rivals = 0 then null
    when not claimed and shared_at is not null and (now() at time zone 'Asia/Kolkata')::date - (shared_at at time zone 'Asia/Kolkata')::date >= private.attention_follow_up_days() then extract(epoch from shared_at)
  end as attention_order
from base;

revoke all on public.team_institutions from anon;
grant select on public.team_institutions to authenticated, service_role;

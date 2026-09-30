-- Helpers used by RLS policies. Security definer so they can read membership tables
-- without recursing into those tables' own policies. search_path is pinned.

create function private.is_team() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_users where user_id = (select auth.uid()));
$$;

create function private.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_users where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.is_member(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships where user_id = (select auth.uid()) and institution_id = target
  );
$$;

create function private.is_owner(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where user_id = (select auth.uid()) and institution_id = target and role = 'owner'
  );
$$;

-- True when one of the viewer's institutions tracks the target as a rival.
-- Only ever answers for the tracking side, so the tracked side never learns who tracks it.
create function private.tracks(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rivals r
    join public.memberships m on m.institution_id = r.institution_id
    where m.user_id = (select auth.uid()) and r.rival_institution_id = target
  );
$$;

-- The tier that applies right now. Mirrors effectiveTier() in src/domain/tiers.ts:
-- no plan, a plan that has not started, or a plan past its end date all count as Free.
create function private.effective_tier(target uuid, as_of timestamptz default now()) returns public.tier
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when p.starts_at > as_of then 'free'::public.tier
        when p.ends_at is not null and p.ends_at <= as_of then 'free'::public.tier
        else p.tier
      end
      from public.plans p
      where p.institution_id = target
    ),
    'free'::public.tier
  );
$$;

revoke all on all functions in schema private from public;
alter default privileges in schema private revoke execute on functions from public;

grant usage on schema private to authenticated;
grant execute on function
  private.is_team(),
  private.is_admin(),
  private.is_member(uuid),
  private.is_owner(uuid),
  private.tracks(uuid),
  private.effective_tier(uuid, timestamptz)
to authenticated;

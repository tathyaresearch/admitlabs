-- Row level security for Phase 1. Run with `npm run db:test` (supabase test db).
-- Everything runs in one transaction and is rolled back, so sample data is untouched.
--
-- Fixtures:
--   A: college, claimed. owner-a (owner), member-a (member). Free plan. Tracks C.
--   B: college, claimed. owner-b (owner). Paid plan. Tracks A (A must never find out).
--   C: college, unclaimed rival record.
--   P: skilling institute, team prospect.

begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

-- Runs a statement as the current role and returns how many rows it changed.
-- Created inside this transaction, so it is rolled back with everything else.
create schema rls_test;
create function rls_test.affected(statement text) returns integer
language plpgsql
as $$
declare
  changed integer;
begin
  execute statement;
  get diagnostics changed = row_count;
  return changed;
end;
$$;
grant usage on schema rls_test to authenticated;
grant execute on function rls_test.affected(text) to authenticated;

insert into auth.users (id, email, aud, role) values
  ('10000000-0000-4000-8000-000000000001', 'owner-a@rls.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000002', 'member-a@rls.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000003', 'owner-b@rls.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000004', 'team@rls.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000005', 'admin@rls.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000006', 'nobody@rls.test', 'authenticated', 'authenticated');

insert into public.cities (name, state) values ('Guwahati', 'Assam'), ('Jorhat', 'Assam'), ('Silchar', 'Assam') on conflict do nothing;

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('20000000-0000-4000-8000-00000000000a', 'rls-a', 'RLS A', 'college', 'Guwahati', 'Assam', 'https://rls-a.example'),
  ('20000000-0000-4000-8000-00000000000b', 'rls-b', 'RLS B', 'college', 'Guwahati', 'Assam', 'https://rls-b.example'),
  ('20000000-0000-4000-8000-00000000000c', 'rls-c', 'RLS C', 'college', 'Jorhat', 'Assam', 'https://rls-c.example'),
  ('20000000-0000-4000-8000-00000000000d', 'rls-p', 'RLS Prospect', 'skilling', 'Silchar', 'Assam', 'https://rls-p.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('20000000-0000-4000-8000-00000000000a', true, now(), false),
  ('20000000-0000-4000-8000-00000000000b', true, now(), false),
  ('20000000-0000-4000-8000-00000000000c', false, null, false),
  ('20000000-0000-4000-8000-00000000000d', false, null, true);

insert into public.programs (id, institution_id, name, program_key) values
  ('30000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', 'MBA', 'mba'),
  ('30000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-00000000000c', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', 'owner'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', 'member'),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000b', 'owner');

insert into public.team_users (user_id, role) values
  ('10000000-0000-4000-8000-000000000004', 'team'),
  ('10000000-0000-4000-8000-000000000005', 'admin');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('20000000-0000-4000-8000-00000000000a', 'free', now() - interval '10 days', null),
  ('20000000-0000-4000-8000-00000000000b', 'paid', now() - interval '30 days', now() + interval '150 days');

insert into public.rivals (institution_id, rival_institution_id, suggested) values
  ('20000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000c', true),
  ('20000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000a', false);

insert into public.notes (institution_id, body) values
  ('20000000-0000-4000-8000-00000000000a', 'Private team note about A');

insert into public.cities (name, state) values ('RLS Town', 'Assam');

-- Owner A -------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select slug from public.institutions order by slug$$,
  $$values ('rls-a'::text), ('rls-c'::text)$$,
  'Owner A sees their own institution and the rival they track, nothing else'
);
select is_empty(
  $$select 1 from public.institutions where slug = 'rls-b'$$,
  'Owner A cannot see B, the institution that tracks them'
);
select is_empty(
  $$select 1 from public.institution_status where institution_id = '20000000-0000-4000-8000-00000000000c'$$,
  'Owner A cannot see private flags on a rival record'
);
select isnt_empty(
  $$select 1 from public.institution_status where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Owner A can see their own institution status'
);
select results_eq(
  $$select institution_id::text from public.programs order by institution_id$$,
  $$values ('20000000-0000-4000-8000-00000000000a'::text), ('20000000-0000-4000-8000-00000000000c'::text)$$,
  'Owner A sees programs of their institution and their rival only'
);
select is_empty($$select 1 from public.rivals$$, 'Rival links stay closed to institution users until Phase 3');
select is_empty($$select 1 from public.notes$$, 'Owner A cannot see team notes, even notes about A');
select is_empty($$select 1 from public.signals$$, 'Raw signals are team only in Phase 1');
select isnt_empty(
  $$select 1 from public.plans where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Owner A can read their own plan'
);
select is_empty(
  $$select 1 from public.plans where institution_id = '20000000-0000-4000-8000-00000000000b'$$,
  'Owner A cannot read another plan'
);
select is(
  rls_test.affected($$update public.plans set tier = 'client' where institution_id = '20000000-0000-4000-8000-00000000000a'$$),
  0,
  'Owner A cannot change their own tier'
);
select throws_ok(
  $$insert into public.memberships (user_id, institution_id, role)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000b', 'member')$$,
  '42501', null,
  'Owner A cannot add themselves to another institution'
);
select throws_ok(
  $$insert into public.team_users (user_id, role) values ('10000000-0000-4000-8000-000000000001', 'admin')$$,
  '42501', null,
  'Owner A cannot make themselves team or admin'
);
select is(
  private.effective_tier('20000000-0000-4000-8000-00000000000a'),
  'free'::public.tier,
  'Owner A reads their effective tier as Free'
);
reset role;

-- Member A ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select slug from public.institutions order by slug$$,
  $$values ('rls-a'::text), ('rls-c'::text)$$,
  'Member A sees the same institutions as the owner'
);
select is(
  (select count(*)::int from public.memberships where institution_id = '20000000-0000-4000-8000-00000000000a'),
  2,
  'Member A sees both people at A'
);
reset role;

-- Owner B (tracks A) --------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select slug from public.institutions order by slug$$,
  $$values ('rls-a'::text), ('rls-b'::text)$$,
  'Owner B sees their own institution and the rival they track'
);
select is_empty(
  $$select 1 from public.institution_status where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Owner B cannot see whether their rival has signed up'
);
select is_empty(
  $$select 1 from public.memberships where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Owner B cannot see who works at their rival'
);
select is_empty(
  $$select 1 from public.plans where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Owner B cannot see their rival''s plan'
);
reset role;

-- Signed in, no institution --------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select is_empty($$select 1 from public.institutions$$, 'A user with no institution sees no institutions');
select is_empty($$select 1 from public.plans$$, 'A user with no institution sees no plans');
select isnt_empty($$select 1 from public.cities where name = 'RLS Town'$$, 'Signed in users can read the city list');
reset role;

-- Team ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select isnt_empty($$select 1 from public.institutions where slug = 'rls-p'$$, 'Team sees prospects');
select is(
  (select count(*)::int from public.institutions where slug like 'rls-%'),
  4,
  'Team sees every institution'
);
select isnt_empty(
  $$select 1 from public.notes where institution_id = '20000000-0000-4000-8000-00000000000a'$$,
  'Team sees private notes'
);
select is(
  rls_test.affected($$update public.plans set tier = 'client' where institution_id = '20000000-0000-4000-8000-00000000000a'$$),
  0,
  'Team users who are not Admin cannot change tiers'
);
select lives_ok(
  $$insert into public.notes (institution_id, body) values ('20000000-0000-4000-8000-00000000000d', 'Team can add notes')$$,
  'Team can add notes'
);
select throws_ok(
  $$insert into public.team_users (user_id, role) values ('10000000-0000-4000-8000-000000000006', 'team')$$,
  '42501', null,
  'Team users who are not Admin cannot add team users'
);
reset role;

-- Admin -----------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select is(
  rls_test.affected($$update public.plans set tier = 'client', ends_at = null where institution_id = '20000000-0000-4000-8000-00000000000a'$$),
  1,
  'Admin can change a tier'
);
select lives_ok(
  $$insert into public.team_users (user_id, role) values ('10000000-0000-4000-8000-000000000006', 'team')$$,
  'Admin can add team users'
);
reset role;

-- Anonymous ---------------------------------------------------------------------
set local role anon;
select throws_ok($$select 1 from public.institutions$$, '42501', null, 'Anonymous visitors cannot read tables at all');
reset role;

-- Effective tier (mirrors effectiveTier() in src/domain/tiers.ts) -------------------
select is(private.effective_tier('20000000-0000-4000-8000-00000000000b'), 'paid'::public.tier, 'A Paid plan inside its dates is Paid');
select is(
  private.effective_tier('20000000-0000-4000-8000-00000000000b', now() + interval '151 days'),
  'free'::public.tier,
  'A Paid plan past its end date counts as Free'
);
select is(
  private.effective_tier(
    '20000000-0000-4000-8000-00000000000b',
    (select ends_at from public.plans where institution_id = '20000000-0000-4000-8000-00000000000b')
  ),
  'free'::public.tier,
  'At the exact end moment the plan counts as Free'
);
select is(
  private.effective_tier('20000000-0000-4000-8000-00000000000b', now() - interval '31 days'),
  'free'::public.tier,
  'A plan that has not started yet counts as Free'
);
select is(private.effective_tier('20000000-0000-4000-8000-00000000000c'), 'free'::public.tier, 'No plan counts as Free');
select is(
  private.effective_tier('20000000-0000-4000-8000-00000000000a', now() + interval '10 years'),
  'client'::public.tier,
  'A Client plan with no end date stays Client'
);

select * from finish();
rollback;

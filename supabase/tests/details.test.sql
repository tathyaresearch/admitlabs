-- Self-reported details ("Added by you"): members and the team read them, only the owner writes
-- them, and a rival tracking the institution never sees them. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures, in a made-up state so the sample world never mixes in:
--   D: Detailton college, signed up. owner-d (owner), member-d (member). Program DB (BBA).
--   E: another college. owner-e (owner). Tracks D as a rival. Program EB (BBA).
--   T: a team user.

begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

create schema details_test;
create function details_test.affected(statement text) returns integer
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
grant usage on schema details_test to authenticated;
grant execute on function details_test.affected(text) to authenticated;

insert into public.cities (name, state) values ('Detailton', 'Detail State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('16000000-0000-4000-8000-000000000001', 'owner-d@details.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000002', 'member-d@details.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000003', 'owner-e@details.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000004', 'team-t@details.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('16000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('26000000-0000-4000-8000-00000000000d', 'details-d', 'Details D', 'college', 'Detailton', 'Detail State', 'https://details-d.example'),
  ('26000000-0000-4000-8000-00000000000e', 'details-e', 'Details E', 'college', 'Detailton', 'Detail State', 'https://details-e.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('26000000-0000-4000-8000-00000000000d', true, now()),
  ('26000000-0000-4000-8000-00000000000e', true, now());
insert into public.programs (id, institution_id, name, program_key) values
  ('36000000-0000-4000-8000-0000000000d1', '26000000-0000-4000-8000-00000000000d', 'BBA', 'bba'),
  ('36000000-0000-4000-8000-0000000000e1', '26000000-0000-4000-8000-00000000000e', 'BBA', 'bba');
insert into public.memberships (user_id, institution_id, role) values
  ('16000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-00000000000d', 'owner'),
  ('16000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-00000000000d', 'member'),
  ('16000000-0000-4000-8000-000000000003', '26000000-0000-4000-8000-00000000000e', 'owner');
insert into public.rivals (institution_id, rival_institution_id) values
  ('26000000-0000-4000-8000-00000000000e', '26000000-0000-4000-8000-00000000000d');

-- The owner adds details for the institution and for its program. ------------------------------

select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.institution_details (institution_id, founded_year, naac_grade, hostel) values ('26000000-0000-4000-8000-00000000000d', 1998, 'A+', 'both')$$,
  'the owner adds details for the institution'
);
select lives_ok(
  $$insert into public.program_details (program_id, institution_id, fees_amount, fees_period, seats, average_package, highest_package)
    values ('36000000-0000-4000-8000-0000000000d1', '26000000-0000-4000-8000-00000000000d', 110000, 'year', 120, 3.6, 8.5)$$,
  'the owner adds details for a program'
);
select is(
  details_test.affected($$update public.institution_details set founded_year = 1999 where institution_id = '26000000-0000-4000-8000-00000000000d'$$),
  1,
  'the owner changes them'
);
select throws_ok(
  $$insert into public.program_details (program_id, institution_id, seats) values ('36000000-0000-4000-8000-0000000000e1', '26000000-0000-4000-8000-00000000000d', 10)$$,
  null,
  'a program of another institution cannot be filed under this one'
);
select throws_ok(
  $$update public.program_details set highest_package = 2 where program_id = '36000000-0000-4000-8000-0000000000d1'$$,
  '23514',
  null,
  'the highest package is never below the average'
);
select throws_ok(
  $$update public.program_details set fees_period = null where program_id = '36000000-0000-4000-8000-0000000000d1'$$,
  '23514',
  null,
  'fees always say a year or in total'
);
select throws_ok(
  $$insert into public.institution_details (institution_id, naac_grade) values ('26000000-0000-4000-8000-00000000000e', 'A')$$,
  '42501',
  null,
  'the owner of D cannot add details for E'
);
reset role;

-- A member reads them, and cannot change them. --------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select founded_year from public.institution_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 1999::smallint, 'a member reads the institution details');
select is((select count(*)::integer from public.program_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 1, 'a member reads the program details');
select is(
  details_test.affected($$update public.institution_details set founded_year = 2001 where institution_id = '26000000-0000-4000-8000-00000000000d'$$),
  0,
  'a member cannot change them'
);
select is(
  details_test.affected($$delete from public.program_details where institution_id = '26000000-0000-4000-8000-00000000000d'$$),
  0,
  'a member cannot remove them'
);
reset role;

-- A rival tracking D never sees them. ---------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::integer from public.institution_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 0, 'a rival tracking D never sees its details');
select is((select count(*)::integer from public.program_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 0, 'nor its program details');
reset role;

-- The team reads them, and cannot change them. --------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::integer from public.institution_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 1, 'the team reads the institution details');
select is((select count(*)::integer from public.program_details where institution_id = '26000000-0000-4000-8000-00000000000d'), 1, 'the team reads the program details');
select is(
  details_test.affected($$update public.institution_details set founded_year = 2005 where institution_id = '26000000-0000-4000-8000-00000000000d'$$),
  0,
  'the team cannot change them'
);
reset role;

-- Nobody signed out reads them. -----------------------------------------------------------------

set local role anon;
select throws_ok($$select count(*) from public.institution_details$$, '42501', null, 'signed out, the details cannot be read at all');
reset role;

select * from finish();
rollback;

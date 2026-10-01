-- The website's "Work with us" enquiries, enforced in the database. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures: T, a team user. N, someone who has signed in, not on the team. The test starts from
-- no enquiries, so ones sent to the local database by hand never change its counts.

begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

delete from public.enquiries;

insert into auth.users (id, email, aud, role) values
  ('17000000-0000-4000-8000-000000000001', 'team-t@enquiries.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000002', 'someone-n@enquiries.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('17000000-0000-4000-8000-000000000001', 'team');

-- A visitor, with no sign in ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select lives_ok(
  $$select public.submit_enquiry('  Asha   Rao ', 'Eastgate  University', 'admissions', ' Asha@Eastgate.TEST ', '+91 98765-43210', ' BBA ', '  We want more BBA applications.  ')$$,
  'A visitor sends an enquiry'
);
select throws_ok($$select 1 from public.enquiries$$, '42501', null, 'A visitor never reads enquiries');
select throws_ok(
  $$insert into public.enquiries (name, institution, role, email, phone) values ('Bot', 'Bot', 'other', 'bot@bot.test', '9999999999')$$,
  '42501', null, 'A visitor never writes to the table directly'
);
select throws_ok($$select public.set_enquiry_handled('00000000-0000-4000-8000-000000000000', true)$$, '42501', null, 'A visitor never marks one handled');
select throws_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'not an email', '9876543210', null, null)$$, '23514', null, 'An email that cannot be real is turned away');
select throws_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'asha@other.test', '12345', null, null)$$, '23514', null, 'So is a phone number that cannot be real');
select throws_ok($$select public.submit_enquiry('A', 'Eastgate University', 'admissions', 'asha@other.test', '9876543210', null, null)$$, '23514', null, 'A name needs at least two letters');
select throws_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'asha@other.test', '9876543210', null, repeat('a', 2001))$$, '23514', null, 'A message stays under 2,000 characters');
select throws_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'owner', 'asha@other.test', '9876543210', null, null)$$, '22P02', null, 'Only the five roles are accepted');

select lives_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'asha@eastgate.test', '9876543210', null, null)$$, 'A second enquiry the same day is fine');
select lives_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'ASHA@eastgate.test', '9876543210', null, null)$$, 'And a third, whatever the email''s case');
select throws_ok($$select public.submit_enquiry('Asha Rao', 'Eastgate University', 'admissions', 'asha@eastgate.test', '9876543210', null, null)$$, 'P0001', 'enquiry_limit', 'A fourth from one email in a day is turned away');
select lives_ok($$select public.submit_enquiry('Ravi Das', 'Northbank College', 'founder_director', 'ravi@northbank.test', '09876543210', null, 'Hello')$$, 'Another email still gets through');

-- Someone signed in, not on the team ------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is_empty($$select 1 from public.enquiries$$, 'Institution users never see enquiries');
select throws_ok($$select public.set_enquiry_handled((select id from public.enquiries limit 1), true)$$, '42501', 'not_team', 'Nor mark one handled');

-- A team user -----------------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::integer from public.enquiries), 4, 'The team reads every enquiry');
select results_eq(
  $$select name, institution, email, phone, program, message from public.enquiries where email = 'asha@eastgate.test' and program is not null$$,
  $$values ('Asha Rao', 'Eastgate University', 'asha@eastgate.test', '+919876543210', 'BBA', 'We want more BBA applications.')$$,
  'Spaces, the email''s case and the phone number are tidied'
);
select lives_ok(
  $$select public.set_enquiry_handled((select id from public.enquiries where email = 'ravi@northbank.test'), true)$$,
  'The team marks an enquiry handled'
);
select results_eq(
  $$select handled_at is not null, handled_by from public.enquiries where email = 'ravi@northbank.test'$$,
  $$values (true, '17000000-0000-4000-8000-000000000001'::uuid)$$,
  'With when and by whom'
);
select lives_ok(
  $$select public.set_enquiry_handled((select id from public.enquiries where email = 'ravi@northbank.test'), false)$$,
  'And marks it new again'
);
select is((select count(*)::integer from public.enquiries where handled_at is not null), 0, 'Then nothing is handled');
select throws_ok($$update public.enquiries set name = 'Changed'$$, '42501', null, 'Nobody edits an enquiry');

reset role;
select is(private.enquiries_per_email_per_day(), 3, 'Three a day from one email, as ENQUIRY_RULES says');

select * from finish();
rollback;

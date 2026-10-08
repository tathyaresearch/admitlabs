-- Enquiries fixes (spec section 27): Make Client for a college not in Drishti, and a Lost lead that
-- comes back. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures: T a Team member, M a Client manager. X: a college that has signed up, its owner OX.
-- P: a prospect record (not signed up). Leads L1 to L4 are Won, with no college yet.

begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

insert into public.cities (name, state) values ('Fixton', 'Fix State') on conflict do nothing;
insert into auth.users (id, email, aud, role) values
  ('19000000-0000-4000-8000-000000000001', 'team-t@fix.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000002', 'manager-m@fix.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000003', 'owner-x@fix.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values
  ('19000000-0000-4000-8000-000000000001', 'team'),
  ('19000000-0000-4000-8000-000000000002', 'client_manager');
insert into public.institutions (id, slug, name, type, city, state, website) values
  ('29000000-0000-4000-8000-0000000000a1', 'fix-x', 'Fix X College', 'college', 'Fixton', 'Fix State', 'https://fix-x.example'),
  ('29000000-0000-4000-8000-0000000000b1', 'fix-p', 'Fix P Prospect', 'college', 'Fixton', 'Fix State', 'https://prospect-fix.example');
insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('29000000-0000-4000-8000-0000000000a1', true, now() - interval '30 days', false),
  ('29000000-0000-4000-8000-0000000000b1', false, null, true);
insert into public.memberships (user_id, institution_id, role) values ('19000000-0000-4000-8000-000000000003', '29000000-0000-4000-8000-0000000000a1', 'owner');
insert into public.plans (institution_id, tier, starts_at) values ('29000000-0000-4000-8000-0000000000a1', 'free', now() - interval '30 days');
insert into public.team_leads (id, name, institution, email, source, status) values
  ('39000000-0000-4000-8000-000000000001', 'New Owner', 'Fix New College', 'new-owner@fix.test', 'referral', 'won'),
  ('39000000-0000-4000-8000-000000000002', 'X Owner', 'Fix X College', 'x-lead@fix.test', 'event', 'won'),
  ('39000000-0000-4000-8000-000000000003', 'P Head', 'Fix P Prospect', 'p-head@fix.test', 'linkedin', 'won'),
  ('39000000-0000-4000-8000-000000000004', 'X Dean', 'Fix X College', 'x-dean@fix.test', 'other', 'won'),
  ('39000000-0000-4000-8000-000000000005', 'Not Yet', 'Fix Y College', 'not-yet@fix.test', 'other', 'contacted');

-- Make Client for a college not in Drishti -------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select * from public.make_client_with_college('39000000-0000-4000-8000-000000000001', 'Fix New College', 'college', 'Fixton', 'Fix State', 'https://fix-new.example', 'new-owner@fix.test')$$,
  '42501', null, 'A Client manager never makes a Client'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select * from public.make_client_with_college('39000000-0000-4000-8000-000000000005', 'Fix Y College', 'college', 'Fixton', 'Fix State', 'https://fix-y.example', 'not-yet@fix.test')$$,
  'P0001', 'not_won', 'Only a Won lead'
);
select throws_ok(
  $$select * from public.make_client_with_college('39000000-0000-4000-8000-000000000001', 'Fix New College', 'college', 'Fixton', 'Fix State', 'https://fix-new.example', 'team-t@fix.test')$$,
  'P0001', 'team_email', 'never with a team email as the owner'
);
create temporary table made as
  select 'new'::text as lead, * from public.make_client_with_college('39000000-0000-4000-8000-000000000001', 'Fix New College', 'college', 'Fixton', 'Fix State', 'https://fix-new.example', 'New-Owner@Fix.test');
reset role;
select is((select outcome from made where lead = 'new'), 'created', 'A college not in Drishti is added');
select is((select name from public.institutions where id = (select institution_id from made where lead = 'new')), 'Fix New College', 'with its name');
select ok((select claimed from public.institution_status where institution_id = (select institution_id from made where lead = 'new')), 'signed up, by the team');
select is((select tier::text from public.plans where institution_id = (select institution_id from made where lead = 'new')), 'client', 'Its plan is Client');
select is((select status::text from public.brains where institution_id = (select institution_id from made where lead = 'new')), 'onboarding', 'and onboarding has started');
select is((select role::text from public.invites where email = 'new-owner@fix.test'), 'owner', 'The owner is invited, as the owner');
select ok((select invited from made where lead = 'new'), 'and the server is told to email them');
select is(
  (select institution_id from public.team_leads where id = '39000000-0000-4000-8000-000000000001'),
  (select institution_id from made where lead = 'new'),
  'The lead is linked to its college'
);
select ok((select made_client_at is not null from public.team_leads where id = '39000000-0000-4000-8000-000000000001'), 'and made a Client');

-- The email already belongs to a college in Drishti: that one, never a duplicate.
set local role authenticated;
insert into made select 'x', * from public.make_client_with_college('39000000-0000-4000-8000-000000000002', 'Fix X College (again)', 'college', 'Fixton', 'Fix State', 'https://another-x.example', 'owner-x@fix.test');
reset role;
select is((select outcome from made where lead = 'x'), 'linked', 'An owner''s email links their own college');
select is((select institution_id from made where lead = 'x'), '29000000-0000-4000-8000-0000000000a1'::uuid, 'Fix X College itself');
select is((select count(*)::int from public.institutions where name like 'Fix X College%'), 1, 'No second Fix X College');
select ok(not (select invited from made where lead = 'x'), 'Nobody is invited: they are in already');
select is((select tier::text from public.plans where institution_id = '29000000-0000-4000-8000-0000000000a1'), 'client', 'Fix X College is a Client now');

-- The website: a record that has not signed up becomes the college; one that has is linked.
set local role authenticated;
insert into made select 'p', * from public.make_client_with_college('39000000-0000-4000-8000-000000000003', 'Fix P College', 'college', 'Fixton', 'Fix State', 'https://www.prospect-fix.example/', 'p-head@fix.test');
insert into made select 'x2', * from public.make_client_with_college('39000000-0000-4000-8000-000000000004', 'Fix X', 'college', 'Fixton', 'Fix State', 'https://fix-x.example', 'x-dean@fix.test');
reset role;
select is((select outcome || ' ' || institution_id from made where lead = 'p'), 'claimed 29000000-0000-4000-8000-0000000000b1', 'A prospect with the same website becomes the college');
select ok((select claimed from public.institution_status where institution_id = '29000000-0000-4000-8000-0000000000b1'), 'signed up now');
select is((select outcome || ' ' || institution_id from made where lead = 'x2'), 'linked 29000000-0000-4000-8000-0000000000a1', 'A college with the same website that has signed up is linked');

-- A lead linked to a record that has not signed up: that record becomes the college.
insert into public.institutions (id, slug, name, type, city, state, website) values
  ('29000000-0000-4000-8000-0000000000c1', 'fix-q', 'Fix Q Prospect', 'college', 'Fixton', 'Fix State', 'https://fix-q.example');
insert into public.institution_status (institution_id, claimed, is_prospect) values ('29000000-0000-4000-8000-0000000000c1', false, true);
insert into public.team_leads (id, name, institution, institution_id, email, source, status) values
  ('39000000-0000-4000-8000-000000000007', 'Q Head', 'Fix Q Prospect', '29000000-0000-4000-8000-0000000000c1', 'q-head@fix.test', 'event', 'won');
set local role authenticated;
insert into made select 'q', * from public.make_client_with_college('39000000-0000-4000-8000-000000000007', 'Fix Q College', 'college', 'Fixton', 'Fix State', 'https://fix-q.example', 'q-head@fix.test');
reset role;
select is((select outcome || ' ' || institution_id from made where lead = 'q'), 'claimed 29000000-0000-4000-8000-0000000000c1', 'A lead linked to a prospect makes that record the Client');
select is((select name from public.institutions where id = '29000000-0000-4000-8000-0000000000c1'), 'Fix Q College', 'with the name the team gave it');

-- The invited owner signs in for the first time and owns the college; a second invite makes a member.
insert into auth.users (id, email, aud, role) values
  ('19000000-0000-4000-8000-000000000004', 'new-owner@fix.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000005', 'x-dean@fix.test', 'authenticated', 'authenticated');
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is(public.accept_invites(), (select institution_id from made where lead = 'new'), 'The owner signs in and joins their college');
reset role;
select is((select role::text from public.memberships where user_id = '19000000-0000-4000-8000-000000000004'), 'owner', 'as its owner');
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is(public.accept_invites(), '29000000-0000-4000-8000-0000000000a1'::uuid, 'Invited as owner to a college that has one');
reset role;
select is((select role::text from public.memberships where user_id = '19000000-0000-4000-8000-000000000005'), 'member', 'they join as a member: one owner per college');

-- A Lost lead that comes back ---------------------------------------------------------------------
insert into public.team_leads (id, name, institution, email, phone, source, status, lost_reason, lost_note, owner_id) values
  ('39000000-0000-4000-8000-000000000006', 'Lost Once', 'Fix L College', 'lost-once@fix.test', '+919811100001', 'website', 'lost', 'timing', 'Ask again in March.', '19000000-0000-4000-8000-000000000001');
delete from public.team_lead_alerts;
set local role anon;
select lives_ok(
  $$select public.submit_enquiry('Lost Once', 'Fix L College', 'admissions', 'lost-once@fix.test', '9811100001', null, 'We are ready now.')$$,
  'A lead that was Lost writes in again'
);
reset role;
select is(
  (select status::text || ' ' || coalesce(lost_reason::text, 'no reason') from public.team_leads where id = '39000000-0000-4000-8000-000000000006'),
  'new no reason',
  'It is New again'
);
select is(
  (select data ->> 'was_reason' from public.team_lead_activity where lead_id = '39000000-0000-4000-8000-000000000006' and kind = 'status' and data ->> 'to' = 'new'),
  'timing',
  'History keeps what it was Lost for'
);
select is(
  (select kind || ' ' || was_lost from public.team_lead_alerts where lead_id = '39000000-0000-4000-8000-000000000006'),
  'reopened timing',
  'and its owner is emailed that it came back after Lost'
);

-- Saving a lead's details keeps an edit line (it failed before: a word read as an array).
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.save_team_lead('39000000-0000-4000-8000-000000000005', '{"city": "Fixton", "wants": "A content plan."}')$$,
  'A lead''s details are saved'
);
reset role;
select is(
  (select data -> 'fields' from public.team_lead_activity where lead_id = '39000000-0000-4000-8000-000000000005' and kind = 'edited'),
  '["city", "wants"]'::jsonb,
  'History says which details changed'
);

select * from finish();
rollback;

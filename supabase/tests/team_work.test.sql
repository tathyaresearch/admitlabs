-- Product review part 6: the AdmitLabs team's work log for a Client (C5), enforced in the
-- database. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   C: a Client. owner-c, member-c.
--   O: another Client. owner-o.
--   P: Paid. owner-p.
--   E: a Client whose service ended (Free now), with one entry from before. owner-e.
--   team: a team user. team2: another team user.

begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('19000000-0000-4000-8000-000000000001', 'owner-c@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000002', 'member-c@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000003', 'owner-o@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000004', 'owner-p@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000005', 'owner-e@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000006', 'team@work.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000007', 'team2@work.test', 'authenticated', 'authenticated');

insert into public.team_users (user_id, role) values
  ('19000000-0000-4000-8000-000000000006', 'team'),
  ('19000000-0000-4000-8000-000000000007', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('29000000-0000-4000-8000-00000000000c', 'work-c', 'Work C', 'skilling', 'Guwahati', 'Assam', 'https://work-c.example'),
  ('29000000-0000-4000-8000-00000000000d', 'work-o', 'Work O', 'college', 'Guwahati', 'Assam', 'https://work-o.example'),
  ('29000000-0000-4000-8000-00000000000a', 'work-p', 'Work P', 'college', 'Guwahati', 'Assam', 'https://work-p.example'),
  ('29000000-0000-4000-8000-00000000000e', 'work-e', 'Work E', 'college', 'Guwahati', 'Assam', 'https://work-e.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('29000000-0000-4000-8000-00000000000c', true, now() - interval '200 days', false),
  ('29000000-0000-4000-8000-00000000000d', true, now() - interval '200 days', false),
  ('29000000-0000-4000-8000-00000000000a', true, now() - interval '60 days', false),
  ('29000000-0000-4000-8000-00000000000e', true, now() - interval '200 days', false);

insert into public.memberships (user_id, institution_id, role) values
  ('19000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-00000000000c', 'owner'),
  ('19000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-00000000000c', 'member'),
  ('19000000-0000-4000-8000-000000000003', '29000000-0000-4000-8000-00000000000d', 'owner'),
  ('19000000-0000-4000-8000-000000000004', '29000000-0000-4000-8000-00000000000a', 'owner'),
  ('19000000-0000-4000-8000-000000000005', '29000000-0000-4000-8000-00000000000e', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('29000000-0000-4000-8000-00000000000c', 'client', now() - interval '200 days', null),
  ('29000000-0000-4000-8000-00000000000d', 'client', now() - interval '200 days', null),
  ('29000000-0000-4000-8000-00000000000a', 'paid', now() - interval '60 days', now() + interval '120 days'),
  ('29000000-0000-4000-8000-00000000000e', 'client', now() - interval '200 days', now() - interval '5 days');

-- Written while E was a Client, before its service ended.
insert into public.team_work (institution_id, kind, body, work_on, added_by) values
  ('29000000-0000-4000-8000-00000000000e', 'done', 'Posted the admission dates on every page.', current_date - 30, '19000000-0000-4000-8000-000000000006');

-- The team writes a Client's log ------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.team_work (institution_id, kind, body, work_on, link) values
    ('29000000-0000-4000-8000-00000000000c', 'done', 'Added WhatsApp to every course page.', current_date - 1, 'https://work-c.example/courses')$$,
  'The team adds what it did for a Client, with a link'
);
select lives_ok(
  $$insert into public.team_work (institution_id, kind, body, work_on) values
    ('29000000-0000-4000-8000-00000000000c', 'next', 'Publish the placement results.', current_date + 12)$$,
  'The team adds what it does next'
);
select is(
  (select added_by from public.team_work where body = 'Added WhatsApp to every course page.'),
  '19000000-0000-4000-8000-000000000006'::uuid,
  'An entry is added in the name of whoever adds it'
);
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on) values ('29000000-0000-4000-8000-00000000000a', 'Fixed the fees page.', current_date)$$,
  '42501',
  null,
  'Only a Client has a work log: not Paid'
);
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on) values ('29000000-0000-4000-8000-00000000000e', 'Fixed the fees page.', current_date)$$,
  '42501',
  null,
  'Nor a Client whose service has ended'
);
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on, added_by) values
    ('29000000-0000-4000-8000-00000000000c', 'Fixed the fees page.', current_date, '19000000-0000-4000-8000-000000000007')$$,
  '42501',
  null,
  'Nobody adds an entry in another team user''s name'
);
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on) values ('29000000-0000-4000-8000-00000000000c', '  a ', current_date)$$,
  '23514',
  null,
  'An entry says what was done, in a few words at least'
);
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on, link) values ('29000000-0000-4000-8000-00000000000c', 'Fixed the fees page.', current_date, 'javascript:alert(1)')$$,
  '23514',
  null,
  'A link is http or https only'
);
select is((select count(*)::int from public.team_work where institution_id = '29000000-0000-4000-8000-00000000000e'), 1, 'The team still reads a log after the service ends');
reset role;

-- The Client's people read it; nobody else does --------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 2, 'The Client''s owner reads their log, and only theirs');
select throws_ok(
  $$insert into public.team_work (institution_id, body, work_on, added_by) values
    ('29000000-0000-4000-8000-00000000000c', 'We fixed it ourselves.', current_date, '19000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'A Client cannot write in the team''s log'
);
update public.team_work set body = 'Changed by the Client.';
select is((select count(*)::int from public.team_work where body = 'Changed by the Client.'), 0, 'A Client cannot change an entry');
delete from public.team_work;
select is((select count(*)::int from public.team_work), 2, 'A Client cannot remove an entry');
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 2, 'A member of the Client reads it too');
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 0, 'Another Client never sees it');
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 0, 'Paid has no work log to read');
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 0, 'After the service ends, the institution no longer sees the log');
reset role;

set local role anon;
select throws_ok($$select count(*) from public.team_work$$, '42501', null, 'Nobody signed out reads it');
reset role;

-- Anyone on the team marks Next as done, or removes an entry -------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
set local role authenticated;
update public.team_work set kind = 'done', work_on = current_date where body = 'Publish the placement results.' and kind = 'next';
select is(
  (select kind::text from public.team_work where body = 'Publish the placement results.'),
  'done',
  'Another team user marks Next as done'
);
select is(
  (select work_on from public.team_work where body = 'Publish the placement results.'),
  current_date,
  'It is dated the day it was marked done'
);
delete from public.team_work where body = 'Added WhatsApp to every course page.';
select is((select count(*)::int from public.team_work where body = 'Added WhatsApp to every course page.'), 0, 'A team user removes an entry');
reset role;

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_work), 1, 'The Client sees the change straight away');
reset role;

select * from finish();
rollback;

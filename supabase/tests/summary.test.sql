-- Version 2, Part 6 (spec sections 11, 13, 24 and 25), enforced in the database: a month's summary
-- kept with its report, waiting for the team or approved as it is made; the team fixing a line and
-- Approve and send; each person's email setting; who gets the email. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures:
--   P: Paid, Review first. owner-p, member-p. September's summary waits; August's was approved.
--   C: Client, sent automatically. owner-c.
--   Team: team-s.

begin;
create extension if not exists pgtap with schema extensions;

select plan(33);

insert into public.cities (name, state) values ('Summaryville', 'Summary State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('1b000000-0000-4000-8000-000000000001', 'owner-p@summary.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000002', 'member-p@summary.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000003', 'owner-c@summary.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000004', 'team-s@summary.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('1b000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('2b000000-0000-4000-8000-00000000000a', 'summary-p', 'Summary Paid', 'college', 'Summaryville', 'Summary State', 'https://summary-p.example'),
  ('2b000000-0000-4000-8000-00000000000c', 'summary-c', 'Summary Client', 'skilling', 'Summaryville', 'Summary State', 'https://summary-c.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect, review_first) values
  ('2b000000-0000-4000-8000-00000000000a', true, now() - interval '90 days', false, true),
  ('2b000000-0000-4000-8000-00000000000c', true, now() - interval '90 days', false, false);

insert into public.memberships (user_id, institution_id, role) values
  ('1b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-00000000000a', 'owner'),
  ('1b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-00000000000a', 'member'),
  ('1b000000-0000-4000-8000-000000000003', '2b000000-0000-4000-8000-00000000000c', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('2b000000-0000-4000-8000-00000000000a', 'paid', now() - interval '90 days', now() + interval '90 days'),
  ('2b000000-0000-4000-8000-00000000000c', 'client', now() - interval '90 days', null);

insert into public.reports (institution_id, month, storage_path, pages, size_bytes, summary, review, approved_at) values
  ('2b000000-0000-4000-8000-00000000000a', '2026-08-01', '2b000000-0000-4000-8000-00000000000a/2026-08.pdf', 7, 90000, '{"month":"2026-08"}', 'approved', now() - interval '30 days');

-- The server makes September's: P waits (Review first), C goes out as it is made. ------------------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select isnt(
  public.record_report(
    '2b000000-0000-4000-8000-00000000000a', '2026-09-01', '2b000000-0000-4000-8000-00000000000a/2026-09.pdf', 7::smallint, 91000, now() - interval '2 days',
    '{"month":"2026-09","words":[],"lines":{"words":"No word moved since August.","things":["Show your full BBA fees","Reply to every review"],"move":"Silverline College: Added a page.","enquiries":null},"things":[]}'::jsonb,
    'waiting', 'Your September report is ready.'
  ),
  null::uuid,
  'A summary and its report waiting for review are recorded'
);
select results_eq(
  $$select review::text, approved_at is null from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'$$,
  $$values ('waiting'::text, true)$$,
  'as waiting, not approved'
);
select is((select count(*)::integer from public.notifications where institution_id = '2b000000-0000-4000-8000-00000000000a'), 0, 'and nobody is told while it waits');

select lives_ok(
  $$select public.record_report('2b000000-0000-4000-8000-00000000000c', '2026-09-01', '2b000000-0000-4000-8000-00000000000c/2026-09.pdf', 7::smallint, 91000, now() - interval '2 days', '{"month":"2026-09","lines":{"enquiries":"Your content brought 23 enquiries in September."}}'::jsonb, 'approved', 'Your September report is ready.')$$,
  'Sent automatically: approved as it is made'
);
select results_eq(
  $$select r.review::text, r.approved_at is not null, (select count(*)::integer from public.notifications n where n.institution_id = r.institution_id and n.kind = 'report_ready') from public.reports r where r.institution_id = '2b000000-0000-4000-8000-00000000000c'$$,
  $$values ('approved'::text, true, 1)$$,
  'with "Your September report is ready."'
);
select throws_ok(
  $$select public.record_report('2b000000-0000-4000-8000-00000000000c', '2026-10-01', 'x.pdf', 7::smallint, 1, now(), '[1]'::jsonb, 'approved', null)$$,
  '22023', 'bad_summary',
  'A summary is an object'
);
select is(
  public.summary_recipients('2b000000-0000-4000-8000-00000000000a'),
  array['owner-p@summary.test', 'member-p@summary.test'],
  'The summary goes to the owner and the members who keep it on'
);

-- The college, while it waits -----------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select month::text from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' order by month$$,
  $$values ('2026-08-01'::text)$$,
  'A member sees the approved months only'
);
select throws_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-08-01'), 'move', 'A new line.')$$,
  '42501', null,
  'A member fixes no line'
);
select throws_ok(
  $$select public.approve_report((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-08-01'), 7::smallint, 1, 'x')$$,
  '42501', null,
  'and approves nothing'
);
select throws_ok(
  $$select public.summary_recipients('2b000000-0000-4000-8000-00000000000a')$$,
  '42501', null,
  'Who gets the email is for the server only'
);

-- Each person's email ---------------------------------------------------------------------------------
select lives_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000002', false)$$,
  'A member turns their own email off'
);
select throws_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000001', false)$$,
  '42501', null,
  'but not the owner’s'
);
select results_eq(
  $$select email, summary_email from public.institution_people('2b000000-0000-4000-8000-00000000000a') order by email$$,
  $$values ('member-p@summary.test'::text, false), ('owner-p@summary.test'::text, true)$$,
  'Settings shows each person’s email setting'
);

select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000002', true)$$,
  'The owner turns anyone’s on or off'
);
select throws_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000003', true)$$,
  'P0002', 'not_found',
  'only for someone at the institution'
);
select throws_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000c', '1b000000-0000-4000-8000-000000000003', false)$$,
  '42501', null,
  'and never at another institution'
);
select lives_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000002', false)$$,
  'The owner turns the member’s off again'
);

-- The team's review ------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select is((select count(*)::integer from public.reports where review = 'waiting' and institution_id = '2b000000-0000-4000-8000-00000000000a'), 1, 'The team sees the waiting summary');
select throws_ok(
  $$select public.set_summary_email('2b000000-0000-4000-8000-00000000000a', '1b000000-0000-4000-8000-000000000002', true)$$,
  '42501', null,
  'The team changes nobody’s email'
);
select lives_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'move', 'Silverline College added a placements page.', 'The provider named the wrong page.')$$,
  'The team fixes a line'
);
select is(
  (select summary #>> '{lines,move}' from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'),
  'Silverline College added a placements page.',
  'which the summary now says'
);
select results_eq(
  $$select what::text, target, before, after, reason, edited_by::text from public.audit_edits where report_id = (select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01')$$,
  $$values ('summary_line'::text, 'summary:move'::text, 'Silverline College: Added a page.'::text, 'Silverline College added a placements page.'::text, 'The provider named the wrong page.'::text, '1b000000-0000-4000-8000-000000000004'::text)$$,
  'and every change is kept: who, what it was, what it became and why'
);
select lives_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'things.2', 'Reply to every Google review')$$,
  'A thing to do can be fixed too'
);
select throws_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'things.3', 'A third thing')$$,
  '22023', 'bad_target',
  'only a line the summary has'
);
select throws_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'enquiries', 'Your content brought 4 enquiries.')$$,
  '22023', 'bad_target',
  'a Paid summary has no enquiries line'
);
select throws_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'move', '   ')$$,
  '22023', 'bad_line',
  'and never an empty one'
);

select lives_ok(
  $$select public.approve_report((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 8::smallint, 93000, 'Your September report is ready.')$$,
  'Approve and send'
);
select results_eq(
  $$select r.review::text, r.approved_by::text, r.pages::integer, (select count(*)::integer from public.notifications n where n.institution_id = r.institution_id and n.kind = 'report_ready') from public.reports r where r.institution_id = '2b000000-0000-4000-8000-00000000000a' and r.month = '2026-09-01'$$,
  $$values ('approved'::text, '1b000000-0000-4000-8000-000000000004'::text, 8, 1)$$,
  'it shows, with who approved it, the PDF as made again, and "Your September report is ready."'
);
select throws_ok(
  $$select public.approve_report((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 8::smallint, 93000, 'x')$$,
  'P0001', 'not_waiting',
  'Approving twice tells nobody twice'
);
select throws_ok(
  $$select public.record_summary_edit((select id from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'), 'move', 'Too late.')$$,
  'P0001', 'not_waiting',
  'and an approved summary is not changed'
);

-- The college, once approved --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select results_eq(
  $$select month::text, summary #>> '{lines,move}' from public.reports where institution_id = '2b000000-0000-4000-8000-00000000000a' and month = '2026-09-01'$$,
  $$values ('2026-09-01'::text, 'Silverline College added a placements page.'::text)$$,
  'A member sees September now, with the line as the team fixed it'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(
  public.summary_recipients('2b000000-0000-4000-8000-00000000000a'),
  array['owner-p@summary.test'],
  'The member who turned it off gets no email'
);

select * from finish();
rollback;

-- Phase 5: who can see which monthly report (spec sections 10 and 12), enforced in the database.
-- Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   P: Paid. owner-p, member-p. An August report.
--   L: a Paid plan that has ended (now Free). owner-l. A July report from when it was Paid.
--   F: Free, never Paid. owner-f. No reports.
--   X: another Paid institution. owner-x. An August report.

begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into public.cities (name, state) values ('Reportville', 'Report State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('14000000-0000-4000-8000-000000000001', 'owner-p@reports.test', 'authenticated', 'authenticated'),
  ('14000000-0000-4000-8000-000000000002', 'member-p@reports.test', 'authenticated', 'authenticated'),
  ('14000000-0000-4000-8000-000000000003', 'owner-l@reports.test', 'authenticated', 'authenticated'),
  ('14000000-0000-4000-8000-000000000004', 'owner-f@reports.test', 'authenticated', 'authenticated'),
  ('14000000-0000-4000-8000-000000000005', 'owner-x@reports.test', 'authenticated', 'authenticated'),
  ('14000000-0000-4000-8000-000000000006', 'team@reports.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('14000000-0000-4000-8000-000000000006', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('24000000-0000-4000-8000-00000000000a', 'reports-p', 'Reports P', 'college', 'Reportville', 'Report State', 'https://reports-p.example'),
  ('24000000-0000-4000-8000-00000000000b', 'reports-l', 'Reports L', 'college', 'Reportville', 'Report State', 'https://reports-l.example'),
  ('24000000-0000-4000-8000-00000000000c', 'reports-f', 'Reports F', 'college', 'Reportville', 'Report State', 'https://reports-f.example'),
  ('24000000-0000-4000-8000-00000000000d', 'reports-x', 'Reports X', 'college', 'Reportville', 'Report State', 'https://reports-x.example');

insert into public.memberships (user_id, institution_id, role) values
  ('14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-00000000000a', 'owner'),
  ('14000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-00000000000a', 'member'),
  ('14000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-00000000000b', 'owner'),
  ('14000000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-00000000000c', 'owner'),
  ('14000000-0000-4000-8000-000000000005', '24000000-0000-4000-8000-00000000000d', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('24000000-0000-4000-8000-00000000000a', 'paid', now() - interval '60 days', now() + interval '120 days'),
  ('24000000-0000-4000-8000-00000000000b', 'paid', now() - interval '200 days', now() - interval '10 days'),
  ('24000000-0000-4000-8000-00000000000c', 'free', now() - interval '30 days', null),
  ('24000000-0000-4000-8000-00000000000d', 'paid', now() - interval '60 days', now() + interval '120 days');

insert into public.reports (institution_id, month, storage_path, pages, size_bytes) values
  ('24000000-0000-4000-8000-00000000000a', '2026-08-01', '24000000-0000-4000-8000-00000000000a/2026-08.pdf', 7, 90000),
  ('24000000-0000-4000-8000-00000000000b', '2026-07-01', '24000000-0000-4000-8000-00000000000b/2026-07.pdf', 7, 90000),
  ('24000000-0000-4000-8000-00000000000d', '2026-08-01', '24000000-0000-4000-8000-00000000000d/2026-08.pdf', 7, 90000);

insert into storage.objects (bucket_id, name) values
  ('reports', '24000000-0000-4000-8000-00000000000a/2026-08.pdf'),
  ('reports', '24000000-0000-4000-8000-00000000000b/2026-07.pdf'),
  ('reports', '24000000-0000-4000-8000-00000000000d/2026-08.pdf');

select is((select public from storage.buckets where id = 'reports'), false, 'The reports bucket is private');

-- Owner P, on Paid ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select storage_path from public.reports$$,
  $$values ('24000000-0000-4000-8000-00000000000a/2026-08.pdf'::text)$$,
  'Paid sees its own reports only'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'reports'$$,
  $$values ('24000000-0000-4000-8000-00000000000a/2026-08.pdf'::text)$$,
  'and can reach its own files only'
);

-- Member P ------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is((select count(*)::integer from public.reports), 1, 'A member sees the institution''s reports');
select is((select count(*)::integer from storage.objects where bucket_id = 'reports'), 1, 'and can download them');

-- Owner L, Paid plan ended --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

select results_eq(
  $$select month from public.reports$$,
  $$values ('2026-07-01'::date)$$,
  'After a Paid plan ends, past reports stay listed'
);
select is((select count(*)::integer from storage.objects where bucket_id = 'reports'), 1, 'and downloadable');

-- Owner F, Free ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select is_empty($$select 1 from public.reports$$, 'Free has no reports');
select is_empty($$select 1 from storage.objects where bucket_id = 'reports'$$, 'and reaches no report files');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('reports', '24000000-0000-4000-8000-00000000000c/2026-09.pdf')$$,
  '42501', null,
  'Nobody uploads a report from the browser'
);

-- Team ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000006","role":"authenticated"}', true);

select is((select count(*)::integer from public.reports where storage_path like '24000000%'), 3, 'The team sees every report');
select is((select count(*)::integer from storage.objects where bucket_id = 'reports' and name like '24000000%'), 3, 'and every file');
select throws_ok(
  $$select public.record_report('24000000-0000-4000-8000-00000000000a', '2026-09-01', 'x.pdf', 7::smallint, 1000, now(), null)$$,
  '42501', null,
  'Only the server records reports'
);

-- The server (service key) -----------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select isnt(
  public.record_report('24000000-0000-4000-8000-00000000000a', '2026-09-01', '24000000-0000-4000-8000-00000000000a/2026-09.pdf', 7::smallint, 91000, now(), 'Your September report is ready.'),
  null::uuid,
  'A made report is recorded'
);
select results_eq(
  $$select kind::text, text, link from public.notifications where institution_id = '24000000-0000-4000-8000-00000000000a'$$,
  $$values ('report_ready'::text, 'Your September report is ready.'::text, '/reports'::text)$$,
  'with "Your September report is ready."'
);
select lives_ok(
  $$select public.record_report('24000000-0000-4000-8000-00000000000a', '2026-09-01', '24000000-0000-4000-8000-00000000000a/2026-09.pdf', 8::smallint, 95000, now(), null)$$,
  'Making the same month again replaces it'
);
select results_eq(
  $$select count(*)::integer, max(pages)::integer from public.reports where institution_id = '24000000-0000-4000-8000-00000000000a' and month = '2026-09-01'$$,
  $$values (1, 8)$$,
  'One report per institution and month, and no second notice'
);

select * from finish();
rollback;

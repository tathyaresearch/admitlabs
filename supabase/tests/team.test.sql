-- Phase 6: the team tools (spec sections 5, 13 and 19), enforced in the database.
-- Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures, in a made-up state so the sample world never mixes in:
--   T: a team user. A: an Admin. O: owner of C. N: someone who has signed in, with no institution.
--   C: Teamton, signed up, on Paid. P: Teamton, a prospect with a team Audit (5 fixes, 2 strengths).
--   R: Teamton, a rival record (not signed up, not a prospect) with a rival Audit.

begin;
create extension if not exists pgtap with schema extensions;

select plan(66);

insert into public.cities (name, state) values ('Teamton', 'Team State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('15000000-0000-4000-8000-000000000001', 'team-t@team.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000002', 'admin-a@team.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000003', 'owner-o@team.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000004', 'someone-n@team.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values
  ('15000000-0000-4000-8000-000000000001', 'team'),
  ('15000000-0000-4000-8000-000000000002', 'admin');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('25000000-0000-4000-8000-00000000000c', 'team-c', 'Team C', 'college', 'Teamton', 'Team State', 'https://team-c.example'),
  ('25000000-0000-4000-8000-00000000000a', 'team-p', 'Team P', 'college', 'Teamton', 'Team State', 'https://team-p.example'),
  ('25000000-0000-4000-8000-00000000000d', 'team-r', 'Team R', 'college', 'Teamton', 'Team State', 'https://team-r.example');
insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('25000000-0000-4000-8000-00000000000c', true, now() - interval '60 days', false),
  ('25000000-0000-4000-8000-00000000000a', false, null, true),
  ('25000000-0000-4000-8000-00000000000d', false, null, false);
insert into public.programs (id, institution_id, name, program_key) values
  ('35000000-0000-4000-8000-0000000000c1', '25000000-0000-4000-8000-00000000000c', 'BBA', 'bba'),
  ('35000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('35000000-0000-4000-8000-0000000000d1', '25000000-0000-4000-8000-00000000000d', 'BBA', 'bba');
insert into public.memberships (user_id, institution_id, role) values
  ('15000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-00000000000c', 'owner');
insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('25000000-0000-4000-8000-00000000000c', 'paid', now() - interval '60 days', now() + interval '120 days');

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version) values
  ('45000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-00000000000a', now() - interval '2 days', 'team', 'manual', 51, 50, 52, 51, 1),
  ('45000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-00000000000c', now() - interval '5 days', 'paid', 'scheduled', 70, 70, 70, 70, 1),
  ('45000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-00000000000d', now() - interval '3 days', 'rival', 'scheduled', 44, 44, 44, 44, 1);
insert into public.audit_program_scores (audit_id, program_id, overall, discovered, trusted, chosen) values
  ('45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000a1', 51, 50, 52, 51);

-- The prospect's team Audit: fixes ranked 1 to 5, and two strengths. Every check has how to fix.
insert into public.audit_checks (id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, checked_at) values
  ('55000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000a1', 'chosen', 'fees_shown', 'missing', 0, 20, null, 1, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000001', null, 'trusted', 'review_rating', 'weak', 4, 15, null, 2, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000001', null, 'discovered', 'youtube', 'weak', 3, 10, null, 3, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000001', null, 'chosen', 'page_speed', 'okay', 5, 10, null, 4, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000001', null, 'trusted', 'approvals', 'okay', 10, 15, null, 5, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000006', '45000000-0000-4000-8000-000000000001', null, 'discovered', 'instagram_activity', 'strong', 20, 20, 1, null, now() - interval '2 days'),
  ('55000000-0000-4000-8000-000000000007', '45000000-0000-4000-8000-000000000001', null, 'chosen', 'easy_enquiry', 'strong', 10, 10, 2, null, now() - interval '2 days');
insert into public.audit_check_details (audit_check_id, finding, why_it_matters, how_to_fix, difficulty, source_url)
select c.id, 'Found ' || c.check_key, 'It matters.', 'Fix ' || c.check_key, 'easy'::public.difficulty, 'https://team-p.example/' || c.check_key
from public.audit_checks c where c.audit_id = '45000000-0000-4000-8000-000000000001';

insert into public.notes (id, institution_id, author_id, body) values
  ('65000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-00000000000c', '15000000-0000-4000-8000-000000000002', 'Admin note about C.'),
  ('65000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-00000000000a', '15000000-0000-4000-8000-000000000001', 'Team note about P.');

-- Links made in this test, by name (tokens are random).
create temporary table tokens (label text primary key, token text not null);
grant all on tokens to authenticated, anon;
-- A link that ran out 10 days ago.
insert into public.share_links (token, institution_id, audit_id, created_at, expires_at)
values ('expiredexpiredexpiredexpired0001', '25000000-0000-4000-8000-00000000000a', '45000000-0000-4000-8000-000000000001', now() - interval '100 days', now() - interval '10 days');

-- Share links: the team ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

insert into tokens values ('live', public.create_share_link('45000000-0000-4000-8000-000000000001', 90));
insert into tokens values ('stopped', public.create_share_link('45000000-0000-4000-8000-000000000001', 90));
select ok((select length(token) = 32 from tokens where label = 'live'), 'The team shares a prospect''s team Audit as a private link');
select is(
  (select round(extract(epoch from (expires_at - created_at)) / 86400)::integer from public.share_links where token = (select token from tokens where label = 'live')),
  90,
  'The link works for the days the team chose'
);
select throws_ok($$select public.create_share_link('45000000-0000-4000-8000-000000000002', 90)$$, 'P0001', 'not_team_audit', 'An institution''s own Audit is never shared');
select throws_ok($$select public.create_share_link('45000000-0000-4000-8000-000000000003', 90)$$, 'P0001', 'not_team_audit', 'A rival Audit is never shared');
select throws_ok($$select public.create_share_link('45000000-0000-4000-8000-000000000001', 0)$$, 'P0001', 'share_days', 'A link lasts at least a day');
select throws_ok(
  $$insert into public.share_links (institution_id, audit_id, expires_at) values ('25000000-0000-4000-8000-00000000000a', '45000000-0000-4000-8000-000000000001', now() + interval '1 day')$$,
  '42501', null,
  'Links are only made through create_share_link'
);
update public.share_links set stopped_at = now(), stopped_by = '15000000-0000-4000-8000-000000000001' where token = (select token from tokens where label = 'stopped');
select isnt((select stopped_at from public.share_links where token = (select token from tokens where label = 'stopped')), null, 'The team can stop a link');

-- Share links: anyone with the link, no sign in -------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select is((public.shared_audit((select token from tokens where label = 'live')) ->> 'status'), 'live', 'A live link opens without signing in');
select is(
  (public.shared_audit((select token from tokens where label = 'live')) -> 'institution' ->> 'name'),
  'Team P',
  'It shows the prospect'
);
select is(
  jsonb_array_length(public.shared_audit((select token from tokens where label = 'live')) -> 'checks'),
  7,
  'and every check, with its result'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.shared_audit((select token from tokens where label = 'live')) -> 'checks') c where c ->> 'finding' is not null and c ->> 'sourceUrl' is not null and c ->> 'checkedAt' is not null),
  7,
  'what was found, the source and the date for every check'
);
select results_eq(
  $$select c ->> 'key' from jsonb_array_elements(public.shared_audit((select token from tokens where label = 'live')) -> 'checks') c where c ->> 'howToFix' is not null order by (c ->> 'fixRank')::integer$$,
  $$values ('fees_shown'), ('review_rating'), ('youtube')$$,
  'How to fix only for the top 3 fixes'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.shared_audit((select token from tokens where label = 'live')) -> 'checks') c where c ->> 'difficulty' is not null),
  3,
  'and how hard only for those three'
);
select is(public.shared_audit((select token from tokens where label = 'stopped')), '{"status": "expired"}'::jsonb, 'A stopped link shows only that it has expired');
select is(public.shared_audit('expiredexpiredexpiredexpired0001'), '{"status": "expired"}'::jsonb, 'So does a link past its 90 days');
select is(public.shared_audit('no-such-link'), null, 'An unknown link shows nothing');
select throws_ok($$select 1 from public.share_links$$, '42501', null, 'Nobody reads links directly without signing in');
select throws_ok($$select public.create_share_link('45000000-0000-4000-8000-000000000001', 90)$$, '42501', null, 'Only the team makes links');

-- Institution users -------------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select is_empty($$select 1 from public.notes$$, 'Private notes never reach institution users');
select is_empty($$select 1 from public.share_links$$, 'Nor do share links');
select is_empty($$select 1 from public.team_institutions$$, 'Nor the team''s list');
select is_empty($$select 1 from public.team_people()$$, 'Nor the team''s people');
select throws_ok($$select public.create_share_link('45000000-0000-4000-8000-000000000001', 90)$$, '42501', null, 'Institution users never make links');
select throws_ok($$select * from public.add_prospect('{"name":"X","website":"https://x.example","type":"college","city":"Teamton","state":"Team State","programs":[{"name":"BBA","programKey":"bba"}]}')$$, '42501', null, 'Nor add prospects');
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'client', now())$$, '42501', null, 'Nor change their own plan');
select is_empty($$select 1 from public.bulk_runs$$, 'Nor see bulk runs');

-- The team: notes, prospects, the list --------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::integer from public.notes where institution_id in ('25000000-0000-4000-8000-00000000000c', '25000000-0000-4000-8000-00000000000a')), 2, 'The team reads every note');
select lives_ok(
  $$insert into public.notes (institution_id, author_id, body) values ('25000000-0000-4000-8000-00000000000a', '15000000-0000-4000-8000-000000000001', 'Called the principal.')$$,
  'The team adds notes as themselves'
);
select throws_ok(
  $$insert into public.notes (institution_id, author_id, body) values ('25000000-0000-4000-8000-00000000000a', '15000000-0000-4000-8000-000000000002', 'Pretending to be the Admin.')$$,
  '42501', null,
  'but never in someone else''s name'
);
delete from public.notes where id = '65000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.notes where id = '65000000-0000-4000-8000-000000000001'), 1, 'A team member cannot remove someone else''s note');
delete from public.notes where id = '65000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.notes where id = '65000000-0000-4000-8000-000000000002'), 0, 'but removes their own');

select results_eq(
  $$select status, score, audit_kind::text from public.team_institutions where id in ('25000000-0000-4000-8000-00000000000c', '25000000-0000-4000-8000-00000000000a', '25000000-0000-4000-8000-00000000000d') order by name$$,
  $$values ('signed_up'::text, 70::smallint, 'paid'::text), ('prospect'::text, 51::smallint, 'team'::text), ('rival_record'::text, 44::smallint, 'rival'::text)$$,
  'The team''s list: status and latest score for each kind of record'
);
select is((select tier::text from public.team_institutions where id = '25000000-0000-4000-8000-00000000000c'), 'paid', 'with the plan that applies today');

select is(
  (select reused from public.add_prospect('{"name":"Team New","website":"https://www.team-new.example/","type":"university","city":"Teamton","state":"Team State","programs":[{"name":"BBA","programKey":"bba"},{"name":"Rare Program","programKey":""}]}')),
  false,
  'A new prospect is added'
);
select results_eq(
  $$select s.claimed, s.is_prospect, (select count(*)::integer from public.programs p where p.institution_id = s.institution_id) from public.institution_status s join public.institutions i on i.id = s.institution_id where i.slug = 'team-new'$$,
  $$values (false, true, 2)$$,
  'as a prospect, with its programs, not signed up'
);
select results_eq(
  $$select reused from public.add_prospect('{"name":"Team R again","website":"team-r.example","type":"college","city":"Teamton","state":"Team State","programs":[{"name":"MBA","programKey":"mba"}]}')$$,
  $$values (true)$$,
  'A rival record with the same website is reused, never duplicated'
);
select results_eq(
  $$select s.is_prospect, (select count(*)::integer from public.programs p where p.institution_id = s.institution_id) from public.institution_status s where s.institution_id = '25000000-0000-4000-8000-00000000000d'$$,
  $$values (true, 2)$$,
  'and becomes a prospect, with the new program added'
);
select throws_ok(
  $$select * from public.add_prospect('{"name":"Team C","website":"https://team-c.example","type":"college","city":"Teamton","state":"Team State","programs":[{"name":"BBA","programKey":"bba"}]}')$$,
  'P0001', 'signed_up',
  'An institution that has signed up is never made a prospect'
);
select lives_ok(
  $$insert into public.bulk_runs (created_by, source, total) values ('15000000-0000-4000-8000-000000000001', 'paste', 3)$$,
  'The team keeps its bulk runs'
);
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'client', now())$$, '42501', null, 'Only an Admin changes plans');
select throws_ok($$select public.add_team_user('someone-n@team.test', 'team')$$, '42501', null, 'Only an Admin adds team users');

-- Admin: plans ------------------------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now())$$, 'P0001', 'plan_period', 'Starting Paid needs the period');
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now(), 6)$$, 'P0001', 'plan_period', 'Monthly or 3 months, nothing else');
select lives_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now() - interval '5 days', 1)$$, 'Admin starts Paid, Monthly');
select is(
  (select (ends_at at time zone 'Asia/Kolkata') = ((starts_at at time zone 'Asia/Kolkata') + interval '1 month') and paid_months = 1 from public.plans where institution_id = '25000000-0000-4000-8000-00000000000c'),
  true,
  'Monthly runs one month from its start'
);
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now() - interval '40 days', 1)$$, 'P0001', 'plan_over', 'Never a Monthly plan that has already ended');
select lives_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now() - interval '10 days', 3)$$, 'Admin starts Paid, 3 months');
select is(
  (select (ends_at at time zone 'Asia/Kolkata') = ((starts_at at time zone 'Asia/Kolkata') + interval '3 months') and paid_months = 3 from public.plans where institution_id = '25000000-0000-4000-8000-00000000000c'),
  true,
  '3 months runs 3 months from its start'
);
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now() + interval '2 days', 3)$$, 'P0001', 'plan_future', 'Never a start in the future');
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'paid', now() - interval '100 days', 3)$$, 'P0001', 'plan_over', 'Never a Paid plan that has already ended');
select throws_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000a', 'paid', now(), 3)$$, 'P0001', 'not_signed_up', 'Only for institutions that have signed up');
select lives_ok($$select public.set_plan('25000000-0000-4000-8000-00000000000c', 'client', now() - interval '1 day')$$, 'Admin makes an institution a Client');
select is((select ends_at from public.plans where institution_id = '25000000-0000-4000-8000-00000000000c'), null, 'which runs until an Admin ends it');
select is((select paid_months from public.plans where institution_id = '25000000-0000-4000-8000-00000000000c'), null, 'with no Paid period');
reset role;
select throws_ok(
  $$update public.plans set paid_months = 3 where institution_id = '25000000-0000-4000-8000-00000000000c'$$,
  '23514', null, 'Only a Paid plan has a period'
);
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.end_plan('25000000-0000-4000-8000-00000000000c')$$, 'Admin ends a plan now');
select is(private.effective_tier('25000000-0000-4000-8000-00000000000c'), 'free', 'and the institution moves to Free');
select throws_ok($$select public.end_plan('25000000-0000-4000-8000-00000000000c')$$, 'P0001', 'no_active_plan', 'An ended plan cannot end again');

-- Admin: team users ---------------------------------------------------------------------------------------
select is(public.add_team_user('Someone-N@team.test', 'team'), 'added', 'Someone who has signed in joins the team at once');
select is(public.add_team_user('new-person@team.test', 'admin'), 'invited', 'Anyone else joins when they first sign in');
select throws_ok($$select public.add_team_user('owner-o@team.test', 'team')$$, 'P0001', 'institution_user', 'Never someone who uses Drishti for an institution');

-- The last Admin stays an Admin.
reset role;
delete from public.team_users where role = 'admin' and user_id <> '15000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select public.set_team_role('15000000-0000-4000-8000-000000000002', 'team')$$, 'P0001', 'last_admin', 'The last Admin cannot stop being an Admin');
select throws_ok($$select public.remove_team_user('15000000-0000-4000-8000-000000000002')$$, 'P0001', 'last_admin', 'or be removed');

-- The person added by email signs in for the first time.
reset role;
insert into auth.users (id, email, aud, role) values ('15000000-0000-4000-8000-000000000005', 'new-person@team.test', 'authenticated', 'authenticated');
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is(public.accept_team_invite(), 'admin'::public.team_role, 'At first sign in they join with the role they were given');
select is((select count(*)::integer from public.team_invites where email = 'new-person@team.test'), 0, 'and the invite is used up');

-- The number of fixes shown in full matches TEAM_RULES.sharedFixesInFull (checked on the app side too).
reset role;
select is(private.shared_fix_limit(), 3, 'A shared Audit explains the top 3 fixes in full');

select * from finish();
rollback;

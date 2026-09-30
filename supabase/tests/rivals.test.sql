-- Phase 3: the Rivals plan rules (spec section 10) and the rival functions, enforced in the
-- database. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures (colleges unless noted):
--   A: Rivalton (Test State), Free. owner-a, member-a. BBA and BCA. Tracks C, D and G. Tracked by B.
--   B: Rivalton, Paid. owner-b. BBA. Tracks A and C.
--   K: Rivalton, Client. owner-k. BBA. Tracks C, D and G.
--   N: Rivalton, Free. owner-n. BBA and BCA. No rivals yet.
--   C: Rivalton, unclaimed. BBA. Two rival Audits (52, then 55), a move, a post, an ad, a check.
--   D: Otherton (same state), unclaimed. BCA. One rival Audit (45).
--   E: Rivalton, unclaimed. MBA only.   G: Rivalton, unclaimed. BBA. Never scored.
--   P: Rivalton, a team prospect. BBA. U: a university in Rivalton. BBA. S: Farton, another state. BBA.

begin;
create extension if not exists pgtap with schema extensions;

select plan(56);

-- A made-up state, so the sample institutions (all in Assam) never show up in these suggestions.
insert into public.cities (name, state) values ('Rivalton', 'Test State'), ('Otherton', 'Test State'), ('Farton', 'Far State') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('12000000-0000-4000-8000-000000000001', 'owner-a@rivals.test', 'authenticated', 'authenticated'),
  ('12000000-0000-4000-8000-000000000002', 'member-a@rivals.test', 'authenticated', 'authenticated'),
  ('12000000-0000-4000-8000-000000000003', 'owner-b@rivals.test', 'authenticated', 'authenticated'),
  ('12000000-0000-4000-8000-000000000004', 'owner-k@rivals.test', 'authenticated', 'authenticated'),
  ('12000000-0000-4000-8000-000000000005', 'owner-n@rivals.test', 'authenticated', 'authenticated'),
  ('12000000-0000-4000-8000-000000000006', 'team@rivals.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('12000000-0000-4000-8000-000000000006', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('22000000-0000-4000-8000-00000000000a', 'rivals-a', 'Rivals A', 'college', 'Rivalton', 'Test State', 'https://rivals-a.example'),
  ('22000000-0000-4000-8000-00000000000b', 'rivals-b', 'Rivals B', 'college', 'Rivalton', 'Test State', 'https://rivals-b.example'),
  ('22000000-0000-4000-8000-000000000012', 'rivals-k', 'Rivals K', 'college', 'Rivalton', 'Test State', 'https://rivals-k.example'),
  ('22000000-0000-4000-8000-000000000013', 'rivals-n', 'Rivals N', 'college', 'Rivalton', 'Test State', 'https://rivals-n.example'),
  ('22000000-0000-4000-8000-00000000000c', 'rivals-c', 'Rivals C', 'college', 'Rivalton', 'Test State', 'https://rivals-c.example'),
  ('22000000-0000-4000-8000-00000000000d', 'rivals-d', 'Rivals D', 'college', 'Otherton', 'Test State', 'https://rivals-d.example'),
  ('22000000-0000-4000-8000-00000000000e', 'rivals-e', 'Rivals E', 'college', 'Rivalton', 'Test State', 'https://rivals-e.example'),
  ('22000000-0000-4000-8000-000000000011', 'rivals-g', 'Rivals G', 'college', 'Rivalton', 'Test State', 'https://rivals-g.example'),
  ('22000000-0000-4000-8000-000000000014', 'rivals-p', 'Rivals P', 'college', 'Rivalton', 'Test State', 'https://rivals-p.example'),
  ('22000000-0000-4000-8000-000000000015', 'rivals-u', 'Rivals U', 'university', 'Rivalton', 'Test State', 'https://rivals-u.example'),
  ('22000000-0000-4000-8000-000000000016', 'rivals-s', 'Rivals S', 'college', 'Farton', 'Far State', 'https://rivals-s.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('22000000-0000-4000-8000-00000000000a', true, now(), false),
  ('22000000-0000-4000-8000-00000000000b', true, now(), false),
  ('22000000-0000-4000-8000-000000000012', true, now(), false),
  ('22000000-0000-4000-8000-000000000013', true, now(), false),
  ('22000000-0000-4000-8000-00000000000c', false, null, false),
  ('22000000-0000-4000-8000-00000000000d', false, null, false),
  ('22000000-0000-4000-8000-00000000000e', false, null, false),
  ('22000000-0000-4000-8000-000000000011', false, null, false),
  ('22000000-0000-4000-8000-000000000014', false, null, true),
  ('22000000-0000-4000-8000-000000000015', false, null, false),
  ('22000000-0000-4000-8000-000000000016', false, null, false);

insert into public.programs (id, institution_id, name, program_key) values
  ('32000000-0000-4000-8000-0000000000a1', '22000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000000a2', '22000000-0000-4000-8000-00000000000a', 'BCA', 'bca'),
  ('32000000-0000-4000-8000-0000000000b1', '22000000-0000-4000-8000-00000000000b', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000012a1', '22000000-0000-4000-8000-000000000012', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000013a1', '22000000-0000-4000-8000-000000000013', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000013a2', '22000000-0000-4000-8000-000000000013', 'BCA', 'bca'),
  ('32000000-0000-4000-8000-0000000000c1', '22000000-0000-4000-8000-00000000000c', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000000d1', '22000000-0000-4000-8000-00000000000d', 'BCA', 'bca'),
  ('32000000-0000-4000-8000-0000000000e1', '22000000-0000-4000-8000-00000000000e', 'MBA', 'mba'),
  ('32000000-0000-4000-8000-0000000011a1', '22000000-0000-4000-8000-000000000011', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000014a1', '22000000-0000-4000-8000-000000000014', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000015a1', '22000000-0000-4000-8000-000000000015', 'BBA', 'bba'),
  ('32000000-0000-4000-8000-0000000016a1', '22000000-0000-4000-8000-000000000016', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-00000000000a', 'owner'),
  ('12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-00000000000a', 'member'),
  ('12000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-00000000000b', 'owner'),
  ('12000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000012', 'owner'),
  ('12000000-0000-4000-8000-000000000005', '22000000-0000-4000-8000-000000000013', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('22000000-0000-4000-8000-00000000000a', 'free', now() - interval '100 days', null, '32000000-0000-4000-8000-0000000000a1'),
  ('22000000-0000-4000-8000-00000000000b', 'paid', now() - interval '60 days', now() + interval '120 days', null),
  ('22000000-0000-4000-8000-000000000012', 'client', now() - interval '200 days', null, null),
  ('22000000-0000-4000-8000-000000000013', 'free', now() - interval '5 days', null, '32000000-0000-4000-8000-0000000013a1');

insert into public.rivals (institution_id, rival_institution_id, suggested) values
  ('22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c', true),
  ('22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000d', false),
  ('22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-000000000011', false),
  ('22000000-0000-4000-8000-00000000000b', '22000000-0000-4000-8000-00000000000a', false),
  ('22000000-0000-4000-8000-00000000000b', '22000000-0000-4000-8000-00000000000c', true),
  ('22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-00000000000c', true),
  ('22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-00000000000d', false),
  ('22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-000000000011', false);

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version) values
  ('42000000-0000-4000-8000-0000000000a1', '22000000-0000-4000-8000-00000000000a', now() - interval '2 days', 'free', 'signup', 50, 50, 50, 50, 1),
  ('42000000-0000-4000-8000-0000000000a2', '22000000-0000-4000-8000-00000000000a', now() - interval '3 days', 'rival', 'scheduled', 48, 48, 48, 48, 1),
  ('42000000-0000-4000-8000-0000000000a3', '22000000-0000-4000-8000-00000000000a', now() - interval '4 days', 'team', 'manual', 47, 47, 47, 47, 1),
  ('42000000-0000-4000-8000-0000000000b1', '22000000-0000-4000-8000-00000000000b', now() - interval '6 days', 'paid', 'scheduled', 60, 60, 60, 60, 1),
  ('42000000-0000-4000-8000-0000000000c1', '22000000-0000-4000-8000-00000000000c', '2026-08-01 04:30:00+00', 'rival', 'scheduled', 52, 52, 52, 52, 1),
  ('42000000-0000-4000-8000-0000000000c2', '22000000-0000-4000-8000-00000000000c', '2026-09-01 04:30:00+00', 'rival', 'scheduled', 55, 55, 55, 55, 1),
  ('42000000-0000-4000-8000-0000000000d1', '22000000-0000-4000-8000-00000000000d', '2026-09-01 04:30:00+00', 'rival', 'scheduled', 45, 45, 45, 45, 1);

insert into public.audit_program_scores (audit_id, program_id, overall, discovered, trusted, chosen) values
  ('42000000-0000-4000-8000-0000000000c2', '32000000-0000-4000-8000-0000000000c1', 55, 55, 55, 55),
  ('42000000-0000-4000-8000-0000000000a2', '32000000-0000-4000-8000-0000000000a1', 48, 48, 48, 48);

insert into public.audit_checks (id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, checked_at) values
  ('52000000-0000-4000-8000-0000000000c2', '42000000-0000-4000-8000-0000000000c2', '32000000-0000-4000-8000-0000000000c1', 'chosen', 'fees_shown', 'strong', 25, 25, now()),
  ('52000000-0000-4000-8000-0000000000a2', '42000000-0000-4000-8000-0000000000a2', null, 'chosen', 'page_speed', 'weak', 3, 10, now());
insert into public.audit_check_details (audit_check_id, finding, source_url) values
  ('52000000-0000-4000-8000-0000000000c2', 'Fees shown for BBA', 'https://rivals-c.example/fees'),
  ('52000000-0000-4000-8000-0000000000a2', 'Slow on phones', 'https://pagespeed.example/a');

insert into public.signals (institution_id, provider, check_key, value, source_url, fetched_at) values
  ('22000000-0000-4000-8000-00000000000c', 'places', 'review_rating', '{"rating": 4.1, "reviewCount": 80, "replyRate": 0.5}', 'https://maps.example/c', '2026-08-01 04:30:00+00'),
  ('22000000-0000-4000-8000-00000000000c', 'places', 'review_rating', '{"rating": 4.3, "reviewCount": 95, "replyRate": 0.5}', 'https://maps.example/c', '2026-09-01 04:30:00+00');

insert into public.rival_moves (rival_institution_id, kind, description, source_url, detected_at) values
  ('22000000-0000-4000-8000-00000000000c', 'fee_change', 'Now shows BBA fees.', 'https://rivals-c.example/fees', now() - interval '3 days'),
  ('22000000-0000-4000-8000-00000000000a', 'new_page', 'Added a hostel page.', 'https://rivals-a.example/hostel', now() - interval '2 days');
insert into public.rival_content (rival_institution_id, platform, url, title, metrics, why_it_worked, month) values
  ('22000000-0000-4000-8000-00000000000c', 'instagram', 'https://instagram.example/p/c1', 'Campus tour', '{"views": 1000}', 'Real students.', '2026-09-01');
insert into public.rival_ads (rival_institution_id, promise, source_url) values
  ('22000000-0000-4000-8000-00000000000c', 'Placement support for every student.', 'https://ads.example/c');
insert into public.rival_checks (rival_institution_id, week, checked_at) values
  ('22000000-0000-4000-8000-00000000000c', '2026-09-28', '2026-09-28 03:30:00+00');

insert into public.actions (institution_id, month, rank, text, feature) values
  ('22000000-0000-4000-8000-00000000000a', '2026-09-01', 1, 'Audit thing', 'audit'),
  ('22000000-0000-4000-8000-00000000000a', '2026-09-01', 1, 'Rival thing for A', 'rivals'),
  ('22000000-0000-4000-8000-00000000000b', '2026-09-01', 1, 'Rival thing for B', 'rivals');

-- Owner A, on Free ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select rival_institution_id::text from public.rivals order by 1$$,
  $$values ('22000000-0000-4000-8000-00000000000c'::text), ('22000000-0000-4000-8000-00000000000d'::text), ('22000000-0000-4000-8000-000000000011'::text)$$,
  'Free A sees its own rival list'
);
select is_empty(
  $$select 1 from public.rivals where rival_institution_id = '22000000-0000-4000-8000-00000000000a'$$,
  'Rivals never know: A cannot see that B tracks it'
);
select results_eq(
  $$select id::text from public.audits$$,
  $$values ('42000000-0000-4000-8000-0000000000a1'::text)$$,
  'Free A sees its own latest Audit only: no rival Audits, and never the rival or team runs of its own record'
);
select results_eq(
  $$select rival_institution_id::text, standing from public.rival_standings('22000000-0000-4000-8000-00000000000a') order by 1$$,
  $$values ('22000000-0000-4000-8000-00000000000c'::text, 'ahead'::text), ('22000000-0000-4000-8000-00000000000d', 'behind'), ('22000000-0000-4000-8000-000000000011', 'unscored')$$,
  'Free A gets ahead or behind for each rival, one word each, from the latest rival Audit'
);
select is(
  (select count(*)::integer from public.rival_standings('22000000-0000-4000-8000-00000000000a') where standing ~ '[0-9]'),
  0,
  'Standings carry no scores'
);
select is_empty(
  $$select 1 from public.rival_standings('22000000-0000-4000-8000-00000000000b')$$,
  'A cannot ask for another institution''s standings'
);
select is_empty($$select 1 from public.rival_moves$$, 'Free sees no rival moves');
select is_empty($$select 1 from public.rival_content$$, 'Free sees no rival content');
select is_empty($$select 1 from public.rival_ads$$, 'Free sees no rival ads');
select is_empty($$select 1 from public.rival_checks$$, 'Free sees no rival check dates');
select is_empty($$select 1 from public.audit_checks where audit_id = '42000000-0000-4000-8000-0000000000c2'$$, 'Free sees no rival check results');
select is_empty($$select 1 from public.rival_review_trend('22000000-0000-4000-8000-00000000000c')$$, 'Free sees no review trend');
select results_eq(
  $$select feature::text from public.actions$$,
  $$values ('audit'::text)$$,
  'Free reads its own actions, but not the Rivals 3 things to do'
);
select results_eq(
  $$select moves, posts, ads from public.rival_teaser('22000000-0000-4000-8000-00000000000a')$$,
  $$values (1, 1, 1)$$,
  'Free''s unlock card gets counts only'
);
select results_eq(
  $$select institution_id::text from public.rival_suggestions('22000000-0000-4000-8000-00000000000a')$$,
  $$values ('22000000-0000-4000-8000-000000000013'::text), ('22000000-0000-4000-8000-00000000000b'), ('22000000-0000-4000-8000-000000000012')$$,
  'Suggestions leave out rivals already tracked and rank by shared programs'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000d', '22000000-0000-4000-8000-000000000013']::uuid[], '[]')$$,
  'P0001', 'rivals_locked',
  'Free picks once: A cannot change its rivals'
);
select lives_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000d', '22000000-0000-4000-8000-000000000011']::uuid[], '[]')$$,
  'Saving the same list again is not a change'
);
select is_empty($$select 1 from public.rival_changes$$, 'An unchanged list is not logged');

-- Member A ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is((select count(*)::integer from public.rivals), 3, 'A member sees the rival list');
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000d', '22000000-0000-4000-8000-000000000013']::uuid[], '[]')$$,
  '42501', 'not_allowed',
  'Only the owner changes rivals'
);

-- Owner N, on Free, first setup -----------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

select results_eq(
  $$select institution_id::text, same_city, shared_programs from public.rival_suggestions('22000000-0000-4000-8000-000000000013')$$,
  $$values
    ('22000000-0000-4000-8000-00000000000a'::text, true, array['BBA', 'BCA']),
    ('22000000-0000-4000-8000-00000000000b', true, array['BBA']),
    ('22000000-0000-4000-8000-00000000000c', true, array['BBA']),
    ('22000000-0000-4000-8000-000000000011', true, array['BBA']),
    ('22000000-0000-4000-8000-000000000012', true, array['BBA']),
    ('22000000-0000-4000-8000-00000000000d', false, array['BCA'])$$,
  'Suggestions: same type, shared programs, same city first, then the state. No prospects, other types, other states or no overlap'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c']::uuid[], '[]')$$,
  'P0001', 'rival_count',
  'At least 3 rivals'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000b', '22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-00000000000d']::uuid[], '[]')$$,
  'P0001', 'rival_count',
  'At most 5 rivals'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000e']::uuid[], '[]')$$,
  '42501', 'not_allowed',
  'A pick must be a suggestion or a current rival'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c']::uuid[],
    '[{"name": "Us again", "type": "college", "city": "Rivalton", "state": "Test State", "website": "http://www.rivals-n.example/", "programs": ["32000000-0000-4000-8000-0000000013a1"]}]')$$,
  'P0001', 'own_website',
  'You cannot add yourself as a rival'
);
select is(
  cardinality(public.save_rivals(
    array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c']::uuid[],
    '[{"name": "Rivals X", "type": "college", "city": "Rivalton", "state": "Test State", "website": "https://rivals-x.example", "instagram": "rivalsx", "programs": ["32000000-0000-4000-8000-0000000013a1"]}]'
  )),
  3,
  'First setup on Free: two suggestions and one rival added by hand'
);
select results_eq(
  $$select i.name, p.name, p.program_key from public.institutions i join public.programs p on p.institution_id = i.id where i.website = 'https://rivals-x.example'$$,
  $$values ('Rivals X'::text, 'BBA'::text, 'bba'::text)$$,
  'An added rival is a new record with the programs ticked from your own list'
);
select is_empty(
  $$select 1 from public.institution_status s join public.institutions i on i.id = s.institution_id where i.website = 'https://rivals-x.example'$$,
  'Whether an added rival is on Drishti stays private'
);
select results_eq(
  $$select suggested from public.rivals order by suggested$$,
  $$values (false), (true), (true)$$,
  'Suggested picks are marked; added rivals are not'
);
select results_eq(
  $$select first_setup, cardinality(rival_ids) from public.rival_changes$$,
  $$values (true, 3)$$,
  'The first setup is logged, and does not count as a change'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000b']::uuid[], '[]')$$,
  'P0001', 'rivals_locked',
  'After the first setup, Free keeps its rivals'
);

-- Owner B, on Paid ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.audits order by 1$$,
  $$values ('42000000-0000-4000-8000-0000000000a2'::text), ('42000000-0000-4000-8000-0000000000b1'), ('42000000-0000-4000-8000-0000000000c1'), ('42000000-0000-4000-8000-0000000000c2')$$,
  'Paid B sees its own Audit and the rival Audits of what it tracks, never a rival''s own or team Audits'
);
select isnt_empty($$select 1 from public.audit_checks where audit_id = '42000000-0000-4000-8000-0000000000c2'$$, 'Paid sees rival check results');
select results_eq(
  $$select finding from public.audit_check_details where audit_check_id = '52000000-0000-4000-8000-0000000000c2'$$,
  $$values ('Fees shown for BBA'::text)$$,
  'Paid sees what was found for a rival, with its source'
);
select is((select count(*)::integer from public.rival_moves), 2, 'Paid sees the moves of rivals it tracks');
select is((select count(*)::integer from public.rival_content), 1, 'Paid sees rival content');
select is((select count(*)::integer from public.rival_ads), 1, 'Paid sees rival ads');
select is((select count(*)::integer from public.rival_checks), 1, 'Paid sees when rivals were checked');
select results_eq(
  $$select rating, review_count from public.rival_review_trend('22000000-0000-4000-8000-00000000000c')$$,
  $$values (4.3::numeric, 95), (4.1::numeric, 80)$$,
  'Paid gets the review trend from the rival Audits, newest first'
);
select is_empty($$select 1 from public.rival_review_trend('22000000-0000-4000-8000-00000000000d')$$, 'Only for rivals you track');
select results_eq($$select text from public.actions$$, $$values ('Rival thing for B'::text)$$, 'Paid reads its own Rivals 3 things to do');
select lives_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-000000000011']::uuid[], '[]')$$,
  'Paid changes its rivals once this month'
);
select throws_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000a', '22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-000000000012']::uuid[], '[]')$$,
  'P0001', 'change_used',
  'A second change in the same calendar month is refused'
);

-- Owner K, on Client ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select results_eq(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000d']::uuid[],
    '[{"name": "Another name for E", "type": "college", "city": "Rivalton", "state": "Test State", "website": "https://www.rivals-e.example/about", "programs": ["32000000-0000-4000-8000-0000000012a1"]}]') @> array['22000000-0000-4000-8000-00000000000e']::uuid[]$$,
  $$values (true)$$,
  'Adding a rival whose website is already on record reuses that record'
);
select results_eq(
  $$select name from public.institutions where id = '22000000-0000-4000-8000-00000000000e'$$,
  $$values ('Rivals E'::text)$$,
  'An existing record is never renamed by someone adding it'
);
select lives_ok(
  $$select public.save_rivals(array['22000000-0000-4000-8000-00000000000c', '22000000-0000-4000-8000-00000000000d', '22000000-0000-4000-8000-000000000011']::uuid[], '[]')$$,
  'Client changes its rivals any time'
);
select is((select count(*)::integer from public.rival_changes where not first_setup), 2, 'Both Client changes are logged');

-- Team ------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000006","role":"authenticated"}', true);

select isnt_empty($$select 1 from public.rivals where rival_institution_id = '22000000-0000-4000-8000-00000000000a'$$, 'The team sees every rival link');
select throws_ok(
  $$select public.record_rival_check('{}')$$,
  '42501', null,
  'Only the server records rival checks'
);

-- The server (service key) --------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.record_rival_check(jsonb_build_object(
    'rival_institution_id', '22000000-0000-4000-8000-00000000000c',
    'week', '2026-10-05',
    'checked_at', now(),
    'notify', true,
    'moves', jsonb_build_array(
      jsonb_build_object('kind', 'admission_dates', 'description', 'Announced admission dates.', 'source_url', 'https://rivals-c.example/admissions', 'detected_at', now(), 'notice', 'Rivals C announced admission dates.'),
      jsonb_build_object('kind', 'fee_change', 'description', 'Now shows BBA fees.', 'source_url', 'https://rivals-c.example/fees', 'detected_at', now(), 'notice', 'Rivals C now shows BBA fees.')
    ),
    'content_months', jsonb_build_array('2026-09-01'),
    'content', jsonb_build_array(
      jsonb_build_object('platform', 'youtube', 'url', 'https://youtube.example/watch?v=c2', 'title', 'Hostel tour', 'metrics', jsonb_build_object('views', 2000), 'why_it_worked', 'Answers a worry.', 'month', '2026-09-01', 'posted_at', '2026-09-20 12:00:00+00')
    )
  )),
  1,
  'A weekly check stores new moves only'
);
select results_eq(
  $$select institution_id::text, link from public.notifications where kind = 'rival_move' and link = '/rivals/22000000-0000-4000-8000-00000000000c' order by 1$$,
  $$values ('22000000-0000-4000-8000-00000000000b'::text, '/rivals/22000000-0000-4000-8000-00000000000c'::text), ('22000000-0000-4000-8000-000000000012', '/rivals/22000000-0000-4000-8000-00000000000c')$$,
  'Each new move alerts Paid and Client trackers, never Free ones'
);
select is(
  public.record_rival_check(jsonb_build_object(
    'rival_institution_id', '22000000-0000-4000-8000-00000000000c', 'week', '2026-10-05', 'checked_at', now(), 'notify', true,
    'moves', jsonb_build_array(jsonb_build_object('kind', 'admission_dates', 'description', 'Announced admission dates.', 'source_url', 'https://rivals-c.example/admissions', 'detected_at', now(), 'notice', 'Again'))
  )),
  0,
  'Checking again finds nothing new'
);
select is((select count(*)::integer from public.notifications where kind = 'rival_move' and link = '/rivals/22000000-0000-4000-8000-00000000000c'), 2, 'and sends no second alert');
select results_eq(
  $$select title from public.rival_content where rival_institution_id = '22000000-0000-4000-8000-00000000000c'$$,
  $$values ('Hostel tour'::text)$$,
  'Best content is replaced for the months a check covers'
);
select is(
  public.record_actions('22000000-0000-4000-8000-00000000000b', '2026-09-01', 'rivals',
    '[{"rank": 1, "text": "One", "detail": "Why", "check_key": "fees_shown"}, {"rank": 2, "text": "Two", "rival_institution_id": "22000000-0000-4000-8000-00000000000c"}]'),
  2,
  'record_actions writes a feature''s list'
);
select results_eq(
  $$select text from public.actions where institution_id = '22000000-0000-4000-8000-00000000000b' order by rank$$,
  $$values ('One'::text), ('Two')$$,
  'and replaces the month''s earlier list'
);

select * from finish();
rollback;

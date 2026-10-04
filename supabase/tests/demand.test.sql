-- Phase 4: the Demand plan rules (spec section 10) and the Demand functions, enforced in the
-- database. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures, in a made-up state so the sample world never mixes in (colleges unless noted):
--   F: Pullton, Free. owner-f. BBA (the Free program) and BCA.
--   P: Pullton, Paid. owner-p. BBA and MBA. Tracks R.
--   K: Pullton, Client. owner-k. BBA.
--   X: Farpull (another state), Paid. owner-x. BBA.
--   T: Tinyton, Free. owner-t. BBA. Tinyton has too little data, so Demand State fills in.
--   R: Pullton, unclaimed rival record. BBA.   O: Pullton, unclaimed, tracked by nobody. BBA.
-- Pulls for September 2026 (and an older August one): Pullton BBA, BCA and MBA; Demand State
-- BBA (with version 1's mentions, still stored, never read); All India BBA; Farpull BBA;
-- Tinyton BBA (too little).

begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

insert into public.cities (name, state) values ('Pullton', 'Demand State'), ('Farpull', 'Other State'), ('Tinyton', 'Demand State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('13000000-0000-4000-8000-000000000001', 'owner-f@demand.test', 'authenticated', 'authenticated'),
  ('13000000-0000-4000-8000-000000000002', 'owner-p@demand.test', 'authenticated', 'authenticated'),
  ('13000000-0000-4000-8000-000000000003', 'owner-k@demand.test', 'authenticated', 'authenticated'),
  ('13000000-0000-4000-8000-000000000004', 'owner-x@demand.test', 'authenticated', 'authenticated'),
  ('13000000-0000-4000-8000-000000000005', 'team@demand.test', 'authenticated', 'authenticated'),
  ('13000000-0000-4000-8000-000000000006', 'owner-t@demand.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('13000000-0000-4000-8000-000000000005', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('23000000-0000-4000-8000-00000000000f', 'demand-f', 'Demand F', 'college', 'Pullton', 'Demand State', 'https://demand-f.example'),
  ('23000000-0000-4000-8000-00000000000a', 'demand-p', 'Demand P', 'college', 'Pullton', 'Demand State', 'https://demand-p.example'),
  ('23000000-0000-4000-8000-00000000000b', 'demand-k', 'Demand K', 'college', 'Pullton', 'Demand State', 'https://demand-k.example'),
  ('23000000-0000-4000-8000-00000000000c', 'demand-x', 'Demand X', 'college', 'Farpull', 'Other State', 'https://demand-x.example'),
  ('23000000-0000-4000-8000-00000000000d', 'demand-r', 'Demand R', 'college', 'Pullton', 'Demand State', 'https://demand-r.example'),
  ('23000000-0000-4000-8000-00000000000e', 'demand-o', 'Demand O', 'college', 'Pullton', 'Demand State', 'https://demand-o.example'),
  ('23000000-0000-4000-8000-000000000010', 'demand-t', 'Demand T', 'college', 'Tinyton', 'Demand State', 'https://demand-t.example');

insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('23000000-0000-4000-8000-00000000000f', true, now() - interval '90 days'),
  ('23000000-0000-4000-8000-00000000000a', true, now() - interval '90 days'),
  ('23000000-0000-4000-8000-00000000000b', true, now() - interval '90 days'),
  ('23000000-0000-4000-8000-00000000000c', true, now() - interval '90 days'),
  ('23000000-0000-4000-8000-00000000000d', false, null),
  ('23000000-0000-4000-8000-00000000000e', false, null),
  ('23000000-0000-4000-8000-000000000010', true, now() - interval '30 days');

insert into public.programs (id, institution_id, name, program_key) values
  ('33000000-0000-4000-8000-0000000000f1', '23000000-0000-4000-8000-00000000000f', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-0000000000f2', '23000000-0000-4000-8000-00000000000f', 'BCA', 'bca'),
  ('33000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-0000000000a2', '23000000-0000-4000-8000-00000000000a', 'MBA', 'mba'),
  ('33000000-0000-4000-8000-0000000000b1', '23000000-0000-4000-8000-00000000000b', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-0000000000c1', '23000000-0000-4000-8000-00000000000c', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-0000000000d1', '23000000-0000-4000-8000-00000000000d', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-0000000000e1', '23000000-0000-4000-8000-00000000000e', 'BBA', 'bba'),
  ('33000000-0000-4000-8000-000000000101', '23000000-0000-4000-8000-000000000010', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-00000000000f', 'owner'),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-00000000000a', 'owner'),
  ('13000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-00000000000b', 'owner'),
  ('13000000-0000-4000-8000-000000000004', '23000000-0000-4000-8000-00000000000c', 'owner'),
  ('13000000-0000-4000-8000-000000000006', '23000000-0000-4000-8000-000000000010', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('23000000-0000-4000-8000-00000000000f', 'free', now() - interval '90 days', null, '33000000-0000-4000-8000-0000000000f1'),
  ('23000000-0000-4000-8000-00000000000a', 'paid', now() - interval '60 days', now() + interval '120 days', null),
  ('23000000-0000-4000-8000-00000000000b', 'client', now() - interval '200 days', null, null),
  ('23000000-0000-4000-8000-00000000000c', 'paid', now() - interval '60 days', now() + interval '120 days', null),
  ('23000000-0000-4000-8000-000000000010', 'free', now() - interval '30 days', null, '33000000-0000-4000-8000-000000000101');

insert into public.rivals (institution_id, rival_institution_id) values
  ('23000000-0000-4000-8000-00000000000a', '23000000-0000-4000-8000-00000000000d');

insert into public.demand_pulls (id, scope, region, state, program_key, month, pulled_at) values
  ('43000000-0000-4000-8000-000000000001', 'city', 'Pullton', 'Demand State', 'bba', '2026-09-01', '2026-09-28 00:30:00+00'),
  ('43000000-0000-4000-8000-000000000002', 'city', 'Pullton', 'Demand State', 'bca', '2026-09-01', '2026-09-28 00:30:00+00'),
  ('43000000-0000-4000-8000-000000000003', 'city', 'Pullton', 'Demand State', 'mba', '2026-09-01', '2026-09-28 00:30:00+00'),
  ('43000000-0000-4000-8000-000000000004', 'state', 'Demand State', 'Demand State', 'bba', '2026-09-01', '2026-09-28 00:30:00+00'),
  -- All India is shared with the sample world, so this one uses a month the sample does not have.
  ('43000000-0000-4000-8000-000000000005', 'india', 'India', null, 'bba', '2025-09-01', '2025-09-28 00:30:00+00'),
  ('43000000-0000-4000-8000-000000000006', 'city', 'Farpull', 'Other State', 'bba', '2026-09-01', '2026-09-28 00:30:00+00'),
  ('43000000-0000-4000-8000-000000000007', 'city', 'Pullton', 'Demand State', 'bba', '2026-08-01', '2026-08-28 00:30:00+00');
insert into public.demand_pulls (id, scope, region, state, program_key, month, pulled_at, too_little) values
  ('43000000-0000-4000-8000-000000000008', 'city', 'Tinyton', 'Demand State', 'bba', '2026-09-01', '2026-09-28 00:30:00+00', true);

insert into public.demand_items (pull_id, kind, text, count, change_pct, rank, source_url, found_at, meta, institution_id, sentiment) values
  ('43000000-0000-4000-8000-000000000001', 'rising', 'BBA in Analytics', 400, 38, 2, 'https://trends.example/a', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'rising', 'BBA in Aviation', 100, 50, 1, 'https://trends.example/b', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'falling', 'General BBA', 500, -12, 1, 'https://trends.example/c', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'question', 'Which BBA college has placements?', 96, null, 1, 'https://quora.example/q', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'question', 'What does BBA cost?', 81, null, 2, 'https://youtube.example/q', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'worry', 'Fees and hidden charges', 140, null, 1, 'https://reddit.example/w', now(), '{"theme": "fees", "isNew": false}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'worry', 'Too many colleges', 38, null, 2, 'https://reddit.example/n', now(), '{"theme": "new", "isNew": true}', null, null),
  ('43000000-0000-4000-8000-000000000001', 'idea', 'Show real placements', 0, null, 1, 'https://quora.example/q', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000002', 'rising', 'BCA with AI', 350, 60, 1, 'https://trends.example/d', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000003', 'rising', 'MBA in Analytics', 380, 70, 1, 'https://trends.example/e', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000006', 'rising', 'Far away trend', 90, 99, 1, 'https://trends.example/f', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000007', 'rising', 'Last month trend', 90, 90, 1, 'https://trends.example/g', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000004', 'mention', 'Students like P', 14, null, null, 'https://reddit.example/p', now(), '{}', '23000000-0000-4000-8000-00000000000a', 'positive'),
  ('43000000-0000-4000-8000-000000000004', 'mention', 'Complaints about R', 6, null, null, 'https://x.example/r', now(), '{}', '23000000-0000-4000-8000-00000000000d', 'negative'),
  ('43000000-0000-4000-8000-000000000004', 'mention', 'Students like O', 9, null, null, 'https://reddit.example/o', now(), '{}', '23000000-0000-4000-8000-00000000000e', 'positive'),
  ('43000000-0000-4000-8000-000000000004', 'rising', 'BBA across the state', null, 20, 1, 'https://trends.example/s', now(), '{}', null, null),
  ('43000000-0000-4000-8000-000000000008', 'rising', 'Tiny trend', null, 99, 1, 'https://trends.example/t', now(), '{}', null, null);

-- Owner F, on Free ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is_empty($$select 1 from public.demand_pulls$$, 'Free reads no pulls directly');
select is_empty($$select 1 from public.demand_items$$, 'Free reads no Demand items directly');
select results_eq(
  $$select text, change_pct from public.demand_highlight('23000000-0000-4000-8000-00000000000f')$$,
  $$values ('BBA in Aviation'::text, 50::numeric)$$,
  'Free gets one rising trend: its Free program, its city, the latest month'
);
select results_eq(
  $$select program_name, region, month from public.demand_highlight('23000000-0000-4000-8000-00000000000f')$$,
  $$values ('BBA'::text, 'Pullton'::text, '2026-09-01'::date)$$,
  'with the program, the city and the month'
);
select results_eq(
  $$select trends, topics, questions, content, ideas, best_months from public.demand_teaser('23000000-0000-4000-8000-00000000000f')$$,
  $$values (3, 0, 2, 0, 1, 0)$$,
  'What Paid adds on Free gets counts only'
);
select is_empty($$select 1 from public.demand_highlight('23000000-0000-4000-8000-00000000000a')$$, 'Free cannot ask about another institution');

-- Owner P, on Paid ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.demand_pulls where id::text like '43000000%' order by id$$,
  $$values ('43000000-0000-4000-8000-000000000001'::text), ('43000000-0000-4000-8000-000000000003'), ('43000000-0000-4000-8000-000000000004'), ('43000000-0000-4000-8000-000000000005'), ('43000000-0000-4000-8000-000000000007')$$,
  'Paid reads its own city, state and All India, for its own programs only'
);
select is_empty($$select 1 from public.demand_items where kind = 'mention'$$, 'Mentions are never read directly');
select isnt_empty($$select 1 from public.demand_items where kind = 'question'$$, 'Paid reads questions');
select is_empty($$select 1 from public.demand_items where text = 'BCA with AI'$$, 'but not a program it does not offer');
select is_empty($$select 1 from public.demand_items where text = 'Far away trend'$$, 'nor another city');
select results_eq(
  $$select text from public.demand_highlight('23000000-0000-4000-8000-00000000000a')$$,
  $$values ('MBA in Analytics'::text)$$,
  'Paid''s highlight is the fastest rise across its programs'
);

-- Owner K, on Client ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

select is((select count(*)::integer from public.demand_pulls where id::text like '43000000%'), 4, 'Client reads the BBA pulls for its city, state and All India');

-- Owner T, on Free in a city with too little data -------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000006","role":"authenticated"}', true);

select results_eq(
  $$select text, region from public.demand_highlight('23000000-0000-4000-8000-000000000010')$$,
  $$values ('BBA across the state'::text, 'Demand State'::text)$$,
  'When the city has too little data, the state fills in for the one rising program'
);
select results_eq(
  $$select trends, topics, questions, content, ideas, best_months from public.demand_teaser('23000000-0000-4000-8000-000000000010')$$,
  $$values (1, 0, 0, 0, 0, 0)$$,
  'and for the counts, never the version 1 mentions'
);

-- Owner X, Paid in another state --------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.demand_pulls where id::text like '43000000%' order by id$$,
  $$values ('43000000-0000-4000-8000-000000000005'::text), ('43000000-0000-4000-8000-000000000006')$$,
  'Another state sees All India and its own city only'
);

-- Team --------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

select is((select count(*)::integer from public.demand_items where pull_id::text like '43000000%'), 17, 'The team sees every item, mentions too');
select throws_ok($$select public.record_demand_pull('{}')$$, '42501', null, 'Only the server records pulls');

-- The server (service key) ------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select isnt(
  public.record_demand_pull(jsonb_build_object(
    'scope', 'city', 'region', 'Pullton', 'state', 'Demand State', 'program_key', 'bba', 'month', '2026-10-01', 'pulled_at', now(),
    'items', jsonb_build_array(
      jsonb_build_object('kind', 'rising', 'text', 'BBA in Fintech', 'count', 300, 'change_pct', 64, 'rank', 1, 'source_url', 'https://trends.example/h', 'found_at', now()),
      jsonb_build_object('kind', 'question', 'text', 'Is BBA hard?', 'language', 'hi', 'original_text', 'Original', 'count', 40, 'rank', 1, 'source_url', 'https://youtube.example/h', 'found_at', now(), 'meta', jsonb_build_object('platform', 'youtube'))
    ),
    'spikes', jsonb_build_array(jsonb_build_object('notice', 'Rising in Pullton: BBA in Fintech, up 64% this month.'))
  )),
  null::uuid,
  'A pull is saved'
);
select results_eq(
  $$select institution_id::text from public.notifications where kind = 'demand_spike' and text like 'Rising in Pullton%' order by 1$$,
  $$values ('23000000-0000-4000-8000-00000000000a'::text), ('23000000-0000-4000-8000-00000000000b')$$,
  'A big spike alerts Paid and Client institutions in that city that offer the program, never Free, never another city'
);
select results_eq(
  $$select link from public.notifications where kind = 'demand_spike' and text like 'Rising in Pullton%' limit 1$$,
  $$values ('/demand'::text)$$,
  'The alert opens Demand'
);
select lives_ok(
  $$select public.record_demand_pull(jsonb_build_object(
    'scope', 'city', 'region', 'Pullton', 'state', 'Demand State', 'program_key', 'bba', 'month', '2026-10-01', 'pulled_at', now(),
    'items', jsonb_build_array(jsonb_build_object('kind', 'rising', 'text', 'BBA in Fintech', 'count', 310, 'change_pct', 66, 'rank', 1, 'source_url', 'https://trends.example/h', 'found_at', now())),
    'spikes', jsonb_build_array(jsonb_build_object('notice', 'Rising in Pullton: BBA in Fintech, up 64% this month.'))
  ))$$,
  'Pulling the same month again replaces it'
);
select is((select count(*)::integer from public.notifications where kind = 'demand_spike' and text like 'Rising in Pullton%'), 2, 'with no second alert');
select results_eq(
  $$select d.text, d.count from public.demand_items d join public.demand_pulls p on p.id = d.pull_id
    where p.region = 'Pullton' and p.program_key = 'bba' and p.month = '2026-10-01'$$,
  $$values ('BBA in Fintech'::text, 310)$$,
  'and its items are the new ones'
);
select results_eq(
  $$select count(*)::integer from public.demand_pulls where region = 'Pullton' and program_key = 'bba' and month = '2026-10-01'$$,
  $$values (1)$$,
  'One pull per region, program and month'
);
select throws_ok(
  $$insert into public.demand_pulls (scope, region, state, program_key, month) values ('city', 'Pullton', null, 'bba', '2026-11-01')$$,
  '23514', null,
  'A city pull always records its state'
);
select lives_ok(
  $$insert into public.demand_pulls (scope, region, state, program_key, month) values ('city', 'Pullton', 'Another State', 'bba', '2026-09-01')$$,
  'The same city name in another state is its own pull'
);
select throws_ok(
  $$insert into public.demand_pulls (scope, region, state, program_key, month, too_little) values ('state', 'Demand State', 'Demand State', 'mba', '2026-09-01', true)$$,
  '23514', null,
  'Only a city can have too little: its state fills in'
);
do $$
begin
  perform public.record_demand_pull(jsonb_build_object('scope', 'city', 'region', 'Tinyton', 'state', 'Demand State', 'program_key', 'bba', 'month', '2026-10-01', 'pulled_at', now(), 'too_little', true, 'items', '[]'::jsonb));
  perform public.record_demand_pull(jsonb_build_object('scope', 'state', 'region', 'Demand State', 'state', 'Demand State', 'program_key', 'bba', 'month', '2026-10-01', 'pulled_at', now(), 'too_little', true, 'items', '[]'::jsonb));
end;
$$;
select results_eq(
  $$select p.scope::text, p.too_little from public.demand_pulls p
    where p.program_key = 'bba' and p.month = '2026-10-01' and p.region in ('Tinyton', 'Demand State')
    order by 1$$,
  $$values ('city'::text, true), ('state', false)$$,
  'A pull keeps too little for a city, never for a state'
);

select * from finish();
rollback;

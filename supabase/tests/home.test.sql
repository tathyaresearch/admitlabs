-- The new Home (product review part 2): Mark as done, Start here, effort on the Rivals 3 things
-- to do and the renamed score label, enforced in the database. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures:
--   H: college on Paid. owner-h, member-h. Two Paid Audits; the latest finds Fees shown Weak,
--      Review rating Okay and Page speed Strong.
--   O: another college on Free. owner-o.

begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('17000000-0000-4000-8000-000000000001', 'owner-h@home.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000002', 'member-h@home.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000003', 'owner-o@home.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000004', 'team@home.test', 'authenticated', 'authenticated');

insert into public.team_users (user_id, role) values ('17000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('27000000-0000-4000-8000-00000000000a', 'home-h', 'Home H', 'college', 'Guwahati', 'Assam', 'https://home-h.example'),
  ('27000000-0000-4000-8000-00000000000b', 'home-o', 'Home O', 'college', 'Guwahati', 'Assam', 'https://home-o.example');

insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('27000000-0000-4000-8000-00000000000a', true, now() - interval '60 days'),
  ('27000000-0000-4000-8000-00000000000b', true, now() - interval '60 days');

insert into public.programs (id, institution_id, name, program_key) values
  ('37000000-0000-4000-8000-0000000000a1', '27000000-0000-4000-8000-00000000000a', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('17000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-00000000000a', 'owner'),
  ('17000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-00000000000a', 'member'),
  ('17000000-0000-4000-8000-000000000003', '27000000-0000-4000-8000-00000000000b', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('27000000-0000-4000-8000-00000000000a', 'paid', now() - interval '60 days', now() + interval '120 days'),
  ('27000000-0000-4000-8000-00000000000b', 'free', now() - interval '60 days', null);

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version) values
  ('47000000-0000-4000-8000-0000000000a1', '27000000-0000-4000-8000-00000000000a', now() - interval '35 days', 'paid', 'scheduled', 55, 55, 55, 55, 1),
  ('47000000-0000-4000-8000-0000000000a2', '27000000-0000-4000-8000-00000000000a', now() - interval '5 days', 'paid', 'scheduled', 60, 60, 60, 60, 1);

insert into public.audit_checks (audit_id, program_id, pillar, check_key, result, points_awarded, points_max, checked_at) values
  ('47000000-0000-4000-8000-0000000000a2', '37000000-0000-4000-8000-0000000000a1', 'chosen', 'fees_shown', 'weak', 7.5, 25, now()),
  ('47000000-0000-4000-8000-0000000000a2', null, 'trusted', 'review_rating', 'okay', 15, 25, now()),
  ('47000000-0000-4000-8000-0000000000a2', null, 'chosen', 'page_speed', 'strong', 10, 10, now());

-- Owner H marks things done --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'fees_shown')$$,
  'The owner marks a fix done'
);
select is(
  public.mark_done('27000000-0000-4000-8000-00000000000a', 'fees_shown'),
  (select id from public.done_marks where check_key = 'fees_shown'),
  'Marking it again while it waits changes nothing'
);
select is((select count(*)::int from public.done_marks where check_key = 'fees_shown'), 1, 'One open mark per check');
select lives_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'review_rating')$$,
  'An Okay check is something to fix too'
);
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'page_speed')$$,
  'P0001', 'nothing_to_fix',
  'A check the latest Audit finds Strong cannot be marked'
);
select lives_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', p_thing => 'Post the full fee in one image.', p_month => '2026-09-01')$$,
  'Any other thing is marked with its month'
);
select is(
  public.mark_done('27000000-0000-4000-8000-00000000000a', p_thing => 'Post the full fee in one image.', p_month => '2026-09-01'),
  (select id from public.done_marks where thing is not null),
  'The same thing in the same month is one mark'
);
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', p_thing => 'Post a reel.', p_month => '2026-09-15')$$,
  '22023', 'bad_month',
  'A month is its first day'
);
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', p_thing => 'Post a reel.', p_month => '2099-01-01')$$,
  '22023', 'bad_month',
  'Not a month still to come'
);
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'fees_shown', 'Post a reel.', '2026-09-01')$$,
  '22023', 'one_thing',
  'A mark is a check or a thing, never both'
);
select throws_ok(
  $$insert into public.done_marks (institution_id, check_key) values ('27000000-0000-4000-8000-00000000000a', 'youtube')$$,
  '42501', null,
  'Marks are only added through mark_done()'
);
select lives_ok(
  $$select public.undo_done('27000000-0000-4000-8000-00000000000a', p_thing => 'Post the full fee in one image.', p_month => '2026-09-01')$$,
  'The owner takes a mark back'
);
select is((select count(*)::int from public.done_marks where thing is not null), 0, 'It is gone');
reset role;

-- Member H, owner O and the team ----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.done_marks), 2, 'A member sees what was marked done');
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'review_rating')$$,
  '42501', 'not_owner',
  'Only the owner marks things done'
);
select throws_ok(
  $$select public.undo_done('27000000-0000-4000-8000-00000000000a', 'fees_shown')$$,
  '42501', 'not_owner',
  'Only the owner takes a mark back'
);
select lives_ok($$select public.close_start_guide('27000000-0000-4000-8000-00000000000a')$$, 'Anyone at the institution closes Start here');
reset role;

select ok(
  (select guide_closed_at is not null from public.memberships where user_id = '17000000-0000-4000-8000-000000000002'),
  'Start here is closed for the member who closed it'
);
select ok(
  (select guide_closed_at is null from public.memberships where user_id = '17000000-0000-4000-8000-000000000001'),
  'and still open for the owner'
);

select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.done_marks), 0, 'Another institution never sees the marks');
select throws_ok(
  $$select public.mark_done('27000000-0000-4000-8000-00000000000a', 'review_rating')$$,
  '42501', 'not_owner',
  'nor marks anything for it'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.done_marks where institution_id = '27000000-0000-4000-8000-00000000000a'), 2, 'The AdmitLabs team sees the marks');
reset role;

-- The next Audit checks them (service key) ------------------------------------------------
select lives_ok($$select public.record_audit(jsonb_build_object(
  'institution_id', '27000000-0000-4000-8000-00000000000a', 'kind', 'team', 'trigger', 'manual', 'run_at', now(),
  'overall', 60, 'discovered', 60, 'trusted', 60, 'chosen', 60, 'config_version', 1, 'programs', '[]'::jsonb, 'checks', '[]'::jsonb
))$$, 'A team run of the institution saves');
select is((select count(*)::int from public.done_marks where institution_id = '27000000-0000-4000-8000-00000000000a' and checked_by_audit is null), 2, 'A team run checks nothing that was marked done');

select lives_ok($$select public.record_audit(jsonb_build_object(
  'institution_id', '27000000-0000-4000-8000-00000000000a', 'kind', 'paid', 'trigger', 'scheduled', 'run_at', now(),
  'overall', 62, 'discovered', 62, 'trusted', 62, 'chosen', 62, 'config_version', 1, 'programs', '[]'::jsonb, 'checks', '[]'::jsonb
))$$, 'The next own Audit saves');
select is(
  (select count(*)::int from public.done_marks m join public.audits a on a.id = m.checked_by_audit where a.kind = 'paid' and a.overall = 62),
  2,
  'The next own Audit checks every fix marked done before it'
);

select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.undo_done('27000000-0000-4000-8000-00000000000a', 'fees_shown')$$, 'Taking back a checked mark does nothing');
select is((select count(*)::int from public.done_marks where check_key = 'fees_shown'), 1, 'A checked mark stays: it is history');
reset role;

-- Effort on the Rivals 3 things to do, and the renamed label ----------------------------------
select lives_ok(
  $$select public.record_actions('27000000-0000-4000-8000-00000000000a', '2026-09-01', 'rivals', '[{"rank": 1, "text": "Learn from their top post", "detail": "It worked.", "effort": "medium"}]'::jsonb)$$,
  'The month''s Rivals 3 things to do save'
);
select is(
  (select effort::text from public.actions where institution_id = '27000000-0000-4000-8000-00000000000a' and month = '2026-09-01'),
  'medium',
  'A lesson keeps how big a job it is'
);
select is(
  (select count(*)::int from public.scoring_config where labels @> '[{"label": "At risk"}]'::jsonb),
  0,
  'No score band is called At risk: 0 to 39 is Getting started'
);

select * from finish();
rollback;

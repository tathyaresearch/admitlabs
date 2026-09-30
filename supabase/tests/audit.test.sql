-- Phase 2: the Audit's plan rules (spec section 10) and the owner actions, enforced in the
-- database. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   F: college on Free. owner-f, member-f. Programs F1 (the Free program) and F2.
--      Audits: an older Free Audit, the latest Free Audit, a team run and a rival run.
--   P: college on Paid. owner-p. Programs P1, P2. Two Paid Audits.
--   L: a Paid plan that has ended (now Free). owner-l. Free program L1. One Paid Audit over L1 and L2.
--   R: an unclaimed record (a tracked rival) with one rival run.

begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('11000000-0000-4000-8000-000000000001', 'owner-f@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000002', 'member-f@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000003', 'owner-p@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000004', 'owner-l@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000005', 'team@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000006', 'newcomer@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000007', 'claimer@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000008', 'invitee@audit.test', 'authenticated', 'authenticated'),
  ('11000000-0000-4000-8000-000000000009', 'copycat@audit.test', 'authenticated', 'authenticated');

insert into public.team_users (user_id, role) values ('11000000-0000-4000-8000-000000000005', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('21000000-0000-4000-8000-00000000000f', 'audit-f', 'Audit F', 'college', 'Guwahati', 'Assam', 'https://audit-f.example'),
  ('21000000-0000-4000-8000-00000000000e', 'audit-p', 'Audit P', 'college', 'Guwahati', 'Assam', 'https://audit-p.example'),
  ('21000000-0000-4000-8000-00000000000d', 'audit-l', 'Audit L', 'college', 'Guwahati', 'Assam', 'https://audit-l.example'),
  ('21000000-0000-4000-8000-00000000000c', 'audit-r', 'Audit R', 'college', 'Guwahati', 'Assam', 'https://www.audit-r.example');

insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('21000000-0000-4000-8000-00000000000f', true, now() - interval '100 days'),
  ('21000000-0000-4000-8000-00000000000e', true, now() - interval '60 days'),
  ('21000000-0000-4000-8000-00000000000d', true, now() - interval '200 days'),
  ('21000000-0000-4000-8000-00000000000c', false, null);

insert into public.programs (id, institution_id, name, program_key) values
  ('31000000-0000-4000-8000-0000000000f1', '21000000-0000-4000-8000-00000000000f', 'BBA', 'bba'),
  ('31000000-0000-4000-8000-0000000000f2', '21000000-0000-4000-8000-00000000000f', 'BCA', 'bca'),
  ('31000000-0000-4000-8000-0000000000e1', '21000000-0000-4000-8000-00000000000e', 'MBA', 'mba'),
  ('31000000-0000-4000-8000-0000000000e2', '21000000-0000-4000-8000-00000000000e', 'BBA', 'bba'),
  ('31000000-0000-4000-8000-0000000000d1', '21000000-0000-4000-8000-00000000000d', 'BBA', 'bba'),
  ('31000000-0000-4000-8000-0000000000d2', '21000000-0000-4000-8000-00000000000d', 'MBA', 'mba'),
  ('31000000-0000-4000-8000-0000000000c1', '21000000-0000-4000-8000-00000000000c', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-00000000000f', 'owner'),
  ('11000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-00000000000f', 'member'),
  ('11000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-00000000000e', 'owner'),
  ('11000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-00000000000d', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('21000000-0000-4000-8000-00000000000f', 'free', now() - interval '100 days', null, '31000000-0000-4000-8000-0000000000f1'),
  ('21000000-0000-4000-8000-00000000000e', 'paid', now() - interval '60 days', now() + interval '120 days', null),
  ('21000000-0000-4000-8000-00000000000d', 'paid', now() - interval '200 days', now() - interval '10 days', '31000000-0000-4000-8000-0000000000d1');

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version) values
  ('41000000-0000-4000-8000-0000000000f1', '21000000-0000-4000-8000-00000000000f', now() - interval '92 days', 'free', 'signup', 41, 36, 44, 44, 1),
  ('41000000-0000-4000-8000-0000000000f2', '21000000-0000-4000-8000-00000000000f', now() - interval '2 days', 'free', 'scheduled', 46, 44, 44, 50, 1),
  ('41000000-0000-4000-8000-0000000000f3', '21000000-0000-4000-8000-00000000000f', now() - interval '1 day', 'team', 'manual', 50, 50, 50, 50, 1),
  ('41000000-0000-4000-8000-0000000000f4', '21000000-0000-4000-8000-00000000000f', now() - interval '1 day', 'rival', 'scheduled', 48, 48, 48, 48, 1),
  ('41000000-0000-4000-8000-0000000000e1', '21000000-0000-4000-8000-00000000000e', now() - interval '40 days', 'paid', 'scheduled', 60, 60, 60, 60, 1),
  ('41000000-0000-4000-8000-0000000000e2', '21000000-0000-4000-8000-00000000000e', now() - interval '10 days', 'paid', 'scheduled', 64, 64, 64, 64, 1),
  ('41000000-0000-4000-8000-0000000000d1', '21000000-0000-4000-8000-00000000000d', now() - interval '20 days', 'paid', 'scheduled', 55, 55, 55, 55, 1),
  ('41000000-0000-4000-8000-0000000000c1', '21000000-0000-4000-8000-00000000000c', now() - interval '5 days', 'rival', 'scheduled', 30, 30, 30, 30, 1);

insert into public.audit_program_scores (audit_id, program_id, overall, discovered, trusted, chosen) values
  ('41000000-0000-4000-8000-0000000000f1', '31000000-0000-4000-8000-0000000000f1', 41, 36, 44, 44),
  ('41000000-0000-4000-8000-0000000000f2', '31000000-0000-4000-8000-0000000000f1', 46, 44, 44, 50),
  ('41000000-0000-4000-8000-0000000000f3', '31000000-0000-4000-8000-0000000000f1', 50, 50, 50, 50),
  ('41000000-0000-4000-8000-0000000000f3', '31000000-0000-4000-8000-0000000000f2', 50, 50, 50, 50),
  ('41000000-0000-4000-8000-0000000000e1', '31000000-0000-4000-8000-0000000000e1', 60, 60, 60, 60),
  ('41000000-0000-4000-8000-0000000000e1', '31000000-0000-4000-8000-0000000000e2', 60, 60, 60, 60),
  ('41000000-0000-4000-8000-0000000000e2', '31000000-0000-4000-8000-0000000000e1', 64, 64, 64, 64),
  ('41000000-0000-4000-8000-0000000000e2', '31000000-0000-4000-8000-0000000000e2', 64, 64, 64, 64),
  ('41000000-0000-4000-8000-0000000000d1', '31000000-0000-4000-8000-0000000000d1', 55, 55, 55, 55),
  ('41000000-0000-4000-8000-0000000000d1', '31000000-0000-4000-8000-0000000000d2', 55, 55, 55, 55),
  ('41000000-0000-4000-8000-0000000000c1', '31000000-0000-4000-8000-0000000000c1', 30, 30, 30, 30);

insert into public.audit_checks (id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, checked_at) values
  -- F, latest Free Audit: ranks 1 to 3 have details; the rest are results only.
  ('51000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-0000000000f2', null, 'discovered', 'instagram_activity', 'okay', 15, 25, 2, 6, now()),
  ('51000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-0000000000f2', null, 'discovered', 'google_profile', 'weak', 6, 20, null, 3, now()),
  ('51000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-0000000000f2', '31000000-0000-4000-8000-0000000000f1', 'discovered', 'google_search', 'okay', 18, 30, 1, 4, now()),
  ('51000000-0000-4000-8000-000000000004', '41000000-0000-4000-8000-0000000000f2', '31000000-0000-4000-8000-0000000000f1', 'chosen', 'fees_shown', 'weak', 7.5, 25, null, 2, now()),
  ('51000000-0000-4000-8000-000000000005', '41000000-0000-4000-8000-0000000000f2', null, 'chosen', 'page_speed', 'weak', 3, 10, null, 9, now()),
  -- P, latest Paid Audit.
  ('52000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-0000000000e2', '31000000-0000-4000-8000-0000000000e2', 'chosen', 'fees_shown', 'weak', 7.5, 25, null, 7, now()),
  -- L, the Paid Audit from before the plan ended.
  ('53000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-0000000000d1', '31000000-0000-4000-8000-0000000000d1', 'chosen', 'fees_shown', 'weak', 7.5, 25, null, 1, now()),
  ('53000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-0000000000d1', '31000000-0000-4000-8000-0000000000d2', 'chosen', 'fees_shown', 'weak', 7.5, 25, null, 1, now()),
  ('53000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-0000000000d1', null, 'chosen', 'page_speed', 'weak', 3, 10, null, 8, now()),
  -- F, the team run: never shown to F.
  ('54000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-0000000000f3', null, 'chosen', 'page_speed', 'weak', 3, 10, null, 1, now());

insert into public.audit_check_details (audit_check_id, finding, source_url)
select id, 'Found something', 'https://source.example' from public.audit_checks
where id::text like '51000000%' or id::text like '52000000%' or id::text like '53000000%' or id::text like '54000000%';

insert into public.notifications (institution_id, kind, text) values
  ('21000000-0000-4000-8000-00000000000f', 'audit_ready', 'Your new Audit is ready. See what changed.'),
  ('21000000-0000-4000-8000-00000000000f', 'audit_ready', 'Your first Audit is ready. See where you stand.'),
  ('21000000-0000-4000-8000-00000000000e', 'audit_ready', 'Your new Audit is ready. See what changed.');

-- Owner F, on Free ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select id::text from public.audits$$,
  $$values ('41000000-0000-4000-8000-0000000000f2'::text)$$,
  'Free sees only its latest Audit: no history'
);
select is_empty(
  $$select 1 from public.audits where kind in ('team', 'rival')$$,
  'Free never sees team or rival runs of its own record'
);
select results_eq(
  $$select audit_id::text || '/' || program_id::text from public.audit_program_scores$$,
  $$values ('41000000-0000-4000-8000-0000000000f2/31000000-0000-4000-8000-0000000000f1'::text)$$,
  'Free sees the program score of the program its Audit covers'
);
select is((select count(*)::int from public.audit_checks), 5, 'Free sees every check result in its latest Audit');
select is((select count(*)::int from public.audit_check_details), 4, 'Free sees details for the top 3 strengths and top 3 fixes only');
select is_empty(
  $$select 1 from public.audit_check_details where audit_check_id = '51000000-0000-4000-8000-000000000005'$$,
  'A check outside the top 3 lists keeps its details hidden on Free'
);
select throws_ok($$select public.record_audit('{}'::jsonb)$$, '42501', null, 'Institution users cannot save Audits');
select throws_ok(
  $$insert into public.audits (institution_id, kind, trigger, overall, discovered, trusted, chosen, config_version)
    values ('21000000-0000-4000-8000-00000000000f', 'free', 'manual', 100, 100, 100, 100, 1)$$,
  '42501', null,
  'Institution users cannot write scores directly'
);
select is(private.free_top_limit(), 3, 'The Free limit is the Top 3 from the plans table');
reset role;

-- Owner P, on Paid ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.audits), 2, 'Paid sees its score history');
select is((select count(*)::int from public.audit_program_scores), 4, 'Paid sees every program');
select isnt_empty(
  $$select 1 from public.audit_check_details where audit_check_id = '52000000-0000-4000-8000-000000000001'$$,
  'Paid sees every detail, whatever its rank'
);
reset role;

-- Owner L: the Paid plan ended, so Free rules apply ---------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select id::text from public.audits$$,
  $$values ('41000000-0000-4000-8000-0000000000d1'::text)$$,
  'After a Paid plan ends, the last Audit stays visible'
);
select results_eq(
  $$select program_id::text from public.audit_program_scores$$,
  $$values ('31000000-0000-4000-8000-0000000000d1'::text)$$,
  'After a Paid plan ends, only the chosen Free program shows'
);
select results_eq(
  $$select id::text from public.audit_checks order by id$$,
  $$values ('53000000-0000-4000-8000-000000000001'::text), ('53000000-0000-4000-8000-000000000003'::text)$$,
  'Check results for other programs are hidden; shared checks show'
);
select results_eq(
  $$select audit_check_id::text from public.audit_check_details$$,
  $$values ('53000000-0000-4000-8000-000000000001'::text)$$,
  'Details follow the Free rule too'
);
reset role;

-- Member F ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.audits), 1, 'A member sees what the plan allows, like the owner');
select throws_ok(
  $$select public.set_free_program('31000000-0000-4000-8000-0000000000f2')$$,
  '42501', null,
  'Only the owner can choose the Free program'
);
select is(public.mark_notifications_read(), 2, 'Marking read only touches this institution''s notifications');
reset role;

-- Owner F: owner actions ----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$select public.set_free_program('31000000-0000-4000-8000-0000000000f2')$$, 'The owner can change the Free program at any time');
select isnt_empty(
  $$select 1 from public.audit_program_scores where program_id = '31000000-0000-4000-8000-0000000000f1'$$,
  'The latest Free Audit still shows the program it covered until the next one'
);
select throws_ok(
  $$select public.archive_program('31000000-0000-4000-8000-0000000000f2')$$,
  'P0001', 'free_program',
  'On Free, the Free program cannot be removed until another is chosen'
);
select isnt(public.add_program('B.Com', 'bcom'), null, 'The owner can add a program');
select lives_ok($$select public.archive_program('31000000-0000-4000-8000-0000000000f1')$$, 'The owner can remove a program; past Audits keep it');
select is(
  public.add_program('BBA', 'bba'),
  '31000000-0000-4000-8000-0000000000f1'::uuid,
  'Adding a removed program back brings back the same program'
);
select lives_ok($$select public.invite_member(' Invitee@Audit.test ')$$, 'The owner can invite someone by email');
select throws_ok(
  $$select public.update_institution('Audit F', 'college', 'Guwahati', 'Assam', 'https://www.audit-p.example/', 'auditf', '', '{}'::jsonb)$$,
  'P0001', 'website_taken',
  'A website already used by another institution is refused'
);
select is((select count(*)::int from public.institution_people('21000000-0000-4000-8000-00000000000f')), 2, 'The owner sees the people at their institution');
select is((select count(*)::int from public.institution_people('21000000-0000-4000-8000-00000000000e')), 0, 'Nobody sees the people at another institution');
select lives_ok($$select public.remove_member('11000000-0000-4000-8000-000000000002')$$, 'The owner can remove a member');
reset role;

-- Invitee: joins on sign in -------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select is(public.accept_invites(), '21000000-0000-4000-8000-00000000000f'::uuid, 'An invited person joins when they sign in');
select is((select count(*)::int from public.audits), 1, 'The new member sees what the plan allows');
reset role;

-- Newcomer: signs up a new institution --------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select isnt(
  public.onboard_institution('Newcomer College', 'college', 'Guwahati', 'Assam', 'https://newcomer-college.example', 'newcomer', '', '{}'::jsonb,
    '[{"name": "BBA", "program_key": "bba"}, {"name": "Aviation Safety", "program_key": ""}]'::jsonb),
  null,
  'A new user can set up their institution'
);
select results_eq(
  $$select p.tier::text || '/' || m.role::text || '/' || (select count(*) from public.programs)::text
    from public.plans p join public.memberships m on m.institution_id = p.institution_id$$,
  $$values ('free/owner/2'::text)$$,
  'They start as owner, on Free, with their programs'
);
select throws_ok(
  $$select public.onboard_institution('Again', 'college', 'Guwahati', 'Assam', 'https://again.example', 'again', '', '{}'::jsonb, '[{"name": "BBA"}]'::jsonb)$$,
  'P0001', 'already_onboarded',
  'An owner cannot set up a second institution'
);
reset role;

-- Claimer: signs up with a tracked rival's website --------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
set local role authenticated;

select is(
  public.onboard_institution('Audit R', 'college', 'Guwahati', 'Assam', 'http://audit-r.example/about', 'auditr', '', '{}'::jsonb,
    '[{"name": "MBA", "program_key": "mba"}]'::jsonb),
  '21000000-0000-4000-8000-00000000000c'::uuid,
  'Signing up with an unclaimed record''s website claims that record'
);
select is_empty($$select 1 from public.audits$$, 'Rival runs from before the claim stay private');
select results_eq(
  $$select name from public.programs where archived_at is null$$,
  $$values ('MBA'::text)$$,
  'The new owner''s program list wins'
);
reset role;

-- Copycat: tries a claimed institution's website ----------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$select public.onboard_institution('Audit F Again', 'college', 'Guwahati', 'Assam', 'https://audit-f.example', 'copy', '', '{}'::jsonb, '[{"name": "BBA"}]'::jsonb)$$,
  'P0001', 'already_claimed',
  'An institution that is already on Drishti cannot be claimed again'
);
reset role;

-- Team ------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$select public.onboard_institution('Team College', 'college', 'Guwahati', 'Assam', 'https://team-college.example', 'team', '', '{}'::jsonb, '[{"name": "BBA"}]'::jsonb)$$,
  'P0001', 'team_user',
  'Team users do not sign up institutions'
);
select ok((select count(*) from public.audits where id::text like '41000000%') = 8, 'The team sees every Audit, including team and rival runs');
reset role;

-- The Audit writer (server only) ------------------------------------------------------
set local role service_role;
select lives_ok(
  $$select public.record_audit(jsonb_build_object(
    'institution_id', '21000000-0000-4000-8000-00000000000e', 'kind', 'paid', 'trigger', 'manual', 'run_at', now(),
    'overall', 66, 'discovered', 66, 'trusted', 66, 'chosen', 66, 'config_version', 1, 'programs', '[]'::jsonb, 'checks', '[]'::jsonb))$$,
  'Paid can use one extra refresh in a month'
);
select throws_ok(
  $$select public.record_audit(jsonb_build_object(
    'institution_id', '21000000-0000-4000-8000-00000000000e', 'kind', 'paid', 'trigger', 'manual', 'run_at', now(),
    'overall', 67, 'discovered', 67, 'trusted', 67, 'chosen', 67, 'config_version', 1, 'programs', '[]'::jsonb, 'checks', '[]'::jsonb))$$,
  'P0001', 'refresh_used',
  'A second extra refresh in the same calendar month is refused by the database'
);
reset role;

set local role anon;
select throws_ok($$select public.record_audit('{}'::jsonb)$$, '42501', null, 'Anonymous visitors cannot save Audits');
reset role;

select * from finish();
rollback;

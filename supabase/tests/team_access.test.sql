-- The team area's access levels (spec section 27), enforced in the database: Admin, Team member
-- and Client manager. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures, in a made-up state so the sample world never mixes in:
--   A: an Admin. T: a Team member. M: a Client manager, assigned to C1. W: a Client manager with
--   no Clients. O: owner of C1.
--   C1, C2: Clients. F: on Free. R: a rival C1 tracks. Q: a rival only C2 tracks.

begin;
create extension if not exists pgtap with schema extensions;

select plan(42);

insert into public.cities (name, state) values ('Accessville', 'Access State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('16000000-0000-4000-8000-000000000001', 'admin-a@access.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000002', 'team-t@access.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000003', 'manager-m@access.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000004', 'manager-w@access.test', 'authenticated', 'authenticated'),
  ('16000000-0000-4000-8000-000000000005', 'owner-o@access.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values
  ('16000000-0000-4000-8000-000000000001', 'admin'),
  ('16000000-0000-4000-8000-000000000002', 'team'),
  ('16000000-0000-4000-8000-000000000003', 'client_manager'),
  ('16000000-0000-4000-8000-000000000004', 'client_manager');
insert into public.team_invites (email, role, invited_by) values ('later@access.test', 'team', '16000000-0000-4000-8000-000000000001');
insert into public.person_names (user_id, name) values ('16000000-0000-4000-8000-000000000005', 'Olive Owner');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('26000000-0000-4000-8000-0000000000c1', 'access-c1', 'Access C1', 'college', 'Accessville', 'Access State', 'https://access-c1.example'),
  ('26000000-0000-4000-8000-0000000000c2', 'access-c2', 'Access C2', 'college', 'Accessville', 'Access State', 'https://access-c2.example'),
  ('26000000-0000-4000-8000-0000000000f1', 'access-f', 'Access F', 'college', 'Accessville', 'Access State', 'https://access-f.example'),
  ('26000000-0000-4000-8000-0000000000a1', 'access-r', 'Access R', 'college', 'Accessville', 'Access State', 'https://access-r.example'),
  ('26000000-0000-4000-8000-0000000000a2', 'access-q', 'Access Q', 'college', 'Accessville', 'Access State', 'https://access-q.example');
insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('26000000-0000-4000-8000-0000000000c1', true, now() - interval '90 days', false),
  ('26000000-0000-4000-8000-0000000000c2', true, now() - interval '90 days', false),
  ('26000000-0000-4000-8000-0000000000f1', true, now() - interval '30 days', false),
  ('26000000-0000-4000-8000-0000000000a1', false, null, false),
  ('26000000-0000-4000-8000-0000000000a2', false, null, false);
insert into public.plans (institution_id, tier, starts_at) values
  ('26000000-0000-4000-8000-0000000000c1', 'client', now() - interval '60 days'),
  ('26000000-0000-4000-8000-0000000000c2', 'client', now() - interval '60 days'),
  ('26000000-0000-4000-8000-0000000000f1', 'free', now() - interval '30 days');
insert into public.memberships (user_id, institution_id, role) values
  ('16000000-0000-4000-8000-000000000005', '26000000-0000-4000-8000-0000000000c1', 'owner');
insert into public.rivals (institution_id, rival_institution_id) values
  ('26000000-0000-4000-8000-0000000000c1', '26000000-0000-4000-8000-0000000000a1'),
  ('26000000-0000-4000-8000-0000000000c2', '26000000-0000-4000-8000-0000000000a2');
insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version, review) values
  ('46000000-0000-4000-8000-0000000000c1', '26000000-0000-4000-8000-0000000000c1', now() - interval '1 day', 'client', 'manual', 70, 70, 70, 70, 1, 'waiting'),
  ('46000000-0000-4000-8000-0000000000c2', '26000000-0000-4000-8000-0000000000c2', now() - interval '1 day', 'client', 'manual', 60, 60, 60, 60, 1, 'waiting'),
  ('46000000-0000-4000-8000-0000000000a1', '26000000-0000-4000-8000-0000000000a1', now() - interval '2 days', 'rival', 'scheduled', 50, 50, 50, 50, 1, 'approved'),
  ('46000000-0000-4000-8000-0000000000a2', '26000000-0000-4000-8000-0000000000a2', now() - interval '2 days', 'rival', 'scheduled', 40, 40, 40, 40, 1, 'approved');
insert into public.rival_ads (rival_institution_id, promise, source_url) values
  ('26000000-0000-4000-8000-0000000000a1', 'Admissions open for BBA', 'https://ads.example/r'),
  ('26000000-0000-4000-8000-0000000000a2', 'Hostel for all', 'https://ads.example/q');
insert into public.notes (institution_id, author_id, body) values
  ('26000000-0000-4000-8000-0000000000c1', '16000000-0000-4000-8000-000000000002', 'A note about C1.'),
  ('26000000-0000-4000-8000-0000000000c2', '16000000-0000-4000-8000-000000000002', 'A note about C2.');
insert into public.brains (institution_id, started_by) values
  ('26000000-0000-4000-8000-0000000000c1', '16000000-0000-4000-8000-000000000002');
insert into public.brain_items (institution_id, kind, fields, to_confirm, source) values
  ('26000000-0000-4000-8000-0000000000c1', 'link', '{"type": "other", "label": "listing.example", "url": "https://listing.example/c1", "shared": false}', true, 'drishti');
insert into public.leads (institution_id, name, phone, consent) values
  ('26000000-0000-4000-8000-0000000000c1', 'A Student', '+919876543210', 'I agree to be contacted about admissions.');
insert into public.bulk_runs (created_by, source, total) values ('16000000-0000-4000-8000-000000000002', 'paste', 1);

-- The team assigns ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.assign_client_manager('26000000-0000-4000-8000-0000000000c1', '16000000-0000-4000-8000-000000000003')$$,
  'A Team member assigns a Client manager to a Client'
);
select throws_ok(
  $$select public.assign_client_manager('26000000-0000-4000-8000-0000000000c1', '16000000-0000-4000-8000-000000000002')$$,
  'P0001', 'not_client_manager', 'Only to someone whose level is Client manager'
);
select throws_ok(
  $$select public.assign_client_manager('26000000-0000-4000-8000-0000000000f1', '16000000-0000-4000-8000-000000000003')$$,
  'P0001', 'not_client', 'Only for a Client'
);
select is((select count(*)::int from public.client_managers where institution_id = '26000000-0000-4000-8000-0000000000c1'), 1, 'The team sees who looks after a Client');
select is((select count(*)::int from public.institutions where city = 'Accessville'), 5, 'A Team member sees every institution');
-- Only the Bulk Audit made above: a local database may hold others from trying the screen.
select is((select count(*)::int from public.bulk_runs where created_by = '16000000-0000-4000-8000-000000000002'), 1, 'and the Bulk Audits');
reset role;

-- The Client manager: their Client, and the rival it tracks -------------------------------------
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select id from public.institutions where city = 'Accessville' order by id$$,
  $$values ('26000000-0000-4000-8000-0000000000a1'::uuid), ('26000000-0000-4000-8000-0000000000c1'::uuid)$$,
  'A Client manager sees their Client and the rival it tracks, nothing else'
);
select results_eq(
  $$select id from public.team_institutions where city = 'Accessville'$$,
  $$values ('26000000-0000-4000-8000-0000000000c1'::uuid)$$,
  'The team list shows them their own Client'
);
select results_eq(
  $$select id from public.audits where institution_id in (select id from public.institutions where city = 'Accessville') order by id$$,
  $$values ('46000000-0000-4000-8000-0000000000a1'::uuid), ('46000000-0000-4000-8000-0000000000c1'::uuid)$$,
  'Their Client''s Audits and its rival''s, as the team sees them'
);
select is((select count(*)::int from public.rival_ads where source_url like 'https://ads.example/%'), 1, 'Rival ads: only the rival their Client tracks');
select is((select count(*)::int from public.plans where institution_id in ('26000000-0000-4000-8000-0000000000c1', '26000000-0000-4000-8000-0000000000c2', '26000000-0000-4000-8000-0000000000f1')), 1, 'Plans: only their Client''s');
select is((select count(*)::int from public.notes where institution_id in ('26000000-0000-4000-8000-0000000000c1', '26000000-0000-4000-8000-0000000000c2')), 1, 'Team notes: only their Client''s');
select is((select count(*)::int from public.bulk_runs), 0, 'No Bulk Audits');
select is((select count(*)::int from public.client_managers), 1, 'They see their own assignment');
select is((select count(*)::int from public.team_users), 1, 'and their own place on the team, not everyone''s levels');
select is((select count(*)::int from public.team_people() where email like '%@access.test'), 4, 'The team''s names, for who wrote what');
select is((select count(*)::int from public.team_people() where pending), 0, 'but not the invitations waiting');
select is((select count(*)::int from public.leads where institution_id = '26000000-0000-4000-8000-0000000000c1'), 0, 'Never a student''s details: Leads stay with the college');
select is((select count(*)::int from public.institution_people('26000000-0000-4000-8000-0000000000c1')), 1, 'Their Client''s people');
select is((select count(*)::int from public.institution_people('26000000-0000-4000-8000-0000000000c2')), 0, 'not another Client''s');
select is((select name from public.person_names where user_id = '16000000-0000-4000-8000-000000000005'), 'Olive Owner', 'with their names');
select is((select count(*)::int from public.brain_items where institution_id = '26000000-0000-4000-8000-0000000000c1' and to_confirm), 1, 'What Drishti found for their Client''s Brain, waiting to be confirmed');
select is((select count(*)::int from public.audit_waiting('26000000-0000-4000-8000-0000000000c2')), 0, 'Nothing about another Client, even through a function');

-- What they do for their Client, and only theirs.
select lives_ok(
  $$insert into public.notes (institution_id, author_id, body) values ('26000000-0000-4000-8000-0000000000c1', '16000000-0000-4000-8000-000000000003', 'Called the principal.')$$,
  'A Client manager adds a team note to their Client'
);
select throws_ok(
  $$insert into public.notes (institution_id, author_id, body) values ('26000000-0000-4000-8000-0000000000c2', '16000000-0000-4000-8000-000000000003', 'x')$$,
  '42501', null, 'never to another Client'
);
select lives_ok(
  $$insert into public.team_work (institution_id, kind, body, work_on, added_by) values ('26000000-0000-4000-8000-0000000000c1', 'done', 'Posted the BBA reel.', current_date, '16000000-0000-4000-8000-000000000003')$$,
  'adds to their Client''s work log'
);
select throws_ok(
  $$insert into public.team_work (institution_id, kind, body, work_on, added_by) values ('26000000-0000-4000-8000-0000000000c2', 'done', 'x', current_date, '16000000-0000-4000-8000-000000000003')$$,
  '42501', null, 'not another''s'
);
select lives_ok($$select public.set_review_first('26000000-0000-4000-8000-0000000000c1', true)$$, 'sets how their Client''s Audits go out');
select throws_ok($$select public.set_review_first('26000000-0000-4000-8000-0000000000c2', true)$$, '42501', null, 'not another''s');
select lives_ok($$select public.approve_audit('46000000-0000-4000-8000-0000000000c1', null, null)$$, 'approves their Client''s Audit');
select throws_ok($$select public.approve_audit('46000000-0000-4000-8000-0000000000c2', null, null)$$, '42501', null, 'not another Client''s');
select lives_ok($$select public.start_brain('26000000-0000-4000-8000-0000000000c1')$$, 'runs their Client''s onboarding');
select throws_ok($$select public.start_brain('26000000-0000-4000-8000-0000000000c2')$$, '42501', null, 'not another''s');
select throws_ok(
  $$select public.assign_client_manager('26000000-0000-4000-8000-0000000000c2', '16000000-0000-4000-8000-000000000003')$$,
  '42501', null, 'They do not assign Clients, not even to themselves'
);
select throws_ok($$select public.set_plan('26000000-0000-4000-8000-0000000000f1', 'client', now())$$, '42501', null, 'They do not change plans');
select throws_ok($$select public.add_team_user('new@access.test', 'team')$$, '42501', null, 'nor the team');
reset role;

-- A Client manager with no Clients sees nothing ---------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.institutions where city = 'Accessville'), 0, 'A Client manager with no Clients sees no institution');
select is((select count(*)::int from public.team_institutions where city = 'Accessville'), 0, 'and an empty team list');
reset role;

-- The Team member cannot change levels; the Admin can, and the Clients go with the level ----------
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.set_team_role('16000000-0000-4000-8000-000000000003', 'team')$$, '42501', null, 'A Team member does not change levels');
reset role;
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.set_team_role('16000000-0000-4000-8000-000000000003', 'team')$$, 'An Admin makes the Client manager a Team member');
select is((select count(*)::int from public.client_managers where user_id = '16000000-0000-4000-8000-000000000003'), 0, 'who no longer looks after Clients one by one');
reset role;
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.institutions where city = 'Accessville'), 5, 'and sees everything, as a Team member');
reset role;

select * from finish();
rollback;

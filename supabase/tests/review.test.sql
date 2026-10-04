-- Version 2, Part 2 (spec sections 7, 13 and 25), enforced in the database: the college's waiting
-- state, Free's counts, marks on findings, Let AdmitLabs fix this, the team's review and Approve
-- and send, and the shared Audit's findings. Run with `npm run db:test`. Everything is rolled back
-- at the end.
--
-- Fixtures:
--   P: college on Paid. owner-p, member-p. An approved Audit (a weak check ranked 1, a complaint
--      ranked 2, a good word, a finding taken out) and a newer one waiting for review. A check
--      marked done before the newer one ran.
--   F: college on Free. owner-f. A weak check ranked 1 and one ranked 4; findings ranked 2 and 5.
--   C: skilling institute, an AdmitLabs Client. owner-c.
--   N: a new Free sign up whose first Audit waits for review. owner-n.
--   R: a prospect with a shared team Audit: fixes ranked 1, 2, 4 and 5, and a finding taken out.
--   Team: team-r.

begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('19000000-0000-4000-8000-000000000001', 'owner-p@review.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000002', 'member-p@review.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000003', 'owner-f@review.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000004', 'owner-c@review.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000005', 'owner-n@review.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000006', 'team-r@review.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('19000000-0000-4000-8000-000000000006', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('29000000-0000-4000-8000-00000000000a', 'review-p', 'Review Paid', 'college', 'Guwahati', 'Assam', 'https://review-p.example'),
  ('29000000-0000-4000-8000-00000000000b', 'review-f', 'Review Free', 'college', 'Guwahati', 'Assam', 'https://review-f.example'),
  ('29000000-0000-4000-8000-00000000000c', 'review-c', 'Review Client', 'skilling', 'Guwahati', 'Assam', 'https://review-c.example'),
  ('29000000-0000-4000-8000-00000000000d', 'review-n', 'Review New', 'college', 'Guwahati', 'Assam', 'https://review-n.example'),
  ('29000000-0000-4000-8000-00000000000e', 'review-r', 'Review Prospect', 'college', 'Guwahati', 'Assam', 'https://review-r.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('29000000-0000-4000-8000-00000000000a', true, now() - interval '90 days', false),
  ('29000000-0000-4000-8000-00000000000b', true, now() - interval '90 days', false),
  ('29000000-0000-4000-8000-00000000000c', true, now() - interval '90 days', false),
  ('29000000-0000-4000-8000-00000000000d', true, now() - interval '1 day', false),
  ('29000000-0000-4000-8000-00000000000e', false, null, true);

insert into public.programs (id, institution_id, name, program_key) values
  ('39000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('39000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 'BBA', 'bba'),
  ('39000000-0000-4000-8000-0000000000d1', '29000000-0000-4000-8000-00000000000d', 'BBA', 'bba'),
  ('39000000-0000-4000-8000-0000000000e1', '29000000-0000-4000-8000-00000000000e', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('19000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-00000000000a', 'owner'),
  ('19000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-00000000000a', 'member'),
  ('19000000-0000-4000-8000-000000000003', '29000000-0000-4000-8000-00000000000b', 'owner'),
  ('19000000-0000-4000-8000-000000000004', '29000000-0000-4000-8000-00000000000c', 'owner'),
  ('19000000-0000-4000-8000-000000000005', '29000000-0000-4000-8000-00000000000d', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('29000000-0000-4000-8000-00000000000a', 'paid', now() - interval '90 days', now() + interval '90 days', null),
  ('29000000-0000-4000-8000-00000000000b', 'free', now() - interval '90 days', null, '39000000-0000-4000-8000-0000000000b1'),
  ('29000000-0000-4000-8000-00000000000c', 'client', now() - interval '90 days', null, null),
  ('29000000-0000-4000-8000-00000000000d', 'free', now() - interval '1 day', null, '39000000-0000-4000-8000-0000000000d1');

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version, review, approved_at) values
  ('49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', now() - interval '20 days', 'paid', 'scheduled', 60, 60, 60, 60, 1, 'approved', now() - interval '20 days'),
  ('49000000-0000-4000-8000-0000000000a2', '29000000-0000-4000-8000-00000000000a', now() - interval '1 day', 'paid', 'manual', 62, 62, 62, 62, 1, 'waiting', null),
  ('49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', now() - interval '10 days', 'free', 'signup', 45, 45, 45, 45, 1, 'approved', now() - interval '10 days'),
  ('49000000-0000-4000-8000-0000000000c1', '29000000-0000-4000-8000-00000000000c', now() - interval '5 days', 'client', 'scheduled', 50, 50, 50, 50, 1, 'approved', now() - interval '5 days'),
  ('49000000-0000-4000-8000-0000000000d1', '29000000-0000-4000-8000-00000000000d', now() - interval '2 hours', 'free', 'signup', 40, 40, 40, 40, 1, 'waiting', null),
  ('49000000-0000-4000-8000-0000000000e1', '29000000-0000-4000-8000-00000000000e', now() - interval '3 days', 'team', 'manual', 48, 48, 48, 48, 1, 'approved', now() - interval '3 days');

insert into public.audit_checks (id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, fix_rank, checked_at) values
  ('59000000-0000-4000-8000-0000000000a1', '49000000-0000-4000-8000-0000000000a1', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 1, now() - interval '20 days'),
  ('59000000-0000-4000-8000-0000000000a2', '49000000-0000-4000-8000-0000000000a1', '39000000-0000-4000-8000-0000000000a1', 'chosen', 'fees_shown', 'strong', 25, 25, null, now() - interval '20 days'),
  ('59000000-0000-4000-8000-0000000000a3', '49000000-0000-4000-8000-0000000000a2', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 1, now() - interval '1 day'),
  ('59000000-0000-4000-8000-0000000000b1', '49000000-0000-4000-8000-0000000000b1', '39000000-0000-4000-8000-0000000000b1', 'chosen', 'fees_shown', 'weak', 8, 25, 1, now() - interval '10 days'),
  ('59000000-0000-4000-8000-0000000000b2', '49000000-0000-4000-8000-0000000000b1', null, 'trusted', 'approvals', 'weak', 4, 15, 4, now() - interval '10 days'),
  ('59000000-0000-4000-8000-0000000000c1', '49000000-0000-4000-8000-0000000000c1', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 1, now() - interval '5 days'),
  ('59000000-0000-4000-8000-0000000000d1', '49000000-0000-4000-8000-0000000000d1', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 1, now() - interval '2 hours'),
  ('59000000-0000-4000-8000-0000000000e1', '49000000-0000-4000-8000-0000000000e1', '39000000-0000-4000-8000-0000000000e1', 'chosen', 'fees_shown', 'weak', 8, 25, 1, now() - interval '3 days'),
  ('59000000-0000-4000-8000-0000000000e2', '49000000-0000-4000-8000-0000000000e1', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 4, now() - interval '3 days');

insert into public.audit_check_details (audit_check_id, finding, source_url, why_it_matters, fix_steps, ready_fix, fix_title) values
  ('59000000-0000-4000-8000-0000000000a3', 'The enquiry form is only on the contact page.', 'https://review-p.example/contact', 'Students leave before they find it.', array['Add a WhatsApp button to every page.'], null, null),
  ('59000000-0000-4000-8000-0000000000e1', 'Only the BBA total fee is shown.', 'https://review-r.example/bba', 'Fees are the first thing parents check.', array['Show the fee for each year.'], '{"kind": "text", "title": "BBA fees", "text": "Year 1: [amount]"}', 'Show the BBA fee for each year'),
  ('59000000-0000-4000-8000-0000000000e2', 'The enquiry form is only on the contact page.', 'https://review-r.example/contact', 'Students leave before they find it.', array['Add a WhatsApp button to every page.'], '{"kind": "text", "title": "A button", "text": "Chat with us"}', null);

insert into public.audit_findings (id, audit_id, institution_id, place, kind, finding_key, line, source_name, source_url, checked_at, fix_title, fix_why, fix_steps, ready_fix, effort, impact, fix_rank, removed_at) values
  ('69000000-0000-4000-8000-0000000000a1', '49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 'people', 'bad', 'p-complaint', 'Three students say the hostel fee went up.', 'Reddit', 'https://reddit.example/p', now(), 'Reply to the thread', null, null, null, 'easy', 'high', 2, null),
  ('69000000-0000-4000-8000-0000000000a2', '49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 'people', 'good', 'p-good', 'A student likes the faculty.', 'Reddit', 'https://reddit.example/p2', now(), null, null, null, null, null, null, null, null),
  ('69000000-0000-4000-8000-0000000000a3', '49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 'other', 'news', 'p-gone', 'A story about another college.', 'news.example', 'https://news.example/x', now(), null, null, null, null, null, null, null, now()),
  ('69000000-0000-4000-8000-0000000000a4', '49000000-0000-4000-8000-0000000000a2', '29000000-0000-4000-8000-00000000000a', 'people', 'unanswered', 'p-new', 'A question nobody answered.', 'Quora', 'https://quora.example/p', now(), 'Answer it', null, null, null, 'easy', 'medium', 2, null),
  ('69000000-0000-4000-8000-0000000000b1', '49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 'people', 'unanswered', 'f-top', 'A question in the top 3.', 'Quora', 'https://quora.example/f1', now(), 'Answer it', null, null, null, 'easy', 'medium', 2, null),
  ('69000000-0000-4000-8000-0000000000b2', '49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 'other', 'listing', 'f-later', 'A listing with old fees.', 'collegeguide.example', 'https://collegeguide.example/f', now(), 'Update it', null, null, null, 'easy', 'medium', 5, null),
  ('69000000-0000-4000-8000-0000000000b3', '49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 'people', 'good', 'f-good', 'A student likes the campus.', 'Reddit', 'https://reddit.example/f2', now(), null, null, null, null, null, null, null, null),
  ('69000000-0000-4000-8000-0000000000e1', '49000000-0000-4000-8000-0000000000e1', '29000000-0000-4000-8000-00000000000e', 'people', 'bad', 'r-top', 'A complaint about fees.', 'Reddit', 'https://reddit.example/r1', now(), 'Reply to the thread', 'Students read it.', array['Reply within a day.'], '{"kind": "text", "title": "A reply", "text": "Thank you."}', 'easy', 'high', 2, null),
  ('69000000-0000-4000-8000-0000000000e2', '49000000-0000-4000-8000-0000000000e1', '29000000-0000-4000-8000-00000000000e', 'other', 'listing', 'r-later', 'A listing with old fees.', 'collegeguide.example', 'https://collegeguide.example/r', now(), 'Update it', 'Parents compare here.', array['Write to the site.'], null, 'easy', 'medium', 5, null),
  ('69000000-0000-4000-8000-0000000000e3', '49000000-0000-4000-8000-0000000000e1', '29000000-0000-4000-8000-00000000000e', 'other', 'news', 'r-out', 'A story about another college.', 'news.example', 'https://news.example/r', now(), null, null, null, null, null, null, null, now());

-- Marked done before the waiting Audit ran, so Approve and send checks it.
insert into public.done_marks (institution_id, check_key, marked_by, marked_at) values
  ('29000000-0000-4000-8000-00000000000a', 'easy_enquiry', '19000000-0000-4000-8000-000000000001', now() - interval '2 days');

insert into public.share_links (token, institution_id, audit_id, created_at, expires_at)
values ('reviewtestreviewtestreviewtest01', '29000000-0000-4000-8000-00000000000e', '49000000-0000-4000-8000-0000000000e1', now() - interval '1 day', now() + interval '89 days');

-- The college while a new Audit waits ------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select trigger::text, first from public.audit_waiting('29000000-0000-4000-8000-00000000000a')$$,
  $$values ('manual', false)$$,
  'The college learns a new Audit waits for review, and that it is not its first'
);
select is_empty($$select * from public.audit_waiting('29000000-0000-4000-8000-00000000000b')$$, 'Never about another college');
select results_eq(
  $$select place::text, found, to_fix from public.findings_teaser('29000000-0000-4000-8000-00000000000a') order by place::text$$,
  $$values ('people', 2, 1)$$,
  'Counts of what each place holds, from the approved Audit, never a finding taken out'
);

-- Marks done, on findings too -------------------------------------------------------------------------
select isnt(public.mark_done('29000000-0000-4000-8000-00000000000a', p_finding => 'p-complaint'), null, 'The owner marks a finding done');
select is(
  public.mark_done('29000000-0000-4000-8000-00000000000a', p_finding => 'p-complaint'),
  (select id from public.done_marks where finding_key = 'p-complaint' and checked_by_audit is null),
  'Marking it again changes nothing'
);
select throws_ok($$select public.mark_done('29000000-0000-4000-8000-00000000000a', p_finding => 'p-good')$$, 'P0001', 'nothing_to_fix', 'A finding with nothing to do cannot be marked');
select throws_ok($$select public.mark_done('29000000-0000-4000-8000-00000000000a', p_finding => 'p-new')$$, 'P0001', 'nothing_to_fix', 'Nor one from the Audit still waiting for review');
select lives_ok($$select public.undo_done('29000000-0000-4000-8000-00000000000a', p_finding => 'p-complaint')$$, 'The owner takes a mark back');
select is((select count(*)::int from public.done_marks where finding_key = 'p-complaint'), 0, 'And it is gone');

-- Let AdmitLabs fix this --------------------------------------------------------------------------------
select isnt(public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'check:easy_enquiry', 'Make it one tap to enquire'), null, 'The owner asks AdmitLabs to fix a check');
select is(
  public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'check:easy_enquiry', 'Make it one tap to enquire'),
  (select asked_at from public.open_fix_asks('29000000-0000-4000-8000-00000000000a') where fix_key = 'check:easy_enquiry'),
  'Asking again sends nothing new: it says when the open request was sent'
);
select isnt(public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'finding:p-complaint', 'Reply to the thread'), null, 'Or a finding');
select is((select count(*)::int from public.open_fix_asks('29000000-0000-4000-8000-00000000000a')), 2, 'One open request per fix');
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'check:fees_shown', 'Show your fees')$$, 'P0001', 'nothing_to_fix', 'Not a Strong check');
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'finding:p-good', 'Thank them')$$, 'P0001', 'nothing_to_fix', 'Not a finding with nothing to do');
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'check:easy_enquiry', '  ')$$, '22023', 'bad_title', 'A request names the fix');
select is_empty($$select * from public.open_paid_ask('29000000-0000-4000-8000-00000000000a')$$, 'A request to fix something is not a request for Paid');
select throws_ok($$select public.record_review('{"audit_id": "49000000-0000-4000-8000-0000000000a2"}'::jsonb)$$, '42501', 'not_allowed', 'A college cannot change a review');
select throws_ok($$select public.approve_audit('49000000-0000-4000-8000-0000000000a2', 'Ready', '/')$$, '42501', 'not_allowed', 'Nor approve one');

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000a', 'finding:p-complaint', 'Reply to the thread')$$, '42501', 'not_owner', 'Only the owner asks');
select is((select count(*)::int from public.open_fix_asks('29000000-0000-4000-8000-00000000000a')), 2, 'Members see what was asked');

-- Free asks about the fixes it sees: its top 3 ---------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select isnt(public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000b', 'check:fees_shown', 'Show your full BBA fees'), null, 'Free asks about a check in its top 3');
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000b', 'check:approvals', 'Show your approvals')$$, 'P0001', 'nothing_to_fix', 'Not one beyond its top 3');
select isnt(public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000b', 'finding:f-top', 'Answer it'), null, 'A finding in its top 3');
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000b', 'finding:f-later', 'Update it')$$, 'P0001', 'nothing_to_fix', 'Not a finding beyond its top 3');
select results_eq(
  $$select place::text, found, to_fix from public.findings_teaser('29000000-0000-4000-8000-00000000000b') order by place::text$$,
  $$values ('other', 1, 1), ('people', 2, 1)$$,
  'Free sees how much each place holds, counts only'
);

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok($$select public.ask_admitlabs_fix('29000000-0000-4000-8000-00000000000c', 'check:easy_enquiry', 'Make it one tap to enquire')$$, 'P0001', 'team_works_on_it', 'A Client asks for nothing: the team already works on it');

-- A first Audit waiting -------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select results_eq(
  $$select trigger::text, first from public.audit_waiting('29000000-0000-4000-8000-00000000000d')$$,
  $$values ('signup', true)$$,
  'A new sign up learns its first Audit is being checked'
);
select is((select count(*)::int from public.audits where institution_id = '29000000-0000-4000-8000-00000000000d'), 0, 'Nothing of it shows until it is approved');

-- The team's review --------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select throws_ok($$select public.record_review('{"audit_id": "49000000-0000-4000-8000-0000000000a1"}'::jsonb)$$, 'P0001', 'not_waiting', 'An approved Audit is not changed');
select lives_ok(
  $$select public.record_review(jsonb_build_object(
    'audit_id', '49000000-0000-4000-8000-0000000000a2',
    'scores', jsonb_build_object('overall', 70, 'discovered', 62, 'trusted', 62, 'chosen', 80, 'overall_change', 10, 'discovered_change', 2, 'trusted_change', 2, 'chosen_change', 20),
    'checks', jsonb_build_array(jsonb_build_object('id', '59000000-0000-4000-8000-0000000000a3', 'result', 'okay', 'points_awarded', 12, 'strength_rank', null, 'fix_rank', 1, 'team_checked', true)),
    'details', jsonb_build_array(jsonb_build_object('audit_check_id', '59000000-0000-4000-8000-0000000000a3', 'finding', 'A WhatsApp button is on every page.')),
    'findings', jsonb_build_array(jsonb_build_object('id', '69000000-0000-4000-8000-0000000000a4', 'line', 'A question about hostels nobody answered.', 'fix_rank', 2)),
    'edits', jsonb_build_array(jsonb_build_object('what', 'result', 'target', 'check:easy_enquiry:institution', 'before', 'weak', 'after', 'okay', 'reason', 'The button is on every page.'))
  ))$$,
  'The team fixes a result and a line'
);
select results_eq(
  $$select a.overall::int, c.result::text, c.team_checked_at is not null, d.finding
    from public.audits a join public.audit_checks c on c.audit_id = a.id join public.audit_check_details d on d.audit_check_id = c.id
    where a.id = '49000000-0000-4000-8000-0000000000a2'$$,
  $$values (70, 'okay', true, 'A WhatsApp button is on every page.')$$,
  'The score, the result and the line change, and the result reads checked by the team'
);
select is((select line from public.audit_findings where id = '69000000-0000-4000-8000-0000000000a4'), 'A question about hostels nobody answered.', 'A finding''s line changes');
select results_eq(
  $$select what::text, target, before, after, reason, edited_by from public.audit_edits where audit_id = '49000000-0000-4000-8000-0000000000a2'$$,
  $$values ('result', 'check:easy_enquiry:institution', 'weak', 'okay', 'The button is on every page.', '19000000-0000-4000-8000-000000000006'::uuid)$$,
  'Every change is kept, with who made it'
);
select lives_ok(
  $$select public.record_review(jsonb_build_object(
    'audit_id', '49000000-0000-4000-8000-0000000000a2',
    'findings', jsonb_build_array(jsonb_build_object('id', '69000000-0000-4000-8000-0000000000a4', 'removed', true, 'fix_rank', null)),
    'edits', jsonb_build_array(jsonb_build_object('what', 'finding_removed', 'target', 'finding:p-new', 'before', 'A question about hostels nobody answered.', 'after', null, 'reason', 'Another college.'))
  ))$$,
  'The team takes out a finding'
);
select results_eq(
  $$select removed_at is not null, removed_by, fix_rank from public.audit_findings where id = '69000000-0000-4000-8000-0000000000a4'$$,
  $$values (true, '19000000-0000-4000-8000-000000000006'::uuid, null::smallint)$$,
  'It is kept, taken out, with who took it out'
);

-- Approve and send ---------------------------------------------------------------------------------------------
select lives_ok($$select public.approve_audit('49000000-0000-4000-8000-0000000000a2', 'Your new Audit is ready. See what changed.', '/#changed')$$, 'The team approves and sends');
select results_eq(
  $$select review::text, approved_by, approved_at is not null from public.audits where id = '49000000-0000-4000-8000-0000000000a2'$$,
  $$values ('approved', '19000000-0000-4000-8000-000000000006'::uuid, true)$$,
  'The Audit is approved, by whom and when'
);
select results_eq(
  $$select text, link from public.notifications where institution_id = '29000000-0000-4000-8000-00000000000a' and kind = 'audit_ready'$$,
  $$values ('Your new Audit is ready. See what changed.', '/#changed')$$,
  'The college hears it is ready'
);
select is((select checked_by_audit from public.done_marks where check_key = 'easy_enquiry' and institution_id = '29000000-0000-4000-8000-00000000000a'), '49000000-0000-4000-8000-0000000000a2'::uuid, 'The marks done before it ran are checked');
select throws_ok($$select public.approve_audit('49000000-0000-4000-8000-0000000000a2', 'Again', '/')$$, 'P0001', 'not_waiting', 'Approving twice changes nothing');

select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_findings where audit_id = '49000000-0000-4000-8000-0000000000a2'), 0, 'The college never sees the finding the team took out');
select is_empty($$select * from public.audit_waiting('29000000-0000-4000-8000-00000000000a')$$, 'And nothing waits any more');

-- The shared Audit ----------------------------------------------------------------------------------------------
reset role;
set local role anon;
select is(
  (select jsonb_agg(f ->> 'findingKey' order by f ->> 'findingKey') from jsonb_array_elements(public.shared_audit('reviewtestreviewtestreviewtest01') -> 'findings') f),
  '["r-later", "r-top"]'::jsonb,
  'A shared Audit shows what was found, never a finding taken out'
);
select results_eq(
  $$select f ->> 'findingKey', f ->> 'fixTitle', jsonb_typeof(f -> 'fixSteps'), jsonb_typeof(f -> 'readyFix'), f ->> 'fixWhy'
    from jsonb_array_elements(public.shared_audit('reviewtestreviewtestreviewtest01') -> 'findings') f order by 1$$,
  $$values ('r-later', 'Update it', 'null', 'null', null), ('r-top', 'Reply to the thread', 'array', 'object', 'Students read it.')$$,
  'How to fix a finding only for the top 3, its name for every one'
);
select results_eq(
  $$select c ->> 'key', c ->> 'fixTitle', jsonb_typeof(c -> 'fixSteps'), jsonb_typeof(c -> 'readyFix'), c ->> 'whyItMatters'
    from jsonb_array_elements(public.shared_audit('reviewtestreviewtestreviewtest01') -> 'checks') c order by 1$$,
  $$values ('easy_enquiry', null, 'null', 'null', null), ('fees_shown', 'Show the BBA fee for each year', 'array', 'object', 'Fees are the first thing parents check.')$$,
  'And for a check'
);

select * from finish();
rollback;

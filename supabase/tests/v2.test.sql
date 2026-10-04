-- Version 2 data rules (spec sections 16, 23, 24 and 25), enforced in the database. Run with
-- `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   P: college on Paid. owner-p. An approved Audit, and a newer one waiting for the team's review.
--      Tracks R. A waiting report and an approved one.
--   F: college on Free. owner-f. An approved Free Audit with findings ranked 2 and 5.
--   C: skilling institute, an AdmitLabs Client. owner-c. A tracking link, an enquiry, lead settings.
--   R: a rival record with a rival Audit.
--   Team: team-v.

begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('18000000-0000-4000-8000-000000000001', 'owner-p@v2.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000002', 'owner-f@v2.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000003', 'owner-c@v2.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000004', 'team-v@v2.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('18000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('28000000-0000-4000-8000-00000000000a', 'v2-p', 'V2 Paid', 'college', 'Guwahati', 'Assam', 'https://v2-p.example'),
  ('28000000-0000-4000-8000-00000000000b', 'v2-f', 'V2 Free', 'college', 'Guwahati', 'Assam', 'https://v2-f.example'),
  ('28000000-0000-4000-8000-00000000000c', 'v2-c', 'V2 Client', 'skilling', 'Guwahati', 'Assam', 'https://v2-c.example'),
  ('28000000-0000-4000-8000-00000000000d', 'v2-r', 'V2 Rival', 'college', 'Guwahati', 'Assam', 'https://v2-r.example');

insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('28000000-0000-4000-8000-00000000000a', true, now() - interval '90 days'),
  ('28000000-0000-4000-8000-00000000000b', true, now() - interval '90 days'),
  ('28000000-0000-4000-8000-00000000000c', true, now() - interval '90 days'),
  ('28000000-0000-4000-8000-00000000000d', false, null);

insert into public.programs (id, institution_id, name, program_key) values
  ('38000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', 'BBA', 'bba'),
  ('38000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', 'BBA', 'bba'),
  ('38000000-0000-4000-8000-0000000000c1', '28000000-0000-4000-8000-00000000000c', 'Data Analytics', 'data-analytics');

insert into public.memberships (user_id, institution_id, role) values
  ('18000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-00000000000a', 'owner'),
  ('18000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-00000000000b', 'owner'),
  ('18000000-0000-4000-8000-000000000003', '28000000-0000-4000-8000-00000000000c', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('28000000-0000-4000-8000-00000000000a', 'paid', now() - interval '90 days', now() + interval '90 days', null),
  ('28000000-0000-4000-8000-00000000000b', 'free', now() - interval '90 days', null, '38000000-0000-4000-8000-0000000000b1'),
  ('28000000-0000-4000-8000-00000000000c', 'client', now() - interval '90 days', null, null);

insert into public.rivals (institution_id, rival_institution_id, suggested, added_at) values
  ('28000000-0000-4000-8000-00000000000a', '28000000-0000-4000-8000-00000000000d', true, now() - interval '60 days');

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version, review, approved_at) values
  ('48000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', now() - interval '20 days', 'paid', 'scheduled', 60, 60, 60, 60, 1, 'approved', now() - interval '20 days'),
  ('48000000-0000-4000-8000-0000000000a2', '28000000-0000-4000-8000-00000000000a', now() - interval '1 day', 'paid', 'manual', 62, 62, 62, 62, 1, 'waiting', null),
  ('48000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', now() - interval '10 days', 'free', 'signup', 45, 45, 45, 45, 1, 'approved', now() - interval '10 days'),
  ('48000000-0000-4000-8000-0000000000d1', '28000000-0000-4000-8000-00000000000d', now() - interval '10 days', 'rival', 'scheduled', 70, 70, 70, 70, 1, 'approved', now() - interval '10 days');

insert into public.audit_checks (id, audit_id, program_id, pillar, check_key, result, points_awarded, points_max, fix_rank, checked_at) values
  ('58000000-0000-4000-8000-0000000000a1', '48000000-0000-4000-8000-0000000000a2', null, 'chosen', 'easy_enquiry', 'weak', 6, 20, 1, now());

insert into public.audit_findings (audit_id, institution_id, place, kind, finding_key, line, source_name, source_url, checked_at, fix_title, effort, impact, fix_rank, removed_at) values
  ('48000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', 'people', 'bad', 'p-complaint', 'Three students say the hostel fee went up.', 'Reddit', 'https://reddit.example/p', now(), 'Reply to the thread', 'easy', 'high', 1, null),
  ('48000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', 'people', 'good', 'p-praise', 'A student likes the faculty.', 'Reddit', 'https://reddit.example/p2', now(), null, null, null, null, null),
  ('48000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', 'other', 'news', 'p-not-ours', 'A story about another college.', 'news.example', 'https://news.example/x', now(), null, null, null, null, now()),
  ('48000000-0000-4000-8000-0000000000a2', '28000000-0000-4000-8000-00000000000a', 'people', 'unanswered', 'p-waiting', 'A question nobody answered.', 'Quora', 'https://quora.example/p', now(), 'Answer it', 'easy', 'medium', 2, null),
  ('48000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', 'people', 'unanswered', 'f-top', 'A question in the top 3.', 'Quora', 'https://quora.example/f1', now(), 'Answer it', 'easy', 'medium', 2, null),
  ('48000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', 'other', 'listing', 'f-later', 'A listing with old fees.', 'collegeguide.example', 'https://collegeguide.example/f', now(), 'Update it', 'easy', 'medium', 5, null),
  ('48000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', 'people', 'good', 'f-good', 'A student likes the campus.', 'Reddit', 'https://reddit.example/f2', now(), null, null, null, null, null),
  ('48000000-0000-4000-8000-0000000000d1', '28000000-0000-4000-8000-00000000000d', 'people', 'good', 'r-good', 'Students praise the placements.', 'Reddit', 'https://reddit.example/r', now(), null, null, null, null, null);

insert into public.audit_edits (audit_id, what, target, before, after, reason, edited_by) values
  ('48000000-0000-4000-8000-0000000000a2', 'result', 'check:easy_enquiry', 'weak', 'okay', 'The button is on every page.', '18000000-0000-4000-8000-000000000004');

insert into public.content_picks (institution_id, month, rank, program_id, idea) values
  ('28000000-0000-4000-8000-00000000000b', '2026-09-01', 1, '38000000-0000-4000-8000-0000000000b1', '{"title": "One"}'),
  ('28000000-0000-4000-8000-00000000000b', '2026-09-01', 2, '38000000-0000-4000-8000-0000000000b1', '{"title": "Two"}'),
  ('28000000-0000-4000-8000-00000000000b', '2026-09-01', 3, '38000000-0000-4000-8000-0000000000b1', '{"title": "Three"}'),
  ('28000000-0000-4000-8000-00000000000a', '2026-09-01', 1, '38000000-0000-4000-8000-0000000000a1', '{"title": "One"}'),
  ('28000000-0000-4000-8000-00000000000a', '2026-09-01', 2, '38000000-0000-4000-8000-0000000000a1', '{"title": "Two"}'),
  ('28000000-0000-4000-8000-00000000000a', '2026-09-01', 3, '38000000-0000-4000-8000-0000000000a1', '{"title": "Three"}');

insert into public.lead_links (id, institution_id, program_id, code, name, used_on, created_by) values
  ('68000000-0000-4000-8000-0000000000c1', '28000000-0000-4000-8000-00000000000c', '38000000-0000-4000-8000-0000000000c1', 'v2link01', 'Instagram bio', 'instagram', '18000000-0000-4000-8000-000000000004');
insert into public.leads (institution_id, link_id, program_id, name, phone, email, city, consent) values
  ('28000000-0000-4000-8000-00000000000c', '68000000-0000-4000-8000-0000000000c1', '38000000-0000-4000-8000-0000000000c1', 'Ankita Kalita', '+910000010001', 'ankita@mail.example', 'Guwahati', 'Your details go to V2 Client so they can contact you about admission.');
insert into public.lead_settings (institution_id, alert_emails, keep_months) values
  ('28000000-0000-4000-8000-00000000000c', array['owner-c@v2.test'], 12);
insert into public.email_log (kind, institution_id, recipient, sender, ok) values
  ('lead_alert', '28000000-0000-4000-8000-00000000000c', 'owner-c@v2.test', 'Local test inbox', true);

insert into public.reports (institution_id, month, storage_path, review, approved_at) values
  ('28000000-0000-4000-8000-00000000000a', '2026-08-01', 'v2-p/2026-08.pdf', 'approved', now() - interval '30 days'),
  ('28000000-0000-4000-8000-00000000000a', '2026-09-01', 'v2-p/2026-09.pdf', 'waiting', null);

-- Review first: what the college sees -----------------------------------------------------------
select is(private.latest_own_audit('28000000-0000-4000-8000-00000000000a'), '48000000-0000-4000-8000-0000000000a1'::uuid, 'The latest own Audit is the latest approved one');

select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.audits where institution_id = '28000000-0000-4000-8000-00000000000a'), 1, 'Paid sees its approved Audit, not the one waiting for review');
select is((select count(*)::int from public.audit_checks where audit_id = '48000000-0000-4000-8000-0000000000a2'), 0, 'Nothing of the waiting Audit reaches the college');
select is((select count(*)::int from public.audit_findings where institution_id = '28000000-0000-4000-8000-00000000000a'), 2, 'Paid reads every finding of its approved Audit, except one the team took out');
select is((select count(*)::int from public.audit_findings where finding_key = 'p-not-ours'), 0, 'A finding taken out in a review never shows');
select is((select count(*)::int from public.audit_findings where finding_key = 'r-good'), 1, 'Paid reads what is said about a rival it tracks');
select is((select count(*)::int from public.audit_edits), 0, 'The college never reads the review changes');
select is((select count(*)::int from public.reports where institution_id = '28000000-0000-4000-8000-00000000000a'), 1, 'A report waiting for review does not show on Reports');
select is((select count(*)::int from public.content_picks where institution_id = '28000000-0000-4000-8000-00000000000a'), 3, 'Paid reads all of Make these 3');
select is((select count(*)::int from public.leads), 0, 'Another college never reads Leads');
select is((select count(*)::int from public.lead_links), 0, 'Another college never reads tracking links');
select is((select count(*)::int from public.email_log), 0, 'The email log is the team''s');

-- Free --------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
  (select array_agg(finding_key order by finding_key) from public.audit_findings where institution_id = '28000000-0000-4000-8000-00000000000b'),
  array['f-top'],
  'Free reads the findings among its top 3 fixes only'
);
select is((select count(*)::int from public.audit_findings where finding_key = 'r-good'), 0, 'Free reads nothing about a rival');
select is((select array_agg(rank order by rank) from public.content_picks where institution_id = '28000000-0000-4000-8000-00000000000b'), array[1::smallint], 'Free reads the first of Make these 3 only');

-- Client: its own Leads ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.leads), 1, 'The Client reads its own enquiries');
select is((select count(*)::int from public.lead_links), 1, 'The Client reads its own tracking links');
select is((select count(*)::int from public.lead_settings), 1, 'The Client reads its lead settings');

-- The team ------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.audits where id = '48000000-0000-4000-8000-0000000000a2'), 1, 'The team sees the Audit waiting for review');
select is((select count(*)::int from public.audit_findings where institution_id in ('28000000-0000-4000-8000-00000000000a', '28000000-0000-4000-8000-00000000000b')), 7, 'The team reads every finding, the waiting and the taken out too');
select is((select count(*)::int from public.audit_edits where audit_id = '48000000-0000-4000-8000-0000000000a2'), 1, 'The team reads every change made in a review');
select is((select count(*)::int from public.leads where institution_id = '28000000-0000-4000-8000-00000000000c'), 0, 'The team never reads a student''s details');
select is((select count(*)::int from public.lead_links where institution_id = '28000000-0000-4000-8000-00000000000c'), 1, 'The team reads the tracking links it made');
select is((select count(*)::int from public.email_log where institution_id = '28000000-0000-4000-8000-00000000000c'), 1, 'The team reads the email log');

reset role;

-- Saving: review, marks and alerts -------------------------------------------------------------------
insert into public.done_marks (institution_id, finding_key, marked_by, marked_at) values
  ('28000000-0000-4000-8000-00000000000a', 'p-complaint', '18000000-0000-4000-8000-000000000001', now() - interval '12 hours');

select lives_ok(
  $$select public.record_audit(jsonb_build_object(
    'institution_id', '28000000-0000-4000-8000-00000000000a', 'kind', 'paid', 'trigger', 'scheduled', 'run_at', now() - interval '2 hours',
    'overall', 63, 'discovered', 63, 'trusted', 63, 'chosen', 63, 'config_version', 1, 'review', 'waiting', 'programs', '[]'::jsonb, 'checks', '[]'::jsonb,
    'findings', jsonb_build_array(jsonb_build_object('place', 'people', 'kind', 'good', 'finding_key', 'p-new', 'line', 'New praise.', 'source_name', 'Reddit', 'source_url', 'https://reddit.example/new', 'checked_at', now())),
    'notification', jsonb_build_object('text', 'Your new Audit is ready. See what changed.', 'link', '/#changed')))$$,
  'A waiting Audit saves with its findings'
);
select is((select count(*)::int from public.notifications where institution_id = '28000000-0000-4000-8000-00000000000a' and kind = 'audit_ready'), 0, 'A waiting Audit tells nobody');
select is((select checked_by_audit from public.done_marks where finding_key = 'p-complaint'), null, 'A waiting Audit checks no marks');

select lives_ok(
  $$select public.record_audit(jsonb_build_object(
    'institution_id', '28000000-0000-4000-8000-00000000000a', 'kind', 'paid', 'trigger', 'scheduled', 'run_at', now() - interval '1 hour',
    'overall', 64, 'discovered', 64, 'trusted', 64, 'chosen', 64, 'config_version', 1, 'review', 'approved', 'programs', '[]'::jsonb, 'checks', '[]'::jsonb,
    'notification', jsonb_build_object('text', 'Your new Audit is ready. See what changed.', 'link', '/#changed')))$$,
  'An approved Audit saves'
);
select is((select count(*)::int from public.notifications where institution_id = '28000000-0000-4000-8000-00000000000a' and kind = 'audit_ready'), 1, 'An approved Audit says it is ready');
select isnt((select checked_by_audit from public.done_marks where finding_key = 'p-complaint'), null, 'An approved Audit checks the findings marked done before it');

select throws_ok(
  $$insert into public.audits (institution_id, run_at, kind, trigger, overall, discovered, trusted, chosen, config_version, review)
    values ('28000000-0000-4000-8000-00000000000d', now(), 'rival', 'scheduled', 1, 1, 1, 1, 1, 'waiting')$$,
  '23514', null,
  'Rival and team runs never wait for review'
);

select lives_ok(
  $$select public.record_rival_ad(jsonb_build_object('rival_institution_id', '28000000-0000-4000-8000-00000000000d', 'promise', 'Scholarships for early applicants.',
    'source_url', 'https://ads.example/v2', 'entered_by', '18000000-0000-4000-8000-000000000004', 'entered_at', now(),
    'description', 'Started ads: “Scholarships for early applicants.”', 'notice', 'V2 Rival started ads: “Scholarships for early applicants.”', 'notify', true))$$,
  'The team enters a rival''s ad'
);
select is((select count(*)::int from public.notifications where institution_id = '28000000-0000-4000-8000-00000000000a' and kind = 'rival_move'), 1, 'Its Paid tracker hears that the rival started ads');

-- Let AdmitLabs fix this ----------------------------------------------------------------------------
select throws_ok(
  $$insert into public.enquiries (kind, institution_id, asked_by, institution, email) values ('fix_request', '28000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-000000000001', 'V2 Paid', 'owner-p@v2.test')$$,
  '23514', null,
  'A request to fix something names the fix'
);
insert into public.enquiries (kind, institution_id, asked_by, institution, email, fix_key, fix_title)
values ('fix_request', '28000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-000000000001', 'V2 Paid', 'owner-p@v2.test', 'check:easy_enquiry', 'Make it one tap to enquire');
select throws_ok(
  $$insert into public.enquiries (kind, institution_id, asked_by, institution, email, fix_key, fix_title)
    values ('fix_request', '28000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-000000000001', 'V2 Paid', 'owner-p@v2.test', 'check:easy_enquiry', 'Make it one tap to enquire')$$,
  '23505', null,
  'One open request per fix'
);

select * from finish();
rollback;

-- The Client Brain (spec section 26), enforced in the database. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures:
--   C: a Client. owner-c, member-c.
--   P: Paid. owner-p.
--   E: a Client whose service ended (Free now). owner-e.
--   team: a team user.

begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('1b000000-0000-4000-8000-000000000001', 'owner-c@brain.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000002', 'member-c@brain.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000004', 'owner-p@brain.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000005', 'owner-e@brain.test', 'authenticated', 'authenticated'),
  ('1b000000-0000-4000-8000-000000000006', 'team@brain.test', 'authenticated', 'authenticated');

insert into public.team_users (user_id, role) values ('1b000000-0000-4000-8000-000000000006', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('2b000000-0000-4000-8000-00000000000c', 'brain-c', 'Brain C', 'college', 'Guwahati', 'Assam', 'https://brain-c.example'),
  ('2b000000-0000-4000-8000-00000000000a', 'brain-p', 'Brain P', 'college', 'Guwahati', 'Assam', 'https://brain-p.example'),
  ('2b000000-0000-4000-8000-00000000000e', 'brain-e', 'Brain E', 'college', 'Guwahati', 'Assam', 'https://brain-e.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('2b000000-0000-4000-8000-00000000000c', true, now() - interval '200 days', false),
  ('2b000000-0000-4000-8000-00000000000a', true, now() - interval '60 days', false),
  ('2b000000-0000-4000-8000-00000000000e', true, now() - interval '200 days', false);

insert into public.programs (id, institution_id, name, program_key) values
  ('3b000000-0000-4000-8000-00000000000c', '2b000000-0000-4000-8000-00000000000c', 'BBA', 'bba'),
  ('3b000000-0000-4000-8000-00000000000a', '2b000000-0000-4000-8000-00000000000a', 'BBA', 'bba');

insert into public.memberships (user_id, institution_id, role) values
  ('1b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-00000000000c', 'owner'),
  ('1b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-00000000000c', 'member'),
  ('1b000000-0000-4000-8000-000000000004', '2b000000-0000-4000-8000-00000000000a', 'owner'),
  ('1b000000-0000-4000-8000-000000000005', '2b000000-0000-4000-8000-00000000000e', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('2b000000-0000-4000-8000-00000000000c', 'client', now() - interval '200 days', null),
  ('2b000000-0000-4000-8000-00000000000a', 'paid', now() - interval '60 days', now() + interval '30 days'),
  ('2b000000-0000-4000-8000-00000000000e', 'client', now() - interval '200 days', now() - interval '5 days');

-- E had a Brain while it was a Client.
insert into public.brains (institution_id, started_by) values ('2b000000-0000-4000-8000-00000000000e', '1b000000-0000-4000-8000-000000000006');
insert into public.brain_items (institution_id, kind, fields, source) values ('2b000000-0000-4000-8000-00000000000e', 'tagline', '{"text": "Before it ended"}', 'team');

-- Before onboarding: nobody at the college changes anything -------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'tagline', '{"text": "Learn here"}')$$,
  '42501', null, 'Before onboarding starts, the college cannot write to a Brain'
);
select throws_ok($$select public.start_brain('2b000000-0000-4000-8000-00000000000c')$$, '42501', null, 'Only the team starts onboarding');
reset role;

-- The team starts it ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.start_brain('2b000000-0000-4000-8000-00000000000a')$$, 'P0001', 'not_client', 'Only a Client has a Brain: not Paid');
select is(public.start_brain('2b000000-0000-4000-8000-00000000000c'), true, 'The team starts onboarding for a Client');
select is(public.start_brain('2b000000-0000-4000-8000-00000000000c'), false, 'Starting again changes nothing');
select is(
  public.add_found_brain_items('2b000000-0000-4000-8000-00000000000c', '[
    {"kind": "found", "fields": {"target": "program:3b000000-0000-4000-8000-00000000000c:fees", "label": "BBA fees", "value": "₹92,000 a year", "feesAmount": 92000, "feesPeriod": "year", "pageUrl": null, "approvals": null}, "source_url": "https://brain-c.example/bba", "found_at": "2026-10-01T05:00:00Z"},
    {"kind": "link", "fields": {"type": "other", "label": "listing.example", "url": "https://listing.example/brain-c", "shared": false}, "source_url": "https://listing.example/brain-c", "found_at": "2026-10-01T05:00:00Z"}
  ]'),
  2,
  'What Drishti found waits for the team to confirm'
);
select throws_ok(
  $$select public.add_found_brain_items('2b000000-0000-4000-8000-00000000000c', '[{"kind": "tagline", "fields": {"text": "x"}}]')$$,
  '22023', 'bad_kind', 'Drishti only pre-fills facts it can find'
);
select is((select count(*)::int from public.brain_items where institution_id = '2b000000-0000-4000-8000-00000000000c' and to_confirm), 2, 'The team sees what Drishti found');
select is((select by from public.brain_changes where target = 'brain' and institution_id = '2b000000-0000-4000-8000-00000000000c'), '1b000000-0000-4000-8000-000000000006'::uuid, 'History says who started onboarding');
reset role;

-- The college's people read and change it, and see only what is confirmed -------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_items where institution_id = '2b000000-0000-4000-8000-00000000000c'), 0, 'A member does not see what Drishti found until the team confirms it');
select isnt(
  public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'tagline', '{"text": "Learn here. Lead anywhere."}'),
  null,
  'A member adds a fact'
);
select lives_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'tagline', '{"text": "Learn here."}')$$,
  'Saving a single kind again replaces it'
);
select is((select count(*)::int from public.brain_items where kind = 'tagline' and institution_id = '2b000000-0000-4000-8000-00000000000c'), 1, 'There is one tagline');
select is((select fields ->> 'text' from public.brain_items where kind = 'tagline' and institution_id = '2b000000-0000-4000-8000-00000000000c'), 'Learn here.', 'It is the new one');
select is((select source::text from public.brain_items where kind = 'tagline' and institution_id = '2b000000-0000-4000-8000-00000000000c'), 'college', 'Saved by the college');
select is(
  (select array_agg(what order by at, what) from public.brain_changes where institution_id = '2b000000-0000-4000-8000-00000000000c' and kind = 'tagline'),
  array['added', 'changed'],
  'History keeps the fact added, then changed'
);
select is(
  (select by from public.brain_changes where institution_id = '2b000000-0000-4000-8000-00000000000c' and kind = 'tagline' and what = 'changed'),
  '1b000000-0000-4000-8000-000000000002'::uuid,
  'and who changed it'
);
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'link', '{"type": "other", "label": "Instagram", "url": "https://instagram.example", "note": "password: Bright@2026", "shared": false}')$$,
  '22023', 'looks_like_login', 'No passwords: a login is refused, however deep'
);
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'link', '{"type": "other", "label": "Portal", "url": "https://name:secret@portal.example", "shared": false}')$$,
  '22023', 'looks_like_login', 'nor a link with a password in it'
);
select lives_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'note', '{"type": "note", "title": null, "body": "The admission portal login page is linked from the home page.", "on": null, "link": null}')$$,
  'The word login alone is fine'
);
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'alumnus', '{"name": "Priya", "line": "Call her on +91 98765 43210", "program": null, "link": null}')$$,
  '22023', 'student_contact', 'No student contact details in Proof'
);
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'found', '{"target": "x"}')$$,
  '22023', 'bad_kind', 'Nobody writes what Drishti found'
);
-- The details added by you: a Client's member changes them too.
select lives_ok(
  $$insert into public.program_details (program_id, institution_id, fees_amount, fees_period, updated_by)
    values ('3b000000-0000-4000-8000-00000000000c', '2b000000-0000-4000-8000-00000000000c', 92000, 'year', '1b000000-0000-4000-8000-000000000002')$$,
  'A Client''s member adds a program''s fees'
);
select ok(
  exists (select 1 from public.brain_checks where institution_id = '2b000000-0000-4000-8000-00000000000c' and fact = 'program:3b000000-0000-4000-8000-00000000000c:fees'),
  'Changing the fees says when they were last checked'
);
select is(
  (select what from public.brain_changes where institution_id = '2b000000-0000-4000-8000-00000000000c' and target = 'program:3b000000-0000-4000-8000-00000000000c'),
  'added',
  'and History keeps the change'
);
select lives_ok(
  $$select public.check_brain_fact('2b000000-0000-4000-8000-00000000000c', 'program:3b000000-0000-4000-8000-00000000000c:fees')$$,
  'Still right: a fact checked with no change'
);
select throws_ok(
  $$select public.check_brain_fact('2b000000-0000-4000-8000-00000000000c', 'program:3b000000-0000-4000-8000-00000000000a:fees')$$,
  '22023', 'bad_program', 'Only for the college''s own programs'
);
select throws_ok($$select public.set_brain_step('2b000000-0000-4000-8000-00000000000c', 'brand_kit', true)$$, '42501', null, 'The college does not tick the team''s checklist');
reset role;

-- Paid has no Brain, even for its own details ---------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brains), 0, 'Paid reads no Brain');
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000a', null, 'tagline', '{"text": "x"}')$$,
  '42501', null, 'and writes none'
);
reset role;

-- The team: what Drishti found, the checklist and Ready ------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.confirm_brain_item((select id from public.brain_items where kind = 'link' and institution_id = '2b000000-0000-4000-8000-00000000000c'))$$,
  'The team confirms a listing Drishti found'
);
select ok(
  exists (select 1 from public.brain_changes where kind = 'link' and what = 'confirmed' and institution_id = '2b000000-0000-4000-8000-00000000000c'),
  'History says it was confirmed'
);
select lives_ok(
  $$select public.close_found_item((select id from public.brain_items where kind = 'found' and institution_id = '2b000000-0000-4000-8000-00000000000c'), 'corrected')$$,
  'The team closes a found fee once it is corrected in the details'
);
select ok(
  exists (select 1 from public.brain_changes where kind = 'found' and what = 'corrected' and institution_id = '2b000000-0000-4000-8000-00000000000c'),
  'History says how it was closed'
);
select throws_ok($$select public.set_brain_step('2b000000-0000-4000-8000-00000000000c', 'drive_shared', true)$$, 'P0001', 'step_needs_fact', 'Drive folder shared needs a Drive folder in the Brain');
select lives_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'link', '{"type": "drive", "label": null, "url": "https://drive.example/c", "shared": true}')$$,
  'The team adds the shared folder'
);
select lives_ok($$select public.set_brain_step('2b000000-0000-4000-8000-00000000000c', 'drive_shared', true)$$, 'and ticks the step');
select throws_ok($$select public.mark_brain_ready('2b000000-0000-4000-8000-00000000000c')$$, 'P0001', 'checklist_open', 'Ready waits for the whole checklist');
select lives_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'contact', '{"role": "approver", "name": "Meera", "title": null, "phone": null, "email": null, "best": null, "approves": "Reels"}');
    select public.save_brain_item('2b000000-0000-4000-8000-00000000000c', null, 'plan', '{"month": "2026-10", "link": null, "status": "agreed", "agreedBy": "Meera", "note": null}');
    select public.set_brain_step('2b000000-0000-4000-8000-00000000000c', step, true) from unnest(enum_range(null::public.brain_step)) as step$$,
  'The checklist done'
);
select lives_ok($$select public.mark_brain_ready('2b000000-0000-4000-8000-00000000000c')$$, 'The team marks it Ready');
select is((select status::text from public.brains where institution_id = '2b000000-0000-4000-8000-00000000000c'), 'ready', 'It is Ready');
select is((select count(*)::int from public.notifications where institution_id = '2b000000-0000-4000-8000-00000000000c' and kind = 'brain_ready'), 1, 'The college hears "Your Brain is ready"');
insert into public.notes (institution_id, author_id, body) values ('2b000000-0000-4000-8000-00000000000c', '1b000000-0000-4000-8000-000000000006', 'Meera decides fast on WhatsApp.');
select is((select count(*)::int from public.brain_changes where institution_id = '2b000000-0000-4000-8000-00000000000c' and team_only), 1, 'A team note is kept in History as team only');
reset role;

select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_changes where institution_id = '2b000000-0000-4000-8000-00000000000c' and team_only), 0, 'The college never sees the team''s notes, in History either');
reset role;

-- A Client that ended ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_items), 0, 'A college whose service ended no longer sees its Brain');
reset role;
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_items where institution_id = '2b000000-0000-4000-8000-00000000000e'), 1, 'The team still reads it');
select throws_ok(
  $$select public.save_brain_item('2b000000-0000-4000-8000-00000000000e', null, 'tagline', '{"text": "After it ended"}')$$,
  '42501', null, 'and nobody changes it'
);
reset role;

-- Names ------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.set_my_name('  Anjali   Das ');
select is((select name from public.person_names where user_id = '1b000000-0000-4000-8000-000000000002'), 'Anjali Das', 'Each person sets their own name, tidied');
reset role;
select set_config('request.jwt.claims', '{"sub":"1b000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.person_names where user_id = '1b000000-0000-4000-8000-000000000002'), 0, 'Someone at another college does not see it');
reset role;

select * from finish();
rollback;

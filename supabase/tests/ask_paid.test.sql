-- Product review part 5: asking AdmitLabs for Paid from the dashboard (C2), and the team list by
-- the reason an institution needs attention (B8), enforced in the database. Run with
-- `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   F: Free, signed up, no rivals. owner-f, member-f.
--   P: Paid ending in 10 days, with a rival. owner-p.
--   L: Paid ending in 120 days, with a rival. owner-l.
--   C: Client, with a rival, no Audit run by the team. owner-c.
--   S: Free, with a rival, its latest Audit down 5.
--   X: a prospect whose team Audit was shared 10 days ago.
--   R: a rival record.

begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into auth.users (id, email, aud, role) values
  ('18000000-0000-4000-8000-000000000001', 'owner-f@ask.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000002', 'member-f@ask.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000003', 'owner-p@ask.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000004', 'owner-l@ask.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000005', 'owner-c@ask.test', 'authenticated', 'authenticated'),
  ('18000000-0000-4000-8000-000000000006', 'team@ask.test', 'authenticated', 'authenticated');

insert into public.team_users (user_id, role) values ('18000000-0000-4000-8000-000000000006', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('28000000-0000-4000-8000-00000000000f', 'ask-f', 'Ask F', 'college', 'Guwahati', 'Assam', 'https://ask-f.example'),
  ('28000000-0000-4000-8000-00000000000a', 'ask-p', 'Ask P', 'college', 'Guwahati', 'Assam', 'https://ask-p.example'),
  ('28000000-0000-4000-8000-00000000000b', 'ask-l', 'Ask L', 'college', 'Guwahati', 'Assam', 'https://ask-l.example'),
  ('28000000-0000-4000-8000-00000000000c', 'ask-c', 'Ask C', 'college', 'Guwahati', 'Assam', 'https://ask-c.example'),
  ('28000000-0000-4000-8000-00000000000d', 'ask-s', 'Ask S', 'college', 'Guwahati', 'Assam', 'https://ask-s.example'),
  ('28000000-0000-4000-8000-00000000000e', 'ask-x', 'Ask X', 'college', 'Guwahati', 'Assam', 'https://ask-x.example'),
  ('28000000-0000-4000-8000-000000000010', 'ask-r', 'Ask R', 'college', 'Guwahati', 'Assam', 'https://ask-r.example');

insert into public.institution_status (institution_id, claimed, claimed_at, is_prospect) values
  ('28000000-0000-4000-8000-00000000000f', true, now() - interval '60 days', false),
  ('28000000-0000-4000-8000-00000000000a', true, now() - interval '200 days', false),
  ('28000000-0000-4000-8000-00000000000b', true, now() - interval '60 days', false),
  ('28000000-0000-4000-8000-00000000000c', true, now() - interval '60 days', false),
  ('28000000-0000-4000-8000-00000000000d', true, now() - interval '60 days', false),
  ('28000000-0000-4000-8000-00000000000e', false, null, true);

insert into public.memberships (user_id, institution_id, role) values
  ('18000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-00000000000f', 'owner'),
  ('18000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-00000000000f', 'member'),
  ('18000000-0000-4000-8000-000000000003', '28000000-0000-4000-8000-00000000000a', 'owner'),
  ('18000000-0000-4000-8000-000000000004', '28000000-0000-4000-8000-00000000000b', 'owner'),
  ('18000000-0000-4000-8000-000000000005', '28000000-0000-4000-8000-00000000000c', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('28000000-0000-4000-8000-00000000000f', 'free', now() - interval '60 days', null),
  ('28000000-0000-4000-8000-00000000000a', 'paid', now() - interval '170 days', now() + interval '10 days'),
  ('28000000-0000-4000-8000-00000000000b', 'paid', now() - interval '60 days', now() + interval '120 days'),
  ('28000000-0000-4000-8000-00000000000c', 'client', now() - interval '60 days', null),
  ('28000000-0000-4000-8000-00000000000d', 'free', now() - interval '60 days', null);

insert into public.rivals (institution_id, rival_institution_id) values
  ('28000000-0000-4000-8000-00000000000a', '28000000-0000-4000-8000-000000000010'),
  ('28000000-0000-4000-8000-00000000000b', '28000000-0000-4000-8000-000000000010'),
  ('28000000-0000-4000-8000-00000000000c', '28000000-0000-4000-8000-000000000010'),
  ('28000000-0000-4000-8000-00000000000d', '28000000-0000-4000-8000-000000000010');

insert into public.audits (id, institution_id, run_at, kind, trigger, overall, overall_change, discovered, trusted, chosen, config_version) values
  ('48000000-0000-4000-8000-0000000000d1', '28000000-0000-4000-8000-00000000000d', now() - interval '5 days', 'free', 'scheduled', 40, -5, 40, 40, 40, 1),
  ('48000000-0000-4000-8000-0000000000c1', '28000000-0000-4000-8000-00000000000c', now() - interval '40 days', 'client', 'manual', 60, null, 60, 60, 60, 1),
  ('48000000-0000-4000-8000-0000000000e1', '28000000-0000-4000-8000-00000000000e', now() - interval '12 days', 'team', 'manual', 30, null, 30, 30, 30, 1);

insert into public.share_links (token, institution_id, audit_id, created_by, created_at, expires_at) values
  ('ask-x-token', '28000000-0000-4000-8000-00000000000e', '48000000-0000-4000-8000-0000000000e1', '18000000-0000-4000-8000-000000000006', now() - interval '10 days', now() + interval '80 days');

-- The rules match the app's ---------------------------------------------------------------
select is(private.continue_paid_days(), 31, 'Asking to continue opens with the first reminder, 30 days out (PLAN_RULES), and a day more');
select is(private.attention_score_drop(), 3, 'A drop of 3 needs attention (TEAM_RULES.attentionScoreDrop)');
select is(private.attention_follow_up_days(), 7, 'A week after sharing (TEAM_RULES.followUpAfterDays)');

-- A Free owner asks for Paid ---------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$select public.ask_for_paid('28000000-0000-4000-8000-00000000000f')$$, 'The owner on Free asks for Paid');
select is(
  public.ask_for_paid('28000000-0000-4000-8000-00000000000f'),
  (select asked_at from public.open_paid_ask('28000000-0000-4000-8000-00000000000f')),
  'Asking again while it is open sends nothing new: the first time comes back'
);
select is((select kind::text from public.open_paid_ask('28000000-0000-4000-8000-00000000000f')), 'ask_paid', 'It is a request for Paid');
select is((select count(*)::int from public.enquiries), 0, 'An institution never reads Enquiries itself');
reset role;

select is(
  (select count(*)::int from public.enquiries where institution_id = '28000000-0000-4000-8000-00000000000f'),
  1,
  'One open request, however many clicks'
);
select is(
  (select email from public.enquiries where institution_id = '28000000-0000-4000-8000-00000000000f'),
  'owner-f@ask.test',
  'It carries the owner''s email, for the team to write back'
);

-- A member sees it, but only the owner asks -------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select kind::text from public.open_paid_ask('28000000-0000-4000-8000-00000000000f')), 'ask_paid', 'A member sees the open request');
select throws_ok($$select public.ask_for_paid('28000000-0000-4000-8000-00000000000f')$$, '42501', 'not_allowed', 'A member cannot ask');
select is((select count(*)::int from public.open_paid_ask('28000000-0000-4000-8000-00000000000a')), 0, 'Nobody sees another institution''s request');
reset role;

-- Paid near its end asks to continue; earlier Paid and Client have nothing to ask -------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.ask_for_paid('28000000-0000-4000-8000-00000000000a')$$, 'Paid ending in 10 days asks to continue');
select is((select kind::text from public.open_paid_ask('28000000-0000-4000-8000-00000000000a')), 'continue_paid', 'It is a request to continue Paid');
reset role;

select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.ask_for_paid('28000000-0000-4000-8000-00000000000b')$$, 'P0001', 'nothing_to_ask', 'Paid with months to go has nothing to ask');
reset role;

select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.ask_for_paid('28000000-0000-4000-8000-00000000000c')$$, 'P0001', 'nothing_to_ask', 'A Client has nothing to ask');
reset role;

-- The website's form still needs its fields ---------------------------------------------------
select throws_ok(
  $$insert into public.enquiries (kind, name, institution, role, email) values ('work_with_us', 'Asha', 'Some College', 'admissions', 'asha@some.test')$$,
  '23514',
  null,
  'A form enquiry without a phone is turned away'
);
select throws_ok(
  $$insert into public.enquiries (kind, institution, email) values ('ask_paid', 'Some College', 'asha@some.test')$$,
  '23514',
  null,
  'A request for Paid always names its institution and who asked'
);

-- The team reads every request, and the list by reason ---------------------------------------
select set_config('request.jwt.claims', '{"sub":"18000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select is(
  (
    select count(*)::int from public.enquiries
    where kind in ('ask_paid', 'continue_paid') and institution_id in ('28000000-0000-4000-8000-00000000000f', '28000000-0000-4000-8000-00000000000a')
  ),
  2,
  'The team sees both requests in Enquiries'
);
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000a'), 1, 'Paid ending in 10 days comes first');
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000c'), 2, 'A Client with no team Audit this month next');
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000d'), 3, 'Then a score down 5');
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000f'), 4, 'Then signed up with no rivals');
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000e'), 5, 'Then a prospect shared 10 days ago, not signed up');
select is((select attention from public.team_institutions where id = '28000000-0000-4000-8000-00000000000b'), null, 'Paid with months to go and rivals picked needs nothing');
select is(
  (
    select array_agg(name order by attention nulls last, attention_order nulls last, name)
    from public.team_institutions
    where id in ('28000000-0000-4000-8000-00000000000a', '28000000-0000-4000-8000-00000000000b', '28000000-0000-4000-8000-00000000000c', '28000000-0000-4000-8000-00000000000d', '28000000-0000-4000-8000-00000000000e', '28000000-0000-4000-8000-00000000000f')
  ),
  array['Ask P', 'Ask C', 'Ask S', 'Ask F', 'Ask X', 'Ask L'],
  'Most urgent first'
);
reset role;

select * from finish();
rollback;

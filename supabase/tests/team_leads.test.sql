-- Enquiries, AdmitLabs' own leads (spec section 27), in the database: what comes in joins its
-- lead (the same email or phone, never a second lead), tracking links tag the source, a new Free
-- college comes in, who sees and changes what, and the alerts waiting.
-- Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures: A an Admin, T a Team member, M a Client manager, O the owner of F (a college on Free).

begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

insert into public.cities (name, state) values ('Leadton', 'Lead State') on conflict do nothing;
insert into auth.users (id, email, aud, role) values
  ('17000000-0000-4000-8000-000000000001', 'admin-a@leads.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000002', 'team-t@leads.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000003', 'manager-m@leads.test', 'authenticated', 'authenticated'),
  ('17000000-0000-4000-8000-000000000004', 'owner-o@leads.test', 'authenticated', 'authenticated');
-- This test's Admin is the only one, so the alerts below go to them.
delete from public.team_users;
insert into public.team_users (user_id, role) values
  ('17000000-0000-4000-8000-000000000001', 'admin'),
  ('17000000-0000-4000-8000-000000000002', 'team'),
  ('17000000-0000-4000-8000-000000000003', 'client_manager');
insert into public.institutions (id, slug, name, type, city, state, website) values
  ('27000000-0000-4000-8000-0000000000f1', 'lead-f', 'Lead F College', 'college', 'Leadton', 'Lead State', 'https://lead-f.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values ('27000000-0000-4000-8000-0000000000f1', true, now());
insert into public.memberships (user_id, institution_id, role) values ('17000000-0000-4000-8000-000000000004', '27000000-0000-4000-8000-0000000000f1', 'owner');
delete from public.team_lead_alerts;

-- A new Free college comes in -------------------------------------------------------------------------
insert into public.plans (institution_id, tier, starts_at) values ('27000000-0000-4000-8000-0000000000f1', 'free', now());
select is(
  (select source::text from public.team_leads where email = 'owner-o@leads.test'),
  'free_signup',
  'A new Free college comes in as a lead, from its owner'
);
select is((select institution_id from public.team_leads where email = 'owner-o@leads.test'), '27000000-0000-4000-8000-0000000000f1'::uuid, 'linked to the college');

-- The website's form -----------------------------------------------------------------------------------
set local role anon;
select lives_ok(
  $$select public.submit_enquiry('Asha Rao', 'Leadton College', 'admissions', 'asha@leadton.example', '+919876543210', 'BBA', 'We want more BBA admissions.')$$,
  'Anyone sends the Talk to us form'
);
select throws_ok($$select count(*) from public.team_leads$$, '42501', null, 'Nobody signed out reads a lead');
reset role;
select is((select status::text from public.team_leads where email = 'asha@leadton.example'), 'new', 'It is a new lead');
select is((select wants from public.team_leads where email = 'asha@leadton.example'), 'BBA. We want more BBA admissions.', 'with what they want');
select is((select count(*)::int from public.team_lead_alerts where kind = 'new' and sent_at is null), 2, 'Each new lead waits to email the team');

-- The same person again joins their lead: by email, and by phone written another way.
set local role anon;
select lives_ok(
  $$select public.submit_enquiry('Asha Rao', 'Leadton College', 'admissions', 'ASHA@leadton.example', '9876543211', null, 'Following up.')$$,
  'The same email sends again'
);
select lives_ok(
  $$select public.submit_enquiry('Asha R', 'Leadton College', 'principal_dean', 'asha.principal@leadton.example', '+91 98765 43210', null, 'From the principal.')$$,
  'and the same phone, written with spaces, from another email'
);
reset role;
select is((select count(*)::int from public.team_leads where institution = 'Leadton College'), 1, 'One lead, never a duplicate');
select is((select count(*)::int from public.enquiries where lead_id = (select id from public.team_leads where institution = 'Leadton College')), 3, 'with all three enquiries in it');
select is((select count(*)::int from public.team_lead_activity where kind = 'came_back' and lead_id = (select id from public.team_leads where institution = 'Leadton College')), 2, 'History says it came back, twice');
select is((select count(*)::int from public.team_lead_alerts where kind = 'returning' and sent_at is null), 2, 'and each time the owner hears of it');

-- Tracking links ---------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
create temporary table links (code text);
grant all on links to anon, authenticated;
insert into links select code from public.create_team_lead_link('Bio link', 'instagram');
select throws_ok($$select public.create_team_lead_link('Website', 'website')$$, '22023', 'bad_source', 'A link is for a social source');
reset role;
set local role anon;
select lives_ok(
  format($$select public.submit_enquiry('Ravi Das', 'Hilltop Institute', 'marketing', 'ravi@hilltop.example', '9123456780', null, null, %L)$$, (select code from links)),
  'The form, opened from the Instagram bio link'
);
reset role;
select is((select source::text || ', ' || source_detail from public.team_leads where email = 'ravi@hilltop.example'), 'instagram, Bio link', 'is tagged Instagram, with the link''s name');
select is((select this_month from public.team_lead_link_counts() where link_id = (select l.id from public.team_lead_links l where l.code = (select code from links))), 1, 'and counted for the link');

-- Who sees and changes what --------------------------------------------------------------------------
create temporary table lead_total as select count(*)::int as n from public.team_leads;
grant all on lead_total to authenticated;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_leads), 0, 'A Client manager sees no lead they do not own');
select throws_ok(
  $$select public.set_team_lead_owner((select id from public.team_leads limit 1), '17000000-0000-4000-8000-000000000003')$$,
  '42501', null, 'and cannot give themselves one'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_leads), (select n from lead_total), 'A Team member sees every lead');
select lives_ok(
  $$select public.set_team_lead_owner((select id from public.team_leads where institution = 'Leadton College'), '17000000-0000-4000-8000-000000000003')$$,
  'and gives one to the Client manager'
);
select throws_ok(
  $$select public.set_team_lead_status((select id from public.team_leads where institution = 'Leadton College'), 'lost')$$,
  '22023', 'lost_reason', 'Lost needs a reason'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.team_leads), 1, 'The Client manager sees the lead they own');
select is((select count(*)::int from public.enquiries), 3, 'and what came in for it, nothing else');
select lives_ok(
  $$select public.set_team_lead_status((select id from public.team_leads where institution = 'Leadton College'), 'call_booked')$$,
  'They move it on'
);
select lives_ok(
  $$select public.add_team_lead_note((select id from public.team_leads where institution = 'Leadton College'), 'Call on Friday at 11.')$$,
  'and add a note'
);
select throws_ok(
  $$select public.save_team_lead((select id from public.team_leads where email = 'ravi@hilltop.example'), '{"city": "Leadton"}')$$,
  '42501', null, 'never to a lead they do not own'
);
select is(
  (select joined from public.add_team_lead('{"name": "Meena Shah", "institution": "Riverbank College", "phone": "9000011111"}', 'event')),
  false,
  'A Client manager adds a lead by hand'
);
select is((select owner_id from public.team_leads where name = 'Meena Shah'), '17000000-0000-4000-8000-000000000003'::uuid, 'and owns it');
reset role;
select is(
  (select array_agg(kind order by kind) from public.team_lead_activity where lead_id = (select id from public.team_leads where institution = 'Leadton College') and kind in ('owner', 'status', 'note')),
  array['note', 'owner', 'status'],
  'History keeps the owner, the status and the note (one moment in a test: no order to check)'
);
select ok(
  (select bool_and(handled_at is not null) from public.enquiries where lead_id = (select id from public.team_leads where institution = 'Leadton College')),
  'Moving on from New handles what came in, so a college can ask again'
);

-- By hand, the same phone joins the lead there is ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select joined from public.add_team_lead('{"name": "Asha", "phone": "+91 98765 43210"}', 'referral')), true, 'Added by hand with a phone already known: it joins that lead');
select throws_ok($$select public.add_team_lead('{"name": "X", "phone": "9000000000"}', 'website')$$, '22023', 'bad_source', 'By hand, only the social sources');
reset role;

-- The alerts -------------------------------------------------------------------------------------------
select is(
  (select array_agg(r) from public.team_lead_alert_recipients((select id from public.team_leads where email = 'ravi@hilltop.example')) r),
  array['admin-a@leads.test'],
  'A lead with no owner emails every Admin'
);
select is(
  (select array_agg(r) from public.team_lead_alert_recipients((select id from public.team_leads where institution = 'Leadton College')) r),
  array['manager-m@leads.test'],
  'one with an owner emails the owner'
);
select is((select count(*)::int from public.claim_team_lead_alerts()) > 0 and (select count(*) from public.claim_team_lead_alerts()) = 0, true, 'Each waiting alert is taken once');

select * from finish();
rollback;

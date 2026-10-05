-- Version 2, Part 5: Leads (spec section 23), enforced in the database. Run with `npm run db:test`.
-- Everything is rolled back at the end.
--
-- Fixtures, in a made-up state so the sample world never mixes in:
--   C: Leadsville, Client. owner-c and member-c. BBA, MBA, and BCA (archived). Admissions email added.
--      Links L1 (BBA, live) and L2 (MBA, archived), with enquiries on known days for the counts.
--   D: Leadsville, Client. owner-d. Link LD, with enquiries 13 months, 8 months and a day old.
--   F: Leadsville, Free. owner-f.     X: Leadsville, a Client once, now ended. Link LX, still live.
--   A team user.

begin;
create extension if not exists pgtap with schema extensions;

select plan(50);

insert into public.cities (name, state) values ('Leadsville', 'Lead State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('15000000-0000-4000-8000-000000000001', 'owner-c@leads.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000002', 'member-c@leads.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000003', 'owner-f@leads.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000004', 'team@leads.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000005', 'owner-d@leads.test', 'authenticated', 'authenticated'),
  ('15000000-0000-4000-8000-000000000006', 'owner-x@leads.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('15000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('25000000-0000-4000-8000-00000000000c', 'leads-c', 'Lead C', 'college', 'Leadsville', 'Lead State', 'https://leads-c.example'),
  ('25000000-0000-4000-8000-00000000000d', 'leads-d', 'Lead D', 'skilling', 'Leadsville', 'Lead State', 'https://leads-d.example'),
  ('25000000-0000-4000-8000-00000000000f', 'leads-f', 'Lead F', 'college', 'Leadsville', 'Lead State', 'https://leads-f.example'),
  ('25000000-0000-4000-8000-00000000000a', 'leads-x', 'Lead X', 'college', 'Leadsville', 'Lead State', 'https://leads-x.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('25000000-0000-4000-8000-00000000000c', true, now() - interval '400 days'),
  ('25000000-0000-4000-8000-00000000000d', true, now() - interval '400 days'),
  ('25000000-0000-4000-8000-00000000000f', true, now() - interval '400 days'),
  ('25000000-0000-4000-8000-00000000000a', true, now() - interval '400 days');

insert into public.programs (id, institution_id, name, program_key, archived_at) values
  ('35000000-0000-4000-8000-0000000000c1', '25000000-0000-4000-8000-00000000000c', 'BBA', 'bba', null),
  ('35000000-0000-4000-8000-0000000000c2', '25000000-0000-4000-8000-00000000000c', 'MBA', 'mba', null),
  ('35000000-0000-4000-8000-0000000000c3', '25000000-0000-4000-8000-00000000000c', 'BCA', 'bca', now() - interval '5 days'),
  ('35000000-0000-4000-8000-0000000000d1', '25000000-0000-4000-8000-00000000000d', 'Digital Marketing', 'digital-marketing', null),
  ('35000000-0000-4000-8000-0000000000f1', '25000000-0000-4000-8000-00000000000f', 'BBA', 'bba', null),
  ('35000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', 'BBA', 'bba', null);

insert into public.memberships (user_id, institution_id, role) values
  ('15000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-00000000000c', 'owner'),
  ('15000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-00000000000c', 'member'),
  ('15000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-00000000000f', 'owner'),
  ('15000000-0000-4000-8000-000000000005', '25000000-0000-4000-8000-00000000000d', 'owner'),
  ('15000000-0000-4000-8000-000000000006', '25000000-0000-4000-8000-00000000000a', 'owner');

insert into public.plans (institution_id, tier, starts_at, ends_at, free_program_id) values
  ('25000000-0000-4000-8000-00000000000c', 'client', now() - interval '400 days', null, null),
  ('25000000-0000-4000-8000-00000000000d', 'client', now() - interval '400 days', null, null),
  ('25000000-0000-4000-8000-00000000000f', 'free', now() - interval '400 days', null, '35000000-0000-4000-8000-0000000000f1'),
  ('25000000-0000-4000-8000-00000000000a', 'client', now() - interval '400 days', now() - interval '10 days', null);

insert into public.institution_details (institution_id, admissions_email) values ('25000000-0000-4000-8000-00000000000c', 'admissions@leads-c.example');

insert into public.lead_links (id, institution_id, program_id, code, name, used_on, created_at, archived_at) values
  ('45000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-00000000000c', '35000000-0000-4000-8000-0000000000c1', 'lcl1aaaa', 'Instagram bio', 'instagram', '2026-05-01 10:00+05:30', null),
  ('45000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-00000000000c', '35000000-0000-4000-8000-0000000000c2', 'lcl2bbbb', 'Reel: MBA fees', 'instagram', '2026-05-02 10:00+05:30', now() - interval '1 day'),
  ('45000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-00000000000d', '35000000-0000-4000-8000-0000000000d1', 'ldd1dddd', 'YouTube', 'youtube', now() - interval '500 days', null),
  ('45000000-0000-4000-8000-000000000004', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a1', 'lxx1xxxx', 'Facebook page', 'facebook', now() - interval '300 days', null);

insert into public.leads (id, institution_id, link_id, program_id, name, phone, email, city, consent, created_at) values
  -- C, on known days: counted as of 15 September 2026, noon in India.
  ('55000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Asha One', '+910000000001', 'asha@mail.example', 'Leadsville', 'Your details go to Lead C so they can contact you about admission.', '2026-09-10 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Bina Two', '+910000000002', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-09-02 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Chitra Three', '+910000000003', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-08-05 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000004', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Dev Four', '+910000000004', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-08-20 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000005', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Esha Five', '+910000000005', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-07-10 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000006', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-0000000000c1', 'Faiz Six', '+910000000006', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-06-01 10:00+05:30'),
  ('55000000-0000-4000-8000-000000000007', '25000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-000000000002', '35000000-0000-4000-8000-0000000000c2', 'Gita Seven', '+910000000007', null, null, 'Your details go to Lead C so they can contact you about admission.', '2026-09-14 10:00+05:30'),
  -- D: one past every keeping time, one past 6 months only, one new.
  ('55000000-0000-4000-8000-0000000000d1', '25000000-0000-4000-8000-00000000000d', '45000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-0000000000d1', 'Old Enquiry', '+910000000011', null, null, 'Your details go to Lead D so they can contact you about admission.', now() - interval '13 months'),
  ('55000000-0000-4000-8000-0000000000d2', '25000000-0000-4000-8000-00000000000d', '45000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-0000000000d1', 'Middle Enquiry', '+910000000012', null, null, 'Your details go to Lead D so they can contact you about admission.', now() - interval '8 months'),
  ('55000000-0000-4000-8000-0000000000d3', '25000000-0000-4000-8000-00000000000d', '45000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-0000000000d1', 'New Enquiry', '+910000000013', null, null, 'Your details go to Lead D so they can contact you about admission.', now() - interval '1 day');

-- 20 enquiries through D's link in the last hour: the hourly cap. The next is turned away.
insert into public.leads (institution_id, link_id, program_id, name, phone, consent, created_at)
select '25000000-0000-4000-8000-00000000000d', '45000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-0000000000d1', 'Busy ' || n, '+91000000' || lpad((100 + n)::text, 4, '0'),
  'Your details go to Lead D so they can contact you about admission.', now() - interval '10 minutes'
from generate_series(1, 20) as n;

-- Anyone, on the form ----------------------------------------------------------------------------
set local role anon;

select results_eq(
  $$select institution_name, program_name, open, closed_reason, jsonb_array_length(programs) from public.lead_form('lcl1aaaa')$$,
  $$values ('Lead C'::text, 'BBA'::text, true, null::text, 2)$$,
  'The form shows the college, the program and its other programs (not an archived one), and takes enquiries'
);
select results_eq($$select open, closed_reason from public.lead_form('lcl2bbbb')$$, $$values (false, 'archived'::text)$$, 'An archived link''s form is closed');
select results_eq($$select open, closed_reason from public.lead_form('lxx1xxxx')$$, $$values (false, 'not_client'::text)$$, 'and so is one of a college that is no longer a Client');
select is_empty($$select 1 from public.lead_form('nosuchcd')$$, 'An unknown code has no form');
select throws_ok($$select 1 from public.leads$$, '42501', null, 'Anyone cannot read enquiries');
select throws_ok($$select 1 from public.lead_links$$, '42501', null, 'nor the links');

select isnt(public.submit_lead('lcl1aaaa', '  Hema   Eight ', '+910000000008', 'Hema@Mail.example', 'Leadsville', null), null::uuid, 'Anyone sends an enquiry through a live link');
select throws_ok($$select public.submit_lead('lcl1aaaa', 'Hema Again', '+910000000008', null, null, null)$$, 'P0001', 'already_sent', 'One a day from one phone');
select throws_ok($$select public.submit_lead('lcl1aaaa', 'Hema Again', '+910000000009', 'hema@mail.example', null, null)$$, 'P0001', 'already_sent', 'and from one email');
select throws_ok($$select public.submit_lead('lcl2bbbb', 'Ira Nine', '+910000000020', null, null, null)$$, 'P0001', 'link_closed', 'An archived link takes none');
select throws_ok($$select public.submit_lead('lxx1xxxx', 'Ira Nine', '+910000000020', null, null, null)$$, 'P0001', 'link_closed', 'nor a link of a college that is no longer a Client');
select throws_ok($$select public.submit_lead('lcl1aaaa', 'Ira Nine', '+910000000020', null, null, '35000000-0000-4000-8000-0000000000f1')$$, '22023', 'bad_program', 'The course must be one of the college''s');
select throws_ok($$select public.submit_lead('lcl1aaaa', 'Ira Nine', '+910000000020', null, null, '35000000-0000-4000-8000-0000000000c3')$$, '22023', 'bad_program', 'and not one it has archived');
select throws_ok($$select public.submit_lead('ldd1dddd', 'Jaya Ten', '+910000000021', null, null, null)$$, 'P0001', 'link_busy', 'A link takes at most 20 an hour');

-- The college's own people -------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select name, email, program_id::text, consent from public.leads where phone = '+910000000008'$$,
  $$values ('Hema Eight'::text, 'hema@mail.example'::text, '35000000-0000-4000-8000-0000000000c1'::text, 'Your details go to Lead C so they can contact you about admission.'::text)$$,
  'The owner reads it: tidied, the link''s program to start, and the consent line as the form shows it'
);
select results_eq(
  $$select array_agg(name order by name) from public.leads where institution_id = '25000000-0000-4000-8000-00000000000c' and created_at <= '2026-09-15 12:00+05:30'$$,
  $$values (array['Asha One', 'Bina Two', 'Chitra Three', 'Dev Four', 'Esha Five', 'Faiz Six', 'Gita Seven']::text[])$$,
  'and every enquiry of its own'
);
select is_empty($$select 1 from public.leads where institution_id <> '25000000-0000-4000-8000-00000000000c'$$, 'never another college''s');
select results_eq(
  $$select public.lead_alert_recipients('25000000-0000-4000-8000-00000000000c')$$,
  $$values (array['admissions@leads-c.example']::text[])$$,
  'Before anything is saved, the alert goes to the admissions email added in Settings'
);

select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select isnt_empty($$select 1 from public.leads$$, 'A member reads them too');
select throws_ok($$select public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['m@leads-c.example'], 12::smallint)$$, '42501', 'not_owner', 'but only the owner changes the settings');
select throws_ok($$select public.delete_leads('25000000-0000-4000-8000-00000000000c', null, '+910000000008')$$, '42501', 'not_owner', 'and only the owner deletes');
select throws_ok($$select * from public.create_lead_link('25000000-0000-4000-8000-00000000000c', 'Bio', 'instagram', '35000000-0000-4000-8000-0000000000c1')$$, '42501', 'not_allowed', 'A member sees the links, but only the owner makes one');
select throws_ok($$select public.archive_lead_link('45000000-0000-4000-8000-000000000001')$$, '42501', 'not_allowed', 'or archives one');

-- The AdmitLabs team -------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select is_empty($$select 1 from public.leads$$, 'The team never reads a student''s details');
select results_eq(
  $$select name, this_month, last_month_to_date, last_month, month_before, total from public.lead_link_counts('25000000-0000-4000-8000-00000000000c', '2026-09-15 12:00+05:30') order by name$$,
  $$values ('Instagram bio'::text, 2, 1, 2, 1, 6), ('Reel: MBA fees', 1, 0, 0, 0, 1)$$,
  'It reads the counts by link: this month, last month to the same day and in all, the month before, in all'
);
select matches(
  (select code from public.create_lead_link('25000000-0000-4000-8000-00000000000c', ' Reel:  BBA placements ', 'instagram', '35000000-0000-4000-8000-0000000000c1')),
  '^[0-9a-f]{8}$',
  'The team makes a link for a Client, with a short code'
);
select results_eq(
  $$select name, used_on::text from public.lead_links where institution_id = '25000000-0000-4000-8000-00000000000c' and name like 'Reel: BBA%'$$,
  $$values ('Reel: BBA placements'::text, 'instagram'::text)$$,
  'with its name tidied'
);
select throws_ok($$select * from public.create_lead_link('25000000-0000-4000-8000-00000000000f', 'Bio', 'instagram', '35000000-0000-4000-8000-0000000000f1')$$, 'P0001', 'not_client', 'Only a Client has links');
select throws_ok($$select * from public.create_lead_link('25000000-0000-4000-8000-00000000000c', 'Bio', 'instagram', '35000000-0000-4000-8000-0000000000c3')$$, '22023', 'bad_program', 'for one of its live programs');
select lives_ok($$select public.archive_lead_link('45000000-0000-4000-8000-000000000001')$$, 'The team archives a link');

-- The owner -------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select results_eq($$select open from public.lead_form('lcl1aaaa')$$, $$values (false)$$, 'An archived link''s form closes at once');
select matches(
  (select code from public.create_lead_link('25000000-0000-4000-8000-00000000000c', 'Website: enquiry form', 'website', null)),
  '^[0-9a-f]{8}$',
  'The owner of a Client makes its own links too: here a general form, for any course'
);
select results_eq(
  $$select f.program_id, f.program_name, f.open from public.lead_form((select code from public.lead_links where name = 'Website: enquiry form')) f$$,
  $$values (null::uuid, null::text, true)$$,
  'Its form names no program: the student picks the course'
);
select throws_ok(
  format($$select public.submit_lead(%L, 'Kiran Eleven', '+910000000031')$$, (select code from public.lead_links where name = 'Website: enquiry form')),
  '22023', 'bad_program', 'An enquiry through it needs a course'
);
select isnt(
  public.submit_lead((select code from public.lead_links where name = 'Website: enquiry form'), 'Kiran Eleven', '+910000000031', null, null, '35000000-0000-4000-8000-0000000000c2'),
  null::uuid,
  'and takes the one the student picked'
);
select is(
  (select program_name from public.lead_link_counts('25000000-0000-4000-8000-00000000000c') where name = 'Website: enquiry form'),
  null,
  'Its counts show with no program'
);
select throws_ok($$select * from public.create_lead_link('25000000-0000-4000-8000-00000000000d', 'Bio', 'instagram', null)$$, '42501', 'not_allowed', 'never for another college');
select throws_ok($$select public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['a@x.example', 'b@x.example', 'c@x.example', 'd@x.example'], 12::smallint)$$, '22023', 'too_many_emails', 'Up to 3 addresses');
select throws_ok($$select public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['not an email'], 12::smallint)$$, '22023', 'bad_email', 'each one an email');
select throws_ok($$select public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['', ' '], 12::smallint)$$, '22023', 'no_email', 'at least one');
select throws_ok($$select public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['a@x.example'], 9::smallint)$$, '22023', 'bad_keep_months', 'kept 6, 12 or 24 months');
select is(public.save_lead_settings('25000000-0000-4000-8000-00000000000c', array['Office@Leads-C.example', 'office@leads-c.example', 'head@leads-c.example'], 24::smallint), 0, 'The owner saves them');
select results_eq(
  $$select public.lead_alert_recipients('25000000-0000-4000-8000-00000000000c')$$,
  $$values (array['office@leads-c.example', 'head@leads-c.example']::text[])$$,
  'and the alert goes to the saved addresses, once each'
);
select throws_ok($$select public.delete_leads('25000000-0000-4000-8000-00000000000c', null, null)$$, '22023', 'one_thing', 'Deleting needs one enquiry, or one phone or email');
select is(public.delete_leads('25000000-0000-4000-8000-00000000000c', null, 'HEMA@mail.example'), 1, 'The owner deletes every enquiry from one email');
select is(public.delete_leads('25000000-0000-4000-8000-00000000000c', '55000000-0000-4000-8000-000000000007', null), 1, 'or one enquiry');
select throws_ok($$select public.purge_old_leads(now())$$, '42501', null, 'Only the server runs the daily deletion');

-- The daily deletion, and a shorter keeping time -----------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select lives_ok($$select public.purge_old_leads(now())$$, 'Every day, the server deletes what is past its keeping time');

select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select array_agg(name order by name) from public.leads where name like '%Enquiry'$$,
  $$values (array['Middle Enquiry', 'New Enquiry']::text[])$$,
  'with no keeping time chosen, 12 months: the 13 month old one is gone'
);
select is(public.save_lead_settings('25000000-0000-4000-8000-00000000000d', array['owner-d@leads.test'], 6::smallint), 1, 'Keeping them 6 months deletes the 8 month old one straight away');

select * from finish();
rollback;

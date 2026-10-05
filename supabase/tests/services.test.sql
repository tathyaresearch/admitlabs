-- Version 2 review (October 2026): Talk to AdmitLabs, the sidebar's services card on Free and
-- Paid, enforced in the database. Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures:
--   F: Free. owner-f and member-f.     C: Client. owner-c.     A team user.

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into public.cities (name, state) values ('Serviceville', 'Service State') on conflict do nothing;

insert into auth.users (id, email, aud, role) values
  ('19000000-0000-4000-8000-000000000001', 'owner-f@services.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000002', 'member-f@services.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000003', 'owner-c@services.test', 'authenticated', 'authenticated'),
  ('19000000-0000-4000-8000-000000000004', 'team@services.test', 'authenticated', 'authenticated');
insert into public.team_users (user_id, role) values ('19000000-0000-4000-8000-000000000004', 'team');

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('29000000-0000-4000-8000-00000000000f', 'services-f', 'Service F', 'college', 'Serviceville', 'Service State', 'https://services-f.example'),
  ('29000000-0000-4000-8000-00000000000c', 'services-c', 'Service C', 'college', 'Serviceville', 'Service State', 'https://services-c.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('29000000-0000-4000-8000-00000000000f', true, now() - interval '30 days'),
  ('29000000-0000-4000-8000-00000000000c', true, now() - interval '30 days');
insert into public.memberships (user_id, institution_id, role) values
  ('19000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-00000000000f', 'owner'),
  ('19000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-00000000000f', 'member'),
  ('19000000-0000-4000-8000-000000000003', '29000000-0000-4000-8000-00000000000c', 'owner');
insert into public.plans (institution_id, tier, starts_at, ends_at) values
  ('29000000-0000-4000-8000-00000000000f', 'free', now() - interval '30 days', null),
  ('29000000-0000-4000-8000-00000000000c', 'client', now() - interval '30 days', null);

-- A member of a Free college asks ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.ask_admitlabs_services('29000000-0000-4000-8000-00000000000f')$$, 'A member of a Free college asks to talk about the services');
select isnt(public.open_services_ask('29000000-0000-4000-8000-00000000000f'), null, 'and sees when it was sent');

-- The owner clicks too: still one open request ---------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  public.ask_admitlabs_services('29000000-0000-4000-8000-00000000000f'),
  public.open_services_ask('29000000-0000-4000-8000-00000000000f'),
  'The owner asking again gets the open one back'
);
select is(public.open_services_ask('29000000-0000-4000-8000-00000000000c'), null, 'Nobody sees another college''s request');
select throws_ok($$select public.ask_admitlabs_services('29000000-0000-4000-8000-00000000000c')$$, '42501', 'not_member', 'nor asks for it');

-- A Client already works with AdmitLabs ------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.ask_admitlabs_services('29000000-0000-4000-8000-00000000000c')$$, 'P0001', 'already_client', 'A Client has nothing to ask');

-- The team reads it in Enquiries ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"19000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.enquiries where institution_id = '29000000-0000-4000-8000-00000000000f' and kind = 'ask_services' and handled_at is null),
  1,
  'The team sees one open request, however many clicks'
);
select is(
  (select email from public.enquiries where institution_id = '29000000-0000-4000-8000-00000000000f' and kind = 'ask_services'),
  'member-f@services.test',
  'from whoever asked first, to write back to'
);
select throws_ok($$select public.ask_admitlabs_services('29000000-0000-4000-8000-00000000000f')$$, '42501', 'not_member', 'The team cannot ask for a college');

select * from finish();
rollback;

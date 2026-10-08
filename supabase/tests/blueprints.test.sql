-- The Blueprint (spec section 26), in the database: who uploads and sets its status, who sees
-- which versions and files, the college's answer, and History. Every access level.
-- Run with `npm run db:test`. Everything is rolled back at the end.
--
-- Fixtures: A an Admin, T a Team member, M the Client manager of C, W a Client manager of no
-- Client. C: a Client with a Brain (owner O, member B). D: another Client (owner OD). E: on Paid
-- (owner OE).

begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

insert into public.cities (name, state) values ('Plantown', 'Plan State') on conflict do nothing;
insert into auth.users (id, email, aud, role) values
  ('1a000000-0000-4000-8000-000000000001', 'admin-a@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000002', 'team-t@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000003', 'manager-m@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000004', 'manager-w@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000005', 'owner-o@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000006', 'member-b@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000007', 'owner-od@blueprint.test', 'authenticated', 'authenticated'),
  ('1a000000-0000-4000-8000-000000000008', 'owner-oe@blueprint.test', 'authenticated', 'authenticated');
delete from public.client_managers;
delete from public.team_users;
insert into public.team_users (user_id, role) values
  ('1a000000-0000-4000-8000-000000000001', 'admin'),
  ('1a000000-0000-4000-8000-000000000002', 'team'),
  ('1a000000-0000-4000-8000-000000000003', 'client_manager'),
  ('1a000000-0000-4000-8000-000000000004', 'client_manager');
insert into public.institutions (id, slug, name, type, city, state, website) values
  ('2a000000-0000-4000-8000-00000000000c', 'plan-c', 'Plan C', 'college', 'Plantown', 'Plan State', 'https://plan-c.example'),
  ('2a000000-0000-4000-8000-00000000000d', 'plan-d', 'Plan D', 'college', 'Plantown', 'Plan State', 'https://plan-d.example'),
  ('2a000000-0000-4000-8000-00000000000e', 'plan-e', 'Plan E', 'college', 'Plantown', 'Plan State', 'https://plan-e.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values
  ('2a000000-0000-4000-8000-00000000000c', true, now()),
  ('2a000000-0000-4000-8000-00000000000d', true, now()),
  ('2a000000-0000-4000-8000-00000000000e', true, now());
insert into public.memberships (user_id, institution_id, role) values
  ('1a000000-0000-4000-8000-000000000005', '2a000000-0000-4000-8000-00000000000c', 'owner'),
  ('1a000000-0000-4000-8000-000000000006', '2a000000-0000-4000-8000-00000000000c', 'member'),
  ('1a000000-0000-4000-8000-000000000007', '2a000000-0000-4000-8000-00000000000d', 'owner'),
  ('1a000000-0000-4000-8000-000000000008', '2a000000-0000-4000-8000-00000000000e', 'owner');
insert into public.plans (institution_id, tier, starts_at, ends_at, paid_months) values
  ('2a000000-0000-4000-8000-00000000000c', 'client', now() - interval '30 days', null, null),
  ('2a000000-0000-4000-8000-00000000000d', 'client', now() - interval '30 days', null, null),
  ('2a000000-0000-4000-8000-00000000000e', 'paid', now() - interval '10 days', now() + interval '20 days', 1);
insert into public.brains (institution_id) values ('2a000000-0000-4000-8000-00000000000c'), ('2a000000-0000-4000-8000-00000000000d');
insert into public.client_managers (institution_id, user_id) values ('2a000000-0000-4000-8000-00000000000c', '1a000000-0000-4000-8000-000000000003');
-- Files the browser would have uploaded: two PDFs for C, one too big, one not a PDF.
insert into storage.objects (bucket_id, name, metadata) values
  ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000001.pdf', '{"size": 120000, "mimetype": "application/pdf"}'),
  ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000002.pdf', '{"size": 140000, "mimetype": "application/pdf"}'),
  ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000003.pdf', '{"size": 25000000, "mimetype": "application/pdf"}'),
  ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000004.pdf', '{"size": 1000, "mimetype": "image/png"}');
create temporary table versions (label text primary key, id uuid);
grant all on versions to authenticated, anon;

-- The team uploads ---------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
insert into versions select 'v1', id from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000001.pdf', 'Plan C Blueprint.pdf', 'Reels twice a week on placements.');
select is((select version from public.brain_blueprints where id = (select id from versions where label = 'v1')), 1, 'A Team member uploads version 1');
select is((select status::text from public.brain_blueprints where id = (select id from versions where label = 'v1')), 'draft', 'a Draft');
select throws_ok(
  $$select * from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000003.pdf', 'Big.pdf')$$,
  '22023', 'too_big', 'Never over 20 MB'
);
select throws_ok(
  $$select * from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000004.pdf', 'Picture.pdf')$$,
  '22023', 'not_pdf', 'Only a PDF'
);
select throws_ok(
  $$select * from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000d/0a000000-0000-4000-8000-000000000001.pdf', 'Other.pdf')$$,
  '22023', 'bad_path', 'Only from this college''s folder'
);
select throws_ok(
  $$select * from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000009.pdf', 'Gone.pdf')$$,
  'P0002', 'no_file', 'Only a file that is in the bucket'
);
reset role;

-- The college does not see a Draft, nor its file ----------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 0, 'The owner sees no Draft');
select is((select count(*)::int from storage.objects where bucket_id = 'brain-blueprints'), 0, 'nor its file');
select throws_ok(
  $$select * from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000002.pdf', 'Mine.pdf')$$,
  '42501', null, 'The college never uploads one'
);
select throws_ok($$select public.set_blueprint_status((select id from versions where label = 'v1'), 'shared')$$, '42501', null, 'nor sets its status');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000005.pdf')$$,
  '42501', null, 'nor puts a file in the bucket'
);
reset role;

-- The Client's manager shares it; a manager with other Clients cannot ------------------------------
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 0, 'A Client manager of other Clients sees nothing');
select throws_ok($$select public.set_blueprint_status((select id from versions where label = 'v1'), 'shared')$$, '42501', null, 'and changes nothing');
reset role;
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 1, 'The Client''s manager sees the Draft');
select is((select count(*)::int from storage.objects where bucket_id = 'brain-blueprints' and name like '2a000000-0000-4000-8000-00000000000c/%'), 4, 'and every file in the Client''s folder');
select lives_ok($$select public.set_blueprint_status((select id from versions where label = 'v1'), 'shared')$$, 'and shares it with the college');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('brain-blueprints', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000006.pdf')$$,
  'and may upload a file for the Client'
);
reset role;

-- The college sees what is Shared ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 1, 'A member sees the Shared version');
select is((select count(*)::int from storage.objects where bucket_id = 'brain-blueprints'), 1, 'and only its file');
reset role;
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 0, 'Another Client''s owner sees nothing');
select is((select count(*)::int from storage.objects where bucket_id = 'brain-blueprints'), 0, 'and no file');
select throws_ok($$select public.approve_blueprint((select id from versions where label = 'v1'))$$, '42501', null, 'and cannot approve it');
reset role;
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_blueprints), 0, 'A Paid owner sees no Blueprint');
reset role;
set local role anon;
select throws_ok($$select count(*) from public.brain_blueprints$$, '42501', null, 'Nobody signed out reads one');
reset role;

-- The college answers ------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.approve_blueprint((select id from versions where label = 'v1'))$$, 'The owner approves the Shared version');
reset role;
select is(
  (select status::text || ' ' || approved_by from public.brain_blueprints where id = (select id from versions where label = 'v1')),
  'approved 1a000000-0000-4000-8000-000000000005',
  'Approved, with who approved it'
);
select ok((select approved_at is not null from public.brain_blueprints where id = (select id from versions where label = 'v1')), 'and when');

-- Version 2: a Draft the college does not see, then Shared; the college asks for changes.
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into versions select 'v2', id from public.add_blueprint_version('2a000000-0000-4000-8000-00000000000c', '2a000000-0000-4000-8000-00000000000c/0a000000-0000-4000-8000-000000000002.pdf', 'Plan C Blueprint v2.pdf');
reset role;
select is((select version from public.brain_blueprints where id = (select id from versions where label = 'v2')), 2, 'An Admin uploads the next version: 2');
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select array_agg(version order by version) from public.brain_blueprints), array[1], 'The owner still sees version 1 only, while 2 is a Draft');
select throws_ok($$select public.approve_blueprint((select id from versions where label = 'v1'))$$, 'P0001', 'not_latest', 'An older version cannot be approved');
reset role;
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.set_blueprint_status((select id from versions where label = 'v2'), 'shared')$$, 'The team shares version 2');
reset role;
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.ask_blueprint_changes((select id from versions where label = 'v2'), 'password: secret123')$$, '22023', 'looks_like_login', 'No passwords in a note');
select lives_ok($$select public.ask_blueprint_changes((select id from versions where label = 'v2'), 'Add the MBA plan for Kerala.')$$, 'A member asks for changes');
reset role;
select is((select changes_note from public.brain_blueprints where id = (select id from versions where label = 'v2')), 'Add the MBA plan for Kerala.', 'The note is kept, with who and when');

-- History, and who hears of an answer --------------------------------------------------------------
select is(
  (select array_agg(what order by what) from public.brain_changes where target = 'blueprint:' || (select id from versions where label = 'v2')),
  array['added', 'changes_asked', 'shared'],
  'History: uploaded, shared, changes asked'
);
select ok(
  (select team_only from public.brain_changes where target = 'blueprint:' || (select id from versions where label = 'v2') and what = 'added'),
  'The upload of a Draft is team only in History'
);
select is(public.blueprint_reply_recipients('2a000000-0000-4000-8000-00000000000c')::text, 'manager-m@blueprint.test', 'The college''s answer goes to its Client manager');
select is(public.blueprint_reply_recipients('2a000000-0000-4000-8000-00000000000d')::text, 'admin-a@blueprint.test', 'or, with none, to every Admin');
select set_config('request.jwt.claims', '{"sub":"1a000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.brain_changes where kind = 'blueprint' and team_only), 0, 'The college never sees team only lines');
reset role;

select * from finish();
rollback;

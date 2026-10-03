-- How to fix in steps (product review part 3): record_audit() keeps the analysis provider's steps
-- in order, next to the same advice as one paragraph. Run with `npm run db:test`. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into public.cities (name, state) values ('Guwahati', 'Assam') on conflict do nothing;
insert into public.scoring_config (version, weights, result_shares, thresholds, labels, active)
values (1, '{}', '{}', '{}', '[]', false) on conflict (version) do nothing;

insert into public.institutions (id, slug, name, type, city, state, website) values
  ('28000000-0000-4000-8000-00000000000a', 'steps-a', 'Steps A', 'college', 'Guwahati', 'Assam', 'https://steps-a.example');
insert into public.institution_status (institution_id, claimed, claimed_at) values ('28000000-0000-4000-8000-00000000000a', true, now());

select lives_ok($$select public.record_audit(jsonb_build_object(
  'institution_id', '28000000-0000-4000-8000-00000000000a', 'kind', 'team', 'trigger', 'manual', 'run_at', now(),
  'overall', 50, 'discovered', 50, 'trusted', 50, 'chosen', 50, 'config_version', 1, 'programs', '[]'::jsonb,
  'checks', jsonb_build_array(
    jsonb_build_object(
      'program_id', null, 'pillar', 'chosen', 'check_key', 'easy_enquiry', 'result', 'weak', 'points_awarded', 6, 'points_max', 20,
      'checked_at', now(), 'finding', 'The enquiry form is only on the contact page.', 'why_it_matters', 'Students want to ask right away.',
      'how_to_fix', 'Bring your enquiry form out of the contact page. Put a short form and a WhatsApp button on every page.',
      'fix_steps', jsonb_build_array('Bring your enquiry form out of the contact page.', 'Put a short form and a WhatsApp button on every page.'),
      'difficulty', 'easy', 'source_url', 'https://steps-a.example/contact'
    ),
    jsonb_build_object(
      'program_id', null, 'pillar', 'chosen', 'check_key', 'mobile_friendly', 'result', 'strong', 'points_awarded', 10, 'points_max', 10,
      'checked_at', now(), 'finding', 'Works fully on a phone.', 'why_it_matters', 'Most students browse on a phone.',
      'how_to_fix', null, 'fix_steps', '[]'::jsonb, 'difficulty', null, 'source_url', 'https://steps-a.example'
    )
  )
))$$, 'An Audit with its steps saves');

select is(
  (select d.fix_steps from public.audit_check_details d join public.audit_checks c on c.id = d.audit_check_id
   where c.check_key = 'easy_enquiry' and c.audit_id = (select id from public.audits where institution_id = '28000000-0000-4000-8000-00000000000a')),
  array['Bring your enquiry form out of the contact page.', 'Put a short form and a WhatsApp button on every page.'],
  'The steps are kept, in order'
);
select is(
  (select d.how_to_fix from public.audit_check_details d join public.audit_checks c on c.id = d.audit_check_id
   where c.check_key = 'easy_enquiry' and c.audit_id = (select id from public.audits where institution_id = '28000000-0000-4000-8000-00000000000a')),
  'Bring your enquiry form out of the contact page. Put a short form and a WhatsApp button on every page.',
  'next to the same advice as one paragraph'
);
select is(
  (select d.fix_steps from public.audit_check_details d join public.audit_checks c on c.id = d.audit_check_id
   where c.check_key = 'mobile_friendly' and c.audit_id = (select id from public.audits where institution_id = '28000000-0000-4000-8000-00000000000a')),
  null,
  'A Strong check has no steps'
);

select * from finish();
rollback;

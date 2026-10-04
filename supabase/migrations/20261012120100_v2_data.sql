-- Version 2 data (October 2026; spec sections 7, 8, 9, 16, 23, 24 and 25).
--
--   Cities          near: the nearest bigger city in the state, for Nearby city rivals.
--   Review first    institution_status.review_first, on to start, set by the team. A new own Audit
--                   waits (audits.review) until the team approves it, and so does a month's
--                   summary with its report. A college reads only approved Audits (with their
--                   checks, details and findings) and approved reports; its latest approved Audit
--                   is the one the plan rules and marks use. Every change the team makes in a
--                   review is kept in audit_edits, which only the team reads.
--   Findings        audit_findings: What people say and Other places, one row per finding, with a
--                   fix when there is something to do, ranked with the checks' fixes (fix_rank).
--                   Free reads the findings among its top 3 fixes, the way it reads check details.
--   Ready fix       audit_check_details.ready_fix: a text or a layout to copy.
--   Marks           done_marks.finding_key: a finding marked done waits for the next approved own
--                   Audit, as a check does.
--   Demand          topic, content and best month items; a count only when a source gives a real
--                   one. content_picks: Make these 3, picked with each monthly update; Free reads
--                   the first. Mark as made is a done mark on the idea and its month.
--   Summary         memberships.summary_email: each person turns the monthly summary (or Free's
--                   Audit ready email) off. reports.summary: the month's summary.
--   Enquiries       fix_request: Let AdmitLabs fix this, with the fix's key and name, one open
--                   request per fix.
--   Leads           lead_links (made by the team), leads (read by the college's own people only,
--                   never the team), lead_settings, and email_log (team only, never the message).
--   Scoring         impact bands, and the words Strong, Okay and Weak.

-- Cities ------------------------------------------------------------------------------------

alter table public.cities add column near text;

-- Review first ------------------------------------------------------------------------------

create type public.review_state as enum ('waiting', 'approved');

alter table public.institution_status add column review_first boolean not null default true;

alter table public.audits
  add column review public.review_state not null default 'approved',
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null;
update public.audits set approved_at = run_at where approved_at is null;
-- Team and rival runs are the team's own and never wait. approved_at says when an Audit was approved
-- (empty on a waiting one); approved_by is the team user who approved it, or null when it went out
-- automatically.
alter table public.audits
  add constraint audits_review_own check (review = 'approved' or kind in ('free', 'paid', 'client')),
  add constraint audits_waiting_unapproved check (review = 'approved' or (approved_at is null and approved_by is null));
create index audits_waiting_idx on public.audits (run_at) where review = 'waiting';

-- The newest of an institution's own Audits that the college may see: approved ones only.
create or replace function private.latest_own_audit(target uuid) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select a.id
  from public.audits a
  where a.institution_id = target and a.kind in ('free', 'paid', 'client') and a.review = 'approved'
  order by a.run_at desc, a.id desc
  limit 1;
$$;

create or replace function private.can_see_audit(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audits a
    where a.id = target
      and a.kind in ('free', 'paid', 'client')
      and a.review = 'approved'
      and private.is_member(a.institution_id)
      and (private.effective_tier(a.institution_id) <> 'free' or a.id = private.latest_own_audit(a.institution_id))
  );
$$;

-- A result the team changed in a review: the day it checked it. The college sees "Checked by the
-- AdmitLabs team" with the team's line, and the link stays.
alter table public.audit_checks add column team_checked_at timestamptz;

-- The ready fix: a text, a table or an outline to copy (src/domain/ready-fix.ts).
alter table public.audit_check_details add column ready_fix jsonb check (ready_fix is null or jsonb_typeof(ready_fix) = 'object');

alter table public.reports
  add column summary jsonb check (summary is null or jsonb_typeof(summary) = 'object'),
  add column review public.review_state not null default 'approved',
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null;
update public.reports set approved_at = created_at where approved_at is null;
alter table public.reports add constraint reports_waiting_unapproved check (review = 'approved' or (approved_at is null and approved_by is null));

drop policy reports_member_read on public.reports;
create policy reports_member_read on public.reports
  for select to authenticated using (private.is_member(institution_id) and review = 'approved');

drop policy reports_files_read on storage.objects;
create policy reports_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (
      (select private.is_team())
      or exists (
        select 1 from public.reports r
        where r.storage_path = objects.name and r.review = 'approved' and private.is_member(r.institution_id)
      )
    )
  );

-- Every change the team makes in a review: who, when, what it was, what it became and why.
create type public.edit_what as enum ('result', 'line', 'finding_removed', 'summary_line');

create table public.audit_edits (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.audits (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  what public.edit_what not null,
  -- What was changed, for example 'check:fees_shown:<program id>', 'finding:<finding key>' or 'summary:things:2'.
  target text not null check (char_length(target) between 1 and 300),
  before text,
  after text,
  reason text check (reason is null or char_length(reason) between 1 and 500),
  edited_by uuid references auth.users (id) on delete set null,
  edited_at timestamptz not null default now(),
  constraint audit_edits_one_parent check ((audit_id is null) <> (report_id is null))
);
create index audit_edits_audit_idx on public.audit_edits (audit_id, edited_at) where audit_id is not null;
create index audit_edits_report_idx on public.audit_edits (report_id, edited_at) where report_id is not null;

alter table public.audit_edits enable row level security;
grant select on public.audit_edits to authenticated;
grant all on public.audit_edits to service_role;
revoke all on public.audit_edits from anon;
create policy audit_edits_team_read on public.audit_edits
  for select to authenticated using ((select private.is_team()));

-- Findings ----------------------------------------------------------------------------------

create type public.finding_place as enum ('people', 'other');
create type public.finding_kind as enum ('good', 'bad', 'unanswered', 'listing', 'news', 'directory');
create type public.impact as enum ('high', 'medium', 'low');

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete cascade,
  place public.finding_place not null,
  kind public.finding_kind not null,
  -- The same finding month after month (a thread, a listing), so a mark and what changed can follow it.
  finding_key text not null check (char_length(finding_key) between 1 and 200),
  -- One short line of what was seen, in Drishti's words. Never the author's name or profile.
  line text not null check (char_length(line) between 1 and 400),
  source_name text not null check (char_length(source_name) between 1 and 120),
  source_url text not null,
  checked_at timestamptz not null,
  repeats smallint not null default 1 check (repeats > 0),
  -- For a listing or a directory entry: what is wrong with it, or null when it is right.
  listing text check (listing in ('old_details', 'missing_courses', 'missing')),
  -- The fix, when there is something to do.
  fix_title text check (fix_title is null or char_length(fix_title) between 1 and 200),
  fix_why text,
  fix_steps text[],
  ready_fix jsonb check (ready_fix is null or jsonb_typeof(ready_fix) = 'object'),
  effort public.difficulty,
  impact public.impact,
  fix_rank smallint check (fix_rank > 0),
  -- Taken out in a review: not about the college. Kept for the record, never shown to it.
  removed_at timestamptz,
  removed_by uuid references auth.users (id) on delete set null,
  constraint audit_findings_unique unique (audit_id, finding_key),
  constraint audit_findings_fix check (
    (fix_title is null and effort is null and impact is null and fix_rank is null)
    or (fix_title is not null and effort is not null and impact is not null)
  )
);
create index audit_findings_audit_idx on public.audit_findings (audit_id);
create index audit_findings_key_idx on public.audit_findings (institution_id, finding_key);

alter table public.audit_findings enable row level security;
grant select on public.audit_findings to authenticated;
grant all on public.audit_findings to service_role;
revoke all on public.audit_findings from anon;

-- People at the institution: findings of an Audit they may see. Free: the ones among its top 3 fixes.
create function private.can_see_finding(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audit_findings f
    join public.audits a on a.id = f.audit_id
    where f.id = target
      and f.removed_at is null
      and private.can_see_audit(f.audit_id)
      and (private.effective_tier(a.institution_id) <> 'free' or f.fix_rank <= private.free_top_limit())
  );
$$;

-- Trackers on Paid and Client: what is said about a rival, from its rival runs.
create function private.can_see_rival_finding(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.audit_findings f
    where f.id = target and f.removed_at is null and private.can_see_rival_audit(f.audit_id)
  );
$$;

revoke all on function private.can_see_finding(uuid), private.can_see_rival_finding(uuid) from public;
grant execute on function private.can_see_finding(uuid), private.can_see_rival_finding(uuid) to authenticated;

create policy audit_findings_member_read on public.audit_findings
  for select to authenticated using (private.can_see_finding(id));
create policy audit_findings_rival_read on public.audit_findings
  for select to authenticated using (private.can_see_rival_finding(id));
create policy audit_findings_team_read on public.audit_findings
  for select to authenticated using ((select private.is_team()));

-- Marks done on findings ----------------------------------------------------------------------

alter table public.done_marks
  add column finding_key text check (finding_key is null or char_length(finding_key) between 1 and 200),
  drop constraint done_marks_one_thing,
  drop constraint done_marks_checked,
  add constraint done_marks_one_thing check (num_nonnulls(check_key, finding_key, thing) = 1),
  add constraint done_marks_checked check (checked_by_audit is null or thing is null);
create unique index done_marks_open_finding on public.done_marks (institution_id, finding_key) where finding_key is not null and checked_by_audit is null;

-- Demand ------------------------------------------------------------------------------------

-- A count only when a source gives a real one (spec 9.5): search trends give a change, not a count.
alter table public.demand_items alter column count drop not null, alter column count drop default;

-- Make these 3: the 3 ideas picked for an institution each month, as they were picked.
create table public.content_picks (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  rank smallint not null check (rank between 1 and 3),
  program_id uuid references public.programs (id) on delete set null,
  -- The idea as picked: what to make, why, the format, the hook, the key points and its source.
  idea jsonb not null check (jsonb_typeof(idea) = 'object'),
  picked_at timestamptz not null default now(),
  primary key (institution_id, month, rank)
);

alter table public.content_picks enable row level security;
grant select on public.content_picks to authenticated;
grant all on public.content_picks to service_role;
revoke all on public.content_picks from anon;
-- Free sees the first one, for its program (spec section 10).
create policy content_picks_read on public.content_picks
  for select to authenticated
  using ((select private.is_team()) or (private.is_member(institution_id) and (private.effective_tier(institution_id) <> 'free' or rank = 1)));

-- Summary -----------------------------------------------------------------------------------

alter table public.memberships add column summary_email boolean not null default true;

-- Scoring -----------------------------------------------------------------------------------

alter table public.scoring_config
  add column impact jsonb not null default '{"highMinPoints": 12, "mediumMinPoints": 6}'::jsonb check (jsonb_typeof(impact) = 'object');

update public.scoring_config c
set labels = (
  select jsonb_agg(
    case bands.band ->> 'label'
      when 'Needs work' then jsonb_set(bands.band, '{label}', to_jsonb('Okay'::text))
      when 'Getting started' then jsonb_set(bands.band, '{label}', to_jsonb('Weak'::text))
      else bands.band
    end
    order by bands.position
  )
  from jsonb_array_elements(c.labels) with ordinality as bands(band, position)
)
where c.labels @> '[{"label": "Needs work"}]'::jsonb or c.labels @> '[{"label": "Getting started"}]'::jsonb;

-- Let AdmitLabs fix this -----------------------------------------------------------------------

alter table public.enquiries
  add column fix_key text check (fix_key is null or char_length(fix_key) between 1 and 200),
  add column fix_title text check (fix_title is null or char_length(fix_title) between 1 and 200),
  add constraint enquiries_fix_request check ((kind = 'fix_request') = (fix_key is not null and fix_title is not null));
create unique index enquiries_open_fix on public.enquiries (institution_id, fix_key) where kind = 'fix_request' and handled_at is null;
-- The server writes requests too (the sample world, and later the team's tools), with the service key.
grant select, insert, update on public.enquiries to service_role;

-- Leads -------------------------------------------------------------------------------------

create type public.lead_source as enum ('instagram', 'youtube', 'facebook', 'website', 'whatsapp', 'other');

-- Tracking links, made by the team for a Client: a name, where it is used, and one program.
create table public.lead_links (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  program_id uuid not null,
  -- The form's address: admitlabs.in/enquire/<code>.
  code text not null unique check (code ~ '^[a-z0-9]{6,16}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  used_on public.lead_source not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint lead_links_program_belongs foreign key (program_id, institution_id)
    references public.programs (id, institution_id) on delete cascade
);
create index lead_links_institution_idx on public.lead_links (institution_id, created_at);

-- The only individual student data in Drishti (spec section 23): sent by the student to that
-- college, with the consent line shown. Read by the college's own people only, never the team.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  link_id uuid references public.lead_links (id) on delete set null,
  -- The course the student picked: the link's program, or another of the college's programs.
  program_id uuid references public.programs (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  email text check (email is null or (char_length(email) <= 254 and email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  city text check (city is null or char_length(btrim(city)) between 2 and 80),
  -- The exact consent line the student saw.
  consent text not null check (char_length(consent) between 10 and 300),
  created_at timestamptz not null default now()
);
create index leads_institution_idx on public.leads (institution_id, created_at desc);
create index leads_link_idx on public.leads (link_id, created_at desc);
create index leads_contact_idx on public.leads (institution_id, phone);

-- Who gets the alert email, and how long enquiries are kept.
create table public.lead_settings (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  alert_emails text[] not null default '{}' check (cardinality(alert_emails) <= 3),
  keep_months smallint not null default 12 check (keep_months in (6, 12, 24)),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger lead_settings_touch_updated_at
  before update on public.lead_settings
  for each row execute function private.touch_updated_at();

alter table public.lead_links enable row level security;
alter table public.leads enable row level security;
alter table public.lead_settings enable row level security;
grant select on public.lead_links, public.leads, public.lead_settings to authenticated;
grant all on public.lead_links, public.leads, public.lead_settings to service_role;
revoke all on public.lead_links, public.leads, public.lead_settings from anon;

create policy lead_links_read on public.lead_links
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));
create policy leads_member_read on public.leads
  for select to authenticated using (private.is_member(institution_id) and not (select private.is_team()));
create policy lead_settings_read on public.lead_settings
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));

-- Every email Drishti sends: who to, when, and whether it went. Never the message itself.
create type public.email_kind as enum ('lead_alert', 'monthly_summary', 'audit_ready');

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  kind public.email_kind not null,
  institution_id uuid references public.institutions (id) on delete cascade,
  recipient text not null check (char_length(recipient) <= 254),
  sent_at timestamptz not null default now(),
  -- Which email sender sent it: the local test inbox in this build.
  sender text not null,
  ok boolean not null,
  error text
);
create index email_log_sent_idx on public.email_log (sent_at desc);

alter table public.email_log enable row level security;
grant select on public.email_log to authenticated;
grant all on public.email_log to service_role;
revoke all on public.email_log from anon;
create policy email_log_team_read on public.email_log
  for select to authenticated using ((select private.is_team()));

-- Saving an Audit -------------------------------------------------------------------------------

-- As before, plus: the review state (an own Audit waits when its college has Review first on),
-- the ready fix for each check, and the findings with their fixes. Only an approved own Audit
-- checks the marks done before it ran, and only an approved one sends its notification.
create or replace function public.record_audit(payload jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_institution uuid := (payload ->> 'institution_id')::uuid;
  v_kind public.audit_kind := (payload ->> 'kind')::public.audit_kind;
  v_trigger public.audit_trigger := (payload ->> 'trigger')::public.audit_trigger;
  v_run_at timestamptz := (payload ->> 'run_at')::timestamptz;
  v_review public.review_state := coalesce((payload ->> 'review')::public.review_state, 'approved');
  v_audit uuid;
  v_check uuid;
  item jsonb;
begin
  -- One Audit at a time per institution, so two refreshes cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtextextended(v_institution::text, 0));

  -- Paid gets one extra manual refresh each calendar month, India time (spec section 11).
  if v_trigger = 'manual' and v_kind = 'paid' and exists (
    select 1 from public.audits a
    where a.institution_id = v_institution and a.kind = 'paid' and a.trigger = 'manual'
      and date_trunc('month', a.run_at at time zone 'Asia/Kolkata') = date_trunc('month', v_run_at at time zone 'Asia/Kolkata')
  ) then
    raise exception 'refresh_used' using errcode = 'P0001';
  end if;

  insert into public.audits (
    institution_id, run_at, kind, trigger, program_count, overall, discovered, trusted, chosen,
    overall_change, discovered_change, trusted_change, chosen_change, config_version, created_by, previous_audit_id,
    review, approved_at, approved_by
  ) values (
    v_institution, v_run_at, v_kind, v_trigger, greatest(1, jsonb_array_length(coalesce(payload -> 'programs', '[]'::jsonb))),
    (payload ->> 'overall')::smallint, (payload ->> 'discovered')::smallint, (payload ->> 'trusted')::smallint, (payload ->> 'chosen')::smallint,
    (payload ->> 'overall_change')::smallint, (payload ->> 'discovered_change')::smallint,
    (payload ->> 'trusted_change')::smallint, (payload ->> 'chosen_change')::smallint,
    (payload ->> 'config_version')::integer, (payload ->> 'created_by')::uuid, (payload ->> 'previous_audit_id')::uuid,
    v_review,
    case when v_review = 'approved' then coalesce((payload ->> 'approved_at')::timestamptz, v_run_at) end,
    case when v_review = 'approved' then (payload ->> 'approved_by')::uuid end
  ) returning id into v_audit;

  insert into public.audit_program_scores (
    audit_id, program_id, overall, discovered, trusted, chosen, overall_change, discovered_change, trusted_change, chosen_change
  )
  select v_audit, (p ->> 'program_id')::uuid,
    (p ->> 'overall')::smallint, (p ->> 'discovered')::smallint, (p ->> 'trusted')::smallint, (p ->> 'chosen')::smallint,
    (p ->> 'overall_change')::smallint, (p ->> 'discovered_change')::smallint, (p ->> 'trusted_change')::smallint, (p ->> 'chosen_change')::smallint
  from jsonb_array_elements(payload -> 'programs') as p;

  for item in select value from jsonb_array_elements(payload -> 'checks') loop
    insert into public.audit_checks (
      audit_id, program_id, pillar, check_key, result, points_awarded, points_max, strength_rank, fix_rank, previous_result, checked_at
    ) values (
      v_audit, (item ->> 'program_id')::uuid, (item ->> 'pillar')::public.pillar, (item ->> 'check_key')::public.check_key,
      (item ->> 'result')::public.check_result, (item ->> 'points_awarded')::numeric, (item ->> 'points_max')::smallint,
      (item ->> 'strength_rank')::smallint, (item ->> 'fix_rank')::smallint, (item ->> 'previous_result')::public.check_result,
      (item ->> 'checked_at')::timestamptz
    ) returning id into v_check;
    insert into public.audit_check_details (audit_check_id, finding, why_it_matters, how_to_fix, fix_steps, ready_fix, difficulty, source_url)
    values (
      v_check, item ->> 'finding', item ->> 'why_it_matters', item ->> 'how_to_fix',
      (select array_agg(s.step order by s.position) from jsonb_array_elements_text(coalesce(item -> 'fix_steps', '[]'::jsonb)) with ordinality as s(step, position)),
      case when jsonb_typeof(item -> 'ready_fix') = 'object' then item -> 'ready_fix' end,
      (item ->> 'difficulty')::public.difficulty, item ->> 'source_url'
    );
  end loop;

  insert into public.audit_findings (
    audit_id, institution_id, place, kind, finding_key, line, source_name, source_url, checked_at, repeats, listing,
    fix_title, fix_why, fix_steps, ready_fix, effort, impact, fix_rank
  )
  select v_audit, v_institution, (f ->> 'place')::public.finding_place, (f ->> 'kind')::public.finding_kind,
    f ->> 'finding_key', f ->> 'line', f ->> 'source_name', f ->> 'source_url', (f ->> 'checked_at')::timestamptz,
    coalesce((f ->> 'repeats')::smallint, 1), f ->> 'listing',
    f -> 'fix' ->> 'title', f -> 'fix' ->> 'why',
    (select array_agg(s.step order by s.position) from jsonb_array_elements_text(coalesce(f -> 'fix' -> 'steps', '[]'::jsonb)) with ordinality as s(step, position)),
    case when jsonb_typeof(f -> 'fix' -> 'ready_fix') = 'object' then f -> 'fix' -> 'ready_fix' end,
    (f -> 'fix' ->> 'effort')::public.difficulty, (f -> 'fix' ->> 'impact')::public.impact, (f ->> 'fix_rank')::smallint
  from jsonb_array_elements(coalesce(payload -> 'findings', '[]'::jsonb)) as f;

  -- Mark as done: the first approved own Audit after a check or finding was marked checks it.
  -- A waiting Audit checks nothing until it is approved. Team and rival runs never do.
  if v_kind in ('free', 'paid', 'client') and v_review = 'approved' then
    update public.done_marks
    set checked_by_audit = v_audit
    where institution_id = v_institution and thing is null and checked_by_audit is null and marked_at <= v_run_at;
  end if;

  if v_review = 'approved' and jsonb_typeof(payload -> 'notification') = 'object' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (v_institution, 'audit_ready', payload -> 'notification' ->> 'text', payload -> 'notification' ->> 'link', v_run_at);
  end if;

  return v_audit;
end;
$$;

-- Saving a Demand pull ----------------------------------------------------------------------

-- As before, but a count stays empty when no source gave a real one.
create or replace function public.record_demand_pull(payload jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_scope public.demand_scope := (payload ->> 'scope')::public.demand_scope;
  v_region text := payload ->> 'region';
  v_state text := nullif(payload ->> 'state', '');
  v_program text := payload ->> 'program_key';
  v_month date := (payload ->> 'month')::date;
  v_pulled_at timestamptz := (payload ->> 'pulled_at')::timestamptz;
  v_pull uuid;
  spike jsonb;
begin
  insert into public.demand_pulls (scope, region, state, program_key, month, pulled_at)
  values (v_scope, v_region, v_state, v_program, v_month, v_pulled_at)
  on conflict on constraint demand_pulls_unique do update set pulled_at = excluded.pulled_at
  returning id into v_pull;

  delete from public.demand_items d where d.pull_id = v_pull;
  insert into public.demand_items (
    pull_id, kind, text, original_text, language, count, change_pct, rank, institution_id, sentiment, source_url, found_at, meta
  )
  select v_pull, (i ->> 'kind')::public.demand_kind, i ->> 'text', i ->> 'original_text',
    coalesce((i ->> 'language')::public.language, 'en'), (i ->> 'count')::integer, (i ->> 'change_pct')::numeric,
    (i ->> 'rank')::smallint, (i ->> 'institution_id')::uuid, (i ->> 'sentiment')::public.sentiment,
    i ->> 'source_url', (i ->> 'found_at')::timestamptz, coalesce(i -> 'meta', '{}'::jsonb)
  from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) as i;

  if v_scope = 'city' then
    for spike in select value from jsonb_array_elements(coalesce(payload -> 'spikes', '[]'::jsonb)) loop
      insert into public.notifications (institution_id, kind, text, link, created_at)
      select i.id, 'demand_spike', spike ->> 'notice', '/demand', v_pulled_at
      from public.institutions i
      join public.institution_status s on s.institution_id = i.id and s.claimed and s.claimed_at <= v_pulled_at
      where i.city = v_region
        and i.state = v_state
        and private.effective_tier(i.id, v_pulled_at) <> 'free'
        and exists (
          select 1 from public.programs g
          where g.institution_id = i.id and g.archived_at is null and g.program_key = v_program
        )
        and not exists (
          select 1 from public.notifications n
          where n.institution_id = i.id and n.kind = 'demand_spike' and n.text = spike ->> 'notice'
        );
    end loop;
  end if;

  return v_pull;
end;
$$;

-- The fastest rise, as before; a trend without a count sorts after one with a count.
create or replace function public.demand_highlight(p_institution uuid)
returns table (
  text text,
  change_pct numeric,
  count integer,
  source_url text,
  found_at timestamptz,
  program_name text,
  region text,
  month date
)
language sql stable security definer
set search_path = ''
as $$
  with me as (
    select i.id, i.city, i.state from public.institutions i
    where i.id = p_institution and (private.is_member(p_institution) or private.is_team())
  ),
  pulls as (
    select dp.program_id, dp.name, p.id as pull_id, p.region, p.month
    from me
    cross join private.demand_programs(me.id) dp
    join public.demand_pulls p on p.id = private.latest_demand_pull('city', me.city, me.state, dp.program_key)
  )
  select d.text, d.change_pct, d.count, d.source_url, d.found_at, pl.name, pl.region, pl.month
  from pulls pl
  join public.demand_items d on d.pull_id = pl.pull_id and d.kind = 'rising'
  order by d.change_pct desc nulls last, d.count desc nulls last, d.text
  limit 1;
$$;

-- Rival ads --------------------------------------------------------------------------------------

-- A rival's ad, entered by the team (the manual provider): the ad, and a "Started ads" move that
-- alerts the rival's Paid and Client trackers once (spec 8.3). Server only (service key).
create function public.record_rival_ad(payload jsonb) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_rival uuid := (payload ->> 'rival_institution_id')::uuid;
  v_entered_at timestamptz := coalesce((payload ->> 'entered_at')::timestamptz, now());
  v_ad uuid;
  v_move uuid;
begin
  insert into public.rival_ads (rival_institution_id, promise, source_url, entered_by, entered_at)
  values (v_rival, payload ->> 'promise', payload ->> 'source_url', (payload ->> 'entered_by')::uuid, v_entered_at)
  returning id into v_ad;

  insert into public.rival_moves (rival_institution_id, kind, description, source_url, detected_at)
  values (v_rival, 'started_ads', payload ->> 'description', payload ->> 'source_url', v_entered_at)
  on conflict on constraint rival_moves_unique do nothing
  returning id into v_move;

  if v_move is not null and coalesce((payload ->> 'notify')::boolean, false) then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    select r.institution_id, 'rival_move', payload ->> 'notice', '/rivals/' || v_rival::text, v_entered_at
    from public.rivals r
    where r.rival_institution_id = v_rival
      and r.added_at <= v_entered_at
      and private.effective_tier(r.institution_id, v_entered_at) <> 'free';
  end if;
  return v_ad;
end;
$$;

revoke all on function public.record_rival_ad(jsonb) from public, anon, authenticated;
grant execute on function public.record_rival_ad(jsonb) to service_role;

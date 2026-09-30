-- Phase 2: Audit. Schema changes.

-- How an Audit started: at signup, on its schedule, or by a manual refresh.
create type public.audit_trigger as enum ('signup', 'scheduled', 'manual');

-- Each Audit stores its change since the last one, so a Free institution can see what changed
-- without seeing its history (score history is Paid and Client only).
alter table public.audits
  add column trigger public.audit_trigger not null,
  -- How many programs the Audit covered, so points can be counted on the overall score even
  -- when a Free viewer can only see one of them.
  add column program_count smallint not null default 1 check (program_count > 0),
  add column previous_audit_id uuid references public.audits (id) on delete set null,
  add column overall_change smallint check (overall_change between -100 and 100),
  add column discovered_change smallint check (discovered_change between -100 and 100),
  add column trusted_change smallint check (trusted_change between -100 and 100),
  add column chosen_change smallint check (chosen_change between -100 and 100);
create index audits_manual_idx on public.audits (institution_id, run_at) where trigger = 'manual';

alter table public.audit_program_scores
  add column overall_change smallint check (overall_change between -100 and 100),
  add column discovered_change smallint check (discovered_change between -100 and 100),
  add column trusted_change smallint check (trusted_change between -100 and 100),
  add column chosen_change smallint check (chosen_change between -100 and 100);
create index audit_program_scores_program_idx on public.audit_program_scores (program_id);

-- What each check scored last time, for "Was Weak".
alter table public.audit_checks
  add column previous_result public.check_result;

-- Removing a program archives it, so past Audits keep their program rows and names.
alter table public.programs
  add column archived_at timestamptz;

-- City and state always come from the city list (all of India, a fixed list per state).
alter table public.institutions
  add constraint institutions_city_listed foreign key (city, state) references public.cities (name, state) on update cascade;

-- One record per website, so a signup can find and claim a record that already exists
-- (a rival someone tracks, or a team prospect). Scheme, "www." and paths are ignored.
create function private.website_host(url text) returns text
language sql immutable
set search_path = ''
as $$
  select lower(regexp_replace(regexp_replace(btrim(url), '^[a-zA-Z][a-zA-Z0-9+.-]*://', ''), '^www\.|[/?#:].*$', '', 'g'));
$$;
grant usage on schema private to service_role;
grant execute on function private.website_host(text) to authenticated, service_role;
create unique index institutions_website_host_key on public.institutions (private.website_host(website));

-- Member invites. No email is sent in this build: the invited person joins as a Member when
-- they sign in with this address.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  constraint accepted_together check ((accepted_at is null) = (accepted_by is null))
);
create unique index invites_pending_unique on public.invites (institution_id, email) where accepted_at is null;
create index invites_email_idx on public.invites (email) where accepted_at is null;

grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
revoke all on public.invites from anon;
alter table public.invites enable row level security;

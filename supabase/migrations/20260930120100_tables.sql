-- Drishti tables (spec section 16). Names follow the spec; refinements are commented.

-- Reference list so the state can be derived from the city.
create table public.cities (
  name text not null,
  state text not null,
  primary key (name, state)
);

-- Public profile only. Internal flags live in institution_status, so a rival's row can be
-- shown to an institution that tracks it without leaking who has claimed it or who is a prospect.
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  type public.institution_type not null,
  city text not null,
  state text not null,
  website text not null,
  instagram text,
  youtube text,
  other_links jsonb not null default '{}'::jsonb check (jsonb_typeof(other_links) = 'object'),
  created_at timestamptz not null default now()
);

create table public.institution_status (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  claimed boolean not null default false,
  claimed_at timestamptz,
  is_prospect boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  constraint claimed_has_date check (not claimed or claimed_at is not null)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Normalised key (for example 'bba') so Demand pulls can be shared by region and program.
  program_key text check (program_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  unique (institution_id, name),
  unique (id, institution_id)
);
create index programs_institution_idx on public.programs (institution_id);
create index programs_key_idx on public.programs (program_key);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, institution_id)
);
create index memberships_institution_idx on public.memberships (institution_id);
create unique index memberships_one_owner on public.memberships (institution_id) where role = 'owner';

create table public.team_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.team_role not null,
  created_at timestamptz not null default now()
);

-- One current plan per institution. The effective tier is worked out when read:
-- a Paid plan past its end date counts as Free (see private.effective_tier).
create table public.plans (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  tier public.tier not null default 'free',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  set_by uuid references auth.users (id) on delete set null,
  free_program_id uuid,
  updated_at timestamptz not null default now(),
  constraint paid_has_end check (tier <> 'paid' or ends_at is not null),
  constraint ends_after_start check (ends_at is null or ends_at > starts_at),
  constraint free_program_belongs foreign key (free_program_id, institution_id)
    references public.programs (id, institution_id) on delete set null (free_program_id)
);
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function private.touch_updated_at();

-- Every [ADJUSTABLE] scoring value, versioned. Exactly one version is active.
create table public.scoring_config (
  version integer primary key check (version > 0),
  weights jsonb not null,
  result_shares jsonb not null,
  thresholds jsonb not null,
  labels jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index scoring_config_one_active on public.scoring_config (active) where active;

-- Raw facts from providers. Every signal keeps its source and the date it was checked.
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  program_id uuid,
  provider text not null,
  check_key public.check_key not null,
  value jsonb not null,
  source_url text not null,
  fetched_at timestamptz not null,
  constraint signals_program_belongs foreign key (program_id, institution_id)
    references public.programs (id, institution_id) on delete cascade
);
create index signals_lookup_idx on public.signals (institution_id, check_key, fetched_at desc);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  run_at timestamptz not null default now(),
  kind public.audit_kind not null,
  overall smallint not null check (overall between 0 and 100),
  discovered smallint not null check (discovered between 0 and 100),
  trusted smallint not null check (trusted between 0 and 100),
  chosen smallint not null check (chosen between 0 and 100),
  config_version integer not null references public.scoring_config (version),
  created_by uuid references auth.users (id) on delete set null
);
create index audits_institution_idx on public.audits (institution_id, run_at desc);

create table public.audit_program_scores (
  audit_id uuid not null references public.audits (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  overall smallint not null check (overall between 0 and 100),
  discovered smallint not null check (discovered between 0 and 100),
  trusted smallint not null check (trusted between 0 and 100),
  chosen smallint not null check (chosen between 0 and 100),
  primary key (audit_id, program_id)
);

-- Results only. Every tier sees these. Ranks are written by the scoring engine.
create table public.audit_checks (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  program_id uuid references public.programs (id) on delete cascade,
  pillar public.pillar not null,
  check_key public.check_key not null,
  result public.check_result not null,
  points_awarded numeric(5, 2) not null check (points_awarded >= 0),
  points_max smallint not null check (points_max >= 0),
  strength_rank smallint check (strength_rank > 0),
  fix_rank smallint check (fix_rank > 0),
  checked_at timestamptz not null,
  constraint points_within_max check (points_awarded <= points_max),
  constraint audit_checks_unique unique nulls not distinct (audit_id, program_id, check_key)
);
create index audit_checks_audit_idx on public.audit_checks (audit_id);

-- Refinement: details sit in their own rows so the Free rule (details only for the top 3
-- strengths and top 3 fixes) is a row rule that RLS can enforce, not a UI choice.
create table public.audit_check_details (
  audit_check_id uuid primary key references public.audit_checks (id) on delete cascade,
  finding text not null,
  why_it_matters text,
  how_to_fix text,
  difficulty public.difficulty,
  source_url text not null
);

create table public.rivals (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  rival_institution_id uuid not null references public.institutions (id) on delete cascade,
  suggested boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (institution_id, rival_institution_id),
  constraint not_own_rival check (institution_id <> rival_institution_id)
);
create index rivals_rival_idx on public.rivals (rival_institution_id);

create table public.rival_moves (
  id uuid primary key default gen_random_uuid(),
  rival_institution_id uuid not null references public.institutions (id) on delete cascade,
  kind public.rival_move_kind not null,
  description text not null,
  source_url text not null,
  detected_at timestamptz not null
);
create index rival_moves_rival_idx on public.rival_moves (rival_institution_id, detected_at desc);

create table public.rival_content (
  id uuid primary key default gen_random_uuid(),
  rival_institution_id uuid not null references public.institutions (id) on delete cascade,
  platform public.content_platform not null,
  url text not null,
  title text not null,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  why_it_worked text,
  month date not null check (extract(day from month) = 1),
  posted_at timestamptz
);
create index rival_content_rival_idx on public.rival_content (rival_institution_id, month desc);

-- Entered by the team for now (manual provider).
create table public.rival_ads (
  id uuid primary key default gen_random_uuid(),
  rival_institution_id uuid not null references public.institutions (id) on delete cascade,
  promise text not null,
  source_url text not null,
  entered_by uuid references auth.users (id) on delete set null,
  entered_at timestamptz not null default now()
);
create index rival_ads_rival_idx on public.rival_ads (rival_institution_id, entered_at desc);

-- Collected once per region, program and month, then shared by every institution that needs it.
create table public.demand_pulls (
  id uuid primary key default gen_random_uuid(),
  scope public.demand_scope not null,
  region text not null,
  program_key text not null,
  month date not null check (extract(day from month) = 1),
  pulled_at timestamptz not null default now(),
  unique (scope, region, program_key, month)
);

-- Grouped only: a topic, a count and a source link. Never a person.
create table public.demand_items (
  id uuid primary key default gen_random_uuid(),
  pull_id uuid not null references public.demand_pulls (id) on delete cascade,
  kind public.demand_kind not null,
  -- Shown in the product (English). The original wording is kept for Hindi and Assamese.
  text text not null,
  original_text text,
  language public.language not null default 'en',
  count integer not null default 0 check (count >= 0),
  change_pct numeric(6, 1),
  rank smallint check (rank > 0),
  -- Mentions only: which institution the grouped mention is about, and whether it is good or bad.
  institution_id uuid references public.institutions (id) on delete cascade,
  sentiment public.sentiment,
  source_url text not null,
  found_at timestamptz not null,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  constraint original_only_when_translated check (original_text is null or language <> 'en'),
  constraint mention_fields check (
    (kind = 'mention' and institution_id is not null and sentiment is not null)
    or (kind <> 'mention' and institution_id is null and sentiment is null)
  )
);
create index demand_items_pull_idx on public.demand_items (pull_id, kind);
create index demand_items_institution_idx on public.demand_items (institution_id) where institution_id is not null;

-- "3 things to do" and similar monthly actions.
create table public.actions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  rank smallint not null check (rank > 0),
  text text not null,
  feature public.feature not null,
  unique (institution_id, month, rank)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (institution_id, month)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  kind public.notification_kind not null,
  text text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_institution_idx on public.notifications (institution_id, created_at desc);

-- Team only. Never visible to institution users.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index notes_institution_idx on public.notes (institution_id, created_at desc);

create table public.share_links (
  token text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  audit_id uuid not null references public.audits (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index share_links_institution_idx on public.share_links (institution_id);

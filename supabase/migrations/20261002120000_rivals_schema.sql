-- Phase 3: Rivals. Schema changes.

-- The weekly check finds the same page again and again, so a move is stored once.
alter table public.rival_moves
  add constraint rival_moves_unique unique (rival_institution_id, kind, description);

-- Each weekly check of a rival's public presence (moves and best content). A missed week can
-- catch up, and the page can say when Drishti last looked.
create table public.rival_checks (
  rival_institution_id uuid not null references public.institutions (id) on delete cascade,
  -- The Monday (India date) of the week the check covers.
  week date not null check (extract(isodow from week) = 1),
  checked_at timestamptz not null,
  primary key (rival_institution_id, week)
);

-- Every saved rival list, so the plan rules hold: Free picks once, Paid changes once each
-- calendar month (India time), Client any time. The first setup does not count as a change.
create table public.rival_changes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null,
  first_setup boolean not null,
  rival_ids uuid[] not null
);
create index rival_changes_institution_idx on public.rival_changes (institution_id, changed_at desc);

-- 3 things to do: each feature keeps its own ranked list per month, with a line of detail,
-- the rival it was learned from and the check it is about, when there is one.
alter table public.actions
  drop constraint actions_institution_id_month_rank_key,
  add constraint actions_unique unique (institution_id, month, feature, rank),
  add column detail text,
  add column rival_institution_id uuid references public.institutions (id) on delete set null,
  add column check_key public.check_key,
  add column created_at timestamptz not null default now();

grant select, insert, update, delete on public.rival_checks, public.rival_changes to authenticated;
grant all on public.rival_checks, public.rival_changes to service_role;
revoke all on public.rival_checks, public.rival_changes from anon;
alter table public.rival_checks enable row level security;
alter table public.rival_changes enable row level security;

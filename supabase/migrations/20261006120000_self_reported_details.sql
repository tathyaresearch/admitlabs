-- Self-reported details (Settings, "Added by you"): what an institution says about itself and
-- each of its programs. All optional.
--
--   Never in the score. The Audit scores public data only and never reads these tables. They
--   add context: an "Added by you" block on the checks they relate to, a line of advice built on
--   them where the plan shows how to fix, and the monthly report.
--   Private. Members of the institution and the AdmitLabs team read them. Only the owner writes
--   them. A rival tracking the institution never sees them.

create function private.short_list(items text[], max_items integer, max_length integer) returns boolean
language sql immutable
set search_path = ''
as $$
  select items is null or (
    cardinality(items) <= max_items
    and not exists (select 1 from unnest(items) as item where char_length(trim(item)) not between 1 and max_length)
  );
$$;

create table public.institution_details (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  founded_year smallint check (founded_year between 1800 and 2100),
  naac_grade text check (naac_grade in ('A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'not_accredited')),
  nirf_rank smallint check (nirf_rank between 1 and 1000),
  nirf_year smallint check (nirf_year between 2016 and 2100),
  aicte_approved boolean,
  ugc_recognised boolean,
  skilling_recognition text[] check (skilling_recognition <@ array['nsdc', 'skill_india', 'sector_skill_council', 'state_skill_mission']),
  other_approvals text check (char_length(other_approvals) between 1 and 100),
  campus_address text check (char_length(campus_address) between 1 and 200),
  admissions_phone text check (admissions_phone ~ '^\+?[0-9 ]{8,16}$'),
  admissions_email text check (char_length(admissions_email) <= 120 and admissions_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  hostel text check (hostel in ('none', 'boys', 'girls', 'both')),
  scholarships text check (char_length(scholarships) between 1 and 200),
  difference text check (char_length(difference) between 1 and 280),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint institution_details_nirf check (nirf_year is null or nirf_rank is not null)
);

create table public.program_details (
  program_id uuid primary key,
  institution_id uuid not null references public.institutions (id) on delete cascade,
  duration_value smallint check (duration_value between 1 and 120),
  duration_unit text check (duration_unit in ('months', 'years')),
  fees_amount integer check (fees_amount between 0 and 100000000),
  fees_period text check (fees_period in ('year', 'total')),
  seats integer check (seats between 1 and 100000),
  eligibility text check (char_length(eligibility) between 1 and 120),
  specialisations text[] check (private.short_list(specialisations, 5, 60)),
  placement_year smallint check (placement_year between 2000 and 2100),
  placed_percent smallint check (placed_percent between 0 and 100),
  average_package numeric(6, 2) check (average_package between 0 and 9999),
  highest_package numeric(6, 2) check (highest_package between 0 and 9999),
  top_recruiters text[] check (private.short_list(top_recruiters, 5, 60)),
  applications_open date,
  applications_close date,
  page_url text check (char_length(page_url) <= 300 and page_url ~ '^https?://'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- The program belongs to this institution.
  foreign key (program_id, institution_id) references public.programs (id, institution_id) on delete cascade,
  constraint program_details_duration check ((duration_value is null) = (duration_unit is null)),
  constraint program_details_fees check ((fees_amount is null) = (fees_period is null)),
  constraint program_details_packages check (highest_package is null or average_package is null or highest_package >= average_package),
  constraint program_details_dates check (applications_open is null or applications_close is null or applications_close >= applications_open)
);
create index program_details_institution_idx on public.program_details (institution_id);

alter table public.institution_details enable row level security;
alter table public.program_details enable row level security;

-- Read: members and the team. Never a rival that tracks the institution.
create policy institution_details_read on public.institution_details
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));
create policy program_details_read on public.program_details
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));

-- Write: the owner only.
create policy institution_details_owner_insert on public.institution_details
  for insert to authenticated with check (private.is_owner(institution_id));
create policy institution_details_owner_update on public.institution_details
  for update to authenticated using (private.is_owner(institution_id)) with check (private.is_owner(institution_id));
create policy institution_details_owner_delete on public.institution_details
  for delete to authenticated using (private.is_owner(institution_id));
create policy program_details_owner_insert on public.program_details
  for insert to authenticated with check (private.is_owner(institution_id));
create policy program_details_owner_update on public.program_details
  for update to authenticated using (private.is_owner(institution_id)) with check (private.is_owner(institution_id));
create policy program_details_owner_delete on public.program_details
  for delete to authenticated using (private.is_owner(institution_id));

grant select, insert, update, delete on public.institution_details, public.program_details to authenticated;
grant all on public.institution_details, public.program_details to service_role;
revoke all on public.institution_details, public.program_details from anon;
-- The list check runs as whoever writes a row.
grant execute on function private.short_list(text[], integer, integer) to authenticated, service_role;

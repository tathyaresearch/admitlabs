-- Product review part 6: the AdmitLabs team's work log for a Client (C5), behind the "Your
-- AdmitLabs team" card on the Client's Home (C4). The team writes what it did, or does next, with
-- the date and a link to the work when there is one. The Client's people read it while the
-- AdmitLabs service is active. No other plan sees it, and only the team writes it.

create type public.team_work_kind as enum ('done', 'next');

create table public.team_work (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  kind public.team_work_kind not null default 'done',
  -- What was done, or what is next, in a sentence the institution reads.
  body text not null check (char_length(btrim(body)) between 3 and 300),
  -- The day it was done, or for Next, the day it is due.
  work_on date not null,
  link text check (link is null or (link ~* '^https?://[^[:space:]]+$' and char_length(link) <= 500)),
  added_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index team_work_institution_idx on public.team_work (institution_id, work_on desc, created_at desc);

alter table public.team_work enable row level security;
grant select, insert, update, delete on public.team_work to authenticated;
grant all on public.team_work to service_role;
revoke all on public.team_work from anon;

-- The team reads every log, and adds to a Client's log in its own name.
create policy team_work_team_read on public.team_work
  for select to authenticated using ((select private.is_team()));
create policy team_work_team_add on public.team_work
  for insert to authenticated
  with check ((select private.is_team()) and added_by = (select auth.uid()) and private.effective_tier(institution_id) = 'client');
-- The log is the team's shared work: anyone on the team marks Next as done, or removes an entry.
create policy team_work_team_change on public.team_work
  for update to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy team_work_team_remove on public.team_work
  for delete to authenticated using ((select private.is_team()));

-- A Client's own people read their log while the AdmitLabs service is active.
create policy team_work_client_read on public.team_work
  for select to authenticated using (private.is_member(institution_id) and private.effective_tier(institution_id) = 'client');

-- Grants and row level security.
-- API roles get table privileges explicitly (new tables are not auto-exposed); RLS decides rows.
-- anon gets nothing: sign-in goes through the Auth API, never through tables.

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;

-- RLS on for every table. Nothing is readable unless a policy below allows it.
alter table public.cities enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_status enable row level security;
alter table public.programs enable row level security;
alter table public.memberships enable row level security;
alter table public.team_users enable row level security;
alter table public.plans enable row level security;
alter table public.scoring_config enable row level security;
alter table public.signals enable row level security;
alter table public.audits enable row level security;
alter table public.audit_program_scores enable row level security;
alter table public.audit_checks enable row level security;
alter table public.audit_check_details enable row level security;
alter table public.rivals enable row level security;
alter table public.rival_moves enable row level security;
alter table public.rival_content enable row level security;
alter table public.rival_ads enable row level security;
alter table public.demand_pulls enable row level security;
alter table public.demand_items enable row level security;
alter table public.actions enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.notes enable row level security;
alter table public.share_links enable row level security;

-- Cities: a shared reference list.
create policy cities_read on public.cities
  for select to authenticated using (true);
create policy cities_team_write on public.cities
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Institutions: your own, and rivals you track. Team sees everything, including prospects.
create policy institutions_read on public.institutions
  for select to authenticated
  using ((select private.is_team()) or private.is_member(id) or private.tracks(id));
create policy institutions_team_write on public.institutions
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Internal flags: your own institution only. Never a rival's.
create policy institution_status_read on public.institution_status
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));
create policy institution_status_team_write on public.institution_status
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

create policy programs_read on public.programs
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id) or private.tracks(institution_id));
create policy programs_team_write on public.programs
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Members of an institution can see each other. Only the team adds or removes members for now.
create policy memberships_read on public.memberships
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));
create policy memberships_team_write on public.memberships
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Team users: the team sees the team; anyone can see their own row. Only Admin changes it.
create policy team_users_read on public.team_users
  for select to authenticated
  using ((select private.is_team()) or user_id = (select auth.uid()));
create policy team_users_admin_write on public.team_users
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Plans: members read their own. Only Admin sets tiers and dates, so nobody can raise their own tier.
create policy plans_read on public.plans
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));
create policy plans_admin_write on public.plans
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy scoring_config_team_read on public.scoring_config
  for select to authenticated using ((select private.is_team()));
create policy scoring_config_admin_write on public.scoring_config
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Notifications: members read their institution's list.
create policy notifications_read on public.notifications
  for select to authenticated
  using ((select private.is_team()) or private.is_member(institution_id));
create policy notifications_team_write on public.notifications
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Notes: team only. Never visible to institution users.
create policy notes_team_only on public.notes
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Feature tables: team only for now. Each feature phase adds the institution-side
-- policies with its plan rules from section 10 of the spec, together with tests.
create policy signals_team_only on public.signals
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy audits_team_only on public.audits
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy audit_program_scores_team_only on public.audit_program_scores
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy audit_checks_team_only on public.audit_checks
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy audit_check_details_team_only on public.audit_check_details
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy rivals_team_only on public.rivals
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy rival_moves_team_only on public.rival_moves
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy rival_content_team_only on public.rival_content
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy rival_ads_team_only on public.rival_ads
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy demand_pulls_team_only on public.demand_pulls
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy demand_items_team_only on public.demand_items
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy actions_team_only on public.actions
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy reports_team_only on public.reports
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));
create policy share_links_team_only on public.share_links
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

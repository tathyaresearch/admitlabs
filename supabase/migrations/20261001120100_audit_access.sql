-- The institution side of the Audit, with the plan rules from spec section 10, enforced in the
-- database. The app reads Audits as the signed-in user, so these rules decide what reaches the
-- page. Locked areas show placeholders because the real rows never arrive.
--
--   Audits             Free: the latest one only (no history). Paid, Client: all of their own.
--   Program scores     Free: the one program their Audit covers. Paid, Client: every program.
--   Check results      Same as program scores; institution checks are shared by every program.
--   Check details      Free: the top 3 strengths and top 3 fixes. Paid, Client: all.
--
-- An institution never sees team runs (prospect Audits) or rival runs of its own record.

-- How many strengths and fixes Free sees in full. Mirrors the "Top 3" rows in
-- src/config/entitlements.ts; a test on each side checks they agree.
create function private.free_top_limit() returns integer
language sql immutable
set search_path = ''
as $$
  select 3;
$$;

-- The newest of an institution's own Audits.
create function private.latest_own_audit(target uuid) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select a.id
  from public.audits a
  where a.institution_id = target and a.kind in ('free', 'paid', 'client')
  order by a.run_at desc, a.id desc
  limit 1;
$$;

create function private.can_see_audit(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audits a
    where a.id = target
      and a.kind in ('free', 'paid', 'client')
      and private.is_member(a.institution_id)
      and (private.effective_tier(a.institution_id) <> 'free' or a.id = private.latest_own_audit(a.institution_id))
  );
$$;

-- Free sees one program: the one a Free Audit covered, or their chosen Free program inside an
-- older Paid or Client Audit. A null program is an institution check, shared by all.
create function private.can_see_audit_program(audit uuid, program uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_see_audit(audit)
    and (
      program is null
      or exists (
        select 1
        from public.audits a
        left join public.plans p on p.institution_id = a.institution_id
        where a.id = audit
          and (private.effective_tier(a.institution_id) <> 'free' or a.kind = 'free' or p.free_program_id = program)
      )
    );
$$;

create function private.can_see_check_detail(target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audit_checks c
    join public.audits a on a.id = c.audit_id
    where c.id = target
      and private.can_see_audit_program(c.audit_id, c.program_id)
      and (
        private.effective_tier(a.institution_id) <> 'free'
        or c.strength_rank <= private.free_top_limit()
        or c.fix_rank <= private.free_top_limit()
      )
  );
$$;

revoke all on function
  private.free_top_limit(),
  private.latest_own_audit(uuid),
  private.can_see_audit(uuid),
  private.can_see_audit_program(uuid, uuid),
  private.can_see_check_detail(uuid)
from public;
grant execute on function
  private.free_top_limit(),
  private.latest_own_audit(uuid),
  private.can_see_audit(uuid),
  private.can_see_audit_program(uuid, uuid),
  private.can_see_check_detail(uuid)
to authenticated;

create policy audits_member_read on public.audits
  for select to authenticated using (private.can_see_audit(id));
create policy audit_program_scores_member_read on public.audit_program_scores
  for select to authenticated using (private.can_see_audit_program(audit_id, program_id));
create policy audit_checks_member_read on public.audit_checks
  for select to authenticated using (private.can_see_audit_program(audit_id, program_id));
create policy audit_check_details_member_read on public.audit_check_details
  for select to authenticated using (private.can_see_check_detail(audit_check_id));

-- Invites: people at the institution can see who has been invited. Changes go through the
-- owner functions (owner_actions migration); the team can manage them directly.
create policy invites_read on public.invites
  for select to authenticated using ((select private.is_team()) or private.is_member(institution_id));
create policy invites_team_write on public.invites
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

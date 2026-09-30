-- Phase 5: the monthly report (spec section 12). One PDF per institution per month, made on the
-- 1st for the month just ended, for Paid and Client. Stored in a private bucket.
--
--   Reports list   Members of the institution. Past reports stay downloadable after a Paid plan
--                  ends; only Paid and Client get new ones (the maker checks the plan).
--   Files          Readable only through the reports list: a member of the institution that owns
--                  the file, or the team. Written by the server only.

alter table public.reports
  add column pages smallint check (pages > 0),
  add column size_bytes integer check (size_bytes > 0);

create policy reports_member_read on public.reports
  for select to authenticated using (private.is_member(institution_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy reports_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (
      (select private.is_team())
      or exists (select 1 from public.reports r where r.storage_path = objects.name and private.is_member(r.institution_id))
    )
  );

-- Saves a made report: its row (replacing an earlier one for the same month) and, when there is
-- a notice, "Your September report is ready." Server only (service key).
create function public.record_report(
  p_institution uuid,
  p_month date,
  p_storage_path text,
  p_pages smallint,
  p_size integer,
  p_made_at timestamptz,
  p_notice text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_report uuid;
begin
  insert into public.reports (institution_id, month, storage_path, pages, size_bytes, created_at)
  values (p_institution, p_month, p_storage_path, p_pages, p_size, p_made_at)
  on conflict (institution_id, month) do update
    set storage_path = excluded.storage_path, pages = excluded.pages, size_bytes = excluded.size_bytes, created_at = excluded.created_at
  returning id into v_report;

  if coalesce(p_notice, '') <> '' then
    insert into public.notifications (institution_id, kind, text, link, created_at)
    values (p_institution, 'report_ready', p_notice, '/reports', p_made_at);
  end if;
  return v_report;
end;
$$;

revoke all on function public.record_report(uuid, date, text, smallint, integer, timestamptz, text) from public, anon, authenticated;
grant execute on function public.record_report(uuid, date, text, smallint, integer, timestamptz, text) to service_role;

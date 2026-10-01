-- Enquiries from the AdmitLabs website's "Work with us" form (admitlabs.in/work-with-us).
--
--   Visitors only add one, through submit_enquiry(), which checks every field again (the form
--   checks first, src/site/enquiry.ts) and turns away more than three a day from one email.
--   Nobody reads the table without signing in. Every AdmitLabs team user reads every enquiry and
--   marks it handled, or new again, through set_enquiry_handled(). No emails are sent.

create type public.enquiry_role as enum ('founder_director', 'principal_dean', 'admissions', 'marketing', 'other');

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  institution text not null check (char_length(institution) between 2 and 160),
  role public.enquiry_role not null,
  email text not null check (char_length(email) <= 254 and email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  program text check (program is null or char_length(program) between 1 and 160),
  message text check (message is null or char_length(message) between 1 and 2000),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  constraint enquiries_handled check (handled_by is null or handled_at is not null)
);

create index enquiries_newest on public.enquiries (created_at desc);
create index enquiries_by_email on public.enquiries (email, created_at desc);

alter table public.enquiries enable row level security;
grant select on public.enquiries to authenticated;
revoke all on public.enquiries from anon;
create policy enquiries_team_read on public.enquiries
  for select to authenticated using ((select private.is_team()));

-- How many enquiries one email sends in a day. Mirrors ENQUIRY_RULES.perEmailPerDay in
-- src/config/site.ts; a test on each side checks they agree.
create function private.enquiries_per_email_per_day() returns integer
language sql immutable
set search_path = ''
as $$
  select 3;
$$;

create function public.submit_enquiry(
  p_name text,
  p_institution text,
  p_role public.enquiry_role,
  p_email text,
  p_phone text,
  p_program text,
  p_message text
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if (
    select count(*) from public.enquiries
    where email = v_email and created_at > now() - interval '1 day'
  ) >= private.enquiries_per_email_per_day() then
    raise exception 'enquiry_limit' using errcode = 'P0001';
  end if;

  insert into public.enquiries (name, institution, role, email, phone, program, message)
  values (
    regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'),
    regexp_replace(trim(coalesce(p_institution, '')), '[[:space:]]+', ' ', 'g'),
    p_role,
    v_email,
    regexp_replace(coalesce(p_phone, ''), '[[:space:]().-]', '', 'g'),
    nullif(regexp_replace(trim(coalesce(p_program, '')), '[[:space:]]+', ' ', 'g'), ''),
    nullif(trim(coalesce(p_message, '')), '')
  );
end;
$$;

create function public.set_enquiry_handled(p_enquiry uuid, p_handled boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'not_team' using errcode = '42501';
  end if;
  update public.enquiries
  set handled_at = case when p_handled then coalesce(handled_at, now()) end,
      handled_by = case when p_handled then coalesce(handled_by, (select auth.uid())) end
  where id = p_enquiry;
end;
$$;

revoke all on function
  private.enquiries_per_email_per_day(),
  public.submit_enquiry(text, text, public.enquiry_role, text, text, text, text),
  public.set_enquiry_handled(uuid, boolean)
from public, anon;
-- The form has no sign in.
grant execute on function public.submit_enquiry(text, text, public.enquiry_role, text, text, text, text) to anon, authenticated;
grant execute on function public.set_enquiry_handled(uuid, boolean) to authenticated;

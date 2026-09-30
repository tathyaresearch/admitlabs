-- Drishti foundation: schemas, types and shared helpers.

create schema if not exists private;
comment on schema private is 'Helpers for row level security. Not exposed through the API.';
revoke all on schema private from public;

-- Fixed lists. Enums keep the generated TypeScript types exact.
create type public.institution_type as enum ('college', 'university', 'skilling');
create type public.tier as enum ('free', 'paid', 'client');
create type public.membership_role as enum ('owner', 'member');
create type public.team_role as enum ('team', 'admin');
create type public.pillar as enum ('discovered', 'trusted', 'chosen');
create type public.check_key as enum (
  'google_search', 'instagram_activity', 'google_profile', 'youtube', 'ai_answers', 'other_socials',
  'placement_proof', 'review_rating', 'approvals', 'faculty_leaders', 'students_in_content',
  'fees_shown', 'program_page', 'easy_enquiry', 'admission_steps', 'mobile_friendly', 'page_speed'
);
create type public.check_result as enum ('strong', 'okay', 'weak', 'missing');
create type public.difficulty as enum ('easy', 'medium', 'hard');
-- 'team' runs stay private until shared. 'rival' runs score institutions that others track.
create type public.audit_kind as enum ('free', 'paid', 'client', 'team', 'rival');
create type public.rival_move_kind as enum ('new_program', 'fee_change', 'new_page', 'admission_dates');
create type public.content_platform as enum ('instagram', 'youtube');
create type public.demand_scope as enum ('city', 'state', 'india');
create type public.demand_kind as enum ('rising', 'falling', 'question', 'worry', 'mention', 'season', 'idea');
create type public.language as enum ('en', 'hi', 'as');
create type public.sentiment as enum ('positive', 'negative');
create type public.feature as enum ('audit', 'rivals', 'demand');
create type public.notification_kind as enum ('audit_ready', 'rival_move', 'demand_spike', 'plan_reminder', 'plan_ended');

-- Keeps updated_at honest on tables that have it.
create function private.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

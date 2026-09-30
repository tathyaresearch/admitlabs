-- Phase 5: "Your September report is ready." A new enum value has to be committed before it is
-- used, so it sits in a migration of its own.
alter type public.notification_kind add value if not exists 'report_ready';

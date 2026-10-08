-- Client Brain (spec section 26), part 1: the notice "Your Brain is ready". An enum value is
-- added alone: it can only be used once this has committed (20261021120100_client_brain.sql).

alter type public.notification_kind add value if not exists 'brain_ready';

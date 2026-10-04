-- Version 2 (October 2026): the new values of existing kinds. Added on their own, before the
-- migration that uses them, because a new enum value cannot be used in the transaction that
-- adds it.
--
--   Rival alerts      started ads, a big jump in reviews (spec 8.3).
--   Demand items      what students ask about each topic, what gets attention, the best months
--                     to post (spec 9.4). Version 1's worry, mention and season stay for old rows.
--   Enquiries         Let AdmitLabs fix this (spec 7.7).

alter type public.rival_move_kind add value if not exists 'started_ads';
alter type public.rival_move_kind add value if not exists 'reviews_jump';

alter type public.demand_kind add value if not exists 'topic';
alter type public.demand_kind add value if not exists 'content';
alter type public.demand_kind add value if not exists 'best_month';

alter type public.enquiry_kind add value if not exists 'fix_request';

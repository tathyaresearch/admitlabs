-- Version 2 review (October 2026): the new value of an existing kind, added on its own, before the
-- migration that uses it, because a new enum value cannot be used in the transaction that adds it.
--
--   Enquiries       ask_services: "Talk to AdmitLabs" from the dashboard's sidebar, on Free and Paid.

alter type public.enquiry_kind add value if not exists 'ask_services';

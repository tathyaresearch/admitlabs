-- Enquiries, our own leads (spec section 27): a new Free college comes in as an enquiry, and each
-- new or returning lead emails the team. Their own migration, so the next one can use them.

alter type public.enquiry_kind add value if not exists 'free_signup';
alter type public.email_kind add value if not exists 'team_lead_alert';

-- Make Client for a college not in Drishti (spec section 27): the owner gets an email to sign in.
-- Its own migration, so the next one can use it.

alter type public.email_kind add value if not exists 'client_invite';

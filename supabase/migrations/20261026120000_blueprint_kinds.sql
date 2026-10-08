-- The Blueprint (spec section 26): the college approves it or asks for changes, and the team gets an
-- email. Its own migration, so the next one can use it.

alter type public.email_kind add value if not exists 'blueprint_reply';

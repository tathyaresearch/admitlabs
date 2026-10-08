-- The team area (spec section 27): a third access level beside Admin and Team member. A Client
-- manager looks after the Clients assigned to them, and nothing else. Its own migration, so the
-- next one can use the new value.

alter type public.team_role add value if not exists 'client_manager';

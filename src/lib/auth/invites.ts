// Whether someone was invited and has not come in yet: by an institution's owner, to join as a
// Member, or by the AdmitLabs team. Log in lets them in like any account (./email-code.ts); they
// join when they first sign in. Read with the service key, on the server only, so nobody can ask it
// from outside.

import { createAdminClient } from '@/lib/supabase/admin';

export async function hasPendingInvite(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const [member, team] = await Promise.all([
    admin.from('invites').select('id', { count: 'exact', head: true }).eq('email', email).is('accepted_at', null),
    admin.from('team_invites').select('email', { count: 'exact', head: true }).eq('email', email),
  ]);
  return Boolean(member.count || team.count);
}

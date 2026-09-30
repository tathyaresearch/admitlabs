// Who is looking: the signed-in user, their team role, their institution and its plan.
// Read on the server once per request. Row level security applies to every query here.
//
// The AdmitLabs team can open an institution's dashboard read only ("view as", spec section 13:
// everything the institution sees). Then the viewer carries that institution as a Member would,
// so every screen shows exactly what its plan shows and no owner action is offered. The team can
// already read everything, so this never widens what anyone can see or change.

import { cookies } from 'next/headers';
import { cache } from 'react';
import { effectiveTier, type PlanRecord } from '@/domain/tiers';
import type { InstitutionType, MembershipRole, TeamRole, Tier } from '@/domain/types';
import { createClient } from '@/lib/supabase/server';
import { VIEW_AS_COOKIE } from '@/lib/team/view-as';

export interface ViewerInstitution {
  id: string;
  slug: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string | null;
  youtube: string | null;
}

export interface ViewerPlan extends PlanRecord {
  freeProgramId: string | null;
}

export interface Viewer {
  userId: string;
  email: string;
  teamRole: TeamRole | null;
  membership: { role: MembershipRole; institution: ViewerInstitution } | null;
  plan: ViewerPlan | null;
  /** The tier that applies right now (a Paid plan past its end counts as Free). */
  tier: Tier;
  /** A team user looking at an institution's dashboard, read only. */
  viewingAs: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (error || !claims || typeof claims.sub !== 'string') return null;

  const userId = claims.sub;
  const email = typeof claims.email === 'string' ? claims.email : '';

  const [team, membership] = await Promise.all([
    supabase.from('team_users').select('role').eq('user_id', userId).maybeSingle(),
    supabase
      .from('memberships')
      .select('role, created_at, institution:institutions(id, slug, name, type, city, state, website, instagram, youtube)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const teamRole = team.data?.role ?? null;
  let institution: ViewerInstitution | null = membership.data?.institution ?? null;
  let role: MembershipRole | null = membership.data?.role ?? null;
  let viewingAs = false;
  if (teamRole) {
    const viewed = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    if (viewed && UUID.test(viewed)) {
      const { data } = await supabase
        .from('institutions')
        .select('id, slug, name, type, city, state, website, instagram, youtube, institution_status(claimed)')
        .eq('id', viewed)
        .maybeSingle();
      if (data?.institution_status?.claimed) {
        const { id, slug, name, type, city, state, website, instagram, youtube } = data;
        institution = { id, slug, name, type, city, state, website, instagram, youtube };
        role = 'member';
        viewingAs = true;
      }
    }
  }
  let plan: ViewerPlan | null = null;
  if (institution) {
    const { data } = await supabase.from('plans').select('tier, starts_at, ends_at, free_program_id').eq('institution_id', institution.id).maybeSingle();
    if (data) {
      plan = {
        tier: data.tier,
        startsAt: new Date(data.starts_at),
        endsAt: data.ends_at ? new Date(data.ends_at) : null,
        freeProgramId: data.free_program_id,
      };
    }
  }

  return {
    userId,
    email,
    teamRole,
    membership: role && institution ? { role, institution } : null,
    plan,
    tier: effectiveTier(plan, new Date()),
    viewingAs,
  };
});

/** Where someone lands after signing in: team area, their dashboard, or onboarding. */
export function homePath({ isTeam, hasInstitution }: { isTeam: boolean; hasInstitution: boolean }): string {
  if (isTeam) return '/team';
  if (hasInstitution) return '/';
  return '/onboarding';
}

export function homePathFor(viewer: Pick<Viewer, 'teamRole' | 'membership'>): string {
  return homePath({ isTeam: viewer.teamRole !== null, hasInstitution: viewer.membership !== null });
}

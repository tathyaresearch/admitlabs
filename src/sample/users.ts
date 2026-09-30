// Sample users: one owner per signed-up institution, one member (so the Member role gets
// tested), one team user and one admin. Sign in with any of these emails; locally the
// 6-digit code lands in Mailpit.

import type { MembershipRole, TeamRole } from '../domain/types.ts';
import { ADMIN_EMAIL, SAMPLE_INSTITUTIONS, TEAM_EMAIL } from './institutions.ts';

export interface SampleUser {
  email: string;
  kind: 'institution' | 'team';
  institutionSlug: string | null;
  membershipRole: MembershipRole | null;
  teamRole: TeamRole | null;
}

export const SAMPLE_USERS: readonly SampleUser[] = [
  ...SAMPLE_INSTITUTIONS.flatMap((institution) => [
    ...(institution.owner
      ? [{ email: institution.owner, kind: 'institution' as const, institutionSlug: institution.slug, membershipRole: 'owner' as const, teamRole: null }]
      : []),
    ...institution.members.map((email) => ({
      email,
      kind: 'institution' as const,
      institutionSlug: institution.slug,
      membershipRole: 'member' as const,
      teamRole: null,
    })),
  ]),
  { email: TEAM_EMAIL, kind: 'team', institutionSlug: null, membershipRole: null, teamRole: 'team' },
  { email: ADMIN_EMAIL, kind: 'team', institutionSlug: null, membershipRole: null, teamRole: 'admin' },
];

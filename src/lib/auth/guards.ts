// Server-side guards. The proxy sends signed-out visitors to sign in, but every page
// checks again here, because the proxy is not a security boundary on its own.

import { notFound, redirect } from 'next/navigation';
import { isFullTeam } from '@/domain/types';
import { createClient } from '@/lib/supabase/server';
import { getViewer, homePathFor, type Viewer } from './viewer';

export type InstitutionViewer = Viewer & { membership: NonNullable<Viewer['membership']> };
export type TeamViewer = Viewer & { teamRole: NonNullable<Viewer['teamRole']> };

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  return viewer;
}

export async function requireInstitutionViewer(): Promise<InstitutionViewer> {
  const viewer = await requireViewer();
  if (!viewer.membership) redirect(homePathFor(viewer));
  return viewer as InstitutionViewer;
}

/** Team pages are invisible to everyone else: they get a plain "not found". Any access level. */
export async function requireTeamViewer(): Promise<TeamViewer> {
  const viewer = await requireViewer();
  if (!viewer.teamRole) notFound();
  return viewer as TeamViewer;
}

/** The whole team area (spec section 27): Admins and Team members. A Client manager gets "not found". */
export async function requireFullTeam(): Promise<TeamViewer> {
  const viewer = await requireTeamViewer();
  if (!isFullTeam(viewer.teamRole)) notFound();
  return viewer;
}

/** The Team page: Admins only. */
export async function requireAdmin(): Promise<TeamViewer> {
  const viewer = await requireTeamViewer();
  if (viewer.teamRole !== 'admin') notFound();
  return viewer;
}

/** One institution's team pages: the full team, or the Client manager it is assigned to. */
export async function requireInstitutionAccess(institutionId: string): Promise<TeamViewer> {
  const viewer = await requireTeamViewer();
  if (!(await canManage(viewer, institutionId))) notFound();
  return viewer;
}

/**
 * Whether this team user does the team's work for this institution: Admins and Team members for
 * any, a Client manager for the Clients assigned to them. The database checks the same
 * (private.can_manage); this keeps the pages and the service-key paths in step with it.
 */
export async function canManage(viewer: Pick<Viewer, 'teamRole' | 'userId'> | null, institutionId: string): Promise<boolean> {
  if (!viewer?.teamRole) return false;
  if (isFullTeam(viewer.teamRole)) return true;
  const supabase = await createClient();
  const { data } = await supabase.from('client_managers').select('institution_id').eq('user_id', viewer.userId).eq('institution_id', institutionId).maybeSingle();
  return Boolean(data);
}

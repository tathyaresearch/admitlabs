// Server-side guards. The proxy sends signed-out visitors to sign in, but every page
// checks again here, because the proxy is not a security boundary on its own.

import { notFound, redirect } from 'next/navigation';
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

/** Team pages are invisible to everyone else: they get a plain "not found". */
export async function requireTeamViewer(): Promise<TeamViewer> {
  const viewer = await requireViewer();
  if (!viewer.teamRole) notFound();
  return viewer as TeamViewer;
}

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { waitingCount } from '@/audit/review-jobs';
import { AppShell } from '@/components/shell/AppShell';
import { teamHome, teamMobilePrimary, teamNav } from '@/components/shell/nav';
import { isFullTeam, TEAM_ROLE_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

export default async function TeamLayout({ children }: { children: ReactNode }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) notFound();
  const viewer = await requireTeamViewer();
  // What waits for the team's review, counted beside Audit (To review is its first tab).
  const waiting = isFullTeam(viewer.teamRole) ? await waitingCount(await createClient()) : 0;
  return (
    <AppShell
      sections={teamNav(viewer.teamRole)}
      badges={waiting ? { '/team/review': waiting } : undefined}
      mobilePrimary={teamMobilePrimary(viewer.teamRole)}
      homeHref={teamHome(viewer.teamRole)}
      email={viewer.email}
      roleLabel={`AdmitLabs ${TEAM_ROLE_LABELS[viewer.teamRole]}`}
      context={{ title: 'AdmitLabs team', detail: `Signed in as ${TEAM_ROLE_LABELS[viewer.teamRole]}`, brandMark: true }}
      showNotifications={false}
    >
      {children}
    </AppShell>
  );
}

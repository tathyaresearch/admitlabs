import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { waitingCount } from '@/audit/review-jobs';
import { AppShell } from '@/components/shell/AppShell';
import { TEAM_MOBILE_PRIMARY, TEAM_NAV } from '@/components/shell/nav';
import { TEAM_ROLE_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

export default async function TeamLayout({ children }: { children: ReactNode }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) notFound();
  const viewer = await requireTeamViewer();
  // What waits for the team's review, counted beside To review.
  const waiting = await waitingCount(await createClient());
  return (
    <AppShell
      sections={TEAM_NAV}
      badges={waiting ? { '/team/review': waiting } : undefined}
      mobilePrimary={TEAM_MOBILE_PRIMARY}
      homeHref="/team"
      email={viewer.email}
      roleLabel={`AdmitLabs ${TEAM_ROLE_LABELS[viewer.teamRole].toLowerCase()}`}
      context={{ title: 'AdmitLabs team', detail: `Signed in as ${TEAM_ROLE_LABELS[viewer.teamRole]}`, brandMark: true }}
      showNotifications={false}
    >
      {children}
    </AppShell>
  );
}

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { AppShell } from '@/components/shell/AppShell';
import { ViewAsBar } from '@/components/team/ViewAsBar';
import { formatDate } from '@/domain/format';
import { MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) notFound();
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const supabase = await createClient();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('institution_id', institution.id).eq('read', false);
  // The plan, in the sidebar under the name: "Paid until 15 Oct 2026", "Free plan", "Client plan".
  const planLine = viewer.tier === 'paid' && viewer.plan?.endsAt ? `Paid until ${formatDate(viewer.plan.endsAt)}` : `${TIER_LABELS[viewer.tier]} plan`;
  return (
    <AppShell
      sections={INSTITUTION_NAV}
      homeHref="/"
      email={viewer.email}
      roleLabel={viewer.viewingAs ? 'AdmitLabs team, read only' : MEMBERSHIP_ROLE_LABELS[role]}
      unread={count ?? 0}
      banner={viewer.viewingAs ? <ViewAsBar name={institution.name} /> : undefined}
      context={{ title: institution.name, detail: planLine }}
    >
      {children}
    </AppShell>
  );
}

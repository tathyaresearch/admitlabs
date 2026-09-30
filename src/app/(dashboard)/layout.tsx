import type { ReactNode } from 'react';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { AppShell } from '@/components/shell/AppShell';
import { ViewAsBar } from '@/components/team/ViewAsBar';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const supabase = await createClient();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('institution_id', institution.id).eq('read', false);
  return (
    <AppShell
      sections={INSTITUTION_NAV}
      homeHref="/"
      email={viewer.email}
      roleLabel={viewer.viewingAs ? 'AdmitLabs team, read only' : MEMBERSHIP_ROLE_LABELS[role]}
      unread={count ?? 0}
      banner={viewer.viewingAs ? <ViewAsBar name={institution.name} /> : undefined}
      context={{
        title: institution.name,
        detail: `${INSTITUTION_TYPE_LABELS[institution.type]}, ${institution.city}`,
        tag: `${TIER_LABELS[viewer.tier]} plan`,
      }}
    >
      {children}
    </AppShell>
  );
}

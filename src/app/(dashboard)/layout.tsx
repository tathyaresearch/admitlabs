import type { ReactNode } from 'react';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { AppShell } from '@/components/shell/AppShell';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  return (
    <AppShell
      sections={INSTITUTION_NAV}
      homeHref="/"
      email={viewer.email}
      roleLabel={MEMBERSHIP_ROLE_LABELS[role]}
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

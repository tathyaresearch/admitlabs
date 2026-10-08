import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { institutionNav, LEADS_MOBILE_PRIMARY, MOBILE_PRIMARY } from '@/components/shell/nav';
import { AppShell } from '@/components/shell/AppShell';
import { ServicesCard } from '@/components/shell/ServicesCard';
import { ViewAsBar } from '@/components/team/ViewAsBar';
import { formatDate } from '@/domain/format';
import { MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadHasLeads } from '@/lib/leads/load';
import { loadServicesAsk, showsServicesCard } from '@/lib/plan/services';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';
import { SERVICES } from '@/site/content';
import { askServicesAction } from './actions';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) notFound();
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const supabase = await createClient();
  const services = showsServicesCard(viewer);
  const [{ count }, leads, askedAt] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('institution_id', institution.id).eq('read', false),
    loadHasLeads(viewer),
    services ? loadServicesAsk(viewer) : Promise.resolve(null),
  ]);
  // "Want us to do it for you?" on Free and Paid: the services, one line each, and Talk to AdmitLabs.
  const card = (id: string) => <ServicesCard id={id} services={SERVICES.items.map((item) => item.name)} askedAt={askedAt} onAsk={askServicesAction} />;
  // The plan, in the sidebar under the name: "Paid until 15 Oct 2026", "Free plan", "Client plan".
  const planLine = viewer.tier === 'paid' && viewer.plan?.endsAt ? `Paid until ${formatDate(viewer.plan.endsAt)}` : `${TIER_LABELS[viewer.tier]} plan`;
  return (
    <AppShell
      sections={institutionNav(leads, viewer.tier === 'client')}
      mobilePrimary={viewer.tier === 'client' ? LEADS_MOBILE_PRIMARY : MOBILE_PRIMARY}
      homeHref="/"
      email={viewer.email}
      roleLabel={viewer.viewingAs ? 'AdmitLabs team, read only' : MEMBERSHIP_ROLE_LABELS[role]}
      unread={count ?? 0}
      banner={viewer.viewingAs ? <ViewAsBar name={institution.name} /> : undefined}
      context={{ title: institution.name, detail: planLine }}
      card={services ? { side: card('services-side'), menu: card('services-menu') } : undefined}
    >
      {children}
    </AppShell>
  );
}

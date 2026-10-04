// Version 2 mock (Step 2, development only): the dashboard and team frames, with the menu each
// shows in version 2 (Leads for a Client, To review for the team). Each menu item points at its
// mock view, so the right one lights up.

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import type { NavSection } from '@/components/shell/nav';

export type InstitutionSection = 'home' | 'audit' | 'rivals' | 'demand' | 'leads' | 'reports' | 'notifications' | 'plan' | 'settings';

function institutionNav(client: boolean): NavSection[] {
  return [
    {
      label: 'Drishti',
      items: [
        { href: '/mock/home', label: 'Home', icon: 'home' },
        { href: '/mock/audit', label: 'Audit', icon: 'audit' },
        { href: '/mock/rivals', label: 'Rivals', icon: 'rivals' },
        { href: '/mock/demand', label: 'Demand', icon: 'demand' },
        ...(client ? [{ href: '/mock/leads', label: 'Leads', icon: 'enquiry' as const }] : []),
        { href: '/mock/reports', label: 'Reports', icon: 'reports' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/mock/notifications', label: 'Notifications', icon: 'bell' },
        { href: '/mock/plan', label: 'Plan', icon: 'plan' },
        { href: '/mock/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];
}

const TEAM_NAV: NavSection[] = [
  {
    label: 'AdmitLabs team',
    items: [
      { href: '/mock/team/review', label: 'To review', icon: 'checkCircle' },
      { href: '/mock/team/institutions', label: 'Institutions', icon: 'institution' },
      { href: '/mock/team/bulk', label: 'Bulk Audit', icon: 'grid' },
      { href: '/mock/team/ads', label: 'Rival ads', icon: 'rivals' },
      { href: '/mock/team/enquiries', label: 'Enquiries', icon: 'enquiry' },
      { href: '/mock/team/users', label: 'Team users', icon: 'team' },
    ],
  },
];

export function InstitutionShell({ name, detail, client = false, email, children }: { name: string; detail: string; client?: boolean; email: string; children: ReactNode }) {
  return (
    <AppShell
      sections={institutionNav(client)}
      homeHref="/mock/home"
      email={email}
      roleLabel="Owner"
      context={{ title: name, detail }}
      unread={2}
      mobilePrimary={['/mock/home', '/mock/audit', '/mock/rivals', client ? '/mock/leads' : '/mock/demand']}
    >
      {children}
    </AppShell>
  );
}

export function TeamShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sections={TEAM_NAV}
      homeHref="/mock/team/review"
      email="team@admitlabs.example"
      roleLabel="Team"
      context={{ title: 'AdmitLabs team', detail: 'Team', brandMark: true }}
      showNotifications={false}
      badges={{ '/mock/team/review': 4 }}
      mobilePrimary={['/mock/team/review', '/mock/team/institutions', '/mock/team/enquiries', '/mock/team/bulk']}
    >
      {children}
    </AppShell>
  );
}

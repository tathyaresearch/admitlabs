import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavSection {
  label: string;
  items: readonly NavItem[];
}

/** Drishti is the first product in the AdmitLabs dashboard; later tools get their own section. */
export const INSTITUTION_NAV: readonly NavSection[] = [
  {
    label: 'Drishti',
    items: [
      { href: '/', label: 'Home', icon: 'home' },
      { href: '/audit', label: 'Audit', icon: 'audit' },
      { href: '/rivals', label: 'Rivals', icon: 'rivals' },
      { href: '/demand', label: 'Demand', icon: 'demand' },
      { href: '/reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/plan', label: 'Plan', icon: 'plan' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export const TEAM_NAV: readonly NavSection[] = [
  {
    label: 'AdmitLabs team',
    items: [{ href: '/team', label: 'Institutions', icon: 'institution' }],
  },
];

/** The four destinations on the phone bottom bar. Everything else sits under More. */
export const MOBILE_PRIMARY: readonly string[] = ['/', '/audit', '/rivals', '/demand'];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
      { href: '/notifications', label: 'Notifications', icon: 'bell' },
      { href: '/plan', label: 'Plan', icon: 'plan' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

/** Leads (spec section 23), for an AdmitLabs Client, or one whose enquiries are still kept: after Demand. */
export const LEADS_ITEM: NavItem = { href: '/leads', label: 'Leads', icon: 'enquiry' };

export function institutionNav(leads: boolean): readonly NavSection[] {
  if (!leads) return INSTITUTION_NAV;
  return INSTITUTION_NAV.map((section, index) =>
    index === 0 ? { ...section, items: section.items.flatMap((item) => (item.href === '/demand' ? [item, LEADS_ITEM] : [item])) } : section,
  );
}

export const TEAM_NAV: readonly NavSection[] = [
  {
    label: 'AdmitLabs team',
    items: [
      { href: '/team', label: 'Institutions', icon: 'institution' },
      { href: '/team/review', label: 'To review', icon: 'stopwatch' },
      { href: '/team/bulk', label: 'Bulk Audit', icon: 'grid' },
      { href: '/team/ads', label: 'Rival ads', icon: 'rivals' },
      { href: '/team/enquiries', label: 'Enquiries', icon: 'enquiry' },
      { href: '/team/users', label: 'Team users', icon: 'team' },
    ],
  },
];

/** The most pages the phone bottom bar holds on its own. With more, it shows MOBILE_PRIMARY and More. */
export const MOBILE_BAR_MAX = 5;

/** The four destinations on the phone bottom bar of a dashboard. Everything else sits under More. */
export const MOBILE_PRIMARY: readonly string[] = ['/', '/audit', '/rivals', '/demand'];

/** A Client's four: Leads in place of Demand, which moves under More. */
export const LEADS_MOBILE_PRIMARY: readonly string[] = ['/', '/audit', '/rivals', '/leads'];

/** The team's four on the phone bottom bar. */
export const TEAM_MOBILE_PRIMARY: readonly string[] = ['/team', '/team/review', '/team/enquiries', '/team/bulk'];

export function isActive(pathname: string, href: string): boolean {
  // Home pages match exactly, so a page under them (like /team/ads) lights up its own item only.
  if (href === '/' || href === '/team') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

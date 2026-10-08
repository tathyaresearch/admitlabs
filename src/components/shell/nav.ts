import type { IconName } from '@/components/ui/Icon';
import type { TeamRole } from '@/domain/types';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Other pages that light this item up (Audit's tabs, a Client manager's Client pages). */
  also?: readonly string[];
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

/** The Brain (spec section 26), for an AdmitLabs Client: after Leads. On a phone it sits under More. */
export const BRAIN_ITEM: NavItem = { href: '/brain', label: 'Brain', icon: 'brain' };

export function institutionNav(leads: boolean, brain = false): readonly NavSection[] {
  if (!leads && !brain) return INSTITUTION_NAV;
  return INSTITUTION_NAV.map((section, index) =>
    index === 0
      ? { ...section, items: section.items.flatMap((item) => (item.href === '/demand' ? [item, ...(leads ? [LEADS_ITEM] : []), ...(brain ? [BRAIN_ITEM] : [])] : [item])) }
      : section,
  );
}

/** Audit is one item: To review, Bulk Audit and Rival ads are its tabs (spec section 27). */
const AUDIT_ITEM: NavItem = { href: '/team/review', label: 'Audit', icon: 'audit', also: ['/team/bulk', '/team/ads'] };
const ENQUIRIES_ITEM: NavItem = { href: '/team/enquiries', label: 'Enquiries', icon: 'enquiry' };
const INSTITUTIONS_ITEM: NavItem = { href: '/team', label: 'Institutions', icon: 'institution' };
const CLIENTS_ITEM: NavItem = { href: '/team/clients', label: 'Clients', icon: 'briefcase' };
const TEAM_ITEM: NavItem = { href: '/team/users', label: 'Team', icon: 'team' };

/** The team's menu by access level: an Admin has Team too; a Client manager has their Enquiries and Clients only. */
export function teamNav(role: TeamRole): readonly NavSection[] {
  const items =
    role === 'client_manager'
      ? // Every institution page they open is one of their Clients.
        [ENQUIRIES_ITEM, { ...CLIENTS_ITEM, also: ['/team/institutions'] }]
      : [AUDIT_ITEM, ENQUIRIES_ITEM, INSTITUTIONS_ITEM, CLIENTS_ITEM, ...(role === 'admin' ? [TEAM_ITEM] : [])];
  return [{ label: 'AdmitLabs team', items }];
}

/** The team's first page: Institutions, or a Client manager's Clients. */
export function teamHome(role: TeamRole): string {
  return role === 'client_manager' ? '/team/clients' : '/team';
}

/** The team's four on the phone bottom bar (a Client manager has two, so no More). */
export function teamMobilePrimary(role: TeamRole): readonly string[] {
  return role === 'client_manager' ? ['/team/enquiries', '/team/clients'] : ['/team/enquiries', '/team/clients', '/team', '/team/review'];
}

/** The most pages the phone bottom bar holds on its own. With more, it shows MOBILE_PRIMARY and More. */
export const MOBILE_BAR_MAX = 5;

/** The four destinations on the phone bottom bar of a dashboard. Everything else sits under More. */
export const MOBILE_PRIMARY: readonly string[] = ['/', '/audit', '/rivals', '/demand'];

/** A Client's four: Leads in place of Demand, which moves under More. */
export const LEADS_MOBILE_PRIMARY: readonly string[] = ['/', '/audit', '/rivals', '/leads'];

export function isActive(pathname: string, href: string): boolean {
  // Home pages match exactly, so a page under them (like /team/ads) lights up its own item only.
  if (href === '/' || href === '/team') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** An item is lit on its own page, under it, or on the pages it also covers (Audit's tabs). */
export function itemActive(pathname: string, item: NavItem): boolean {
  return [item.href, ...(item.also ?? [])].some((href) => isActive(pathname, href));
}

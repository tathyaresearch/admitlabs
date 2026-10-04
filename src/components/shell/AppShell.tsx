// The dashboard frame. Desktop: a sidebar with "Drishti by AdmitLabs" at the top left (home),
// whose dashboard this is and their plan under it, the pages in the middle and the account at the
// bottom, beside the page on a raised panel. Phone: a slim top bar (the same lockup,
// notifications, account) and a bottom bar with the main pages.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark, ProductLockup } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { AccountMenu } from './AccountMenu';
import { MobileNav } from './MobileNav';
import type { NavSection } from './nav';
import { SideNav } from './SideNav';
import styles from './AppShell.module.css';

export interface ShellContext {
  /** Whose dashboard this is: the institution's name, or "AdmitLabs team". */
  title: string;
  /** One short line under it: the plan ("Paid plan, ends 15 Oct"), or the team role. */
  detail: string;
  /** The AdmitLabs mark beside "AdmitLabs team". An institution shows its name and plan only. */
  brandMark?: boolean;
}

interface AppShellProps {
  sections: readonly NavSection[];
  homeHref: string;
  email: string;
  roleLabel: string;
  context: ShellContext;
  showNotifications?: boolean;
  /** Unread notifications, shown on the bell and beside Notifications in the sidebar. */
  unread?: number;
  /** A strip at the top of the page, for example while the team views an institution's dashboard. */
  banner?: ReactNode;
  /** Counts beside other pages in the sidebar, by href (the team's To review). */
  badges?: Readonly<Record<string, number>>;
  /** The pages on the phone's bottom bar when there are more than fit (src/components/shell/nav.ts). */
  mobilePrimary?: readonly string[];
  children: ReactNode;
}

export function AppShell({ sections, homeHref, email, roleLabel, context, showNotifications = true, unread = 0, banner, badges, mobilePrimary, children }: AppShellProps) {
  const notificationsLabel = unread ? `Notifications, ${unread} new` : 'Notifications';
  const sideBadges = { ...badges, ...(showNotifications && unread ? { '/notifications': unread } : {}) };
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <Link href={homeHref} className={styles.brand} aria-label="Drishti by AdmitLabs, home">
            <ProductLockup size="md" motion="blink" />
          </Link>
          <div className={styles.contextBlock}>
            {context.brandMark ? <BrandMark size={36} className={styles.brandMark} /> : null}
            <span className={styles.contextText}>
              <span className={styles.contextTitle}>{context.title}</span>
              <span className={styles.contextDetail}>{context.detail}</span>
            </span>
          </div>
        </div>
        <div className={styles.sidebarNav}>
          <SideNav sections={sections} badges={Object.keys(sideBadges).length ? sideBadges : undefined} />
        </div>
        <div className={styles.sidebarFoot}>
          <AccountMenu variant="side" email={email} roleLabel={roleLabel} institutionName={context.title} />
        </div>
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link href={homeHref} className={styles.topbarBrand} aria-label="Drishti by AdmitLabs, home">
            <ProductLockup size="md" motion="blink" />
          </Link>
          <div className={styles.topbarActions}>
            {showNotifications ? (
              <Link href="/notifications" className={styles.topbarIcon} aria-label={notificationsLabel} title="Notifications">
                <Icon name="bell" size={20} />
                {unread ? (
                  <span className={`${styles.badge} num`} aria-hidden="true">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <AccountMenu variant="top" email={email} roleLabel={roleLabel} institutionName={context.title} />
          </div>
        </header>

        <div className={styles.panel}>
          {banner ? <div className={styles.banner}>{banner}</div> : null}
          <main id="main" className={styles.main}>
            {children}
          </main>
        </div>
      </div>

      <MobileNav sections={sections} primary={mobilePrimary} />
    </div>
  );
}

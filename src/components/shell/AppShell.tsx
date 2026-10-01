// The dashboard frame. Desktop: a sidebar with whose dashboard this is and their plan at the top,
// the pages in the middle and the account at the bottom, beside the page on a raised panel.
// Phone: a slim top bar (who, notifications, account) and a bottom bar with the main pages.

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
  /** The square at the left: the institution's initials, or the AdmitLabs mark for the team. */
  mark: { kind: 'initials'; text: string } | { kind: 'brand' };
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
  children: ReactNode;
}

/** Up to two initials from the name's main words: "Eastgate University" is EU. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !['of', 'and', 'the', 'for', '&'].includes(word.toLowerCase()));
  return (words.slice(0, 2).map((word) => word[0] ?? '').join('') || 'D').toUpperCase();
}

function Mark({ mark, size }: { mark: ShellContext['mark']; size: 'md' | 'sm' }) {
  if (mark.kind === 'brand') return <BrandMark size={size === 'md' ? 36 : 28} className={styles.brandMark} />;
  return (
    <span className={`${styles.mark} ${styles[`mark-${size}`]}`} aria-hidden="true">
      {mark.text}
    </span>
  );
}

export function AppShell({ sections, homeHref, email, roleLabel, context, showNotifications = true, unread = 0, banner, children }: AppShellProps) {
  const notificationsLabel = unread ? `Notifications, ${unread} new` : 'Notifications';
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <Link href={homeHref} className={styles.context} aria-label={`${context.title}, home`}>
          <Mark mark={context.mark} size="md" />
          <span className={styles.contextText}>
            <span className={styles.contextTitle}>{context.title}</span>
            <span className={styles.contextDetail}>{context.detail}</span>
          </span>
        </Link>
        <div className={styles.sidebarNav}>
          <SideNav sections={sections} badges={showNotifications && unread ? { '/notifications': unread } : undefined} />
        </div>
        <div className={styles.sidebarFoot}>
          <AccountMenu variant="side" email={email} roleLabel={roleLabel} institutionName={context.title} />
          <p className={styles.madeBy}>
            <ProductLockup size="sm" />
          </p>
        </div>
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link href={homeHref} className={styles.topbarContext} aria-label={`${context.title}, home`}>
            <Mark mark={context.mark} size="sm" />
            <span className={styles.topbarTitle}>{context.title}</span>
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

      <MobileNav sections={sections} />
    </div>
  );
}

// The dashboard frame: sidebar on desktop, bottom bar on phone, top bar everywhere.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/ui/Brand';
import { Tag } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { AccountMenu } from './AccountMenu';
import { MobileNav } from './MobileNav';
import type { NavSection } from './nav';
import { SideNav } from './SideNav';
import { ThemeToggle } from './ThemeToggle';
import styles from './AppShell.module.css';

interface AppShellProps {
  sections: readonly NavSection[];
  homeHref: string;
  email: string;
  roleLabel: string;
  /** Shown at the foot of the sidebar: whose dashboard this is. */
  context?: { title: string; detail: string; tag?: string };
  showNotifications?: boolean;
  children: ReactNode;
}

export function AppShell({ sections, homeHref, email, roleLabel, context, showNotifications = true, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <Link href={homeHref} className={styles.brand} aria-label="AdmitLabs home">
          <Wordmark height={19} />
        </Link>
        <div className={styles.sidebarNav}>
          <SideNav sections={sections} />
        </div>
        {context ? (
          <div className={styles.context}>
            <p className={styles.contextTitle}>{context.title}</p>
            <p className={styles.contextDetail}>{context.detail}</p>
            {context.tag ? <Tag>{context.tag}</Tag> : null}
          </div>
        ) : null}
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link href={homeHref} className={styles.topbarBrand} aria-label="AdmitLabs home">
            <Wordmark height={17} />
          </Link>
          <p className={styles.topbarContext}>{context?.title}</p>
          <div className={styles.topbarActions}>
            <ThemeToggle />
            {showNotifications ? (
              <Link href="/notifications" className={styles.topbarIcon} aria-label="Notifications" title="Notifications">
                <Icon name="bell" size={20} />
              </Link>
            ) : null}
            <AccountMenu email={email} roleLabel={roleLabel} institutionName={context?.title} />
          </div>
        </header>

        <main id="main" className={styles.main}>
          {children}
        </main>
      </div>

      <MobileNav sections={sections} />
    </div>
  );
}

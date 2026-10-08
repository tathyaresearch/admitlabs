// Tabs that are links: each one its own address, the current one underlined (aria-current). For
// sections that are separate pages (the team's Audit) or a list's main filter (Institutions by
// plan). Sideways scroll on a phone.

import Link from 'next/link';
import styles from './LinkTabs.module.css';

export interface LinkTab {
  href: string;
  label: string;
  /** A count after the label, in Inter. */
  count?: number;
  current: boolean;
}

export function LinkTabs({ label, tabs }: { label: string; tabs: readonly LinkTab[] }) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={tab.current ? 'page' : undefined} scroll={false}>
          {tab.label}
          {tab.count !== undefined ? <span className={`${styles.count} num`}>{tab.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { isActive, MOBILE_PRIMARY, type NavSection } from './nav';
import styles from './AppShell.module.css';

/** Phone navigation: a bottom bar with four destinations and a More sheet for the rest. */
export function MobileNav({ sections, extra }: { sections: readonly NavSection[]; extra?: ReactNode }) {
  const pathname = usePathname();
  const items = sections.flatMap((section) => section.items);
  const primary = items.filter((item) => MOBILE_PRIMARY.includes(item.href));
  const rest = items.filter((item) => !MOBILE_PRIMARY.includes(item.href));
  const showBar = primary.length > 0;
  const moreActive = rest.some((item) => isActive(pathname, item.href));

  if (!showBar) return null;

  return (
    <>
      <nav aria-label="Drishti" className={styles.bottombar}>
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={styles.bottomLink} aria-current={active ? 'page' : undefined} data-active={active ? 'true' : undefined}>
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className={styles.bottomLink} popoverTarget="more-sheet" data-active={moreActive ? 'true' : undefined}>
          <Icon name="more" size={22} />
          <span>More</span>
        </button>
      </nav>

      <div id="more-sheet" popover="auto" className={styles.sheet}>
        <div className={styles.sheetHandle} aria-hidden="true" />
        <ul className={styles.sheetList}>
          {rest.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={styles.sheetLink} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {extra ? <div className={styles.sheetExtra}>{extra}</div> : null}
      </div>
    </>
  );
}

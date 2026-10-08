'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { itemActive, MOBILE_BAR_MAX, MOBILE_PRIMARY, type NavSection } from './nav';
import styles from './AppShell.module.css';

/**
 * Phone navigation: a bottom bar. Up to five pages (the team area's four) all sit on it; more than
 * that (an institution's dashboard) shows four destinations and a More sheet for the rest.
 */
export function MobileNav({ sections, extra, primary: primaryHrefs = MOBILE_PRIMARY }: { sections: readonly NavSection[]; extra?: ReactNode; primary?: readonly string[] }) {
  const pathname = usePathname();
  const items = sections.flatMap((section) => section.items);
  const fits = items.length <= MOBILE_BAR_MAX;
  const primary = fits ? items : items.filter((item) => primaryHrefs.includes(item.href));
  const rest = fits ? [] : items.filter((item) => !primaryHrefs.includes(item.href));
  const moreActive = rest.some((item) => itemActive(pathname, item));

  if (primary.length === 0) return null;

  return (
    <>
      <nav aria-label={sections[0]?.label ?? 'Pages'} className={styles.bottombar}>
        {primary.map((item) => {
          const active = itemActive(pathname, item);
          return (
            <Link key={item.href} href={item.href} className={styles.bottomLink} aria-current={active ? 'page' : undefined} data-active={active ? 'true' : undefined}>
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {rest.length ? (
          <button type="button" className={styles.bottomLink} popoverTarget="more-sheet" data-active={moreActive ? 'true' : undefined}>
            <Icon name="more" size={22} />
            <span>More</span>
          </button>
        ) : null}
      </nav>

      {rest.length ? (
        <div id="more-sheet" popover="auto" className={styles.sheet}>
          <div className={styles.sheetHandle} aria-hidden="true" />
          <ul className={styles.sheetList}>
            {rest.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.sheetLink} aria-current={itemActive(pathname, item) ? 'page' : undefined}>
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {extra ? <div className={styles.sheetExtra}>{extra}</div> : null}
        </div>
      ) : null}
    </>
  );
}

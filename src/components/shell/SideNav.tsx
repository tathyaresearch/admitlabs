'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { itemActive, type NavSection } from './nav';
import styles from './AppShell.module.css';

/** The sidebar's pages, in groups with space between them. `badges` puts a count beside a page. */
export function SideNav({ sections, badges }: { sections: readonly NavSection[]; badges?: Readonly<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <>
      {sections.map((section) => (
        <nav key={section.label} aria-label={section.label} className={styles.navSection}>
          <ul className={styles.navList}>
            {section.items.map((item) => {
              const active = itemActive(pathname, item);
              const count = badges?.[item.href] ?? 0;
              return (
                <li key={item.href}>
                  <Link href={item.href} className={[styles.navLink, active ? styles.navLinkActive : ''].join(' ')} aria-current={active ? 'page' : undefined}>
                    <Icon name={item.icon} size={18} className={styles.navIcon} />
                    <span className={styles.navText}>{item.label}</span>
                    {count ? (
                      <span className={`${styles.navCount} num`}>
                        {count > 99 ? '99+' : count}
                        <span className="visually-hidden"> new</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ))}
    </>
  );
}

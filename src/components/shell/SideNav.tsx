'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { isActive, type NavSection } from './nav';
import styles from './AppShell.module.css';

export function SideNav({ sections }: { sections: readonly NavSection[] }) {
  const pathname = usePathname();
  return (
    <>
      {sections.map((section) => (
        <nav key={section.label} aria-label={section.label} className={styles.navSection}>
          <p className={styles.navLabel}>{section.label}</p>
          <ul className={styles.navList}>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={[styles.navLink, active ? styles.navLinkActive : ''].join(' ')} aria-current={active ? 'page' : undefined}>
                    <Icon name={item.icon} size={18} />
                    {item.label}
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

// The program switcher: clean tabs, each with its small score. On Free only one program is
// included; the others show as plain locked captions, with no scores sent and no action.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import styles from './audit.module.css';

export interface ProgramEntry {
  id: string;
  name: string;
  /** Present when the latest Audit covered this program and the plan shows it. */
  score?: { overall: number; change: number | null };
  state: 'scored' | 'locked' | 'next';
}

export function ProgramTabs({ entries, active, allLabel }: { entries: readonly ProgramEntry[]; active: string | null; allLabel: string | null }) {
  return (
    <nav aria-label="Programs" className={styles.tabs}>
      {allLabel ? (
        <Link href="/audit" className={styles.tab} aria-current={active === null ? 'page' : undefined}>
          {allLabel}
        </Link>
      ) : null}
      {entries.map((entry) => {
        if (entry.state === 'locked') {
          return (
            <span key={entry.id} className={`${styles.tab} ${styles.tabLocked}`}>
              <Icon name="lock" size={13} />
              {entry.name}
              <span className="visually-hidden"> (included with Paid)</span>
            </span>
          );
        }
        // On Free the one scored program is the whole Audit, so its tab is the Audit page itself.
        const href = allLabel || entry.state !== 'scored' ? `/audit/${entry.id}` : '/audit';
        const current = active === entry.id || (!allLabel && active === null && entry.state === 'scored');
        return (
          <Link key={entry.id} href={href} className={styles.tab} aria-current={current ? 'page' : undefined}>
            {entry.name}
            {entry.score ? <span className={`${styles.tabScore} num`}>{entry.score.overall}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

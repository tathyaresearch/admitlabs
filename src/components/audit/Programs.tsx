// The program switcher and the by-program list (spec 7.6: the same view for each program).
// On Free only one program is included; the others show as locked, with no scores sent.

import Link from 'next/link';
import { Delta, ScoreLabel } from '@/components/ui/Results';
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
    <nav aria-label="Programs" className={styles.programTabs}>
      {allLabel ? (
        <Link href="/audit" className={styles.programTab} aria-current={active === null ? 'page' : undefined}>
          {allLabel}
        </Link>
      ) : null}
      {entries.map((entry) =>
        entry.state === 'locked' ? (
          <Link key={entry.id} href="/plan" className={`${styles.programTab} ${styles.programTabLocked}`} title="Unlock with Paid">
            <Icon name="lock" size={14} />
            {entry.name}
            <span className="visually-hidden">, included with Paid</span>
          </Link>
        ) : (
          <Link
            key={entry.id}
            href={allLabel || entry.state !== 'scored' ? `/audit/${entry.id}` : '/audit'}
            className={styles.programTab}
            aria-current={active === entry.id || (!allLabel && active === null && entry.state === 'scored') ? 'page' : undefined}
          >
            {entry.name}
            {entry.score ? <span className={styles.programTabScore}>{entry.score.overall}</span> : null}
          </Link>
        ),
      )}
    </nav>
  );
}

export function ProgramScoreList({ entries, nextAuditText }: { entries: readonly ProgramEntry[]; nextAuditText: string }) {
  return (
    <div className={styles.programRows}>
      {entries.map((entry) => {
        if (entry.state === 'locked') {
          return (
            <Link key={entry.id} href="/plan" className={styles.programRow}>
              <span className={styles.programName}>{entry.name}</span>
              <span className={styles.programLocked}>
                <Icon name="lock" size={14} />
                Unlock with Paid
              </span>
            </Link>
          );
        }
        if (entry.state === 'next' || !entry.score) {
          return (
            <div key={entry.id} className={styles.programRow}>
              <span className={styles.programName}>{entry.name}</span>
              <span className={styles.programLocked}>{nextAuditText}</span>
            </div>
          );
        }
        return (
          <Link key={entry.id} href={`/audit/${entry.id}`} className={styles.programRow}>
            <span className={styles.programName}>{entry.name}</span>
            <span className={styles.programMeta}>
              <Delta change={entry.score.change} size="sm" />
              <ScoreLabel score={entry.score.overall} />
              <span className={styles.programScore}>{entry.score.overall}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

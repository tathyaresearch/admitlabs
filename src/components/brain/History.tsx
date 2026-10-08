'use client';

// One fact's History (spec section 26), in a side panel: every change, newest first, with who made
// it, when, and what it was before. Closing it goes back to the section.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SidePanel } from '@/components/ui/Overlay';
import styles from './brain.module.css';

export interface HistoryEntry {
  id: string;
  when: string;
  who: string;
  text: string;
  before: string | null;
  after: string | null;
}

export function HistoryPanel({ title, description, entries, closeHref }: { title: string; description: string; entries: readonly HistoryEntry[]; closeHref: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  return (
    <SidePanel
      open={open}
      onClose={() => {
        setOpen(false);
        router.replace(closeHref, { scroll: false });
      }}
      title={title}
      description={description}
    >
      {entries.length ? (
        <ol className={styles.history}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.historyItem}>
              <span className={styles.historyDot} aria-hidden="true" />
              <p className={styles.historyWhen}>
                <span>{entry.when}</span>
                <span>{entry.who}</span>
              </p>
              <p className={styles.historyWhat}>{entry.text}</p>
              {entry.before && entry.after ? (
                <p className={styles.historyChange}>
                  <span className={styles.historyBefore}>{entry.before}</span>
                  <span aria-hidden="true"> to </span>
                  <span className="visually-hidden">, now </span>
                  <span>{entry.after}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.answerEmpty}>No changes kept yet.</p>
      )}
    </SidePanel>
  );
}

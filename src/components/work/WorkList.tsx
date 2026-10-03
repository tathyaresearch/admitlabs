// One entry in a Client's work log, as the Client reads it on Home's card and in the full list:
// a filled tick for work done or an open ring for Next, the sentence, then the day (or the day
// it is due) and a link to see the work when there is one.

import { Icon } from '@/components/ui/Icon';
import { formatDate, hostAndPath } from '@/domain/format';
import type { WorkEntry } from '@/team/work';
import styles from './work.module.css';

export function WorkLine({ entry, size = 'md' }: { entry: WorkEntry; size?: 'sm' | 'md' }) {
  return (
    <li className={styles.entry} data-size={size}>
      <span className={entry.kind === 'done' ? styles.tick : styles.ring} aria-hidden="true">
        {entry.kind === 'done' ? <Icon name="check" size={12} /> : null}
      </span>
      <span className={styles.text}>{entry.text}</span>
      <span className={styles.meta}>
        <span>{entry.kind === 'done' ? formatDate(entry.on) : `By ${formatDate(entry.on)}`}</span>
        {entry.link ? (
          <a href={entry.link} className={styles.link} target="_blank" rel="noreferrer">
            {hostAndPath(entry.link)}
            <Icon name="external" size={12} />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : null}
      </span>
    </li>
  );
}

export function WorkList({ entries, size }: { entries: readonly WorkEntry[]; size?: 'sm' | 'md' }) {
  return (
    <ul className={styles.list} data-size={size ?? 'md'}>
      {entries.map((entry) => (
        <WorkLine key={entry.id} entry={entry} size={size} />
      ))}
    </ul>
  );
}

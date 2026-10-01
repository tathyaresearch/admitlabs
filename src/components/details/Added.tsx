// "Added by you": what an institution said about itself in Settings, always labelled and set apart
// from what Drishti found in public. Never part of the score.

import type { AddedByYou } from '@/domain/details';
import { ADDED_BY_YOU } from '@/domain/details';
import { Icon } from '@/components/ui/Icon';
import styles from './added.module.css';

export function AddedTag({ label = ADDED_BY_YOU }: { label?: string }) {
  return (
    <span className={styles.tag}>
      <Icon name="user" size={13} />
      {label}
    </span>
  );
}

/** On a check: what was added that relates to it, and the advice built on it where the plan shows how to fix. */
export function AddedNote({ added, showAdvice, label }: { added: AddedByYou; showAdvice: boolean; label?: string }) {
  return (
    <div className={styles.note}>
      <AddedTag label={label} />
      <ul className={styles.lines}>
        {added.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {showAdvice && added.advice ? <p className={styles.advice}>{added.advice}</p> : null}
      <p className={styles.never}>From Settings. Never part of the score.</p>
    </div>
  );
}

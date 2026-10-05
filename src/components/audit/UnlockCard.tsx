// Free: the one card that says what Paid adds, with the one "Subscribe now" action on the page.
// It names what is locked and counts it; nothing locked is sent to the page.

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { plural } from '@/domain/format';
import styles from './audit.module.css';

export function UnlockCard({ moreFixes, moreStrengths, lockedPrograms, action }: { moreFixes: number; moreStrengths: number; lockedPrograms: number; action: ReactNode }) {
  const items = [
    moreFixes > 0 ? `${plural(moreFixes, 'more fix', 'more fixes')}, ranked, with how to fix each one` : null,
    moreStrengths > 0 ? `${plural(moreStrengths, 'more strength', 'more strengths')}, with what was found` : null,
    'What Drishti found for every check, and where it found it',
    lockedPrograms > 0 ? `Your other ${plural(lockedPrograms, 'program', 'programs')}, each with its own score` : 'Every program you offer, each with its own score',
    'Your progress, month by month',
  ].filter((item): item is string => item !== null);

  return (
    <section className={styles.unlock} aria-labelledby="unlock-title">
      <div className={styles.unlockText}>
        <h2 id="unlock-title" className={styles.unlockTitle}>
          Paid shows the full picture
        </h2>
        <ul className={styles.unlockList}>
          {items.map((item) => (
            <li key={item} className={styles.unlockItem}>
              <Icon name="lock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.unlockAction}>{action}</div>
    </section>
  );
}

// Free: the one card that says what Paid adds to Rivals, with the one "Ask for Paid" action
// on the page. It names what is locked and counts it, to show the data is real. Nothing locked
// is sent to the page.

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { plural } from '@/domain/format';
import audit from '@/components/audit/audit.module.css';

export function RivalUnlockCard({ moves, posts, ads, action }: { moves: number; posts: number; ads: number; action: ReactNode }) {
  const items = [
    'Head to head scores, pillar by pillar',
    'Where each rival leads you, check by check, with what was found',
    '3 things to do each month, learned from your rivals',
    moves > 0 ? `${plural(moves, 'move', 'moves')} in the last 30 days, with an alert every time a rival moves` : 'Their moves, with an alert every time a rival moves',
    posts > 0 ? `Their ${plural(posts, 'best post', 'best posts')} this month, and what to learn from each` : 'Their best posts, and what to learn from each',
    ads > 0 ? `${plural(ads, 'promise', 'promises')} from their ads` : 'What they promise in their ads',
    'Change your rivals once a month',
  ];
  return (
    <section className={audit.unlock} aria-labelledby="unlock-title">
      <div className={audit.unlockText}>
        <h2 id="unlock-title" className={audit.unlockTitle}>
          Paid shows the full comparison
        </h2>
        <ul className={audit.unlockList}>
          {items.map((item) => (
            <li key={item} className={audit.unlockItem}>
              <Icon name="lock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={audit.unlockAction}>{action}</div>
    </section>
  );
}

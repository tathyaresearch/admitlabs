// Plan gating (spec section 10). Shows enough to prove the data is real (the teaser: real
// layout, counts, one example the plan allows), blurs the rest, and offers one clear action.
//
// Rule: `placeholder` must be fake placeholder content. The server never sends locked data
// to the page, so there is nothing real under the blur to reveal.

import type { ReactNode } from 'react';
import { ButtonLink } from './Button';
import { Icon } from './Icon';
import styles from './LockedPanel.module.css';

interface LockedPanelProps {
  title: string;
  description: string;
  /** Real content the plan is allowed to see, shown above the blur. */
  teaser?: ReactNode;
  /** FAKE content that only gives the blurred area its shape. Never real data. */
  placeholder: ReactNode;
  actionLabel?: string;
  actionHref?: string;
}

export function LockedPanel({ title, description, teaser, placeholder, actionLabel = 'Unlock with Paid', actionHref = '/plan' }: LockedPanelProps) {
  return (
    <div className={styles.locked}>
      {teaser ? <div>{teaser}</div> : null}
      <div className={styles.area}>
        <div className={styles.placeholder} aria-hidden="true" inert>
          {placeholder}
        </div>
        <div className={styles.overlay}>
          <div className={styles.card}>
            <span className={styles.lock}>
              <Icon name="lock" size={20} />
            </span>
            <p className={styles.title}>{title}</p>
            <p className={styles.description}>{description}</p>
            <ButtonLink href={actionHref} size="sm" iconAfter="arrowRight">
              {actionLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

// "Want us to do it for you?", on Free and Paid: the three AdmitLabs services, one line each, and
// Talk to AdmitLabs, which sends the team a request in its Enquiries (one open at a time, however
// many people click). In the sidebar just above the account, and on a phone in the More menu. An
// inverted block: ivory on the dark sidebar, black on the light one.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import styles from './ServicesCard.module.css';

export interface ServicesAskResult {
  ok: boolean;
  askedAt: string | null;
  error: string | null;
}

const THANKS = 'Thanks! The AdmitLabs team will contact you.';

export function ServicesCard({
  id,
  services,
  askedAt: openSince,
  onAsk,
}: {
  /** Where it sits, for its heading's id: the sidebar, or the phone's menu. */
  id: string;
  /** Program Growth, Institution Branding and Admit Campaign. */
  services: readonly string[];
  /** When the open request was sent, if there is one. */
  askedAt: string | null;
  onAsk: () => Promise<ServicesAskResult>;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ask = () => {
    startTransition(async () => {
      const result = await onAsk();
      setSent(result.ok);
      setError(result.ok ? null : result.error);
    });
  };

  return (
    <section className={`invert ${styles.card}`} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.title}>
        Want us to do it for you?
      </h2>
      <ul className={styles.services}>
        {services.map((service) => (
          <li key={service}>
            <Icon name="check" size={14} />
            {service}
          </li>
        ))}
      </ul>
      {sent || openSince ? (
        <p className={styles.done} role="status">
          {sent ? THANKS : `Requested on ${formatDate(openSince ?? '')}. The AdmitLabs team will contact you.`}
        </p>
      ) : (
        <Button size="sm" block icon="mail" loading={pending} onClick={ask}>
          Talk to AdmitLabs
        </Button>
      )}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

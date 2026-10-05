'use client';

// "Subscribe now" on Free, "Renew now" in the last month of Paid (C2): one click sends the request
// to the AdmitLabs team's Enquiries, and the team writes back to complete payment (online payment
// comes before launch). Once sent, it says so, and when. Price and terms stay as they are. Only the
// owner asks; everyone else is told who can.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import { PAID_BUTTONS, PAID_PRICE, PAID_THANKS } from '@/domain/tiers';
import type { PaidAskState } from '@/lib/plan/ask';
import styles from './AskPaid.module.css';

export interface AskPaidResult {
  ok: boolean;
  askedAt: string | null;
  error: string | null;
}

export function AskPaid({
  state,
  onAsk,
  variant = 'primary',
  size = 'md',
  note = true,
}: {
  state: PaidAskState;
  onAsk: () => Promise<AskPaidResult>;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  /** Under the button: the price and terms, or nothing where they are beside it. */
  note?: boolean;
}) {
  // Sent from this button, or from another one on the page (the server then says so for all).
  const [sent, setSent] = useState<string | null>(null);
  const askedAt = sent ?? state.askedAt;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!state.kind) return null;

  if (askedAt) {
    return (
      <p className={styles.asked} role="status">
        <Icon name="check" size={16} />
        <span>
          {sent
            ? PAID_THANKS
            : `Requested on ${formatDate(askedAt)}. The AdmitLabs team will contact ${state.canAsk ? 'you' : 'the owner'} to complete payment.`}
        </span>
      </p>
    );
  }

  if (!state.canAsk) return <p className={styles.note}>The owner of your account can {state.kind === 'ask_paid' ? 'subscribe' : 'renew'}.</p>;

  const ask = () => {
    startTransition(async () => {
      const result = await onAsk();
      if (result.ok) setSent(result.askedAt);
      setError(result.ok ? null : result.error);
    });
  };

  return (
    <div className={styles.ask}>
      <Button variant={variant} size={size} iconAfter="arrowRight" loading={pending} onClick={ask}>
        {PAID_BUTTONS[state.kind]}
      </Button>
      {note ? (
        <p className={styles.note}>
          {PAID_PRICE.text} {PAID_PRICE.term}, no auto-renew.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

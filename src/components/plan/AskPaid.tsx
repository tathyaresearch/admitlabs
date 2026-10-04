'use client';

// "Ask for Paid" on Free, "Ask to continue Paid" in the last month of Paid (C2): one click sends
// the request to the AdmitLabs team's Enquiries. Once sent, it says when and where the team will
// write back. Price and terms stay as they are, and nothing is paid here. Only the owner asks;
// everyone else is told who can.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import { PAID_PRICE } from '@/domain/tiers';
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
  /** Under the button: the price and how it works, how it works alone ('short', where the price is beside it), or nothing. */
  note?: boolean | 'short';
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
          Asked on {formatDate(askedAt)}. The AdmitLabs team will write to {state.canAsk ? <span className={styles.email}>{state.email}</span> : 'the owner'} to switch it on.
        </span>
      </p>
    );
  }

  if (!state.canAsk) return <p className={styles.note}>The owner of your account can ask AdmitLabs for Paid.</p>;

  const ask = () => {
    startTransition(async () => {
      const result = await onAsk();
      if (result.ok) setSent(result.askedAt);
      setError(result.ok ? null : result.error);
    });
  };

  return (
    <div className={styles.ask}>
      <Button variant={variant} size={size} icon="mail" loading={pending} onClick={ask}>
        {state.kind === 'ask_paid' ? 'Ask for Paid' : 'Ask to continue Paid'}
      </Button>
      {note === 'short' ? (
        <p className={styles.note}>The AdmitLabs team writes back and switches Paid on for you. Nothing is paid here.</p>
      ) : note ? (
        <p className={styles.note}>
          {PAID_PRICE.text} {PAID_PRICE.term}, no auto-renew. The AdmitLabs team writes back to switch it on. Nothing is paid here.
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

'use client';

// "Subscribe now" on Free, "Renew now" from the first renewal reminder of Paid (C2). The owner
// picks Monthly or 3 months (3 months first; on renewal, the plan's own), then sends: the request,
// with its period, lands in the AdmitLabs team's Enquiries, and the team writes back to complete
// payment (online payment comes before launch). Where the page already has the toggle (the Plan
// page's offer), its period goes with one click. Once sent, it says so, and when. Only the owner
// asks; everyone else is told who can.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import { PAID_BUTTONS, PAID_PRICE_BY_MONTHS, PAID_PRICE_LINE, PAID_SAVING, PAID_THANKS, paidPeriodText, type PaidMonths } from '@/domain/tiers';
import type { PaidAskState } from '@/lib/plan/ask';
import { PeriodToggle, PriceSwap, usePeriod } from './PeriodToggle';
import styles from './AskPaid.module.css';

export interface AskPaidResult {
  ok: boolean;
  askedAt: string | null;
  error: string | null;
}

/** "Subscribe for 3 months", "Renew monthly": the button that sends, once the period is picked. */
function sendLabel(kind: 'ask_paid' | 'continue_paid', months: PaidMonths): string {
  const verb = kind === 'ask_paid' ? 'Subscribe' : 'Renew';
  return months === 1 ? `${verb} monthly` : `${verb} for ${months} months`;
}

export function AskPaid({
  state,
  onAsk,
  variant = 'primary',
  size = 'md',
  note = true,
  months,
}: {
  state: PaidAskState;
  onAsk: (months: PaidMonths) => Promise<AskPaidResult>;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  /** Under the button: both prices and the terms, or nothing where they are beside it. */
  note?: boolean;
  /** The period picked by the page's own toggle: the button then sends it straight away. */
  months?: PaidMonths;
}) {
  // Sent from this button, or from another one on the page (the server then says so for all).
  const [sent, setSent] = useState<{ at: string | null; months: PaidMonths } | null>(null);
  const askedAt = sent?.at ?? state.askedAt;
  const askedMonths = sent?.months ?? state.askedMonths;
  const [choosing, setChoosing] = useState(false);
  const period = usePeriod(state.pick);
  const pick = period.months;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const kind = state.kind;
  if (!kind) return null;

  if (askedAt) {
    return (
      <p className={styles.asked} role="status">
        <Icon name="check" size={16} />
        <span>
          {sent
            ? PAID_THANKS
            : `Requested on ${formatDate(askedAt)}${askedMonths ? `: ${paidPeriodText(askedMonths)}` : ''}. The AdmitLabs team will contact ${state.canAsk ? 'you' : 'the owner'} to complete payment.`}
        </span>
      </p>
    );
  }

  if (!state.canAsk) return <p className={styles.note}>The owner of your account can {kind === 'ask_paid' ? 'subscribe' : 'renew'}.</p>;

  const send = (period: PaidMonths) => {
    startTransition(async () => {
      const result = await onAsk(period);
      if (result.ok) setSent({ at: result.askedAt, months: period });
      setError(result.ok ? null : result.error);
    });
  };

  const failed = error ? (
    <p className={styles.error} role="alert">
      {error}
    </p>
  ) : null;

  if (months) {
    return (
      <div className={styles.ask}>
        <Button variant={variant} size={size} iconAfter="arrowRight" loading={pending} onClick={() => send(months)}>
          {PAID_BUTTONS[kind]}
        </Button>
        {failed}
      </div>
    );
  }

  if (choosing) {
    const price = PAID_PRICE_BY_MONTHS[pick];
    return (
      <div className={styles.choose} role="group" aria-label={PAID_BUTTONS[kind]}>
        <PeriodToggle value={pick} onChange={period.choose} label="Pick how long" />
        <PriceSwap months={pick} moved={period.moved} towards={period.towards}>
          <p className={styles.price}>
            {price.text} {price.term}.{pick === 3 ? ` ${PAID_SAVING}.` : ''} No auto-renew.
          </p>
        </PriceSwap>
        <div className={styles.buttons}>
          <Button variant="primary" size="sm" iconAfter="arrowRight" loading={pending} onClick={() => send(pick)}>
            {sendLabel(kind, pick)}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setChoosing(false)}>
            Not now
          </Button>
        </div>
        {failed}
      </div>
    );
  }

  return (
    <div className={styles.ask}>
      <Button variant={variant} size={size} iconAfter="arrowRight" onClick={() => setChoosing(true)}>
        {PAID_BUTTONS[kind]}
      </Button>
      {note ? <p className={styles.note}>{PAID_PRICE_LINE}. No auto-renew.</p> : null}
      {failed}
    </div>
  );
}

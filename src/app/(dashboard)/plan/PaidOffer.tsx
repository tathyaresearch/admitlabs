'use client';

// Free's offer on the Plan page: Monthly or 3 months (3 months first, with "Save 17%" in the
// toggle), the price for the period shown, and Subscribe now for that period, in one click. The
// points between come from the page.

import { useState, type ReactNode } from 'react';
import { askForPaidAction } from '@/app/(dashboard)/actions';
import { AskPaid } from '@/components/plan/AskPaid';
import { PeriodToggle } from '@/components/plan/PeriodToggle';
import { PAID_PRICE_BY_MONTHS, type PaidMonths } from '@/domain/tiers';
import type { PaidAskState } from '@/lib/plan/ask';
import styles from './plan.module.css';

export function PaidOffer({ state, children }: { state: PaidAskState; children: ReactNode }) {
  const [months, setMonths] = useState<PaidMonths>(state.pick);
  const price = PAID_PRICE_BY_MONTHS[months];
  return (
    <>
      <div className={styles.offerPrice}>
        <p className={styles.offerName}>Paid adds everything else</p>
        <PeriodToggle value={months} onChange={setMonths} />
        <div className={styles.offerFigure} aria-live="polite">
          <p className={styles.offerAmount}>
            <span className="num">{price.amount}</span>
          </p>
          <p className={styles.offerLength}>
            {price.tax} {price.term}
          </p>
        </div>
      </div>
      {children}
      <div className={styles.offerAsk}>
        <AskPaid state={state} onAsk={askForPaidAction} months={months} />
      </div>
    </>
  );
}

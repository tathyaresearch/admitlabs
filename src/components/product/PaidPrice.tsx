'use client';

// The Paid card's price on /drishti: "Monthly | 3 months", 3 months first, and the price for the
// period picked. "Save 17%" sits on 3 months in the toggle. The prices come from config (PAID_PRICES).

import { useState } from 'react';
import { PeriodToggle } from '@/components/plan/PeriodToggle';
import { DEFAULT_PAID_MONTHS, PAID_PRICE_BY_MONTHS, type PaidMonths } from '@/domain/tiers';
import styles from './product.module.css';

export function PaidPrice() {
  const [months, setMonths] = useState<PaidMonths>(DEFAULT_PAID_MONTHS);
  const price = PAID_PRICE_BY_MONTHS[months];
  return (
    <div className={styles.paidPrice}>
      <PeriodToggle value={months} onChange={setMonths} label="How Paid is billed" />
      <p className={styles.price} aria-live="polite">
        <span className={`${styles.priceValue} num`}>{price.amount}</span>
        <span className={styles.priceTerm}>
          {price.tax} {price.term}
        </span>
      </p>
    </div>
  );
}

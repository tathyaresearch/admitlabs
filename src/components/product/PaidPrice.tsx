'use client';

// The Paid card's price on /drishti: "Monthly | 3 months", 3 months first, and the price for the
// period picked, which rises into place when the period changes. "Save 17%" sits on 3 months in
// the toggle. The prices come from config (PAID_PRICES).

import { PeriodToggle, PriceSwap, usePeriod } from '@/components/plan/PeriodToggle';
import { PAID_PRICE_BY_MONTHS } from '@/domain/tiers';
import styles from './product.module.css';

export function PaidPrice() {
  const period = usePeriod();
  const price = PAID_PRICE_BY_MONTHS[period.months];
  return (
    <div className={styles.paidPrice}>
      <PeriodToggle value={period.months} onChange={period.choose} className={styles.periodToggle} />
      <PriceSwap months={period.months} moved={period.moved} towards={period.towards}>
        <p className={styles.price}>
          <span className={`${styles.priceValue} num`}>{price.amount}</span>
          <span className={styles.priceTerm}>
            {price.tax} {price.term}
          </span>
        </p>
      </PriceSwap>
    </div>
  );
}

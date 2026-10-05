'use client';

// "Monthly | 3 months": how Paid is billed, on /drishti, the Plan page and Subscribe now. A radio
// group: Tab reaches the picked one, the arrow keys move and pick, like SegmentedControl. 3 months
// carries its saving ("Save 17%"), worked out from the prices in config.

import { useRef, type KeyboardEvent } from 'react';
import { PAID_PRICES, PAID_SAVING, type PaidMonths } from '@/domain/tiers';
import styles from './PeriodToggle.module.css';

export function PeriodToggle({
  value,
  onChange,
  label = 'How Paid is billed',
  size = 'md',
}: {
  value: PaidMonths;
  onChange: (months: PaidMonths) => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = PAID_PRICES.findIndex((price) => price.months === value);
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % PAID_PRICES.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + PAID_PRICES.length) % PAID_PRICES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = PAID_PRICES.length - 1;
    else return;
    event.preventDefault();
    const price = PAID_PRICES[next];
    if (!price) return;
    onChange(price.months);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={`${styles.group} ${styles[size]}`} onKeyDown={move}>
      {PAID_PRICES.map((price, index) => {
        const picked = price.months === value;
        return (
          <button
            key={price.months}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={picked}
            tabIndex={picked ? 0 : -1}
            className={styles.option}
            onClick={() => onChange(price.months)}
          >
            {price.label}
            {price.months === 3 ? <span className={`${styles.saving} num`}>{PAID_SAVING}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

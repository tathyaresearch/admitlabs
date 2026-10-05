'use client';

// "Monthly | 3 months": how Paid is billed, on /drishti, the Plan page and Subscribe now. One pill
// everywhere: an ivory thumb glides to the picked option, taking its width, with "Save 17%" on 3
// months (worked out from the prices in config). The thumb carries its own copy of the labels in
// black, held in place as it moves, so the words turn exactly where the thumb covers them. A radio group: Tab reaches the picked option, the
// arrow keys move and pick. The price beside it changes through PriceSwap, which rises into place
// (or drops back, to Monthly). With reduced motion both switch at once.

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DEFAULT_PAID_MONTHS, PAID_PRICES, PAID_SAVING, type PaidMonths } from '@/domain/tiers';
import styles from './PeriodToggle.module.css';

/** The period picked, and whether it has changed since the page opened (only then does the price animate). */
export function usePeriod(initial: PaidMonths = DEFAULT_PAID_MONTHS) {
  const [state, setState] = useState<{ months: PaidMonths; moved: boolean; towards: 'longer' | 'shorter' }>({ months: initial, moved: false, towards: 'longer' });
  return {
    months: state.months,
    moved: state.moved,
    towards: state.towards,
    choose: (months: PaidMonths) =>
      setState((current) => (months === current.months ? current : { months, moved: true, towards: months > current.months ? 'longer' : 'shorter' })),
  };
}

export function PeriodToggle({
  value,
  onChange,
  label = 'How Paid is billed',
  className,
}: {
  value: PaidMonths;
  onChange: (months: PaidMonths) => void;
  label?: string;
  /** /drishti adds the website's soft light this way; in the dashboard the pill stays flat. */
  className?: string;
}) {
  const pill = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const picked = Math.max(0, PAID_PRICES.findIndex((price) => price.months === value));

  // The thumb takes the picked option's place and width, measured, so each option is as wide as
  // its words. Until then (and without JavaScript) the picked option is ivory itself.
  useLayoutEffect(() => {
    const element = pill.current;
    if (!element) return;
    const place = () => {
      const option = refs.current[picked];
      if (!option) return;
      element.style.setProperty('--thumb-x', `${option.offsetLeft}px`);
      element.style.setProperty('--thumb-w', `${option.offsetWidth}px`);
    };
    place();
    // Shown from the next frame, so the first placing never slides in from the side.
    const frame = requestAnimationFrame(() => element.setAttribute('data-ready', ''));
    const resized = new ResizeObserver(place);
    resized.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
    };
  }, [picked]);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    let next = picked;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (picked + 1) % PAID_PRICES.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (picked - 1 + PAID_PRICES.length) % PAID_PRICES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = PAID_PRICES.length - 1;
    else return;
    event.preventDefault();
    const price = PAID_PRICES[next];
    if (!price) return;
    onChange(price.months);
    refs.current[next]?.focus();
  }

  const words = (price: (typeof PAID_PRICES)[number]) => (
    <>
      <span>{price.label}</span>
      {price.months === 3 ? <span className={`${styles.badge} num`}>{PAID_SAVING}</span> : null}
    </>
  );

  return (
    <div ref={pill} role="radiogroup" aria-label={label} className={className ? `${styles.pill} ${className}` : styles.pill} onKeyDown={move}>
      <span className={styles.thumb} data-thumb="" aria-hidden="true">
        <span className={styles.thumbWords}>
          {PAID_PRICES.map((price) => (
            <span key={price.months} className={styles.option}>
              {words(price)}
            </span>
          ))}
        </span>
      </span>
      {PAID_PRICES.map((price, index) => {
        const checked = price.months === value;
        return (
          <button
            key={price.months}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={styles.option}
            onClick={() => onChange(price.months)}
          >
            {words(price)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The price for the period picked. Once the period changes, the new price rises into place (going
 * to 3 months) or drops back (to Monthly). Screen readers hear the new price.
 */
export function PriceSwap({
  months,
  moved,
  towards,
  className,
  children,
}: {
  months: PaidMonths;
  moved: boolean;
  towards: 'longer' | 'shorter';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-live="polite" className={className}>
      <div key={months} className={moved ? styles.swapIn : undefined} data-towards={towards}>
        {children}
      </div>
    </div>
  );
}

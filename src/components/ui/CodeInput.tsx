'use client';

// The 6-digit sign-in code. One real input (so paste, autofill from email, and screen
// readers all work) drawn as six cells.

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import styles from './CodeInput.module.css';

interface CodeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue' | 'type'> {
  id: string;
  name: string;
  label: string;
  length?: number;
  error?: string | null;
  /** Called once all digits are in, after the input shows them. */
  onComplete?: (code: string) => void;
}

export function CodeInput({ id, name, label, length = 6, error, onComplete, autoFocus, ...rest }: CodeInputProps) {
  const [value, setValue] = useState('');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (value.length === length) onCompleteRef.current?.(value);
  }, [value, length]);

  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.cells} data-invalid={error ? 'true' : undefined}>
        {Array.from({ length }, (_, index) => {
          const active = index === Math.min(value.length, length - 1);
          return (
            <span key={index} className={`${styles.cell} num`} data-filled={value[index] ? 'true' : undefined} data-active={active ? 'true' : undefined} aria-hidden="true">
              {value[index] ?? ''}
            </span>
          );
        })}
        <input
          id={id}
          name={name}
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`[0-9]{${length}}`}
          required
          autoFocus={autoFocus}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, length))}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

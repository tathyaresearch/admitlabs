// Form controls with their label, hint and error wired together for screen readers.
// Errors never rely on colour: a heavier border, an icon and a plain sentence.

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Form.module.css';
import { Icon } from './Icon';

interface FieldChrome {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Visually hide the label (it is still read out). */
  hideLabel?: boolean;
}

function describedBy(id: string, hint?: ReactNode, error?: string | null): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

function FieldFrame({ id, label, hint, error, hideLabel, children }: FieldChrome & { children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <FieldError id={id} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string | null }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className={styles.error}>
      <Icon name="info" size={16} />
      {error}
    </p>
  );
}

export function TextField({ id, label, hint, error, hideLabel, className, ...input }: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        className={[styles.control, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
    </FieldFrame>
  );
}

export function TextAreaField({ id, label, hint, error, hideLabel, className, ...textarea }: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        id={id}
        className={[styles.control, styles.textarea, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...textarea}
      />
    </FieldFrame>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  id,
  label,
  hint,
  error,
  hideLabel,
  options,
  placeholder,
  className,
  ...select
}: FieldChrome & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly Option[]; placeholder?: string }) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <span className={styles.selectWrap}>
        <select
          id={id}
          className={[styles.control, styles.select, className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...select}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={18} className={styles.selectIcon} />
      </span>
    </FieldFrame>
  );
}

export function Checkbox({ id, label, hint, className, ...input }: { id: string; label: ReactNode; hint?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className={[styles.choice, className].filter(Boolean).join(' ')}>
      <input id={id} type="checkbox" className={styles.checkbox} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      <span className={styles.choiceText}>
        <label htmlFor={id} className={styles.choiceLabel}>
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function RadioGroup({
  name,
  legend,
  options,
  defaultValue,
  hint,
  error,
}: {
  name: string;
  legend: string;
  options: ReadonlyArray<Option & { hint?: string }>;
  defaultValue?: string;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <fieldset className={styles.fieldset} aria-describedby={describedBy(name, hint, error)} aria-invalid={error ? true : undefined}>
      <legend className={styles.label}>{legend}</legend>
      {hint ? (
        <p id={`${name}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.choices}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className={styles.choice}>
              <input id={id} type="radio" name={name} value={option.value} defaultChecked={option.value === defaultValue} className={styles.radio} />
              <span className={styles.choiceText}>
                <label htmlFor={id} className={styles.choiceLabel}>
                  {option.label}
                </label>
                {option.hint ? <span className={styles.hint}>{option.hint}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      <FieldError id={name} error={error} />
    </fieldset>
  );
}

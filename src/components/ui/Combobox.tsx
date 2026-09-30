'use client';

// A text box with a list of matches (WAI-ARIA combobox pattern). Type to filter, arrow keys to
// move, Enter to choose, Escape to close. The parent owns the text and decides what a choice does.

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import formStyles from './Form.module.css';
import { Icon } from './Icon';
import styles from './Combobox.module.css';

export interface ComboboxProps<T> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  placeholder?: string;
  /** The text in the box. */
  query: string;
  onQueryChange: (query: string) => void;
  search: (query: string) => readonly T[];
  optionKey: (item: T) => string;
  /** What a screen reader hears for the option. */
  optionLabel: (item: T) => string;
  renderOption?: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  /** Shown when nothing matches. */
  emptyText?: string;
  /** Keep the list shut until the text changes (for example right after a choice). */
  closed?: boolean;
  required?: boolean;
}

export function Combobox<T>({
  id,
  label,
  hint,
  error,
  placeholder,
  query,
  onQueryChange,
  search,
  optionKey,
  optionLabel,
  renderOption,
  onSelect,
  emptyText = 'No matches.',
  closed = false,
  required,
}: ComboboxProps<T>) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);

  const results = query.trim() ? search(query) : [];
  const open = focused && !dismissed && !closed && query.trim().length > 0;
  const current = Math.min(active, Math.max(0, results.length - 1));
  const optionId = (index: number) => `${listId}-option-${index}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  function choose(item: T) {
    onSelect(item);
    setDismissed(true);
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setDismissed(false);
      setActive(open ? (current + 1) % Math.max(1, results.length) : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setDismissed(false);
      setActive(open ? (current - 1 + results.length) % Math.max(1, results.length) : Math.max(0, results.length - 1));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      const item = results[current];
      if (item !== undefined) choose(item);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setDismissed(true);
    }
  }

  return (
    <div className={formStyles.field}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
      </label>
      <div className={styles.wrap}>
        <Icon name="search" size={16} className={styles.icon} />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          className={`${formStyles.control} ${styles.input}`}
          placeholder={placeholder}
          value={query}
          required={required}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && results.length ? optionId(current) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setDismissed(false);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        <ul id={listId} role="listbox" aria-label={label} className={styles.list} hidden={!open}>
          {results.map((item, index) => (
            <li
              key={optionKey(item)}
              id={optionId(index)}
              role="option"
              aria-selected={index === current}
              aria-label={optionLabel(item)}
              className={styles.option}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
            >
              {renderOption ? renderOption(item) : optionLabel(item)}
            </li>
          ))}
          {open && results.length === 0 ? (
            <li className={styles.empty} role="presentation">
              {emptyText}
            </li>
          ) : null}
        </ul>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className={formStyles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={formStyles.error}>
          <Icon name="info" size={16} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

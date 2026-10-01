// Number cards: one calm style for every key number (the score, the pillars, your rank among
// rivals, the fastest rise in demand). A label, the number in Inter with tabular figures, and
// a line under it. Same card, same spacing, on every page.

import type { ReactNode } from 'react';
import styles from './Kpi.module.css';

export function KpiCard({ label, aside, className, children }: { label: ReactNode; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      <div className={styles.head}>
        <p className={styles.label}>{label}</p>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * The number itself, in Inter. `suffix` sits after it, smaller: a number like "/100" (set
 * `numericSuffix`) or words like "of 4" (Bricolage). `spoken` is read out after it.
 */
export function KpiNumber({
  value,
  suffix,
  numericSuffix = false,
  size = 'md',
  spoken,
  icon,
}: {
  value: ReactNode;
  suffix?: ReactNode;
  numericSuffix?: boolean;
  size?: 'hero' | 'md';
  spoken?: string;
  icon?: ReactNode;
}) {
  return (
    <p className={[styles.number, styles[size]].join(' ')}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={`${styles.value} num`}>{value}</span>
      {suffix ? <span className={numericSuffix ? `${styles.suffix} num` : styles.suffixWords}>{suffix}</span> : null}
      {spoken ? <span className="visually-hidden">{spoken}</span> : null}
    </p>
  );
}

/** A thin bar for a score out of 100. Decoration: the number beside it says the same. */
export function KpiBar({ value }: { value: number }) {
  return (
    <span className={styles.track} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

/** The quiet line under a number: the change, or where it comes from. */
export function KpiNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

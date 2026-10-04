'use client';

// A waiting monthly summary, line by line, as the team reviews it (spec section 25): how you're
// doing, each of the 3 things to do, the rival move and a Client's enquiries, each to rewrite with
// a short reason when a provider got it wrong. Every change saves at once and is kept; the PDF is
// made again with the lines as they stand when the summary is approved.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { ReviewActionResult } from '@/app/team/review/actions';
import type { SummaryTarget } from '@/report/summary';
import audit from '@/components/audit/places.module.css';
import styles from './review.module.css';

export interface SummaryLineData {
  target: SummaryTarget;
  label: string;
  value: string;
  /** Where a thing comes from and its label: not a line to fix. */
  meta: string | null;
  /** The team's last change to this line in this review. */
  changed: { by: string | null; before: string | null; reason: string | null } | null;
}

function Line({ reportId, line, onFix }: { reportId: string; line: SummaryLineData; onFix: (reportId: string, target: SummaryTarget, value: string, reason: string) => Promise<ReviewActionResult> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(line.value);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const outcome = await onFix(reportId, line.target, value, reason);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setError(null);
      setOpen(false);
      setReason('');
      router.refresh();
    });
  return (
    <li className={[styles.editRow, styles.summaryRow, line.changed ? styles.editRowOn : ''].join(' ')}>
      <span className={styles.editName}>
        <span className={styles.editNameText}>{line.label}</span>
      </span>
      <span className={styles.editLine}>
        <span className={styles.summaryValue}>{line.value}</span>
        {line.meta ? <span className={audit.quiet}>{line.meta}</span> : null}
        {line.changed ? (
          <span className={styles.editNote}>
            Rewritten{line.changed.by ? ` by ${line.changed.by}` : ''}
            {line.changed.before ? `, was “${line.changed.before}”` : ''}
            {line.changed.reason ? `. ${line.changed.reason}` : ''}
          </span>
        ) : null}
      </span>
      <span className={styles.editActions}>
        <button type="button" className={audit.linkButton} onClick={() => setOpen(!open)} disabled={pending}>
          Edit line
        </button>
      </span>
      {open ? (
        <div className={styles.editForm}>
          <label className={styles.editField}>
            <span className={styles.editLabel}>{line.label}</span>
            <textarea className={styles.textInput} rows={3} value={value} maxLength={400} onChange={(event) => setValue(event.target.value)} />
          </label>
          <label className={styles.editField}>
            <span className={styles.editLabel}>Why, in a few words (optional)</span>
            <input className={styles.textInput} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
          </label>
          <div className={styles.editButtons}>
            <Button size="sm" loading={pending} onClick={save}>
              Save
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setOpen(false);
                setValue(line.value);
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
          {error ? (
            <p className={styles.editError} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function SummaryLines({
  reportId,
  lines,
  onFix,
}: {
  reportId: string;
  lines: readonly SummaryLineData[];
  onFix: (reportId: string, target: SummaryTarget, value: string, reason: string) => Promise<ReviewActionResult>;
}) {
  return (
    <ul className={styles.editList}>
      {lines.map((line) => (
        <Line key={line.target} reportId={reportId} line={line} onFix={onFix} />
      ))}
    </ul>
  );
}

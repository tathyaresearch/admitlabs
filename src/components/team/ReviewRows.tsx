'use client';

// One place of a waiting Audit, as the team reviews it (spec section 25): each result with a
// choice of Strong, Okay, Weak or Missing and a short reason; each line (what was seen, a fix's
// name, its steps or its ready fix) to rewrite; a finding to take out when it is not about the
// college. Every change saves at once, the words and the score update, and the change is kept.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ProofView } from '@/audit/places';
import type { ReviewChange } from '@/audit/review';
import { Moved, PLACE_ICONS, ProofLine, Tag } from '@/components/audit/PlaceBits';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { FINDING_KIND_LABELS, RESULT_LABELS, RESULTS, type CheckKey, type CheckResult, type FindingKind, type Place } from '@/domain/types';
import type { ReviewActionResult } from '@/app/team/review/actions';
import audit from '@/components/audit/places.module.css';
import styles from './review.module.css';

export interface ReviewRowData {
  id: string;
  on: 'check' | 'finding';
  place: Place;
  name: string;
  program: string | null;
  checkKey: CheckKey | null;
  result: CheckResult | null;
  findingKind: FindingKind | null;
  /** A finding the last approved Audit did not have. */
  isNew: boolean;
  proof: ProofView | null;
  /** Has a fix, so its name, steps and ready fix can be rewritten too. */
  hasFix: boolean;
  values: { line: string; fixTitle: string; steps: string; readyFix: string };
  /** The team's change to this result in this review, if any. */
  changed: { by: string | null; before: CheckResult; after: CheckResult; reason: string | null } | null;
  /** The lines the team rewrote in this review: "what was seen, the steps". */
  rewritten: { what: string; by: string | null } | null;
}

type Field = 'line' | 'fix_title' | 'fix_steps' | 'ready_fix';

const FIELD_LABELS: Readonly<Record<Field, string>> = {
  line: 'What was seen',
  fix_title: 'The fix’s name',
  fix_steps: 'The steps, one a line',
  ready_fix: 'The ready fix',
};

function Row({ auditId, row, onChange }: { auditId: string; row: ReviewRowData; onChange: (auditId: string, change: ReviewChange) => Promise<ReviewActionResult> }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'result' | 'line' | 'remove'>('idle');
  const [result, setResult] = useState<CheckResult | null>(row.result);
  const [field, setField] = useState<Field>('line');
  const [value, setValue] = useState(row.values.line);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (change: ReviewChange) =>
    startTransition(async () => {
      const outcome = await onChange(auditId, change);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setError(null);
      setMode('idle');
      setReason('');
      router.refresh();
    });

  const pickField = (next: Field) => {
    setField(next);
    setValue(next === 'line' ? row.values.line : next === 'fix_title' ? row.values.fixTitle : next === 'fix_steps' ? row.values.steps : row.values.readyFix);
  };
  const lineField = (next: Field) => (row.on === 'check' && next === 'line' ? 'finding' : next);

  return (
    <li className={[styles.editRow, row.changed || row.rewritten ? styles.editRowOn : ''].join(' ')}>
      <span className={styles.editName}>
        {row.checkKey ? <CheckIcon check={row.checkKey} size={15} /> : <Icon name={PLACE_ICONS[row.place]} size={15} />}
        <span className={styles.editNameText}>
          {row.name}
          {row.program ? <span className={styles.editProgram}>{row.program}</span> : null}
        </span>
      </span>
      <span className={styles.editResult}>
        {row.on === 'check' && row.result ? (
          <>
            <label className="visually-hidden" htmlFor={`result-${row.id}`}>
              Result for {row.name}
              {row.program ? ` in ${row.program}` : ''}
            </label>
            <select
              id={`result-${row.id}`}
              className={styles.selectInput}
              value={result ?? row.result}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value as CheckResult;
                setResult(next);
                setMode(next === row.result ? 'idle' : 'result');
              }}
            >
              {RESULTS.map((option) => (
                <option key={option} value={option}>
                  {RESULT_LABELS[option]}
                </option>
              ))}
            </select>
            <ResultBar result={result ?? row.result} showPoints={false} size="sm" />
          </>
        ) : row.findingKind ? (
          <span className={styles.findingTags}>
            <Tag strong={row.findingKind === 'bad' || row.findingKind === 'unanswered'}>{FINDING_KIND_LABELS[row.findingKind]}</Tag>
            {row.isNew ? <Tag strong>New</Tag> : null}
          </span>
        ) : null}
      </span>
      <span className={styles.editLine}>
        {row.proof ? <ProofLine proof={row.proof} compact /> : null}
        {row.changed ? (
          <span className={styles.editNote}>
            Changed{row.changed.by ? ` by ${row.changed.by}` : ''}: <Moved before={row.changed.before} after={row.changed.after} />
            {row.changed.reason ? `. “${row.changed.reason}”` : ''}
          </span>
        ) : null}
        {row.rewritten ? (
          <span className={styles.editNote}>
            Rewritten{row.rewritten.by ? ` by ${row.rewritten.by}` : ''}: {row.rewritten.what}
          </span>
        ) : null}
      </span>
      <span className={styles.editActions}>
        <button type="button" className={audit.linkButton} onClick={() => setMode(mode === 'line' ? 'idle' : 'line')} disabled={pending}>
          Edit line
        </button>
        {row.on === 'finding' ? (
          <button type="button" className={audit.linkButton} onClick={() => setMode(mode === 'remove' ? 'idle' : 'remove')} disabled={pending}>
            Take out
          </button>
        ) : null}
      </span>

      {mode !== 'idle' ? (
        <div className={styles.editForm}>
          {mode === 'line' ? (
            <>
              {row.hasFix ? (
                <label className={styles.editField}>
                  <span className={styles.editLabel}>Which line</span>
                  <select className={styles.selectInput} value={field} onChange={(event) => pickField(event.target.value as Field)}>
                    {(['line', 'fix_title', 'fix_steps', 'ready_fix'] as const).map((option) => (
                      <option key={option} value={option}>
                        {FIELD_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={styles.editField}>
                <span className={styles.editLabel}>{FIELD_LABELS[field]}</span>
                <textarea className={styles.textInput} rows={field === 'fix_steps' || field === 'ready_fix' ? 5 : 2} value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
            </>
          ) : null}
          <label className={styles.editField}>
            <span className={styles.editLabel}>{mode === 'line' ? 'Why, in a few words (optional)' : mode === 'remove' ? 'Why it is not about the college' : 'Why the result is different'}</span>
            <input className={styles.textInput} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
          </label>
          <div className={styles.editButtons}>
            <Button
              size="sm"
              loading={pending}
              onClick={() =>
                save(
                  mode === 'result'
                    ? { kind: 'result', checkId: row.id, result: result ?? (row.result as CheckResult), reason }
                    : mode === 'remove'
                      ? { kind: 'remove', findingId: row.id, reason }
                      : row.on === 'check'
                        ? { kind: 'line', on: 'check', checkId: row.id, field: lineField(field) as 'finding' | 'fix_title' | 'fix_steps' | 'ready_fix', value, reason }
                        : { kind: 'line', on: 'finding', findingId: row.id, field, value, reason },
                )
              }
            >
              {mode === 'remove' ? 'Take it out' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setMode('idle');
                setResult(row.result);
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

export function ReviewRows({ auditId, rows, onChange }: { auditId: string; rows: readonly ReviewRowData[]; onChange: (auditId: string, change: ReviewChange) => Promise<ReviewActionResult> }) {
  return (
    <ul className={styles.editList}>
      {rows.map((row) => (
        <Row key={row.id} auditId={auditId} row={row} onChange={onChange} />
      ))}
    </ul>
  );
}

/** Approve and send, in the bar at the bottom of the review. */
export function ApproveButton({ auditId, onApprove }: { auditId: string; onApprove: (auditId: string) => Promise<ReviewActionResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className={styles.approveAction}>
      <Button
        icon="check"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await onApprove(auditId);
            if (outcome && !outcome.ok) setError(outcome.error);
          })
        }
      >
        Approve and send
      </Button>
      {error ? (
        <span className={styles.editError} role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

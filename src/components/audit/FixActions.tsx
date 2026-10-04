'use client';

// What the owner does with a fix (spec 7.7): Mark as done (the next Audit checks it) and, on Free
// and Paid, Let AdmitLabs fix this (one request to the team, never sent twice). Everyone else sees
// what was done: "Marked done" and "Sent on 4 Oct. AdmitLabs will write to you." A Client has no
// request to send: the team already works on it.

import { useOptimistic, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import styles from './places.module.css';

export interface FixActionState {
  /** Fix ids marked done and waiting for the next Audit. */
  marked: readonly string[];
  /** Open requests to AdmitLabs, by fix id: when each was sent. */
  asked: Readonly<Record<string, string>>;
  canMark: boolean;
  /** The owner on Free or Paid. */
  canAsk: boolean;
  /** A Client: no request to send. */
  client: boolean;
  /** "15 Oct 2026": when the next Audit checks a mark, on this plan. */
  nextAudit: string | null;
}

export interface FixActionHandlers {
  onMark: (input: { fixId: string; done: boolean }) => Promise<{ ok: boolean; error: string | null }>;
  onAsk: (input: { fixId: string; title: string }) => Promise<{ ok: boolean; askedAt: string | null; error: string | null }>;
}

export function sentLine(askedAt: string): string {
  return `Sent on ${formatDate(askedAt)}. AdmitLabs will write to you.`;
}

export function FixActions({
  fix,
  state,
  handlers,
  layout = 'inline',
}: {
  fix: { id: string; title: string };
  state: FixActionState;
  handlers: FixActionHandlers;
  layout?: 'inline' | 'panel';
}) {
  const [marked, setMarked] = useOptimistic(state.marked.includes(fix.id), (_current: boolean, next: boolean) => next);
  const [asked, setAsked] = useState<string | null>(state.asked[fix.id] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const when = state.nextAudit ? `Your next Audit, on ${state.nextAudit},` : 'Your next Audit';

  const mark = (done: boolean) =>
    startTransition(async () => {
      setMarked(done);
      const result = await handlers.onMark({ fixId: fix.id, done });
      setError(result.ok ? null : result.error);
    });
  const ask = () =>
    startTransition(async () => {
      const result = await handlers.onAsk({ fixId: fix.id, title: fix.title });
      if (result.ok && result.askedAt) setAsked(result.askedAt);
      setError(result.ok ? null : result.error);
    });

  const markControl = state.canMark ? (
    marked ? (
      <span className={styles.markedDone}>
        <Icon name="checkCircle" size={16} />
        Marked done
        <button type="button" className={styles.linkButton} onClick={() => mark(false)} disabled={pending}>
          Undo
        </button>
      </span>
    ) : (
      <Button variant="secondary" size="sm" icon="check" onClick={() => mark(true)} disabled={pending}>
        Mark as done
      </Button>
    )
  ) : marked ? (
    <span className={styles.markedDone}>
      <Icon name="checkCircle" size={16} />
      Marked done
    </span>
  ) : null;

  const askControl = state.client ? null : asked ? (
    <span className={styles.asked}>{sentLine(asked)}</span>
  ) : state.canAsk ? (
    <Button variant={layout === 'panel' ? 'secondary' : 'quiet'} size="sm" icon="wrench" onClick={ask} disabled={pending}>
      Let AdmitLabs fix this
    </Button>
  ) : null;

  if (layout === 'inline') {
    return (
      <>
        {markControl}
        {askControl}
        {error ? (
          <span className={styles.actionError} role="alert">
            {error}
          </span>
        ) : null}
      </>
    );
  }
  return (
    <div className={styles.panelFooter}>
      <div className={styles.panelButtons}>
        {markControl}
        {askControl}
      </div>
      <p className={styles.quiet}>
        {marked ? `${when} checks it and says what it found.` : state.canMark ? `Done it? Mark it. ${when} checks it.` : `When the owner marks it done, ${when.charAt(0).toLowerCase()}${when.slice(1)} checks it.`}
        {!state.client && state.canAsk && !asked ? ' Asking AdmitLabs sends one request to the team; they write back.' : ''}
      </p>
      {error ? (
        <p className={styles.actionError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

'use client';

// The interactive parts of the team's institution page. Every action is a server action that
// checks the team role (and Admin for plans) again; these only show progress and the reply.

import { useActionState, useState } from 'react';
import type { ActionState } from '@/app/team/institutions/[id]/actions';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Form';
import { paidEndText, paidStartFrom, paidStartRange } from '@/team/plans';
import styles from './team.module.css';

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const IDLE: ActionState = { status: 'idle', message: null, attempt: 0 };

function Reply({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? styles.formError : styles.done} role={state.status === 'error' ? 'alert' : 'status'}>
      {state.message}
    </p>
  );
}

export function NoteForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'note'} action={submit} className={styles.facts}>
      <TextAreaField id="note-body" name="body" label="Add a note" hint="Only the AdmitLabs team ever sees notes." rows={3} maxLength={2000} />
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" icon="plus" loading={pending}>
          Add note
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

export function ActionButton({
  action,
  label,
  icon,
  variant = 'primary',
  size = 'sm',
  confirm,
}: {
  action: Action;
  label: string;
  icon?: 'refresh' | 'plus' | 'download' | 'external';
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'sm' | 'md';
  confirm?: string;
}) {
  const [state, submit, pending] = useActionState(action, IDLE);
  const [asking, setAsking] = useState(false);
  if (confirm && asking) {
    return (
      <div className={styles.facts}>
        <p className={styles.formNote}>{confirm}</p>
        <form action={submit} className={styles.inlineForm} onSubmit={() => setAsking(false)}>
          <Button type="submit" size={size} loading={pending}>
            Yes, {label.charAt(0).toLowerCase()}
            {label.slice(1)}
          </Button>
          <Button type="button" size="sm" variant="quiet" onClick={() => setAsking(false)}>
            Keep it
          </Button>
        </form>
      </div>
    );
  }
  return (
    <div className={styles.facts}>
      <form action={submit} className={styles.inlineForm} onSubmit={(event) => {
        if (confirm) {
          event.preventDefault();
          setAsking(true);
        }
      }}>
        <Button type="submit" size={size} variant={variant} icon={icon} loading={pending}>
          {label}
        </Button>
      </form>
      <Reply state={state} />
    </div>
  );
}

export function PaidStartForm({ action, now }: { action: Action; now: string }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  const today = new Date(now);
  const range = paidStartRange(today);
  const [day, setDay] = useState(range.latest);
  const start = paidStartFrom(day, today);
  return (
    <form action={submit} className={styles.facts}>
      <div className={styles.inlineForm}>
        <TextField id="paid-start" name="startsOn" type="date" label="Day of payment" min={range.earliest} max={range.latest} value={day} onChange={(event) => setDay(event.target.value)} />
        <Button type="submit" size="md" loading={pending} disabled={!start}>
          Start Paid
        </Button>
      </div>
      <p className={styles.formNote}>{start ? `${paidEndText(start)}. 6 months, no auto-renew.` : 'Pick today, or a day in the last 6 months.'}</p>
      <Reply state={state} />
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

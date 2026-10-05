'use client';

// The interactive parts of the team's institution page. Every action is a server action that
// checks the team role (and Admin for plans) again; these only show progress and the reply.

import { useActionState, useOptimistic, useState, useTransition } from 'react';
import type { ActionState } from '@/app/team/institutions/[id]/actions';
import { Button } from '@/components/ui/Button';
import { RadioGroup, SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { PeriodToggle } from '@/components/plan/PeriodToggle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LEAD_RULES } from '@/config/leads';
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from '@/domain/types';
import { DEFAULT_PAID_MONTHS, type PaidMonths } from '@/domain/tiers';
import { paidEndText, paidStartFrom, paidStartHint, paidStartRange, paidTermsText } from '@/team/plans';
import { WORK_RULES } from '@/team/work';
import { ANY_COURSE_OPTION, ANY_COURSE_VALUE } from '@/leads/text';
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

/** Adds to a Client's work log: Done or Next, what, the day, and a link to the work when there is one. */
export function WorkForm({ action, today }: { action: Action; today: string }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'work'} action={submit} className={styles.facts}>
      <RadioGroup
        name="kind"
        legend="Is it done?"
        defaultValue="done"
        options={[
          { value: 'done', label: 'Done', hint: 'The team has done it.' },
          { value: 'next', label: 'Next', hint: 'The team does it next, by the day below.' },
        ]}
      />
      <TextAreaField
        id="work-text"
        name="text"
        label="What the team did, or does next"
        hint="One plain sentence they will read, like: Added WhatsApp to every course page."
        rows={2}
        maxLength={WORK_RULES.textMax}
        required
      />
      <div className={styles.workFields}>
        <TextField id="work-on" name="on" type="date" label="Day" hint="When it was done, or for Next, when it is due." defaultValue={today} required />
        <TextField id="work-link" name="link" type="text" inputMode="url" label="Link (optional)" hint="The page, post or listing, so they can see it." placeholder="https://" />
      </div>
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" icon="plus" loading={pending}>
          Add to the log
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

/** Makes a tracking link for a Client: a name, where it will be used, and one of its programs, or any course (a general form). */
export function LeadLinkForm({ action, programs }: { action: Action; programs: ReadonlyArray<{ id: string; name: string }> }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'lead-link'} action={submit} className={styles.facts}>
      <TextField id="lead-link-name" name="name" label="Name" hint="Where it goes, so everyone knows it: Instagram bio, Reel: BBA placements." maxLength={LEAD_RULES.linkNameMax} required />
      <div className={styles.workFields}>
        <SelectField id="lead-link-used" name="used_on" label="Used on" defaultValue="instagram" options={LEAD_SOURCES.map((source) => ({ value: source, label: LEAD_SOURCE_LABELS[source] }))} />
        <SelectField
          id="lead-link-program"
          name="program"
          label="Program"
          defaultValue={programs[0]?.id}
          options={[...programs.map((program) => ({ value: program.id, label: program.name })), { value: ANY_COURSE_VALUE, label: ANY_COURSE_OPTION }]}
        />
      </div>
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" icon="plus" loading={pending}>
          Make the link
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

/** Start Paid: the period the institution paid for (Monthly or 3 months, 3 months first) and the day of payment. */
export function PaidStartForm({ action, now }: { action: Action; now: string }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  const today = new Date(now);
  const [months, setMonths] = useState<PaidMonths>(DEFAULT_PAID_MONTHS);
  const range = paidStartRange(today, months);
  const [day, setDay] = useState(range.latest);
  const start = paidStartFrom(day, today, months);
  return (
    <form action={submit} className={styles.facts}>
      <input type="hidden" name="months" value={months} />
      <PeriodToggle value={months} onChange={setMonths} label="Period paid for" />
      <div className={styles.inlineForm}>
        <TextField id="paid-start" name="startsOn" type="date" label="Day of payment" min={range.earliest} max={range.latest} value={day} onChange={(event) => setDay(event.target.value)} />
        <Button type="submit" size="md" loading={pending} disabled={!start}>
          Start Paid
        </Button>
      </div>
      <p className={styles.formNote}>{start ? `${paidEndText(start, months)}. ${paidTermsText(months)}` : paidStartHint(months)}</p>
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

/** How a college's new Audits and summaries go out: Review first (on to start) or Send automatically. */
export function ReviewFirstSetting({ name, on, action }: { name: string; on: boolean; action: (on: boolean) => Promise<{ ok: true } | { ok: false; error: string }> }) {
  const [shown, setShown] = useOptimistic(on);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  return (
    <div className={styles.facts}>
      <SegmentedControl
        label="How new Audits and summaries go out"
        size="sm"
        options={[
          { value: 'review', label: 'Review first' },
          { value: 'auto', label: 'Send automatically' },
        ]}
        value={shown ? 'review' : 'auto'}
        onChange={(value) => {
          const next = value === 'review';
          if (next === shown) return;
          startTransition(async () => {
            setShown(next);
            const outcome = await action(next);
            setError(outcome.ok ? null : outcome.error);
          });
        }}
      />
      <p className={styles.formNote}>
        {shown
          ? 'Each new Audit and monthly summary waits in To review until the team approves it.'
          : `${name}’s Audits and monthly summaries reach them straight away. With Review first, each waits in To review until the team approves it.`}
      </p>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

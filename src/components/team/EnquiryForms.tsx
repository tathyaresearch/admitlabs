'use client';

// The forms of Enquiries (spec section 27). Every action is a server action that checks the
// person again; these only show progress and the reply.

import { useActionState, useState } from 'react';
import type { ActionState } from '@/app/team/institutions/[id]/actions';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { LOST_REASON_LABELS, LOST_REASONS, SOCIAL_SOURCES, TEAM_LEAD_SOURCE_LABELS, TEAM_LEAD_STATUS_LABELS, TEAM_LEAD_STATUSES, type LostReason, type TeamLeadStatus } from '@/enquiries/model';
import styles from './team.module.css';

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const IDLE: ActionState = { status: 'idle', message: null, attempt: 0 };
const SOURCE_OPTIONS = SOCIAL_SOURCES.map((source) => ({ value: source, label: TEAM_LEAD_SOURCE_LABELS[source] }));

function Reply({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? styles.formError : styles.done} role={state.status === 'error' ? 'alert' : 'status'}>
      {state.message}
    </p>
  );
}

/** A lead added by hand. A Client manager's are their own, so they pick no owner. */
export function AddLeadForm({ action, owners, today }: { action: Action; owners: ReadonlyArray<{ value: string; label: string }> | null; today: string }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'add'} action={submit} className={styles.leadForm}>
      <div className={styles.leadFields}>
        <TextField id="lead-name" name="name" label="Name" autoComplete="off" maxLength={120} />
        <TextField id="lead-institution" name="institution" label="Institution" autoComplete="off" maxLength={160} />
        <TextField id="lead-city" name="city" label="City" autoComplete="off" maxLength={80} />
        <TextField id="lead-phone" name="phone" type="tel" label="Phone" inputMode="tel" hint="A phone or an email, at least." />
        <TextField id="lead-email" name="email" type="email" label="Email" inputMode="email" spellCheck={false} />
        <SelectField id="lead-source" name="source" label="Where they came from" placeholder="Pick one" options={SOURCE_OPTIONS} defaultValue="" />
        {owners ? <SelectField id="lead-owner" name="owner" label="Owner" options={[{ value: '', label: 'Nobody yet' }, ...owners]} defaultValue="" /> : null}
        <TextField id="lead-follow" name="next_follow_up" type="date" label="Next follow-up" min={today} />
      </div>
      <TextAreaField id="lead-wants" name="wants" label="What they want" rows={2} maxLength={500} />
      <TextAreaField id="lead-note" name="note" label="A note" hint="Only the AdmitLabs team sees notes." rows={2} maxLength={2000} />
      <div className={styles.inlineForm}>
        <Button type="submit" size="md" icon="plus" loading={pending}>
          Add the lead
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

/** Where a lead stands. Lost asks why, with a short note. */
export function StatusForm({ action, status, reason, note }: { action: Action; status: TeamLeadStatus; reason: LostReason | null; note: string | null }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  const [picked, setPicked] = useState<TeamLeadStatus>(status);
  return (
    <form action={submit} className={styles.facts}>
      <SelectField
        id="lead-status"
        name="status"
        label="Status"
        options={TEAM_LEAD_STATUSES.map((value) => ({ value, label: TEAM_LEAD_STATUS_LABELS[value] }))}
        value={picked}
        onChange={(event) => setPicked(event.target.value as TeamLeadStatus)}
      />
      {picked === 'lost' ? (
        <>
          <SelectField id="lead-reason" name="reason" label="Why it was lost" placeholder="Pick one" options={LOST_REASONS.map((value) => ({ value, label: LOST_REASON_LABELS[value] }))} defaultValue={reason ?? ''} />
          <TextField id="lead-lost-note" name="lost_note" label="A short note" hint="Optional." maxLength={300} defaultValue={note ?? ''} />
        </>
      ) : null}
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" variant="secondary" loading={pending} disabled={picked === status && picked !== 'lost'}>
          Save the status
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

/** Who works the lead (Admins and Team members give it). */
export function OwnerForm({ action, owner, options }: { action: Action; owner: string | null; options: ReadonlyArray<{ value: string; label: string }> }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form action={submit} className={styles.facts}>
      <SelectField id="lead-owner-change" name="owner" label="Owner" options={[{ value: '', label: 'Nobody yet' }, ...options]} defaultValue={owner ?? ''} />
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" variant="secondary" loading={pending}>
          Save the owner
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

export interface LeadDetailsValues {
  name: string | null;
  institution: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  wants: string | null;
  nextFollowUp: string | null;
}

/** The lead's details, to correct or fill in; and the next follow-up. */
export function LeadDetailsForm({ action, values }: { action: Action; values: LeadDetailsValues }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form action={submit} className={styles.leadForm}>
      <div className={styles.leadFields}>
        <TextField id="detail-name" name="name" label="Name" maxLength={120} defaultValue={values.name ?? ''} />
        <TextField id="detail-institution" name="institution" label="Institution" maxLength={160} defaultValue={values.institution ?? ''} />
        <TextField id="detail-city" name="city" label="City" maxLength={80} defaultValue={values.city ?? ''} />
        <TextField id="detail-phone" name="phone" type="tel" label="Phone" inputMode="tel" defaultValue={values.phone ?? ''} />
        <TextField id="detail-email" name="email" type="email" label="Email" inputMode="email" spellCheck={false} defaultValue={values.email ?? ''} />
        <TextField id="detail-follow" name="next_follow_up" type="date" label="Next follow-up" hint="Leave it empty for none." defaultValue={values.nextFollowUp ?? ''} />
      </div>
      <TextAreaField id="detail-wants" name="wants" label="What they want" rows={2} maxLength={500} defaultValue={values.wants ?? ''} />
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" variant="secondary" loading={pending}>
          Save the details
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

/** A tracking link: its name and where it will be used. */
export function TeamLinkForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'link'} action={submit} className={styles.facts}>
      <div className={styles.inlineForm}>
        <TextField id="link-name" name="name" label="Name" placeholder="Instagram bio" maxLength={80} />
        <SelectField id="link-source" name="source" label="Used on" placeholder="Pick one" options={SOURCE_OPTIONS} defaultValue="" />
        <Button type="submit" size="md" icon="plus" loading={pending}>
          Make a link
        </Button>
      </div>
      <Reply state={state} />
    </form>
  );
}

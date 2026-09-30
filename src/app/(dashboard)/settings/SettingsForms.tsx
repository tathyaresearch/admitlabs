'use client';

import { useActionState } from 'react';
import { CityPicker } from '@/components/institution/CityPicker';
import { ProgramPicker, type ChosenProgram } from '@/components/institution/ProgramPicker';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { RadioGroup, TextField } from '@/components/ui/Form';
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPES } from '@/domain/types';
import { inviteAction, saveProgramsAction, setFreeProgramAction, updateDetailsAction, type FormState } from './actions';
import styles from './settings.module.css';

const start = (values: Record<string, string> = {}): FormState => ({ attempt: 0, status: 'idle', message: null, errors: {}, values });

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p className={styles.status} role="status" data-status={state.status}>
      {state.message}
    </p>
  );
}

export function DetailsForm({ initial }: { initial: Record<string, string> }) {
  const [state, action, pending] = useActionState(updateDetailsAction, start(initial));
  const values = state.values;
  const errors = state.errors;
  return (
    <form key={state.attempt} action={action} className={styles.form} noValidate>
      <TextField id="name" name="name" label="Institution name" defaultValue={values.name} error={errors.name} required />
      <RadioGroup
        name="type"
        legend="Type"
        defaultValue={values.type}
        error={errors.type}
        options={INSTITUTION_TYPES.map((type) => ({ value: type, label: INSTITUTION_TYPE_LABELS[type] }))}
      />
      <CityPicker id="city" error={errors.city} defaultCity={values.city} defaultState={values.state} />
      <TextField id="website" name="website" label="Website" inputMode="url" defaultValue={values.website} error={errors.website} required />
      <TextField id="instagram" name="instagram" label="Instagram" defaultValue={values.instagram} error={errors.instagram} required />
      <TextField id="youtube" name="youtube" label="YouTube (optional)" defaultValue={values.youtube} error={errors.youtube} />
      <div className={styles.pair}>
        <TextField id="facebook" name="facebook" label="Facebook (optional)" defaultValue={values.facebook} error={errors.facebook} />
        <TextField id="linkedin" name="linkedin" label="LinkedIn (optional)" defaultValue={values.linkedin} error={errors.linkedin} />
      </div>
      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          Save details
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ProgramsForm({ programs }: { programs: readonly ChosenProgram[] }) {
  const [state, action, pending] = useActionState(saveProgramsAction, start());
  return (
    <form action={action} className={styles.form} noValidate>
      <ProgramPicker id="program-search" error={state.errors.programs} defaultPrograms={programs} />
      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          Save programs
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function FreeProgramForm({ programs, current, note }: { programs: ReadonlyArray<{ id: string; name: string }>; current: string | null; note: string }) {
  const [state, action, pending] = useActionState(setFreeProgramAction, start());
  return (
    <form action={action} className={styles.form}>
      <RadioGroup
        name="program"
        legend="Your free Audit covers"
        hint={note}
        defaultValue={current ?? undefined}
        error={state.errors.program}
        options={programs.map((program) => ({ value: program.id, label: program.name }))}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" loading={pending}>
          Save choice
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAction, start());
  return (
    <form key={state.attempt} action={action} className={styles.inviteForm} noValidate>
      <TextField
        id="invite-email"
        name="email"
        type="email"
        label="Invite someone"
        hint="They join as a Member and see everything your plan includes. No email is sent in this version: they join when they sign in with this address."
        placeholder="name@college.edu"
        defaultValue={state.values.email}
        error={state.errors.email}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" icon="plus" loading={pending}>
          Invite
        </Button>
        {state.status === 'done' ? <Notice icon="check" title={state.message} /> : null}
      </div>
    </form>
  );
}

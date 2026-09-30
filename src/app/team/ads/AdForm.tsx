'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { addRivalAdAction, type AdFormState } from './actions';
import styles from './ads.module.css';

export function AdForm({ rivals, today }: { rivals: ReadonlyArray<{ id: string; name: string }>; today: string }) {
  const [state, action, pending] = useActionState<AdFormState, FormData>(addRivalAdAction, { attempt: 0, status: 'idle', message: null, errors: {}, values: { seenOn: today } });
  const { values, errors } = state;
  return (
    <form key={state.attempt} action={action} className={styles.form} noValidate>
      <SelectField
        id="ad-rival"
        name="rival"
        label="Rival"
        placeholder="Choose a tracked rival"
        defaultValue={values.rival ?? ''}
        error={errors.rival}
        options={rivals.map((rival) => ({ value: rival.id, label: rival.name }))}
      />
      <TextAreaField
        id="ad-promise"
        name="promise"
        label="What the ad promises"
        hint="The main promise, in the ad's own words. Under 200 characters."
        rows={3}
        defaultValue={values.promise}
        error={errors.promise}
      />
      <div className={styles.pair}>
        <TextField id="ad-source" name="source" label="Where it can be seen" inputMode="url" placeholder="Link to the ad library page" defaultValue={values.source} error={errors.source} />
        <TextField id="ad-date" name="seenOn" type="date" label="Date seen" max={today} defaultValue={values.seenOn ?? today} error={errors.seenOn} />
      </div>
      <div className={styles.actions}>
        <Button type="submit" icon="plus" loading={pending}>
          Add ad
        </Button>
        {state.status === 'done' && state.message ? <Notice icon="check" title={state.message} /> : null}
        {state.status === 'error' && state.message ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

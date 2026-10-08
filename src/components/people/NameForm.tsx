'use client';

// Your name, set once (spec section 26): History in a Client's Brain says who changed what by
// name, or by email when there is none. Each person sets their own.

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Form';
import { setMyNameAction, type BrainFormState } from '@/lib/brain/actions';
import styles from './people.module.css';

const INITIAL: BrainFormState = { status: 'idle', message: null, errors: {}, attempt: 0 };

export function NameForm({ name, hint }: { name: string | null; hint: string }) {
  const [state, action, pending] = useActionState(setMyNameAction, INITIAL);
  return (
    <form action={action} className={styles.form}>
      <div className={styles.field}>
        <TextField id="my-name" name="name" label="Your name" defaultValue={name ?? ''} placeholder="First and last name" error={state.errors.name ?? null} maxLength={80} autoComplete="name" />
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        Save
      </Button>
      <p className={styles.message} role={state.message ? (state.status === 'error' ? 'alert' : 'status') : undefined}>
        {state.message ?? hint}
      </p>
    </form>
  );
}

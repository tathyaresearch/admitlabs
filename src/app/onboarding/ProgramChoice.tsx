'use client';

// Step 2 for Free: the one program the free Audit covers. Then the first Audit runs.

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { RadioGroup } from '@/components/ui/Form';
import { chooseFreeProgramAction, type ChoiceState } from './actions';
import styles from './onboarding.module.css';

export function ProgramChoice({ programs }: { programs: ReadonlyArray<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(chooseFreeProgramAction, { error: null } satisfies ChoiceState);
  return (
    <form action={action} className={styles.form}>
      {state.error ? <Notice icon="info" title={state.error} /> : null}
      <RadioGroup
        name="program"
        legend="Your free Audit covers"
        hint="Pick the program that matters most right now. You can change it in Settings; it applies at your next free Audit."
        defaultValue={programs.length === 1 ? programs[0]?.id : undefined}
        options={programs.map((program) => ({ value: program.id, label: program.name }))}
      />
      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={pending} iconAfter="arrowRight">
          {pending ? 'Running your Audit' : 'Run my free Audit'}
        </Button>
        <p className={styles.fine}>Paid covers every program, each with its own score.</p>
      </div>
    </form>
  );
}

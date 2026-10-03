'use client';

// Step 2 for Free: the one program the free Audit covers, and what happens next. Then the first
// Audit runs.

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { RadioGroup } from '@/components/ui/Form';
import { SCHEDULES } from '@/config/schedules';
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
      <section className={styles.next} aria-labelledby="next-title">
        <h2 id="next-title" className={styles.nextTitle}>
          What happens next
        </h2>
        <ol className={styles.nextSteps}>
          <li>Drishti checks what a student would see: Google, your website, Instagram and your reviews. It takes about a minute.</li>
          <li>You get your score out of 100 and the first things to fix, each with the points it could add.</li>
          <li>Your next free Audit comes in {SCHEDULES.free.auditEveryMonths} months, and shows what changed.</li>
        </ol>
      </section>
      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={pending} iconAfter="arrowRight">
          {pending ? 'Running your Audit' : 'Run my free Audit'}
        </Button>
        <p className={styles.fine}>Paid covers every program, each with its own score.</p>
      </div>
    </form>
  );
}

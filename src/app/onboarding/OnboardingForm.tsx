'use client';

// Step 1: the institution (spec section 6). Plain fields, a city from the list, programs from
// the list or Other, and the public links a student would find.

import { useActionState } from 'react';
import { CityPicker } from '@/components/institution/CityPicker';
import { ProgramPicker } from '@/components/institution/ProgramPicker';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { RadioGroup, TextField } from '@/components/ui/Form';
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPES } from '@/domain/types';
import { onboardAction, type OnboardingState } from './actions';
import styles from './onboarding.module.css';

const START: OnboardingState = { attempt: 0, values: {}, programs: [], errors: {}, formError: null };

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboardAction, START);
  const { values, errors } = state;

  return (
    <form key={state.attempt} action={action} className={styles.form} noValidate>
      {state.formError ? (
        <Notice icon="info" title={state.formError}>
          {errors.name || errors.city || errors.website ? 'Each field says what it needs.' : null}
        </Notice>
      ) : null}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>About your institution</legend>
        <TextField id="name" name="name" label="Institution name" autoComplete="organization" defaultValue={values.name} error={errors.name} required />
        <RadioGroup
          name="type"
          legend="Type"
          defaultValue={values.type}
          error={errors.type}
          options={INSTITUTION_TYPES.map((type) => ({ value: type, label: INSTITUTION_TYPE_LABELS[type] }))}
        />
        <CityPicker id="city" error={errors.city} defaultCity={values.city} defaultState={values.state} />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Programs</legend>
        <ProgramPicker id="programs" error={errors.programs} defaultPrograms={state.programs} />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Where students find you</legend>
        <TextField
          id="website"
          name="website"
          label="Website"
          inputMode="url"
          autoComplete="url"
          placeholder="yourcollege.edu.in"
          defaultValue={values.website}
          error={errors.website}
          required
        />
        <TextField id="instagram" name="instagram" label="Instagram" hint="Your handle or a link to your profile." placeholder="@yourcollege" defaultValue={values.instagram} error={errors.instagram} required />
        <TextField id="youtube" name="youtube" label="YouTube (optional)" placeholder="youtube.com/@yourcollege" defaultValue={values.youtube} error={errors.youtube} />
        <div className={styles.pair}>
          <TextField id="facebook" name="facebook" label="Facebook (optional)" placeholder="facebook.com/yourcollege" defaultValue={values.facebook} error={errors.facebook} />
          <TextField id="linkedin" name="linkedin" label="LinkedIn (optional)" placeholder="linkedin.com/school/yourcollege" defaultValue={values.linkedin} error={errors.linkedin} />
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={pending} iconAfter="arrowRight">
          Continue
        </Button>
        <p className={styles.fine}>Drishti checks public information only: what a student or parent could see.</p>
      </div>
    </form>
  );
}

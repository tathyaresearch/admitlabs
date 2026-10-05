'use client';

// The enquiry form a tracking link opens (spec section 23), as the version 2 mock was approved: an
// ivory card with the college's name and the program, the fields, the consent line above the
// button, then the thanks. A general link names no program: the student picks the course. A
// hidden field and the signed start time turn bots away.

import { useActionState } from 'react';
import type { LeadFormState } from '@/app/(site)/site/enquire/[code]/actions';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { LEAD_TRAP_FIELD } from '@/leads/form';
import { thanksLine } from '@/leads/text';
import styles from './form.module.css';

type Action = (previous: LeadFormState, formData: FormData) => Promise<LeadFormState>;

const IDLE: LeadFormState = { status: 'idle', errors: {}, message: null, values: {}, course: null, already: false, attempt: 0 };

export function LeadForm({
  action,
  college,
  programName,
  programId,
  programs,
  consent,
  started,
}: {
  action: Action;
  college: string;
  programName: string | null;
  programId: string | null;
  programs: ReadonlyArray<{ id: string; name: string }>;
  consent: string;
  started: string;
}) {
  const [state, submit, pending] = useActionState(action, IDLE);

  if (state.status === 'sent') {
    return (
      <div className={styles.card} role="status">
        <p className={styles.college}>{college}</p>
        <Icon name="checkCircle" size={32} />
        <h1 className={styles.thanks}>{state.already ? `Thanks. ${college} has your details from earlier today and will contact you soon.` : thanksLine(college)}</h1>
        {state.course ? <p className={styles.quiet}>You asked about {state.course}.</p> : null}
      </div>
    );
  }

  const value = (field: keyof LeadFormState['values']) => state.values[field] ?? '';
  return (
    <div className={styles.card}>
      <p className={styles.college}>{college}</p>
      <h1 className={styles.title}>{programName ? `Ask about ${programName}` : 'Ask about a course'}</h1>
      <p className={styles.quiet}>Leave your details and the admissions team will contact you.</p>
      <form key={state.attempt} action={submit} className={styles.fields} noValidate>
        <input type="hidden" name="started" value={started} />
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor="lead-website">Leave this empty</label>
          <input id="lead-website" name={LEAD_TRAP_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <TextField id="lead-name" name="name" label="Your name" autoComplete="name" required defaultValue={value('name')} error={state.errors.name} />
        <TextField
          id="lead-phone"
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="Your 10 digit mobile number."
          required
          defaultValue={value('phone')}
          error={state.errors.phone}
        />
        <TextField id="lead-email" name="email" label="Email (optional)" type="email" inputMode="email" autoComplete="email" defaultValue={value('email')} error={state.errors.email} />
        <SelectField
          id="lead-program"
          name="program"
          label="Course"
          options={programs.map((program) => ({ value: program.id, label: program.name }))}
          placeholder={programId ? undefined : 'Choose a course'}
          defaultValue={value('program') || (programId && programs.some((program) => program.id === programId) ? programId : programId ? programs[0]?.id : '')}
          error={state.errors.program}
        />
        <TextField id="lead-city" name="city" label="Your city (optional)" autoComplete="address-level2" defaultValue={value('city')} error={state.errors.city} />
        <p className={styles.consent}>{consent}</p>
        {state.message ? (
          <p className={styles.message} role="alert">
            <Icon name="info" size={16} />
            {state.message}
          </p>
        ) : null}
        <Button type="submit" block loading={pending}>
          Send my enquiry
        </Button>
      </form>
    </div>
  );
}

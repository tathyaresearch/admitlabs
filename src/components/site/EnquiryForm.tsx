'use client';

// The "Work with us" form. Sends without leaving the page; a reply with errors keeps what was
// typed and says what to fix, beside the field. Coming from a service tile (?about=...), the
// message starts by naming that service.

import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { submitEnquiryAction, type EnquiryState } from '@/app/(site)/site/work-with-us/actions';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { ENQUIRY_RULES } from '@/config/site';
import { aboutService, ENQUIRY } from '@/site/content';
import { ENQUIRY_ROLE_LABELS, ENQUIRY_ROLES, TRAP_FIELD } from '@/site/enquiry';
import styles from './enquiry.module.css';

const IDLE: EnquiryState = { status: 'idle', errors: {}, message: null, values: {}, attempt: 0 };
const ROLE_OPTIONS = ENQUIRY_ROLES.map((role) => ({ value: role, label: ENQUIRY_ROLE_LABELS[role] }));
const F = ENQUIRY.fields;

export function EnquiryForm() {
  const [state, submit, pending] = useActionState(submitEnquiryAction, IDLE);
  const form = useRef<HTMLFormElement>(null);

  // From a service tile: start the message by naming the service.
  useEffect(() => {
    const about = aboutService(new URLSearchParams(window.location.search).get('about'));
    const message = form.current?.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (about && message && !message.value) message.value = about;
  }, []);

  // After a reply with errors, take the reader to the first one.
  useEffect(() => {
    if (state.status !== 'error') return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);

  if (state.status === 'sent') {
    return (
      <div className={styles.thanks} role="status">
        <span className={styles.thanksIcon} aria-hidden="true">
          <Icon name="checkCircle" size={28} />
        </span>
        <p className={styles.thanksTitle}>{ENQUIRY.thanks}</p>
        <Link href="/" className={styles.thanksLink}>
          {ENQUIRY.home}
        </Link>
      </div>
    );
  }

  const values = state.values;
  const errors = state.errors;
  return (
    // Keyed by the reply, so the fields show what came back after React resets the form.
    <form key={state.attempt} ref={form} action={submit} className={styles.form} noValidate>
      {state.message ? (
        <div role="alert" tabIndex={-1}>
          <Notice icon="info" title={state.message} />
        </div>
      ) : null}
      <div className={styles.row}>
        <TextField id="enquiry-name" name="name" label={F.name.label} autoComplete="name" required maxLength={ENQUIRY_RULES.nameMax} defaultValue={values.name} error={errors.name} />
        <TextField id="enquiry-institution" name="institution" label={F.institution.label} autoComplete="organization" required maxLength={ENQUIRY_RULES.institutionMax} defaultValue={values.institution} error={errors.institution} />
      </div>
      <SelectField id="enquiry-role" name="role" label={F.role.label} placeholder={F.role.placeholder} options={ROLE_OPTIONS} required defaultValue={values.role ?? ''} error={errors.role} />
      <div className={styles.row}>
        <TextField id="enquiry-email" name="email" type="email" label={F.email.label} autoComplete="email" inputMode="email" required defaultValue={values.email} error={errors.email} />
        <TextField id="enquiry-phone" name="phone" type="tel" label={F.phone.label} autoComplete="tel" inputMode="tel" required defaultValue={values.phone} error={errors.phone} />
      </div>
      <TextField id="enquiry-program" name="program" label={F.program.label} hint={F.program.hint} maxLength={ENQUIRY_RULES.programMax} defaultValue={values.program} error={errors.program} />
      <TextAreaField id="enquiry-message" name="message" label={F.message.label} hint={F.message.hint} rows={4} maxLength={ENQUIRY_RULES.messageMax} defaultValue={values.message} error={errors.message} />
      <div className={styles.trap} aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" name={TRAP_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={styles.submitRow}>
        <Button type="submit" size="lg" loading={pending} iconAfter="arrowRight">
          {ENQUIRY.send}
        </Button>
        <p className={styles.consent}>{ENQUIRY.consent}</p>
      </div>
    </form>
  );
}

'use client';

// Settings, Leads, for the owner: who gets the email for each new enquiry and how long enquiries
// are kept; and, when a student asks, finding them by phone or email and deleting what they sent.

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { RadioGroup, TextField } from '@/components/ui/Form';
import { LEAD_RULES } from '@/config/leads';
import { formatDate } from '@/domain/format';
import { formatPhone } from '@/site/enquiry';
import { deleteStudentAction, findStudentAction, saveLeadSettingsAction, type FoundStudent, type LeadSettingsState } from './leads-actions';
import styles from './settings.module.css';

export function LeadSettingsForm({ emails, keepMonths }: { emails: readonly string[]; keepMonths: number }) {
  const [state, action, pending] = useActionState<LeadSettingsState, FormData>(saveLeadSettingsAction, { status: 'idle', message: null, attempt: 0 });
  return (
    <form action={action} className={styles.form} noValidate>
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Who gets an email for each new enquiry</legend>
        <p className={styles.sectionText}>Up to 3 addresses, usually your admissions team. Each email has the student’s name, phone, email, city and course.</p>
        {Array.from({ length: LEAD_RULES.alertEmailsMax }, (_, index) => (
          <TextField
            key={index}
            id={`alert-email-${index + 1}`}
            name={`alert_email_${index + 1}`}
            label={index === 0 ? 'Email' : `Email ${index + 1} (optional)`}
            type="email"
            inputMode="email"
            autoComplete="off"
            defaultValue={emails[index] ?? ''}
          />
        ))}
      </fieldset>
      <RadioGroup
        name="keep_months"
        legend="How long enquiries are kept"
        defaultValue={String(keepMonths)}
        options={LEAD_RULES.keepMonths.map((months) => ({
          value: String(months),
          label: `${months} months`,
          hint: months === LEAD_RULES.keepMonthsDefault ? 'To start' : undefined,
        }))}
      />
      <p className={styles.sectionText}>After that, each enquiry is deleted for good. A shorter time deletes the older ones straight away.</p>
      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          Save
        </Button>
        {state.message ? (
          <p className={styles.status} role="status" data-status={state.status}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function DeleteStudentForm() {
  const [found, find, finding] = useActionState<FoundStudent, FormData>(findStudentAction, { contact: null, matches: [], message: null, attempt: 0 });
  const [gone, setGone] = useState<{ ids: ReadonlySet<string>; message: string | null; error: string | null }>({ ids: new Set(), message: null, error: null });
  const [deleting, startDelete] = useTransition();
  const shown = found.matches.filter((match) => !gone.ids.has(match.id));

  const remove = (leadId: string | null) =>
    startDelete(async () => {
      const result = await deleteStudentAction({ contact: leadId ? null : found.contact, leadId });
      if (!result.ok) {
        setGone((current) => ({ ...current, error: result.error }));
        return;
      }
      const ids = new Set(gone.ids);
      for (const match of found.matches) if (!leadId || match.id === leadId) ids.add(match.id);
      setGone({ ids, message: `Deleted for good: ${result.deleted === 1 ? '1 enquiry' : `${result.deleted} enquiries`}.`, error: null });
    });

  return (
    <div className={styles.form}>
      <form action={find} className={styles.inviteForm} noValidate>
        <TextField id="student-contact" name="contact" label="Phone number or email" hint="The one the student used on the form." autoComplete="off" required />
        <div className={styles.actions}>
          <Button type="submit" variant="secondary" loading={finding} onClick={() => setGone({ ids: new Set(), message: null, error: null })}>
            Find their enquiries
          </Button>
        </div>
      </form>
      {found.message ? (
        <p className={styles.status} role="status">
          {found.message}
        </p>
      ) : null}
      {shown.length ? (
        <div className={styles.found}>
          <p className={styles.sectionText}>
            Sent from {found.contact?.includes('@') ? found.contact : formatPhone(found.contact ?? '')}:
          </p>
          <ul className={styles.rows}>
            {shown.map((match) => (
              <li key={match.id} className={styles.row}>
                <span className={styles.rowName}>
                  {match.name}
                  <span className={styles.rowSub}>
                    {match.course ? `${match.course}, ` : ''}sent {formatDate(match.sentAt)}
                  </span>
                </span>
                <Button size="sm" variant="quiet" onClick={() => remove(match.id)} disabled={deleting}>
                  Delete this one
                </Button>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <Button variant="secondary" icon="close" onClick={() => remove(null)} loading={deleting}>
              {shown.length === 1 ? 'Delete it for good' : `Delete all ${shown.length} for good`}
            </Button>
          </div>
        </div>
      ) : null}
      {gone.message || gone.error ? (
        <p className={styles.status} role="status" data-status={gone.error ? 'error' : 'done'}>
          {gone.error ?? gone.message}
        </p>
      ) : null}
    </div>
  );
}

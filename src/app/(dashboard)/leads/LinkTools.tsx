'use client';

// The Client's own tracking links on Leads: the owner or a member makes one (a name, where it is
// used, one course or any course), copies it and archives it. The AdmitLabs team still makes them
// too, from the team area.

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Form';
import { LEAD_RULES } from '@/config/leads';
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from '@/domain/types';
import { ANY_COURSE_OPTION, ANY_COURSE_VALUE } from '@/leads/text';
import { archiveLinkAction, createLinkAction, type LinkFormState } from './actions';
import styles from '@/components/leads/leads.module.css';

export function NewLinkForm({ programs }: { programs: ReadonlyArray<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState<LinkFormState, FormData>(createLinkAction, { status: 'idle', message: null, attempt: 0 });
  return (
    <form key={state.status === 'done' ? state.attempt : 'new-link'} action={action} className={styles.linkForm} noValidate>
      <TextField
        id="link-name"
        name="name"
        label="Name"
        hint="Where it goes, so everyone knows it: Instagram bio, Reel: BBA placements."
        maxLength={LEAD_RULES.linkNameMax}
        required
      />
      <div className={styles.linkFields}>
        <SelectField id="link-used" name="used_on" label="Used on" defaultValue="instagram" options={LEAD_SOURCES.map((source) => ({ value: source, label: LEAD_SOURCE_LABELS[source] }))} />
        <SelectField
          id="link-program"
          name="program"
          label="Course"
          hint="Any course makes a general form: the student picks."
          defaultValue={programs[0]?.id ?? ANY_COURSE_VALUE}
          options={[...programs.map((program) => ({ value: program.id, label: program.name })), { value: ANY_COURSE_VALUE, label: ANY_COURSE_OPTION }]}
        />
      </div>
      <div className={styles.linkFormFoot}>
        <Button type="submit" size="sm" icon="plus" loading={pending}>
          Make the link
        </Button>
        {state.message ? (
          <p className={styles.formStatus} role="status" data-status={state.status}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Copy a link; archive it, for the Client's own people, after one more click to be sure. */
export function LinkActions({ url, linkId, canArchive }: { url: string; linkId: string; canArchive: boolean }) {
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const archive = () =>
    startTransition(async () => {
      const result = await archiveLinkAction(linkId);
      setError(result.ok ? null : result.error);
      setAsking(false);
    });

  if (asking) {
    return (
      <span className={styles.linkActions}>
        <span className={styles.confirmText}>Close its form? The enquiries it brought stay.</span>
        <Button type="button" size="sm" variant="secondary" loading={pending} onClick={archive}>
          Yes, archive
        </Button>
        <Button type="button" size="sm" variant="quiet" onClick={() => setAsking(false)}>
          Keep it
        </Button>
      </span>
    );
  }
  return (
    <span className={styles.linkActions}>
      <Button type="button" size="sm" variant="secondary" icon={copied ? 'check' : undefined} onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      {canArchive ? (
        <Button type="button" size="sm" variant="quiet" onClick={() => setAsking(true)}>
          Archive
        </Button>
      ) : null}
      {error ? (
        <span className={styles.formStatus} role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

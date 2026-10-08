'use client';

// The Blueprint's two forms (spec section 26): the team's upload (a PDF goes from the browser
// straight to the private bucket through a signed link, then the server makes it the next
// version), and the college's request for changes. Every action checks the person again.

import { useActionState } from 'react';
import { BRAIN_RULES } from '@/config/brain';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import type { BrainFormState } from '@/lib/brain/actions';
import styles from './brain.module.css';
import { sendBlueprint } from './send-file';

type Action = (state: BrainFormState, formData: FormData) => Promise<BrainFormState>;

const INITIAL: BrainFormState = { status: 'idle', message: null, errors: {}, attempt: 0 };

function Problem({ state }: { state: BrainFormState }) {
  if (state.status !== 'error' || !state.message) return null;
  return (
    <p className={`${styles.formError} ${styles.wide}`} role="alert">
      <Icon name="info" size={16} />
      {state.message}
    </p>
  );
}

export function BlueprintUpload({ institutionId, action, next }: { institutionId: string; action: Action; next: number }) {
  const [state, submit, pending] = useActionState(async (previous: BrainFormState, formData: FormData): Promise<BrainFormState> => {
    const file = formData.get('file');
    formData.delete('file');
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Choose a PDF to upload.', errors: { file: 'Choose a PDF to upload.' }, attempt: previous.attempt + 1 };
    const sent = await sendBlueprint(institutionId, file);
    if ('error' in sent) return { status: 'error', message: sent.error, errors: { file: sent.error }, attempt: previous.attempt + 1 };
    formData.set('file_path', sent.path);
    formData.set('file_name', file.name);
    return action(previous, formData);
  }, INITIAL);
  return (
    <form action={submit} className={styles.fields} noValidate>
      <div className={styles.wide}>
        <TextField
          id="blueprint-file"
          name="file"
          type="file"
          accept="application/pdf"
          label={`Upload blueprint (version ${next})`}
          hint={`A PDF, up to ${BRAIN_RULES.blueprint.maxMb} MB. It is a Draft, for the team only, until you share it.`}
          error={state.errors.file ?? null}
        />
      </div>
      <Problem state={state} />
      <div className={`${styles.formActions} ${styles.wide}`}>
        <Button type="submit" icon="plus" loading={pending}>
          Upload blueprint
        </Button>
      </div>
    </form>
  );
}

export function AskChangesForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, INITIAL);
  return (
    <form action={submit} className={styles.fields} noValidate>
      <div className={styles.wide}>
        <TextAreaField
          id="blueprint-changes"
          name="note"
          label="Ask for changes"
          hint="What to change, in a line or two. Your AdmitLabs team hears at once."
          rows={2}
          maxLength={BRAIN_RULES.blueprint.noteMax}
          error={state.errors.note ?? null}
        />
      </div>
      <Problem state={state} />
      <div className={`${styles.formActions} ${styles.wide}`}>
        <Button type="submit" variant="secondary" loading={pending}>
          Ask for changes
        </Button>
      </div>
    </form>
  );
}

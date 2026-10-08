'use client';

// One fact's form, in place of its row (spec section 26). The same form serves the college and the
// AdmitLabs team, in the Brain, Help us know you and the kickoff call. Errors show by their field,
// in words, never by colour alone.

import Link from 'next/link';
import { useActionState, useId } from 'react';
import { UPLOAD_FAILED } from '@/brain/files';
import type { InputSpec } from '@/brain/form-spec';
import { Button } from '@/components/ui/Button';
import { Checkbox, RadioGroup, SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import type { BrainFormState } from '@/lib/brain/actions';
import styles from './brain.module.css';
import { sendFile } from './send-file';

const INITIAL: BrainFormState = { status: 'idle', message: null, errors: {}, attempt: 0 };

export function FactForm({
  action,
  inputs,
  title,
  submit = 'Save',
  cancelHref,
  hidden = {},
  remove,
  plain = false,
  institutionId,
}: {
  action: (state: BrainFormState, formData: FormData) => Promise<BrainFormState>;
  inputs: readonly InputSpec[];
  /** The college whose Brain this is: a file input's upload goes to its folder. */
  institutionId?: string;
  title?: string;
  submit?: string;
  cancelHref?: string | null;
  /** Extra values the form always sends (which boxes it had, for example). */
  hidden?: Record<string, string>;
  /** Removes the fact: its own small form beside this one. */
  remove?: () => Promise<void>;
  /** Inside a card already: no box of its own. */
  plain?: boolean;
}) {
  const upload = inputs.find((input) => input.type === 'file')?.upload;
  // A file never travels with the form: it goes straight to storage first, and the form sends
  // only where it went (a hosted server takes a few MB a request at most).
  const [state, formAction, pending] = useActionState(async (previous: BrainFormState, formData: FormData): Promise<BrainFormState> => {
    const file = formData.get('file');
    formData.delete('file');
    if (file instanceof File && file.size > 0) {
      const sent = upload && institutionId ? await sendFile(institutionId, upload, file) : { error: UPLOAD_FAILED };
      if ('error' in sent) return { status: 'error', message: sent.error, errors: { file: sent.error }, attempt: previous.attempt + 1 };
      formData.set('file_path', sent.path);
      formData.set('file_name', file.name);
    }
    return action(previous, formData);
  }, INITIAL);
  const id = useId();
  const error = (name: string) => state.errors[name] ?? null;
  return (
    <div className={plain ? styles.formPlain : styles.form}>
      {title ? <p className={styles.formTitle}>{title}</p> : null}
      <form action={formAction} className={styles.fields} noValidate>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {inputs.map((input) => {
          const key = `${input.name}:${input.value ?? ''}`;
          const field = `${id}-${input.name}-${input.value ?? ''}`;
          const wide = input.half ? undefined : styles.wide;
          switch (input.type) {
            case 'hidden':
              return <input key={key} type="hidden" name={input.name} value={input.value ?? ''} />;
            case 'textarea':
              return (
                <div key={key} className={wide}>
                  <TextAreaField id={field} name={input.name} label={input.label} defaultValue={input.value} hint={input.hint} placeholder={input.placeholder} error={error(input.name)} rows={3} />
                </div>
              );
            case 'select':
              return (
                <div key={key} className={wide}>
                  <SelectField id={field} name={input.name} label={input.label} defaultValue={input.value} options={input.options ?? []} hint={input.hint} error={error(input.name)} />
                </div>
              );
            case 'checkbox':
              return (
                <div key={key} className={wide}>
                  <Checkbox id={field} name={input.name} value={input.value ?? 'on'} label={input.label} hint={input.hint} defaultChecked={input.checked} />
                </div>
              );
            case 'radio':
              return (
                <div key={key} className={wide}>
                  <RadioGroup name={input.name} legend={input.label} options={input.options ?? []} defaultValue={input.value} hint={input.hint} error={error(input.name)} />
                </div>
              );
            case 'file':
              return (
                <div key={key} className={wide}>
                  <TextField id={field} name={input.name} label={input.label} type="file" accept={input.accept} hint={input.hint} error={error(input.name)} />
                </div>
              );
            default:
              return (
                <div key={key} className={wide}>
                  <TextField
                    id={field}
                    name={input.name}
                    label={input.label}
                    type={input.type === 'url' ? 'url' : input.type === 'number' ? 'text' : input.type}
                    inputMode={input.type === 'number' ? 'numeric' : undefined}
                    defaultValue={input.value}
                    hint={input.hint}
                    placeholder={input.placeholder}
                    error={error(input.name)}
                  />
                </div>
              );
          }
        })}
        {state.status === 'error' && state.message ? (
          <p className={`${styles.formError} ${styles.wide}`} role="alert">
            <Icon name="info" size={16} />
            {state.message}
          </p>
        ) : null}
        <div className={`${styles.formActions} ${styles.wide}`}>
          <Button type="submit" loading={pending}>
            {submit}
          </Button>
          {cancelHref ? (
            <Link href={cancelHref} className={styles.quietLink} scroll={false}>
              Cancel
            </Link>
          ) : null}
        </div>
      </form>
      {remove ? (
        <form action={remove} className={styles.inlineForm}>
          <Button type="submit" variant="quiet" size="sm" icon="close">
            Remove
          </Button>
        </form>
      ) : null}
    </div>
  );
}

'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { TextField } from '@/components/ui/Form';
import { loginAction, type LoginState } from './actions';
import styles from './login.module.css';

export function LoginForm({ next, mailpitUrl }: { next: string | null; mailpitUrl: string | null }) {
  const initial: LoginState = { step: 'email', email: '', next, message: null, error: null };
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const codeForm = useRef<HTMLFormElement>(null);

  if (state.step === 'email') {
    return (
      <form action={formAction} className={styles.form} noValidate>
        <div className={styles.formHead}>
          <h1 className={styles.formTitle}>Sign in</h1>
          <p className={styles.formText}>Enter your work email. We will send you a 6-digit code. No password needed.</p>
        </div>
        <input type="hidden" name="intent" value="send" />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          id="email"
          name="email"
          type="email"
          label="Work email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@college.edu"
          defaultValue={state.email}
          error={state.error}
          required
          autoFocus
        />
        <Button type="submit" size="lg" block loading={pending} iconAfter="arrowRight">
          Send code
        </Button>
        <p className={styles.fine}>New to Drishti? The same code creates your account.</p>
      </form>
    );
  }

  return (
    <form ref={codeForm} action={formAction} className={styles.form}>
      <div className={styles.formHead}>
        <h1 className={styles.formTitle}>Check your email</h1>
        <p className={styles.formText} role="status">
          {state.message ?? `Enter the code we sent to ${state.email}.`}
        </p>
      </div>
      <input type="hidden" name="email" value={state.email} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <CodeInput id="token" name="token" label="6-digit code" error={state.error} autoFocus onComplete={() => codeForm.current?.requestSubmit()} />
      <Button type="submit" name="intent" value="verify" size="lg" block loading={pending}>
        Sign in
      </Button>
      <div className={styles.secondary}>
        <Button type="submit" name="intent" value="resend" variant="quiet" size="sm" formNoValidate disabled={pending}>
          Send a new code
        </Button>
        <Button type="submit" name="intent" value="change" variant="quiet" size="sm" formNoValidate disabled={pending}>
          Use a different email
        </Button>
      </div>
      {mailpitUrl ? (
        <p className={styles.devHint}>
          Running locally: codes arrive in{' '}
          <a href={mailpitUrl} target="_blank" rel="noreferrer">
            Mailpit
          </a>
          , not a real inbox.
        </p>
      ) : null}
    </form>
  );
}

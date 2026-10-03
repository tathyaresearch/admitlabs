'use client';

// The form of both doors into Drishti: email, then a 6-digit code. The same fields, steps and
// checks for /signup and /login (src/lib/auth/email-code.ts); only the words differ
// (./content.ts). Log in answers every email the same way, so it never says whether one has an
// account; its Sign up link carries the email to sign up in this tab (never in the address).

import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { TextField } from '@/components/ui/Form';
import { emailCodeAction, type EmailCodeState } from '@/lib/auth/email-code';
import { AUTH_COPY, CODE_COPY, type AuthMode } from './content';
import styles from './auth.module.css';

const CARRY = 'drishti:signup-email';

/** "6-digit" kept on one line. */
const SixDigit = () => <span className={styles.keep}>6-digit</span>;

export function AuthForm({ mode, next, mailpitUrl }: { mode: AuthMode; next: string | null; mailpitUrl: string | null }) {
  const copy = AUTH_COPY[mode];
  const initial: EmailCodeState = { mode, step: 'email', email: '', next, message: null, error: null };
  const [state, formAction, pending] = useActionState(emailCodeAction, initial);
  const codeForm = useRef<HTMLFormElement>(null);

  // Sign up starts with the email typed on the log-in page, if there was one.
  useEffect(() => {
    if (mode !== 'signup') return;
    try {
      const carried = sessionStorage.getItem(CARRY);
      sessionStorage.removeItem(CARRY);
      const field = document.getElementById('email');
      if (carried && field instanceof HTMLInputElement && !field.value) field.value = carried;
    } catch {
      // Storage can be blocked; the field simply starts empty.
    }
  }, [mode]);

  const carry = () => {
    try {
      sessionStorage.setItem(CARRY, state.email);
    } catch {
      // As above.
    }
  };

  if (state.step === 'email') {
    return (
      <form action={formAction} className={styles.form} noValidate>
        <div className={styles.formHead}>
          <h1 className={styles.formTitle}>{copy.title}</h1>
          <p className={styles.formText}>{copy.text}</p>
        </div>
        <input type="hidden" name="intent" value="send" />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          id="email"
          name="email"
          type="email"
          label={CODE_COPY.email}
          autoComplete="email"
          inputMode="email"
          placeholder={CODE_COPY.placeholder}
          defaultValue={state.email}
          error={state.error}
          className={styles.input}
          required
          autoFocus
        />
        <Button type="submit" size="lg" block loading={pending} iconAfter="arrowRight" className={styles.submit}>
          {CODE_COPY.send}
        </Button>
        <p className={styles.foot}>
          {copy.footText}{' '}
          <Link href={copy.footHref} className={styles.footLink}>
            {copy.footLink}
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form ref={codeForm} action={formAction} className={styles.form}>
      <div className={styles.formHead}>
        <h1 className={styles.formTitle}>{CODE_COPY.checkTitle}</h1>
        <p className={styles.formText} role="status">
          {mode === 'login' ? (
            <>
              {state.message === 'resent' ? CODE_COPY.loginResent : CODE_COPY.loginSent} {CODE_COPY.newHere}{' '}
              <Link href="/signup" className={styles.footLink} onClick={carry}>
                {CODE_COPY.signUp}
              </Link>
              .
            </>
          ) : state.message === 'sent' ? (
            <>
              We sent a <SixDigit /> code to {state.email}. It works for 10 minutes.
            </>
          ) : state.message === 'resent' ? (
            <>We sent a new code to {state.email}.</>
          ) : (
            <>Enter the code we sent to {state.email}.</>
          )}
        </p>
      </div>
      <input type="hidden" name="email" value={state.email} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <CodeInput id="token" name="token" label={CODE_COPY.code} error={state.error} autoFocus onComplete={() => codeForm.current?.requestSubmit()} />
      <Button type="submit" name="intent" value="verify" size="lg" block loading={pending} className={styles.submit}>
        {copy.verify}
      </Button>
      <div className={styles.secondary}>
        <Button type="submit" name="intent" value="resend" variant="quiet" size="sm" formNoValidate disabled={pending}>
          {CODE_COPY.resend}
        </Button>
        <Button type="submit" name="intent" value="change" variant="quiet" size="sm" formNoValidate disabled={pending}>
          {CODE_COPY.change}
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

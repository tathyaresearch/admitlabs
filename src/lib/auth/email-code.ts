'use server';

// Email, then a 6-digit code, for both doors into Drishti. Locally the code email lands in Mailpit,
// never a real inbox. One action handles every step: send, resend, verify, or go back to change the
// email.
//
// Sign up (/signup) creates an account for a new email and simply signs in one that has an account
// already. Log in (/login) never says whether an email has an account, so nobody can check who uses
// Drishti: whatever the email, it answers the same way, in about the same time. It sends a code only
// to an account that exists, or to someone invited by an owner or the AdmitLabs team, who comes in
// like any account. It never creates an account for anyone else.

import { redirect } from 'next/navigation';
import type { AuthMode } from '@/components/auth/content';
import { hasPendingInvite } from '@/lib/auth/invites';
import { isNoAccount } from '@/lib/auth/no-account';
import { homePath } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/urls';

export interface EmailCodeState {
  mode: AuthMode;
  step: 'email' | 'code';
  email: string;
  next: string | null;
  /** What the code step says: a code was sent, a new one was sent, or nothing yet. The form words it. */
  message: 'sent' | 'resent' | null;
  error: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every log-in answer takes at least this long, so how long it takes says nothing about the email. */
const LOGIN_ANSWER_MS = 1200;

export async function emailCodeAction(previous: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  const mode: AuthMode = previous.mode === 'login' ? 'login' : 'signup';
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = safeNextPath(formData.get('next'));
  const intent = String(formData.get('intent') ?? (formData.get('token') ? 'verify' : 'send'));

  if (intent === 'change') return { mode, step: 'email', email, next, message: null, error: null };
  if (intent === 'verify') return verify(mode, email, next, String(formData.get('token') ?? ''));
  if (!EMAIL_PATTERN.test(email)) {
    return { mode, step: 'email', email, next, message: null, error: 'Enter a valid email address, like name@college.edu.' };
  }
  return mode === 'login' ? sendToLogIn(email, next, intent === 'resend') : sendToSignUp(email, next, intent === 'resend');
}

async function sendToSignUp(email: string, next: string | null, resend: boolean): Promise<EmailCodeState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    const tooMany = error.status === 429 || error.code === 'over_email_send_rate_limit';
    return {
      mode: 'signup',
      step: resend ? 'code' : 'email',
      email,
      next,
      message: null,
      error: tooMany ? 'Too many codes asked for. Wait a minute, then try again.' : 'We could not send a code just now. Please try again in a moment.',
    };
  }
  return { mode: 'signup', step: 'code', email, next, message: resend ? 'resent' : 'sent', error: null };
}

async function sendToLogIn(email: string, next: string | null, resend: boolean): Promise<EmailCodeState> {
  const started = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (isNoAccount(error)) {
      // Invited, but never signed in: the account is made now, and they join on their first sign in.
      if (await hasPendingInvite(email)) {
        const invited = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (invited.error) console.error('Log in: no code for an invited email', invited.error.code ?? invited.error.message);
      }
    } else if (error) {
      // Kept to the server's log: telling the person would say that the account exists.
      console.error('Log in: no code sent', error.code ?? error.message);
    }
  } catch (problem) {
    console.error('Log in: no code sent', problem);
  }
  const left = LOGIN_ANSWER_MS - (Date.now() - started);
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
  return { mode: 'login', step: 'code', email, next, message: resend ? 'resent' : 'sent', error: null };
}

async function verify(mode: AuthMode, email: string, next: string | null, rawToken: string): Promise<EmailCodeState> {
  const token = rawToken.replace(/\D/g, '');
  if (token.length !== 6) return { mode, step: 'code', email, next, message: null, error: 'Enter all 6 digits of the code.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.user) {
    return {
      mode,
      step: 'code',
      email,
      next,
      message: null,
      error: error?.code === 'otp_expired' ? 'That code has expired. Send a new one below.' : 'That code did not work. Check it, or send a new one.',
    };
  }

  const [team, membership] = await Promise.all([
    supabase.from('team_users').select('role').eq('user_id', data.user.id).maybeSingle(),
    supabase.from('memberships').select('role').eq('user_id', data.user.id).limit(1).maybeSingle(),
  ]);
  // Someone an Admin added to the AdmitLabs team by email joins the team when they first sign in.
  const teamRole = team.data?.role ?? (!membership.data ? ((await supabase.rpc('accept_team_invite')).data ?? null) : null);
  // Someone an owner invited joins that institution as a Member when they first sign in.
  const joined = !teamRole && !membership.data ? Boolean((await supabase.rpc('accept_invites')).data) : false;
  redirect(next ?? homePath({ isTeam: Boolean(teamRole), hasInstitution: Boolean(membership.data) || joined }));
}

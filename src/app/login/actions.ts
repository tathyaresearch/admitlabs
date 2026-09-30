'use server';

// Email, then a 6-digit code. Locally the code email lands in Mailpit, never a real inbox.
// One action handles every step: send, resend, verify, or go back to change the email.

import { redirect } from 'next/navigation';
import { homePath } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/urls';

export interface LoginState {
  step: 'email' | 'code';
  email: string;
  next: string | null;
  message: string | null;
  error: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = safeNextPath(formData.get('next'));
  const intent = String(formData.get('intent') ?? (formData.get('token') ? 'verify' : 'send'));

  if (intent === 'change') return { step: 'email', email, next, message: null, error: null };
  if (intent === 'verify') return verify(email, next, String(formData.get('token') ?? ''));
  return send(email, next, intent === 'resend');
}

async function send(email: string, next: string | null, resend: boolean): Promise<LoginState> {
  if (!EMAIL_PATTERN.test(email)) {
    return { step: 'email', email, next, message: null, error: 'Enter a valid email address, like name@college.edu.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    const tooMany = error.status === 429 || error.code === 'over_email_send_rate_limit';
    return {
      step: resend ? 'code' : 'email',
      email,
      next,
      message: null,
      error: tooMany ? 'Too many codes asked for. Wait a minute, then try again.' : 'We could not send a code just now. Please try again in a moment.',
    };
  }

  return {
    step: 'code',
    email,
    next,
    message: resend ? `We sent a new code to ${email}.` : `We sent a 6-digit code to ${email}. It works for 10 minutes.`,
    error: null,
  };
}

async function verify(email: string, next: string | null, rawToken: string): Promise<LoginState> {
  const token = rawToken.replace(/\D/g, '');
  if (token.length !== 6) return { step: 'code', email, next, message: null, error: 'Enter all 6 digits of the code.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.user) {
    return {
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

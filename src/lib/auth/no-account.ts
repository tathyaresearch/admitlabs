// Logging in never creates an account on its own. When the email-code service is asked for a code
// for an email with no account, and may not create one, it answers "Signups not allowed for otp"
// (code otp_disabled). Log in then checks for a pending invite; it never tells the person which it
// was (src/lib/auth/email-code.ts).

export function isNoAccount(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'otp_disabled' || /signups? not allowed/i.test(error.message ?? '');
}

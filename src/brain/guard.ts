// The Brain's two guards (spec section 26). No passwords or logins anywhere: a password belongs in
// a password manager, and the team gets access to social media through each platform's own team
// invite. No student contact details in Proof: alumni and student reviews are a line and a link,
// never a phone number or an email. The database runs the same checks again
// (private.brain_text_ok in the client_brain migration). Pure.

/** "password: x", "pwd = x", "passcode is x", "OTP: 123456", "login: x", "username: x", "credentials". */
const LOGIN_PATTERNS: readonly RegExp[] = [
  /\b(?:pass\s?words?|passwd|pwd|pass\s?codes?)\s*(?:is|was|:|=|-)\s*\S/i,
  /\botp\s*(?:is|:|=)\s*\d{4,8}\b/i,
  /\b(?:user\s?names?|user\s?ids?|login\s?ids?|log\s?ins?|logins?)\s*[:=]\s*\S/i,
  /\b(?:credentials|log\s?in details|login details)\b/i,
  // A link with a user and password in it: https://name:secret@host.
  /[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i,
];

/** A phone number (8 or more digits, with spaces or dashes between) or an email address. */
const CONTACT_PATTERNS: readonly RegExp[] = [/(?:\+?\d[\s-]?){8,}\d/, /[^\s@]+@[^\s@]+\.[^\s@]+/];

export const LOGIN_MESSAGE = 'This looks like a password or a login. Keep logins in a password manager, never in the Brain. Your AdmitLabs team gets access through each platform’s own invite.';
export const CONTACT_MESSAGE = 'Leave out phone numbers and emails here: student details stay in Leads.';

export function looksLikeLogin(text: string): boolean {
  return LOGIN_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasContactDetails(text: string): boolean {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}

/** Every string inside a fact's fields, however deep, so a guard sees all of it. */
export function textsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (value && typeof value === 'object') return Object.values(value).flatMap(textsOf);
  return [];
}

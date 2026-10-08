// The email to the owner of a college the team made a Client from a won enquiry (spec section 27):
// AdmitLabs has set up Drishti for them; signing in with this address opens their dashboard as
// its owner. Pure.

import { emailHtml, emailText, type EmailParts } from '../email/layout.ts';
import type { EmailMessage } from '../providers/email.ts';

export interface ClientInviteInput {
  college: string;
  /** The person on the team who made them a Client. */
  from: string | null;
  /** The log in page, on the dashboard's address. */
  loginUrl: string;
}

export function clientInviteParts(input: ClientInviteInput): EmailParts {
  return {
    preview: `Your Drishti for ${input.college} is ready. Sign in with this email address.`,
    title: `Welcome to Drishti, ${input.college}`,
    lines: [
      `${input.from ? `${input.from} at AdmitLabs has` : 'AdmitLabs has'} set up Drishti for ${input.college}, as an AdmitLabs Client.`,
      'Sign in with this email address: you will be its owner. Add your programs in Settings, and fill in Help us know you so your AdmitLabs team knows your college well.',
    ],
    facts: [],
    after: ['Signing in needs only this email: Drishti sends a 6-digit code. No password.'],
    button: { label: 'Sign in to Drishti', url: input.loginUrl },
    footer: `You get this because AdmitLabs added this address as the owner of ${input.college} in Drishti. Drishti by AdmitLabs.`,
  };
}

export function clientInviteEmail(input: ClientInviteInput, to: string): EmailMessage {
  const parts = clientInviteParts(input);
  return { kind: 'client_invite', to: [to], subject: `Your Drishti for ${input.college} is ready`, text: emailText(parts), html: emailHtml(parts) };
}

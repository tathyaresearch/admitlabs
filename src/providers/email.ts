// The email sender (provider key `email`, spec section 17): the alert for each new enquiry, the
// monthly summary, and Free's Audit ready email. In this build its mock hands every message to
// the local test inbox that local Supabase runs (Mailpit), never to the internet. Real version:
// an email service, later; WhatsApp later, as a second channel. One message per recipient, so
// each one is logged on its own (email_log keeps who, when and whether it went, never the message).

import type { ProviderMode } from '../config/providers.ts';

export type EmailKind = 'lead_alert' | 'monthly_summary' | 'audit_ready' | 'team_lead_alert' | 'client_invite';

export interface EmailMessage {
  kind: EmailKind;
  to: readonly string[];
  subject: string;
  /** Plain text, for every mail app. */
  text: string;
  /** The same message laid out, in black and ivory. */
  html: string;
}

export interface EmailResult {
  recipient: string;
  ok: boolean;
  error: string | null;
}

export interface EmailProvider {
  key: 'email';
  mode: ProviderMode;
  /** Which sender sent it, for the log: "Local test inbox". */
  sender: string;
  send(message: EmailMessage): Promise<EmailResult[]>;
}

/** Who Drishti's emails come from. */
export const EMAIL_FROM = { name: 'Drishti by AdmitLabs', email: 'drishti@admitlabs.example' } as const;

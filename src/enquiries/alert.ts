// The email for each new lead, and for a lead that comes back (spec section 27), to its owner or,
// when it has none, to every Admin: who, the institution, how to reach them, what they want and
// where they came from, with a link to the lead. Pure.

import { emailHtml, emailText, type EmailParts } from '../email/layout.ts';
import { formatDateTime } from '../domain/format.ts';
import type { EmailMessage } from '../providers/email.ts';
import { formatPhone } from '../site/enquiry.ts';
import { leadTitle, LOST_REASON_LABELS, sourceLine, type LostReason, type TeamLeadSource } from './model.ts';

export interface TeamLeadAlertInput {
  /** reopened: it had been Lost, and is New again. */
  kind: 'new' | 'returning' | 'reopened';
  /** What a reopened lead had been lost for. */
  wasLost?: LostReason | null;
  name: string | null;
  institution: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  wants: string | null;
  source: TeamLeadSource;
  sourceDetail: string | null;
  /** The owner's name or email, or null when nobody owns it yet. */
  owner: string | null;
  at: Date | string;
  /** The lead's page in the team area. */
  url: string;
}

export function teamLeadAlertParts(input: TeamLeadAlertInput): EmailParts {
  const who = leadTitle(input);
  const at = input.institution && input.name ? `${input.name}, ${input.institution}` : who;
  const line =
    input.kind === 'new'
      ? `${at} came in through ${sourceLine(input.source, input.sourceDetail)}.`
      : input.kind === 'reopened'
        ? `${at} came back. It was Lost${input.wasLost ? ` (${LOST_REASON_LABELS[input.wasLost]})` : ''}, so it is New again.`
        : `${at} came back.`;
  return {
    preview: line,
    title: input.kind === 'new' ? 'A new enquiry for AdmitLabs' : input.kind === 'reopened' ? 'A Lost enquiry came back' : 'An enquiry came back',
    lines: [line, ...(input.wants ? [`What they want: ${input.wants}`] : [])],
    facts: [
      ...(input.phone ? [{ label: 'Phone', value: formatPhone(input.phone) }] : []),
      ...(input.email ? [{ label: 'Email', value: input.email }] : []),
      ...(input.city ? [{ label: 'City', value: input.city }] : []),
      { label: 'Owner', value: input.owner ?? 'Nobody yet' },
      { label: input.kind === 'new' ? 'Came in' : 'Came back', value: formatDateTime(input.at) },
    ],
    after: input.owner ? [] : ['It has no owner yet, so every Admin gets this. Give it an owner in Enquiries.'],
    button: { label: 'Open the enquiry', url: input.url },
    footer: 'You get this because you own this enquiry, or you are an Admin and it has no owner. AdmitLabs team, Drishti.',
  };
}

export function teamLeadAlertEmail(input: TeamLeadAlertInput, to: readonly string[]): EmailMessage {
  const parts = teamLeadAlertParts(input);
  const who = leadTitle(input);
  return {
    kind: 'team_lead_alert',
    to,
    subject: input.kind === 'new' ? `New enquiry: ${who}${input.institution && input.name ? `, ${input.institution}` : ''}` : input.kind === 'reopened' ? `Came back after Lost: ${who}` : `Came back: ${who}`,
    text: emailText(parts),
    html: emailHtml(parts),
  };
}

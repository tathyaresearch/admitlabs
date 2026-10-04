// The email for each new enquiry (spec section 23), to the college's admissions team: who asked,
// about which course, how to reach them, and which link brought them. It never waits for a
// review (section 25). Pure.

import { emailHtml, emailText, type EmailParts } from '../email/layout.ts';
import { formatDateTime } from '../domain/format.ts';
import { LEAD_SOURCE_LABELS, type LeadSource } from '../domain/types.ts';
import type { EmailMessage } from '../providers/email.ts';
import { formatPhone } from '../site/enquiry.ts';

export interface LeadAlertInput {
  college: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  course: string | null;
  link: { name: string; usedOn: LeadSource } | null;
  sentAt: Date | string;
  /** The Leads page, on the dashboard's address. */
  leadsUrl: string;
}

export function leadAlertParts(input: LeadAlertInput): EmailParts {
  const asked = input.course ? `${input.name} asked about ${input.course}.` : `${input.name} sent an enquiry.`;
  return {
    preview: `${asked} Phone ${formatPhone(input.phone)}.`,
    title: `New enquiry for ${input.college}`,
    lines: [asked],
    facts: [
      { label: 'Phone', value: formatPhone(input.phone) },
      ...(input.email ? [{ label: 'Email', value: input.email }] : []),
      ...(input.city ? [{ label: 'City', value: input.city }] : []),
      ...(input.link ? [{ label: 'From', value: `${input.link.name} (${LEAD_SOURCE_LABELS[input.link.usedOn]})` }] : []),
      { label: 'Sent', value: formatDateTime(input.sentAt) },
    ],
    after: [`They agreed to be contacted by ${input.college} about admission.`],
    button: { label: 'See every enquiry', url: input.leadsUrl },
    footer: `You get this because this address gets enquiry alerts for ${input.college} (in Drishti, Settings, Leads). Drishti by AdmitLabs.`,
  };
}

export function leadAlertEmail(input: LeadAlertInput, to: readonly string[]): EmailMessage {
  const parts = leadAlertParts(input);
  return {
    kind: 'lead_alert',
    to,
    subject: input.course ? `New enquiry: ${input.name}, ${input.course}` : `New enquiry: ${input.name}`,
    text: emailText(parts),
    html: emailHtml(parts),
  };
}

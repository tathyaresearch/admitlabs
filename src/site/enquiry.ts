// The "Work with us" form: what it asks, and checking an answer before it goes to the database,
// which checks again (submit_enquiry). Pure, so it is tested on its own.

import { ENQUIRY_RULES } from '../config/site.ts';

export const ENQUIRY_ROLES = ['founder_director', 'principal_dean', 'admissions', 'marketing', 'other'] as const;
export type EnquiryRole = (typeof ENQUIRY_ROLES)[number];

export const ENQUIRY_ROLE_LABELS: Readonly<Record<EnquiryRole, string>> = {
  founder_director: 'Founder or director',
  principal_dean: 'Principal or dean',
  admissions: 'Admissions',
  marketing: 'Marketing',
  other: 'Other',
};

export interface Enquiry {
  name: string;
  institution: string;
  role: EnquiryRole;
  email: string;
  /** Digits only, with a leading + when given: '+919876543210'. */
  phone: string;
  program: string | null;
  message: string | null;
}

export type EnquiryField = keyof Enquiry;
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

/** A field people never see. Only a bot fills it in: it is told the enquiry went, and nothing is kept. */
export const TRAP_FIELD = 'company_site';

export type ParsedEnquiry = { ok: true; enquiry: Enquiry } | { ok: false; errors: EnquiryErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** One line of text: trimmed, inner runs of spaces made single. */
const line = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** A phone number with its spaces, brackets, dots and hyphens taken out, or null if it cannot be one. */
export function normalisePhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, '');
  return /^\+?\d{10,15}$/.test(compact) ? compact : null;
}

/** A stored number, easier to read: +91 98765 43210, or 98765 43210 for ten digits. Anything else as it is. */
export function formatPhone(phone: string): string {
  const india = /^\+91(\d{5})(\d{5})$/.exec(phone);
  if (india) return `+91 ${india[1]} ${india[2]}`;
  const local = /^0?(\d{5})(\d{5})$/.exec(phone);
  if (local) return `${phone.startsWith('0') ? '0' : ''}${local[1]} ${local[2]}`;
  return phone;
}

const formatLimit = (limit: number) => limit.toLocaleString('en-IN');

export function parseEnquiry(input: Readonly<Record<string, unknown>>): ParsedEnquiry {
  const errors: EnquiryErrors = {};

  const name = line(input.name);
  if (name.length < 2) errors.name = 'Please add your name.';
  else if (name.length > ENQUIRY_RULES.nameMax) errors.name = `Please keep your name under ${formatLimit(ENQUIRY_RULES.nameMax)} characters.`;

  const institution = line(input.institution);
  if (institution.length < 2) errors.institution = 'Please add your institution’s name.';
  else if (institution.length > ENQUIRY_RULES.institutionMax) errors.institution = `Please keep this under ${formatLimit(ENQUIRY_RULES.institutionMax)} characters.`;

  const role = ENQUIRY_ROLES.find((value) => value === input.role) ?? null;
  if (!role) errors.role = 'Please choose your role.';

  const email = line(input.email).toLowerCase();
  if (!email) errors.email = 'Please add an email we can reply to.';
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = 'That email doesn’t look right. Check it and try again.';

  const rawPhone = line(input.phone);
  const phone = rawPhone ? normalisePhone(rawPhone) : null;
  if (!rawPhone) errors.phone = 'Please add a phone number.';
  else if (!phone) errors.phone = 'That number doesn’t look right. Use 10 to 15 digits.';

  const program = line(input.program) || null;
  if (program && program.length > ENQUIRY_RULES.programMax) errors.program = `Please keep this under ${formatLimit(ENQUIRY_RULES.programMax)} characters.`;

  const message = typeof input.message === 'string' ? input.message.trim() || null : null;
  if (message && message.length > ENQUIRY_RULES.messageMax) errors.message = `Please keep your message under ${formatLimit(ENQUIRY_RULES.messageMax)} characters.`;

  if (Object.keys(errors).length || !role || !phone) return { ok: false, errors };
  return { ok: true, enquiry: { name, institution, role, email, phone, program, message } };
}

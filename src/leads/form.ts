// The enquiry form a tracking link opens (spec section 23): what it asks, and checking an answer
// before it goes to the database, which checks again (submit_lead). Pure, so it is tested on its own.

import { LEAD_RULES } from '../config/leads.ts';
import { normalisePhone } from '../site/enquiry.ts';

export interface LeadInput {
  name: string;
  /** '+919876543210': an Indian number gets +91 in front. */
  phone: string;
  email: string | null;
  city: string | null;
  programId: string;
}

export type LeadField = 'name' | 'phone' | 'email' | 'city' | 'program';
export type LeadErrors = Partial<Record<LeadField, string>>;
export type ParsedLead = { ok: true; lead: LeadInput } | { ok: false; errors: LeadErrors };

/** A field people never see. Only a bot fills it in: it is told the enquiry went, and nothing is kept. */
export const LEAD_TRAP_FIELD = 'website_url';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const line = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/**
 * A phone number as stored: spaces, brackets, dots and hyphens out, and +91 in front of an Indian
 * number written without it (98765 43210, 098765 43210, 91 98765 43210). Null if it cannot be one.
 */
export function indianPhone(value: string): string | null {
  const phone = normalisePhone(value);
  if (!phone) return null;
  if (/^[6-9]\d{9}$/.test(phone)) return `+91${phone}`;
  if (/^0[6-9]\d{9}$/.test(phone)) return `+91${phone.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(phone)) return `+${phone}`;
  return phone;
}

/** The phone number or email an owner searches by to delete a student's data, as stored. Null if it is neither. */
export function contactKey(value: string): string | null {
  const text = line(value);
  if (EMAIL.test(text)) return text.toLowerCase();
  return indianPhone(text);
}

export function parseLead(input: Readonly<Record<string, unknown>>, programIds: readonly string[]): ParsedLead {
  const errors: LeadErrors = {};

  const name = line(input.name);
  if (name.length < 2) errors.name = 'Please add your name.';
  else if (name.length > LEAD_RULES.nameMax) errors.name = 'Please write your name in under 120 characters.';

  const rawPhone = line(input.phone);
  const phone = rawPhone ? indianPhone(rawPhone) : null;
  if (!rawPhone) errors.phone = 'Please add your phone number, so they can call you.';
  else if (!phone) errors.phone = 'That number doesn’t look right. Use your 10 digit mobile number.';

  const email = line(input.email).toLowerCase() || null;
  if (email && (email.length > 254 || !EMAIL.test(email))) errors.email = 'That email doesn’t look right. Check it, or leave it out.';

  const city = line(input.city) || null;
  if (city && (city.length < 2 || city.length > LEAD_RULES.cityMax)) errors.city = 'Please write your city in a few words, or leave it out.';

  const programId = typeof input.program === 'string' ? input.program : '';
  if (!programIds.includes(programId)) errors.program = 'Please choose a course.';

  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, lead: { name, phone, email, city, programId } };
}

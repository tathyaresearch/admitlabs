// The Leads list as a CSV file, for the college's own people (spec section 23). Phone numbers are
// written in groups with spaces (91 98765 43210): Excel and Google Sheets keep that as text, so it
// reads in full, with no apostrophe and never as 9.19877E+11. Any other cell that starts like a
// spreadsheet formula gets a leading apostrophe, so a name typed into the public form can never run
// as one. Pure.

import { istParts, istTime } from '../domain/dates.ts';
import { LEAD_SOURCE_LABELS, type LeadSource } from '../domain/types.ts';

export interface LeadCsvRow {
  sentAt: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  course: string | null;
  link: string | null;
  usedOn: LeadSource | null;
}

const HEADER = ['Sent', 'Name', 'Phone', 'Email', 'City', 'Course', 'Link', 'Used on'];
const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-09-28 14:05", in India time: sorts as text, reads as a date. */
function sentWords(value: string): string {
  const at = new Date(value);
  const { year, month, day } = istParts(at);
  const { hour, minute } = istTime(at);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

/** One cell: a formula's first character made harmless, then quoted when it holds a comma, a quote or a new line. */
export function csvCell(value: string | null): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A stored phone number ('+919876543210') in groups with spaces: '91 98765 43210'. A spreadsheet
 * reads that as text, never as a number, and it starts with no formula character, so it needs no
 * apostrophe either. A number in another shape goes in groups of five.
 */
export function csvPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const india = /^91(\d{5})(\d{5})$/.exec(digits);
  if (india) return `91 ${india[1]} ${india[2]}`;
  return digits.match(/\d{1,5}/g)?.join(' ') ?? '';
}

/** The file: a header, then one row per enquiry, newest first as given. With a BOM so spreadsheets read every name right. */
export function leadsCsv(rows: readonly LeadCsvRow[]): string {
  const lines = [HEADER, ...rows.map((row) => [sentWords(row.sentAt), row.name, csvPhone(row.phone), row.email, row.city, row.course, row.link, row.usedOn ? LEAD_SOURCE_LABELS[row.usedOn] : null])];
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

// Display formatting for India. Hand-rolled so the server and the browser always agree
// (Intl month names differ between runtimes, for example "Sep" and "Sept").

import { istParts, istTime } from './dates.ts';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "30 Sep 2026", in India time. */
export function formatDate(value: Date | string): string {
  const { year, month, day } = istParts(toDate(value));
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** "11:52 am", in India time. */
export function formatTime(value: Date | string): string {
  const { hour, minute } = istTime(toDate(value));
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

/** "1 Oct 2026, 11:52 am", in India time. */
export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** "30 September 2026", in India time. */
export function formatDateLong(value: Date | string): string {
  const { year, month, day } = istParts(toDate(value));
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

/** "September 2026" from a 'YYYY-MM' key or a date. */
export function formatMonth(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number) as [number, number];
    return `${MONTHS_LONG[month - 1]} ${year}`;
  }
  const { year, month } = istParts(toDate(value));
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/** "September" from a 'YYYY-MM' key. */
export function formatMonthName(key: string): string {
  const month = Number(key.slice(5, 7));
  return MONTHS_LONG[month - 1] ?? key;
}

/** "Sep" from a 'YYYY-MM' key. */
export function formatMonthShort(key: string): string {
  const month = Number(key.slice(5, 7));
  return MONTHS_SHORT[month - 1] ?? key;
}

/** Indian digit grouping: 1234567 becomes 12,34,567. */
export function groupIndian(value: number): string {
  const negative = value < 0;
  const [whole = '0', fraction] = Math.abs(value).toString().split('.');
  const lastThree = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** "₹9,999". */
export function formatInr(amount: number): string {
  return `₹${groupIndian(Math.round(amount))}`;
}

/** Whole numbers with Indian grouping. */
export function formatCount(value: number): string {
  return groupIndian(Math.round(value));
}

/** "1 program", "3 programs". */
export function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Months as words, a run of months as one span: [3, 4, 5, 6] is "March to June", [11, 12, 1, 2]
 * is "November to February", [4, 5, 6, 10] is "April to June, and October". Spans keep the
 * order the months are given in.
 */
export function monthSpanWords(months: readonly number[]): string {
  const set = new Set(months.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12));
  if (set.size === 12) return 'All year';
  const next = (month: number) => (month % 12) + 1;
  const previous = (month: number) => ((month + 10) % 12) + 1;
  const spans: string[] = [];
  for (const start of [...new Set(months)]) {
    if (!set.has(start) || set.has(previous(start))) continue;
    let end = start;
    while (set.has(next(end))) end = next(end);
    spans.push(start === end ? (MONTHS_LONG[start - 1] ?? '') : `${MONTHS_LONG[start - 1]} to ${MONTHS_LONG[end - 1]}`);
  }
  if (spans.length <= 1) return spans[0] ?? '';
  return `${spans.slice(0, -1).join(', ')}, and ${spans[spans.length - 1]}`;
}

/** "1st", "2nd", "3rd", "4th", "11th", "22nd". */
export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th';
  return `${value}${suffix}`;
}

/** "northbank-college.example/fees" from a full URL, for source lines. */
export function hostAndPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}

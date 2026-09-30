// Display formatting for India. Hand-rolled so the server and the browser always agree
// (Intl month names differ between runtimes, for example "Sep" and "Sept").

import { istParts } from './dates.ts';

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

// Calendar maths in India Standard Time (UTC+5:30, no daylight saving).
// Dates are stored in UTC; days, months and plan ends are counted in India.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Shift a moment so its UTC fields read as India wall-clock time. */
function toIstFields(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/** Year, month (1 to 12) and day of the month in India. */
export function istParts(date: Date): { year: number; month: number; day: number } {
  const ist = toIstFields(date);
  return { year: ist.getUTCFullYear(), month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

/** Calendar day number in India (whole days since 1 Jan 1970, India time). */
export function istDayNumber(date: Date): number {
  return Math.floor((date.getTime() + IST_OFFSET_MS) / DAY_MS);
}

/** Whole calendar days from `from` to `to`, counted in India. Negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return istDayNumber(to) - istDayNumber(from);
}

/** A moment at the given India wall-clock time. `ymd` is 'YYYY-MM-DD'. */
export function istDate(ymd: string, hour = 0, minute = 0): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) throw new Error(`Expected YYYY-MM-DD, got "${ymd}"`);
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hour, minute) - IST_OFFSET_MS);
}

/** 'YYYY-MM' for the month the moment falls in, in India. */
export function monthKey(date: Date): string {
  const ist = toIstFields(date);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM-01', the value stored in month columns. */
export function monthStart(key: string): string {
  assertMonthKey(key);
  return `${key}-01`;
}

/** Every month key from `from` to `to`, inclusive. */
export function monthRange(from: string, to: string): string[] {
  assertMonthKey(from);
  assertMonthKey(to);
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [toY, toM] = to.split('-').map(Number) as [number, number];
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

/** Previous month key. */
export function previousMonth(key: string): string {
  assertMonthKey(key);
  const [y, m] = key.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Add calendar months in India time, keeping the time of day. When the day does not
 * exist in the target month it moves to that month's last day (31 Aug plus 6 months is 28 Feb).
 */
export function addMonths(date: Date, months: number): Date {
  const ist = toIstFields(date);
  const monthIndex = ist.getUTCMonth() + months;
  const year = ist.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(ist.getUTCDate(), lastDay);
  return new Date(
    Date.UTC(year, month, day, ist.getUTCHours(), ist.getUTCMinutes(), ist.getUTCSeconds(), ist.getUTCMilliseconds()) -
      IST_OFFSET_MS,
  );
}

function assertMonthKey(key: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error(`Expected YYYY-MM, got "${key}"`);
}

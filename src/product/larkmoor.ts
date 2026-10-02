// The product page and the sample report it offers show the sample institution under the
// website's names (src/site/scenes.ts): Larkmoor University, Bangalore, with Calderwood College,
// Brackenfield University and Thornbury College as its rivals. Only words change. Every number
// still comes from the sample world through the real scoring engine, so the website, the product
// page and the PDF all agree. The dashboard's own sample keeps its names.

/** Each name, then what the product page calls it. Longer names first, so "Assamese" is never read as "Assam". */
export const LARKMOOR_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['Six Mile, GS Road, Guwahati 781022', 'Bannerghatta Road, Bangalore 560076'],
  ['Eastgate', 'Larkmoor'],
  ['eastgate', 'larkmoor'],
  ['Silverline', 'Calderwood'],
  ['silverline', 'calderwood'],
  ['Highfield', 'Brackenfield'],
  ['highfield', 'brackenfield'],
  ['Northbank', 'Thornbury'],
  ['northbank', 'thornbury'],
  ['Guwahati', 'Bangalore'],
  ['guwahati', 'bangalore'],
  ['Assamese', 'Kannada'],
  ['assamese', 'kannada'],
  ['Assam', 'Karnataka'],
  ['assam', 'karnataka'],
];

function renamed(text: string): string {
  return LARKMOOR_NAMES.reduce((out, [from, to]) => out.replaceAll(from, to), text);
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') return renamed(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value instanceof Date) return value;
  // Keys are ids, never shown, so they stay as they are and every lookup still works.
  if (value instanceof Map) return new Map([...value].map(([key, entry]) => [key, walk(entry)]));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walk(entry)]));
  return value;
}

/** A copy of plain data (records, arrays, maps, dates) with every word in it under the product page's names. */
export function asLarkmoor<T>(value: T): T {
  return walk(value) as T;
}

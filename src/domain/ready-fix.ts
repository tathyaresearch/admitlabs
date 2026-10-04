// A ready fix (spec 7.7): what the writer hands over for a fix, ready to copy, as plain text, a
// table or an outline. Blanks the institution fills in are in [brackets]; the details it added
// (Settings, never read by scoring) fill some of them in. Stored as jsonb with the check's or the
// finding's fix; parseReadyFix() reads it back. Pure.

export type ReadyFix =
  | { kind: 'text'; title: string; text: string; fromDetails?: boolean }
  | { kind: 'table'; title: string; head: readonly string[]; rows: ReadonlyArray<readonly string[]>; note?: string; fromDetails?: boolean }
  | { kind: 'outline'; title: string; items: ReadonlyArray<{ heading: string; line: string }>; fromDetails?: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

/** A stored ready fix, or null when it is missing or not one of the three shapes. */
export function parseReadyFix(value: unknown): ReadyFix | null {
  if (!isRecord(value) || !isText(value.title)) return null;
  const fromDetails = value.fromDetails === true ? { fromDetails: true } : {};
  switch (value.kind) {
    case 'text':
      return isText(value.text) ? { kind: 'text', title: value.title, text: value.text, ...fromDetails } : null;
    case 'table': {
      const { head, rows, note } = value;
      if (!isTextList(head) || head.length === 0 || !Array.isArray(rows) || rows.length === 0) return null;
      if (!rows.every((row) => isTextList(row) && row.length === head.length)) return null;
      return { kind: 'table', title: value.title, head, rows: rows as string[][], ...(isText(note) ? { note } : {}), ...fromDetails };
    }
    case 'outline': {
      const { items } = value;
      if (!Array.isArray(items) || items.length === 0) return null;
      if (!items.every((item) => isRecord(item) && isText(item.heading) && isText(item.line))) return null;
      return { kind: 'outline', title: value.title, items: (items as Array<{ heading: string; line: string }>).map(({ heading, line }) => ({ heading, line })), ...fromDetails };
    }
    default:
      return null;
  }
}

/** The ready fix as plain text, for Copy: a table becomes one line per row, an outline one line per heading. */
export function readyFixText(fix: ReadyFix): string {
  switch (fix.kind) {
    case 'text':
      return fix.text;
    case 'table': {
      const lines = [fix.head, ...fix.rows].map((row) => row.filter((cell) => cell !== '').join(' | '));
      return [fix.title, ...lines, ...(fix.note ? [fix.note] : [])].join('\n');
    }
    case 'outline':
      return [fix.title, ...fix.items.map((item) => `${item.heading}: ${item.line}`)].join('\n');
  }
}

/** Whether a ready fix still has blanks for the institution to fill in. */
export function hasBlanks(fix: ReadyFix): boolean {
  return /\[[^\]]+\]/.test(readyFixText(fix));
}

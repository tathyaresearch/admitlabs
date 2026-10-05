// A grouped Demand item as read from a pull (row level security applies when it is loaded): one
// trend, question, topic, idea or other signal for a program, with its real count when the source
// gave one, and where and when it was found. Never a person.

import type { DemandKind, Language } from '../domain/types.ts';

export interface DemandRow {
  id: string;
  programKey: string;
  programName: string;
  /** The pull's month, 'YYYY-MM'. */
  month: string;
  kind: DemandKind;
  text: string;
  language: Language;
  /** A real count from the source, or null when it gave none (spec 9.5). */
  count: number | null;
  changePct: number | null;
  rank: number | null;
  sourceUrl: string;
  foundAt: string;
  meta: Readonly<Record<string, unknown>>;
}

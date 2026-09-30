// Test support only: a realistic report input without a database. Eastgate University's sample
// Audit (5 programs) is built through the live path with mock providers; rivals, moves, lessons
// and Demand are added by hand. Used by the report tests; the app never imports it.

import { recordFor, stored } from '../audit/testing.ts';
import type { HistoryRow } from '../audit/view.ts';
import { regionsFor } from '../demand/regions.ts';
import type { DemandRow } from '../demand/view.ts';
import { istDate } from '../domain/dates.ts';
import type { DemandKind, Language } from '../domain/types.ts';
import type { ReportInput } from './data.ts';

let next = 0;
function demand(programKey: string, kind: DemandKind, text: string, extra: Partial<DemandRow> = {}): DemandRow {
  next += 1;
  return {
    id: `demand-${next}`,
    programKey,
    programName: programKey.toUpperCase(),
    month: '2026-09',
    kind,
    text,
    language: 'en' as Language,
    count: 50 + next,
    changePct: null,
    rank: null,
    sourceUrl: `https://quora.example/${next}`,
    foundAt: '2026-09-28T00:30:00.000Z',
    meta: { platform: 'quora' },
    ...extra,
  };
}

const DEMAND: DemandRow[] = [
  ...[38, 47, 21, 12, 30].map((change, index) => demand(index % 2 ? 'bca' : 'bba', 'rising', `Rising topic ${index + 1}`, { changePct: change, count: 300 + index })),
  ...[96, 91, 88, 85, 80, 72, 60].map((count, index) => demand(index % 2 ? 'bca' : 'bba', 'question', `Question ${index + 1}?`, { count, language: index === 1 ? 'hi' : 'en' })),
  ...[1, 2, 3, 4, 5, 6].map((index) => demand(index % 2 ? 'bca' : 'bba', 'idea', `Idea ${index}.`, { rank: index, meta: { basedOn: `Question ${index}?` } })),
];

function history(): HistoryRow[] {
  const scores = [59, 61, 69, 72, 72, 73];
  return ['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15'].map((day, index) => ({
    id: day === '2026-08-15' ? 'august' : `audit-${day}`,
    runAt: istDate(day, 10).toISOString(),
    scores: { overall: scores[index] as number, discovered: 70, trusted: 60, chosen: 60 },
  }));
}

/** Eastgate University in September 2026, on Paid, with 3 rivals (one not scored yet), 7 moves, 2 lessons and Demand. */
export async function sampleReportInput(overrides: Partial<ReportInput> = {}): Promise<ReportInput> {
  const { record, names, type, institution } = await recordFor('eastgate-university', '2026-09-15');
  const audit = stored(record, { previousAuditId: 'august' });
  audit.changes = { overall: 1, discovered: 0, trusted: 3, chosen: -1 };
  const rivals = [
    { id: 'silverline', name: 'Silverline College', audit: { runAt: istDate('2026-09-01', 9).toISOString(), scores: { overall: 74, discovered: 73, trusted: 72, chosen: 76 }, changes: { overall: 0, discovered: 0, trusted: 0, chosen: 0 } } },
    { id: 'highfield', name: 'Highfield University', audit: { runAt: istDate('2026-09-01', 9).toISOString(), scores: { overall: 51, discovered: 44, trusted: 66, chosen: 43 }, changes: { overall: -1, discovered: 0, trusted: 0, chosen: -2 } } },
    { id: 'newcomer', name: 'Newcomer College', audit: null },
  ];
  const moves = Array.from({ length: 7 }, (_, index) => ({
    rivalId: index % 2 ? 'highfield' : 'silverline',
    kind: 'new_page' as const,
    description: `Added page ${index + 1}.`,
    detectedAt: istDate(`2026-09-${String(3 + index * 3).padStart(2, '0')}`, 9).toISOString(),
  }));
  return {
    institution: { id: institution.id, name: institution.name, type, city: institution.city, state: institution.state, website: institution.website },
    tier: 'paid',
    month: '2026-09',
    madeAt: istDate('2026-10-01', 7),
    audit,
    programNames: names,
    history: history(),
    rivals,
    moves,
    lessons: [
      { text: "Learn from Silverline College's top post", detail: 'It reached 48,200 views.', checkKey: null, rivalId: 'silverline' },
      { text: 'Reply to every Google review', detail: 'Highfield University is ahead of you here.', checkKey: 'review_rating', rivalId: 'highfield' },
    ],
    lastRivalCheck: istDate('2026-09-28', 9).toISOString(),
    demand: { region: regionsFor(institution).city, rows: DEMAND, pulledAt: istDate('2026-09-28', 6).toISOString() },
    ...overrides,
  };
}

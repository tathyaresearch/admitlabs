// Test support only: a realistic report input without a database. Eastgate University's September
// Audit (5 programs) and two rivals' Audits come through the live path with mock providers (see
// src/sample/world.ts), with the month's Demand as the Demand page reads it; history, moves,
// lessons and Make these 3 are added by hand. Used by the report tests; the app never imports it.

import { findingsOf, recordFor, stored } from '../audit/testing.ts';
import type { HistoryRow } from '../audit/view.ts';
import type { PickedIdea } from '../demand/picks.ts';
import { istDate } from '../domain/dates.ts';
import { sampleDemandSignals } from '../sample/report.ts';
import { checkScoresOf, scoresOf } from '../sample/world.ts';
import type { ReportInput, ReportRival } from './data.ts';

function history(): HistoryRow[] {
  const scores = [59, 61, 69, 72, 72, 73];
  return ['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15'].map((day, index) => ({
    id: day === '2026-08-15' ? 'august' : `audit-${day}`,
    runAt: istDate(day, 10).toISOString(),
    scores: { overall: scores[index] as number, discovered: 70, trusted: 60, chosen: 70 + index },
  }));
}

function idea(title: string, programName: string, asked: number): PickedIdea {
  return {
    title,
    text: `${title} The brief.`,
    why: `Asked about ${asked} times in Guwahati this month. Your ${programName} page does not answer it yet.`,
    hook: 'A hook.',
    points: ['A point.'],
    format: 'reel',
    effort: 'medium',
    topic: 'placements',
    programName,
    programKey: programName.toLowerCase(),
    region: 'Guwahati',
    basedOn: 'Which colleges in Guwahati have real placements?',
    asked,
    askedOn: 'question',
    language: 'en',
    trend: null,
    trendWord: null,
    sourceUrl: 'https://quora.example/q',
    platform: 'quora',
    foundAt: '2026-09-28T00:30:00.000Z',
  };
}

/** Eastgate University in September 2026, on Paid, with 3 rivals (one not checked yet, from a nearby city), 7 moves, 2 lessons, Make these 3 and Demand. */
export async function sampleReportInput(overrides: Partial<ReportInput> = {}): Promise<ReportInput> {
  const [own, silverline, highfield, signals] = await Promise.all([
    recordFor('eastgate-university', '2026-09-15'),
    recordFor('silverline-college', '2026-09-01'),
    recordFor('highfield-university', '2026-09-01'),
    sampleDemandSignals('eastgate-university', '2026-09'),
  ]);
  const audit = stored(own.record, { previousAuditId: 'august' });
  audit.changes = { overall: 1, discovered: 0, trusted: 3, chosen: -1 };
  const rival = (id: string, name: string, sample: typeof silverline, scores: number[]): ReportRival => ({
    id,
    name,
    nearby: false,
    audit: { runAt: sample.record.run_at, scores: scoresOf(sample.record), checks: checkScoresOf(sample), findings: findingsOf(sample.record) },
    history: scores.map((overall, index) => ({ runAt: istDate(`2026-0${4 + index}-01`, 9).toISOString(), overall })),
  });
  const rivals: ReportRival[] = [
    rival('silverline', 'Silverline College', silverline, [70, 71, 73, 74, 74, silverline.record.overall]),
    rival('highfield', 'Highfield University', highfield, [52, 51, 50, 51, 52, highfield.record.overall]),
    { id: 'newcomer', name: 'Newcomer College', nearby: true, audit: null, history: [] },
  ];
  const moves = Array.from({ length: 7 }, (_, index) => ({
    rivalId: index % 2 ? 'highfield' : 'silverline',
    kind: 'new_page' as const,
    description: `Added page ${index + 1}.`,
    detectedAt: istDate(`2026-09-${String(3 + index * 3).padStart(2, '0')}`, 9).toISOString(),
  }));
  return {
    institution: { id: own.institution.id, name: own.institution.name, type: own.type, city: own.institution.city, state: own.institution.state, website: own.institution.website },
    tier: 'paid',
    month: '2026-09',
    madeAt: istDate('2026-10-01', 7),
    audit,
    findings: findingsOf(own.record),
    programNames: own.names,
    history: history(),
    yourChecks: checkScoresOf(own),
    rivals,
    line: 'This month, Silverline College is ahead on placement proof and Instagram.',
    moves,
    lessons: [
      { text: "Learn from Silverline College's top post", detail: 'It reached 48,200 views.', checkKey: null, rivalId: 'silverline', effort: 'medium', month: '2026-09' },
      { text: 'Reply to every Google review', detail: 'Highfield University is ahead of you here.', checkKey: 'review_rating', rivalId: 'highfield', effort: null, month: '2026-09' },
    ],
    lastRivalCheck: istDate('2026-09-28', 9).toISOString(),
    picks: [
      { month: '2026-09', rank: 1, idea: idea('Last year’s BBA placements, one student per reel', 'BBA', 91) },
      { month: '2026-09', rank: 2, idea: idea('Your nursing council recognition, with the link', 'B.Sc Nursing', 88) },
      { month: '2026-09', rank: 3, idea: idea('Three BCA graduates who got jobs without an MCA', 'BCA', 85) },
    ],
    demand: { place: 'Guwahati', signals },
    leads: null,
    ...overrides,
  };
}

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildReport, REPORT_LIMITS, type ReportData } from '../data.ts';
import { sampleReportInput } from '../testing.ts';
import { MAX_PAGES, pageCount, renderReport } from './render.ts';

// The PDF itself: a real render of the sample report, and of the heaviest month the caps allow.

function fonts(raw: string): string[] {
  return [...new Set([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/>]+)/g)].map((match) => match[1] as string))];
}

const long = (text: string, times: number) => Array.from({ length: times }, () => text).join(' ');

/** Every list at its cap, with long names and sentences everywhere. */
function heaviest(data: ReportData): ReportData {
  const fix = data.fixes[0] as ReportData['fixes'][number];
  const program = data.programs[0] as ReportData['programs'][number];
  const row = data.rivals?.rows[0] as NonNullable<ReportData['rivals']>['rows'][number];
  const move = data.rivals?.moves[0] as NonNullable<ReportData['rivals']>['moves'][number];
  const check = data.sources.checks[4] as ReportData['sources']['checks'][number];
  return {
    ...data,
    institution: { ...data.institution, name: 'Brahmaputra Valley Institute of Management and Technology' },
    fixes: [1, 2, 3, 4, 5].map((rank) => ({
      ...fix,
      rank,
      row: { ...fix.row, rank, name: 'Placement proof', programs: '4 programs' },
      results: [
        { program: 'B.Sc Data Analytics', result: 'missing' },
        { program: 'Hotel Management', result: 'weak' },
        { program: 'B.Sc Nursing', result: 'okay' },
        { program: 'Digital Marketing', result: 'okay' },
      ],
      finding: long('Admission information for B.Sc Data Analytics is general, with no clear steps.', 2),
      howToFix: long('Turn general admission information into numbered steps, with the documents needed and the dates.', 2),
    })),
    moreFixes: Array.from({ length: 12 }, (_, index) => ({ rank: index + 6, name: 'Students in content', programs: '5 programs', gain: 'Up to 2 points', difficulty: 'Medium' })),
    programs: Array.from({ length: REPORT_LIMITS.programs }, (_, index) => ({ ...program, name: `Hotel Management and Catering Technology with Culinary Arts ${index + 1}` })),
    morePrograms: 10,
    rivals: {
      verdict: long("You're ahead of Highfield University and Northbank College.", 2),
      rows: Array.from({ length: 7 }, (_, index) => ({ ...row, name: `Brahmaputra Valley Institute ${index + 1}`, rank: index + 1, you: index === 3 })),
      moves: Array.from({ length: 5 }, () => ({ ...move, text: long('Announced 2027 admission dates. Forms open on 5 January 2027.', 2) })),
      moreMoves: 4,
    },
    demand: data.demand && {
      ...data.demand,
      rising: data.demand.rising.map((trend, index) => ({ ...trend, text: `Hotel management careers on cruise lines and in resorts ${index + 1}` })),
      questions: data.demand.questions.map((question) => ({ ...question, text: long('Which data analytics course in Guwahati has placement support?', 2) })),
      ideas: data.demand.ideas.map((idea) => ({ ...idea, text: long('Share placement support in numbers: learners, interviews and offers.', 2), basedOn: 'Which data analytics course in Guwahati has placement support?' })),
    },
    things: data.things.map((thing) => ({ ...thing, title: long('Get found when students search for Data Analytics, Digital Marketing and Hotel Management', 1), detail: long('Could add up to 5 points. Give Data Analytics its own detailed page with the program name.', 3) })),
    sources: {
      checkedOn: null,
      notes: data.sources.notes.map((note) => ({ ...note, text: long(note.text, 2) })),
      checks: data.sources.checks.map((original) => ({ ...original, links: [`${check.links[0]} and 4 more`, 'maps.example/place/brahmaputra/reviews'] })),
    },
  };
}

describe('the monthly report PDF', () => {
  test('a valid A4 PDF of 7 pages, readable in 5 minutes', async () => {
    const pdf = await renderReport(buildReport(await sampleReportInput()));
    const raw = pdf.toString('latin1');
    assert.equal(raw.slice(0, 5), '%PDF-');
    assert.equal(pageCount(pdf), 7);
    assert.match(raw, /\/MediaBox\s*\[0 0 595\.28\d* 841\.89\d*\]/);
  });

  test('Bricolage Grotesque only, embedded in the file', async () => {
    const pdf = await renderReport(buildReport(await sampleReportInput({ tier: 'client' })));
    const raw = pdf.toString('latin1');
    const used = fonts(raw);
    assert.ok(used.length >= 5, used.join(', '));
    assert.ok(
      used.every((name) => name.startsWith('BricolageGrotesque')),
      used.join(', '),
    );
    assert.equal((raw.match(/\/FontFile2/g) ?? []).length, used.length, 'every font is embedded');
  });

  test(`the heaviest month still stays at ${MAX_PAGES} pages or fewer`, async () => {
    const pdf = await renderReport(heaviest(buildReport(await sampleReportInput())));
    assert.ok(pageCount(pdf) <= MAX_PAGES, `${pageCount(pdf)} pages`);
  });
});

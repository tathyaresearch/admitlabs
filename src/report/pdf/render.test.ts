import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildReport, REPORT_LIMITS, type ReportData } from '../data.ts';
import { PLACE_LIMITS } from '../places.ts';
import { sampleReportInput } from '../testing.ts';
import { MAX_PAGES, pageCount, renderLayout, renderReport } from './render.ts';

// The PDF itself: a real render of a month, and of the heaviest month the limits allow.

function fonts(raw: string): string[] {
  return [...new Set([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/>]+)/g)].map((match) => match[1] as string))];
}

const long = (text: string, times: number) => Array.from({ length: times }, () => text).join(' ');

/** Every list at its limit, with long names and sentences everywhere. */
function heaviest(data: ReportData): ReportData {
  const fix = data.fixes[0] as ReportData['fixes'][number];
  const place = data.places[0] as ReportData['places'][number];
  const item = (place.fixes[0] ?? place.good[0]) as ReportData['places'][number]['fixes'][number];
  const rivals = data.rivals as NonNullable<ReportData['rivals']>;
  const demand = data.demand as NonNullable<ReportData['demand']>;
  const longItem = { ...item, title: long('Get found when students search for Hotel Management and Data Analytics', 1), proof: item.proof && { ...item.proof, line: long('Admission information for B.Sc Data Analytics is general, with no clear steps.', 3) } };
  return {
    ...data,
    institution: { ...data.institution, name: 'Brahmaputra Valley Institute of Management and Technology' },
    summary: {
      ...data.summary,
      lines: {
        words: long('Trust is up from Weak in August.', 2),
        things: [1, 2, 3].map(() => long('Get found when students search for Data Analytics, Digital Marketing and Hotel Management', 1)),
        move: long('Silverline College: Announced 2027 admission dates. Forms open on 5 January 2027.', 2),
        enquiries: long('Your content brought 23 enquiries in September, 6 more than in August.', 2),
      },
    },
    places: data.places.map((entry) => ({ ...entry, good: Array.from({ length: PLACE_LIMITS.good }, () => longItem), fixes: Array.from({ length: PLACE_LIMITS.fixes }, () => longItem), moreGood: 4, moreFixes: 4 })),
    fixes: [1, 2, 3, 4, 5].map((rank) => ({
      ...fix,
      rank,
      title: 'Get found when students search for Hotel Management, B.Sc Data Analytics and Digital Marketing',
      programs: '4 programs',
      steps: Array.from({ length: PLACE_LIMITS.steps }, () => long('Turn general admission information into numbered steps, with the documents needed and the dates.', 2)),
      moreSteps: 6,
      readyFix: { title: 'How to apply for B.Sc Data Analytics', lines: [], table: { head: ['Step', 'What to do', 'When'], rows: [1, 2, 3].map((step) => [String(step), long('Fill the form online with every document', 2), '[date] to [date]']) }, outline: [], more: 4 },
      added: { lines: ['Admissions: +91 00000 12345, admissions@brahmaputra-valley.example'], advice: long('Put this admissions contact on every page, next to the enquiry form.', 2) },
    })),
    moreFixes: Array.from({ length: REPORT_LIMITS.moreFixes }, (_, index) => ({ rank: index + 6, title: 'Give Hotel Management, B.Sc Data Analytics and Digital Marketing each a page of its own', where: 'Website, Program pages', checkKey: 'program_page', impact: 'low', effort: 'Effort Medium' })),
    moreFixesCount: 9,
    rivals: {
      ...rivals,
      line: long('This month, Silverline College is ahead on placement proof and Instagram.', 2),
      ranking: Array.from({ length: 6 }, (_, index) => ({ ...(rivals.ranking[0] as (typeof rivals.ranking)[number]), name: `Brahmaputra Valley Institute ${index + 1}`, place: index + 1, you: index === 3, nearby: index === 5 })),
      places: rivals.places.map((entry) => ({ ...entry, cells: Array.from({ length: 6 }, () => ({ word: 'Okay' as const, share: 0.5, leads: false, note: long('1 good, no complaints, 1 unanswered', 2) })) })),
      moves: Array.from({ length: REPORT_LIMITS.moves }, () => ({ ...(rivals.moves[0] as (typeof rivals.moves)[number]), text: long('Announced 2027 admission dates. Forms open on 5 January 2027.', 2) })),
      moreMoves: 6,
    },
    demand: {
      ...demand,
      trends: Array.from({ length: REPORT_LIMITS.trends }, (_, index) => ({ ...(demand.trends[0] as (typeof demand.trends)[number]), text: `Hotel management careers on cruise lines and in resorts ${index + 1}` })),
      questions: Array.from({ length: REPORT_LIMITS.questions }, () => ({ ...(demand.questions[0] as (typeof demand.questions)[number]), text: long('Which data analytics course in Guwahati has placement support?', 2) })),
      picks: demand.picks.map((pick) => ({ ...pick, title: long('Last year’s placements, one student per reel, with the company', 2), weight: long('Asked about 96 times in Guwahati this month.', 2) })),
    },
    leads: { line: long('Your content brought 23 enquiries in September, 6 more than in August.', 2), total: 23, links: Array.from({ length: REPORT_LIMITS.leadLinks }, (_, index) => ({ name: `Reel: Data Analytics placements ${index + 1}`, count: 4, before: 3 })), moreLinks: 3 },
    sources: data.sources.map((note) => ({ ...note, text: long(note.text, 2) })),
  };
}

describe('the monthly report PDF', () => {
  test(`a valid A4 PDF, about 7 pages and never more than ${MAX_PAGES}`, async () => {
    const pdf = await renderReport(buildReport(await sampleReportInput()));
    const raw = pdf.toString('latin1');
    assert.equal(raw.slice(0, 5), '%PDF-');
    assert.ok(pageCount(pdf) >= 6 && pageCount(pdf) <= MAX_PAGES, `${pageCount(pdf)} pages`);
    assert.match(raw, /\/MediaBox\s*\[0 0 595\.28\d* 841\.89\d*\]/);
  });

  test('words in Bricolage Grotesque, numbers in Inter, both embedded in the file', async () => {
    const pdf = await renderReport(buildReport(await sampleReportInput({ tier: 'client', leads: [{ name: 'Instagram bio', count: 6, before: 5 }] })));
    const raw = pdf.toString('latin1');
    const used = fonts(raw);
    assert.ok(used.length >= 4, used.join(', '));
    assert.ok(
      used.every((name) => name.startsWith('BricolageGrotesque') || name.startsWith('Inter')),
      used.join(', '),
    );
    assert.ok(used.some((name) => name.startsWith('Inter')), `numbers in Inter: ${used.join(', ')}`);
    assert.equal((raw.match(/\/FontFile2/g) ?? []).length, used.length, 'every font is embedded');
  });

  test(`the heaviest month still stays at ${MAX_PAGES} pages or fewer, in its compact form`, async () => {
    const data = heaviest(buildReport(await sampleReportInput({ tier: 'client' })));
    const pdf = await renderReport(data);
    assert.ok(pageCount(pdf) <= MAX_PAGES, `${pageCount(pdf)} pages`);
    // The full form runs over, so the compact one is the one kept.
    assert.ok(pageCount(await renderLayout(data, false)) >= pageCount(pdf));
  });
});

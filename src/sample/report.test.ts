import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { buildReport, reportTexts, SAMPLE_REPORT_NOTE } from '../report/data.ts';
import { MAX_PAGES, pageCount, renderReport } from '../report/pdf/render.ts';
import { sampleReportInput as testInput } from '../report/testing.ts';
import { SAMPLE_REPORT, sampleReportData, sampleReportInput } from './report.ts';

// The sample report the product page offers: a real report from the sample world, marked as a
// sample on the cover and every page.

describe('the sample report', () => {
  test("Eastgate University's August 2026 report, made on 1 September", async () => {
    const input = await sampleReportInput();
    assert.equal(SAMPLE_REPORT.slug, 'eastgate-university');
    assert.equal(input.month, '2026-08');
    assert.equal(input.madeAt.toISOString(), '2026-09-01T01:30:00.000Z');
    assert.equal(input.tier, 'paid');
    assert.equal(input.audit.runAt.slice(0, 10), '2026-08-15');
    assert.deepEqual(
      input.history.map((row) => row.scores.overall),
      [59, 61, 69, 72, 73],
    );
    assert.equal(input.rivals.length, 3);
    assert.ok(input.moves.every((move) => move.detectedAt >= '2026-07-31T18:30:00.000Z' && move.detectedAt < '2026-08-31T18:30:00.000Z'));
    assert.equal(input.lessons.length, 3);
    assert.equal(input.lastRivalCheck, '2026-08-31T03:30:00.000Z', 'the Monday check on 31 August');
    assert.equal(input.demand.region.region, 'Guwahati');
  });

  test('marked "Sample report. Fictional data." and nothing else changes', async () => {
    const data = await sampleReportData();
    assert.equal(data.sample, SAMPLE_REPORT_NOTE);
    assert.equal(SAMPLE_REPORT_NOTE, 'Sample report. Fictional data.');
    assert.equal(data.cover.score, 73);
    assert.equal(data.cover.change, 'Up 1 since July');
    assert.equal(data.things.length, 3);
    for (const text of reportTexts(data)) assert.equal(hasDashes(text), false, text);
    const real = buildReport(await testInput());
    assert.equal(real.sample, null, 'a real report never says it is a sample');
  });

  test(`a valid PDF of ${MAX_PAGES} pages or fewer, in Bricolage Grotesque only`, async () => {
    const pdf = await renderReport(await sampleReportData());
    const raw = pdf.toString('latin1');
    assert.equal(raw.slice(0, 5), '%PDF-');
    assert.ok(pageCount(pdf) <= MAX_PAGES, `${pageCount(pdf)} pages`);
    const fonts = [...new Set([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/>]+)/g)].map((match) => match[1] as string))];
    assert.ok(fonts.length > 0 && fonts.every((name) => name.startsWith('BricolageGrotesque')), fonts.join(', '));
  });
});

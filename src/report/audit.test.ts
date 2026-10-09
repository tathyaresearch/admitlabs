import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ADMITLABS_EMAIL } from '../config/team.ts';
import { hasDashes } from '../domain/copy.ts';
import { sampleShared } from '../team/testing.ts';
import { buildAuditPdf } from './audit.ts';
import { reportTexts } from './data.ts';
import { renderAuditPdf } from './pdf/audit.ts';
import { MAX_PAGES, pageCount } from './pdf/render.ts';

// The shared Audit as a PDF (spec section 13): the same content as the shared page, place by place
// with the three words, from what a live link returns. Riverbend College (a college) and Cedar Skill
// Institute (a skilling institute).

const OPTIONS = { madeAt: new Date('2026-10-01T06:30:00Z'), freeAuditUrl: 'http://localhost:3000/signup' };
const SAMPLES = [
  ['riverbend-college', 'college'],
  ['cedar-skill-institute', 'skilling institute'],
] as const;

function fonts(raw: string): string[] {
  return [...new Set([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/>]+)/g)].map((match) => match[1] as string))];
}

describe('what goes into the shared Audit PDF', () => {
  for (const [slug, type] of SAMPLES) {
    test(`the three words, the top 3 fixes in full and the rest by name, in one ranking (${type})`, async () => {
      const data = buildAuditPdf(await sampleShared(slug), OPTIONS);
      assert.deepEqual(
        data.words.map((word) => word.name),
        ['Discovered', 'Trusted', 'Chosen'],
      );
      assert.deepEqual(
        data.topFixes.map((fix) => fix.rank),
        [1, 2, 3],
      );
      assert.ok(data.topFixes.every((fix) => fix.steps.length > 0 && fix.found.length > 0 && fix.why), 'how to fix, what was found and why, for the top 3');
      assert.ok(data.moreFixes.length > 0);
      assert.deepEqual(
        data.moreFixes.map((fix) => fix.rank),
        data.moreFixes.map((_, index) => index + 4),
        'the rest of the ranked list, in order',
      );
    });

    test(`each place, with what's good and what to fix, each with its source and date (${type})`, async () => {
      const data = buildAuditPdf(await sampleShared(slug), OPTIONS);
      assert.deepEqual(
        data.places.map((place) => place.name),
        ['Website', 'Google', 'Social media', 'What people say', 'Other places'],
      );
      const scored = data.places.filter((place) => place.scored).flatMap((place) => [...place.good, ...place.fixes]);
      assert.ok(scored.length > 0);
      assert.ok(scored.every((item) => item.proof?.source && item.proof.date === '18 Sep 2026'));
    });
  }

  test('ends with the AdmitLabs line and the free Audit', async () => {
    const data = buildAuditPdf(await sampleShared(), OPTIONS);
    assert.deepEqual(data.closing, { text: 'Want AdmitLabs to fix this for you?', email: ADMITLABS_EMAIL, freeAudit: 'Get your free Audit at localhost:3000/signup' });
    assert.equal(ADMITLABS_EMAIL, 'hello@admitlabs.in');
    assert.equal(data.monthLabel, 'Audit of 18 Sep 2026');
    assert.equal(data.sharedOn, '19 Sep 2026');
  });

  test('no dashes, and curly quotes only', async () => {
    for (const [slug] of SAMPLES) {
      for (const text of reportTexts(buildAuditPdf(await sampleShared(slug), OPTIONS))) {
        assert.equal(hasDashes(text), false, text);
        assert.doesNotMatch(text, /["']/, text);
      }
    }
  });
});

describe('the shared Audit PDF file', () => {
  for (const [slug, type] of SAMPLES) {
    test(`a valid A4 PDF of ${MAX_PAGES} pages or fewer, words in Bricolage Grotesque and numbers in Inter (${type})`, async () => {
      const pdf = await renderAuditPdf(buildAuditPdf(await sampleShared(slug), OPTIONS));
      const raw = pdf.toString('latin1');
      assert.equal(raw.slice(0, 5), '%PDF-');
      assert.ok(pageCount(pdf) <= MAX_PAGES, `${pageCount(pdf)} pages`);
      assert.match(raw, /\/MediaBox\s*\[0 0 595\.28\d* 841\.89\d*\]/);
      const used = fonts(raw);
      assert.ok(used.every((name) => name.startsWith('BricolageGrotesque') || name.startsWith('Inter')), used.join(', '));
      assert.ok(used.some((name) => name.startsWith('BricolageGrotesque')) && used.some((name) => name.startsWith('Inter')), used.join(', '));
      assert.equal((raw.match(/\/FontFile2/g) ?? []).length, used.length, 'every font is embedded');
    });
  }
});

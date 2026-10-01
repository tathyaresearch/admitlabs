import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ADMITLABS_EMAIL } from '../config/team.ts';
import { hasDashes } from '../domain/copy.ts';
import { ADMITLABS_CAN_FIX } from '../team/share.ts';
import { sampleShared } from '../team/testing.ts';
import { buildAuditPdf, TOP_FIX_NOTE } from './audit.ts';
import { reportTexts } from './data.ts';
import { renderAuditPdf } from './pdf/audit.ts';
import { MAX_PAGES, pageCount } from './pdf/render.ts';

// The shared Audit as a PDF (Phase 6): the same content as the shared page, from what a live link
// returns. Riverbend College (a college) and Cedar Skill Institute (a skilling institute).

const OPTIONS = { madeAt: new Date('2026-10-01T06:30:00Z'), freeAuditUrl: 'http://localhost:3000/login' };
const SAMPLES = [
  ['riverbend-college', 'college'],
  ['cedar-skill-institute', 'skilling institute'],
] as const;

function fonts(raw: string): string[] {
  return [...new Set([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/>]+)/g)].map((match) => match[1] as string))];
}

describe('what goes into the shared Audit PDF', () => {
  for (const [slug, type] of SAMPLES) {
    test(`how to fix for the top 3 fixes only; the rest say AdmitLabs can fix it (${type})`, async () => {
      const data = buildAuditPdf(await sampleShared(slug), OPTIONS);
      assert.deepEqual(
        data.topFixes.map((fix) => fix.rank),
        [1, 2, 3],
      );
      assert.ok(data.topFixes.every((fix) => fix.howToFix && fix.difficulty));
      assert.ok(data.moreFixes.length > 0);
      assert.ok(data.moreFixes.every((fix) => fix.howToFix === null && fix.difficulty === null));
      assert.deepEqual(
        data.moreFixes.map((fix) => fix.rank),
        data.moreFixes.map((_, index) => index + 4),
        'the rest of the ranked list, in order',
      );
    });

    test(`every check with its result, what was found, the source and the date (${type})`, async () => {
      const shared = await sampleShared(slug);
      const data = buildAuditPdf(shared, OPTIONS);
      const parts = data.checks.flatMap((area) => area.checks.flatMap((check) => check.parts));
      assert.equal(parts.length, shared.audit.checks.length);
      assert.ok(parts.every((part) => part.result && part.finding && part.source && part.checkedOn === '18 Sep 2026'));
      const notes = data.checks.flatMap((area) => area.checks.map((check) => check.note));
      assert.equal(notes.filter((note) => note === TOP_FIX_NOTE).length, 3);
      assert.equal(notes.filter((note) => note === ADMITLABS_CAN_FIX).length, data.moreFixes.length);
    });
  }

  test('ends with the AdmitLabs line and the free Audit', async () => {
    const data = buildAuditPdf(await sampleShared(), OPTIONS);
    assert.deepEqual(data.closing, { text: 'Want AdmitLabs to fix this for you?', email: ADMITLABS_EMAIL, freeAudit: 'Get your free Audit at localhost:3000/login' });
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

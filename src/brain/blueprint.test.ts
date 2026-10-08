import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BRAIN_RULES } from '../config/brain.ts';
import { samplePdf } from '../sample/blueprint-pdf.ts';
import { SAMPLE_BLUEPRINTS } from '../sample/blueprints.ts';
import { blueprintFacts, matchQuestion, questionTags, type AskFact } from './ask.ts';
import { blueprintReplyEmail } from './blueprint-email.ts';
import { afterReadySteps, blueprintProblem, blueprintStale, blueprintWord, fileSize, latestBlueprint, readableBlueprint, type BlueprintVersion } from './blueprint.ts';
import { changeLines, type ChangeRow } from './history.ts';
import { BRAIN_SECTIONS, FACT_SECTIONS, SECTION_INFO } from './model.ts';
import { extractPdfText } from './pdf-text.ts';

const version = (extra: Partial<BlueprintVersion>): BlueprintVersion => ({
  id: `b-${extra.version ?? 1}`,
  version: 1,
  fileName: 'Blueprint.pdf',
  sizeBytes: 2048,
  status: 'draft',
  uploadedAt: '2026-10-05T05:30:00.000Z',
  uploadedBy: 'u-kabir',
  sharedAt: null,
  sharedBy: null,
  approvedAt: null,
  approvedBy: null,
  changesNote: null,
  changesAt: null,
  changesBy: null,
  text: null,
  ...extra,
});

const DAY = 24 * 60 * 60 * 1000;
const MIGRATION = readFileSync(new URL('../../supabase/migrations/20261026120100_blueprints.sql', import.meta.url), 'utf8');

describe('the Blueprint', () => {
  test('comes first in the Brain, and is not a section of facts', () => {
    assert.equal(BRAIN_SECTIONS[0], 'blueprint');
    assert.equal(SECTION_INFO.blueprint.name, 'Blueprint');
    assert.ok(!(FACT_SECTIONS as readonly string[]).includes('blueprint'));
    assert.equal(FACT_SECTIONS.length, BRAIN_SECTIONS.length - 1);
  });

  test('the latest version is the highest number, whatever the order', () => {
    const versions = [version({ version: 2 }), version({ version: 3 }), version({ version: 1 })];
    assert.equal(latestBlueprint(versions)?.version, 3);
    assert.equal(latestBlueprint([]), null);
  });

  test('the Clients list says None, Draft, Shared or Approved', () => {
    assert.equal(blueprintWord(null), 'None');
    assert.equal(blueprintWord({ status: 'draft' }), 'Draft');
    assert.equal(blueprintWord({ status: 'shared' }), 'Shared');
    assert.equal(blueprintWord({ status: 'approved' }), 'Approved');
  });

  test('needs checking when the latest version is older than 90 days', () => {
    const latest = version({ uploadedAt: '2026-07-01T05:30:00.000Z' });
    const uploaded = new Date(latest.uploadedAt).getTime();
    assert.equal(BRAIN_RULES.blueprint.checkDays, 90);
    assert.equal(blueprintStale(latest, new Date(uploaded + 90 * DAY)), false);
    assert.equal(blueprintStale(latest, new Date(uploaded + 90 * DAY + 60 * 1000)), true);
    assert.equal(blueprintStale(null, new Date()), false);
  });

  test('Ask the brain reads the latest Shared or Approved version, never a Draft', () => {
    const versions = [version({ version: 1, status: 'approved' }), version({ version: 2, status: 'shared' }), version({ version: 3, status: 'draft' })];
    assert.equal(readableBlueprint(versions)?.version, 2);
    assert.equal(readableBlueprint([version({ status: 'draft' })]), null);
  });

  test('after Ready: shared, then approved; a newer shared version waits for its own approval', () => {
    assert.deepEqual(
      afterReadySteps([]).map((step) => [step.name, step.done]),
      [
        ['Blueprint shared', false],
        ['Blueprint approved', false],
      ],
    );
    const shared = version({ version: 1, status: 'shared', sharedAt: '2026-10-06T06:30:00.000Z' });
    assert.deepEqual(
      afterReadySteps([shared]).map((step) => [step.done, step.at]),
      [
        [true, '2026-10-06T06:30:00.000Z'],
        [false, null],
      ],
    );
    const approved = { ...shared, status: 'approved' as const, approvedAt: '2026-10-07T09:30:00.000Z', approvedBy: 'u-ritu' };
    assert.equal(afterReadySteps([approved])[1]?.done, true);
    assert.equal(afterReadySteps([approved])[1]?.at, '2026-10-07T09:30:00.000Z');
    assert.equal(afterReadySteps([approved, version({ version: 2, status: 'shared', sharedAt: '2026-10-08T06:30:00.000Z' })])[1]?.done, false);
    // A Draft in the works changes neither step.
    assert.equal(afterReadySteps([approved, version({ version: 2 })])[1]?.done, true);
  });

  test('a PDF up to 20 MB, as the bucket and the database say', () => {
    const limit = BRAIN_RULES.blueprint.maxMb * 1024 * 1024;
    assert.equal(blueprintProblem('application/pdf', 1), null);
    assert.equal(blueprintProblem('application/pdf', limit), null);
    assert.equal(blueprintProblem('application/pdf', limit + 1), 'Keep it under 20 MB.');
    assert.equal(blueprintProblem('application/pdf', 0), 'That file is empty.');
    assert.equal(blueprintProblem('image/png', 100), 'Upload a PDF.');
    assert.ok(MIGRATION.includes(`'${BRAIN_RULES.blueprint.bucket}', '${BRAIN_RULES.blueprint.bucket}', false, ${limit}, array['${BRAIN_RULES.blueprint.type}']`));
    assert.ok(MIGRATION.includes(`size_bytes between 1 and ${limit}`));
    assert.ok(MIGRATION.includes(`v_size > ${limit}`));
    assert.ok(MIGRATION.includes(`char_length(text) <= ${BRAIN_RULES.blueprint.textMax}`));
    assert.ok(MIGRATION.includes(`''), ${BRAIN_RULES.blueprint.textMax})`));
    assert.ok(MIGRATION.includes(`between 1 and ${BRAIN_RULES.blueprint.noteMax}`));
  });

  test('sizes in KB and MB', () => {
    assert.equal(fileSize(100), '1 KB');
    assert.equal(fileSize(2353), '2 KB');
    assert.equal(fileSize(1024 * 1024), '1 MB');
    assert.equal(fileSize(9.46 * 1024 * 1024), '9.5 MB');
  });
});

describe('reading a PDF (the mock reader)', () => {
  test('the sample PDF reads back, line by line, brackets and backslashes too', () => {
    const pdf = samplePdf([
      { title: 'A plan', lines: ['Fees (from 2027) stay the same.', 'A path like C:\\plans stays as it is.'] },
      { title: 'Page two', lines: ['One more line.'] },
    ]);
    assert.equal(Buffer.from(pdf.slice(0, 8)).toString('latin1'), '%PDF-1.4');
    assert.equal(extractPdfText(pdf), ['A plan', 'Fees (from 2027) stay the same.', 'A path like C:\\plans stays as it is.', 'Page two', 'One more line.'].join('\n'));
  });

  test('a TJ array joins its parts; a PDF with no plain text says so', () => {
    const latin = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
    assert.equal(extractPdfText(latin('%PDF-1.4\n1 0 obj\n<< /Length 30 >>\nstream\nBT [(Hel) -20 (lo)] TJ ET\nendstream\nendobj\n')), 'Hello');
    assert.equal(extractPdfText(latin('%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\nx\u009c\u00cb\u00480\nendstream\nendobj\n')), null);
    assert.equal(extractPdfText(new Uint8Array()), null);
  });

  test('the sample Blueprints: plain ASCII with no dashes, read back whole', () => {
    for (const sample of SAMPLE_BLUEPRINTS) {
      const lines = sample.pages.flatMap((page) => [page.title, ...page.lines]);
      for (const line of lines) {
        assert.ok(/^[\x20-\x7e]+$/.test(line), line);
        assert.ok(!/[\u2013\u2014]/.test(line), line);
      }
      assert.equal(extractPdfText(samplePdf(sample.pages)), lines.join('\n'));
    }
    const brightpath = SAMPLE_BLUEPRINTS.filter((sample) => sample.slug === 'brightpath-skills');
    assert.deepEqual(
      brightpath.map((sample) => [sample.version, Boolean(sample.shared), Boolean(sample.approved)]),
      [
        [1, true, true],
        [2, true, false],
      ],
    );
    assert.ok(!SAMPLE_BLUEPRINTS.some((sample) => sample.slug === 'silverline-college'));
  });
});

describe('Ask the brain and the Blueprint', () => {
  const text = SAMPLE_BLUEPRINTS[1]?.pages.flatMap((page) => [page.title, ...page.lines]).join('\n') ?? '';
  const facts = blueprintFacts({ id: 'b-2', version: 2, text });
  const goals: AskFact = {
    key: 'item:goals',
    section: 'basics',
    where: 'Basics, Goals',
    answer: 'Fill the January Digital Marketing batch by December.',
    tags: ['goals'],
    program: null,
    stamp: 'item:goals',
    teamOnly: false,
  };

  test('each line of 12 characters or more is a fact, from the version, never team only', () => {
    assert.equal(facts.length, text.split('\n').filter((line) => line.length >= 12).length);
    assert.ok(facts.every((fact) => fact.section === 'blueprint' && fact.stamp === 'blueprint:b-2' && !fact.teamOnly && fact.tags[0] === 'blueprint'));
    assert.ok(facts[0]?.where.includes('version 2'));
    assert.deepEqual(blueprintFacts({ id: 'b', version: 1, text: null }), []);
    assert.deepEqual(blueprintFacts({ id: 'b', version: 1, text: 'Short.\n\nTiny' }), []);
  });

  test('a question about the Blueprint is answered from it', () => {
    assert.deepEqual(questionTags('What does our strategy say?'), ['blueprint']);
    const answer = matchQuestion('What does the blueprint say about Hotel Management?', [goals, ...facts]);
    assert.ok(answer.facts.length >= 1);
    assert.ok(answer.facts.every((fact) => fact.section === 'blueprint'));
    assert.match(answer.facts[0]?.answer ?? '', /Hotel Management/);
  });

  test('otherwise the Brain’s own facts come first', () => {
    const answer = matchQuestion('What are our goals?', [...facts, goals]);
    assert.equal(answer.facts[0]?.key, 'item:goals');
  });
});

describe('the Blueprint in History', () => {
  const context = { people: new Map([['u-ritu', { name: 'Ritu Bora', email: null, team: false }]]), programs: [], institutionType: 'skilling' as const };
  const row = (what: ChangeRow['what'], after: unknown, teamOnly = false): ChangeRow => ({ id: 'c', at: '2026-10-06T06:30:00.000Z', by: 'u-ritu', what, target: 'blueprint:b-2', kind: 'blueprint', field: null, before: null, after, teamOnly });
  const about = { version: 2, file_name: 'Plan.pdf', status: 'shared' };

  test('uploaded, shared, approved, changes asked for and back to Draft', () => {
    const text = (what: ChangeRow['what'], after: unknown) => changeLines(row(what, after), context)[0]?.text;
    assert.equal(text('added', { ...about, status: 'draft' }), 'Uploaded the Blueprint, version 2 (Plan.pdf)');
    assert.equal(text('shared', about), 'Shared the Blueprint, version 2, with the college');
    assert.equal(text('approved', { ...about, status: 'approved' }), 'Approved the Blueprint, version 2');
    assert.equal(text('changes_asked', { ...about, note: 'Add the January open days.' }), 'Asked for changes to the Blueprint, version 2: Add the January open days.');
    assert.equal(text('changed', { ...about, status: 'draft' }), 'Moved the Blueprint, version 2, back to Draft');
    const [line] = changeLines(row('added', about, true), context);
    assert.equal(line?.section, 'blueprint');
    assert.equal(line?.teamOnly, true);
    assert.equal(line?.who, 'Ritu Bora');
  });
});

describe('the email when a college answers', () => {
  const input = { college: 'Brightpath Skills Academy', version: 2, fileName: 'Plan.pdf', who: 'Ritu Bora', at: '2026-10-07T09:30:00.000Z', url: 'http://localhost:3000/team/institutions/x/brain?section=blueprint' };

  test('approved: who, which version, and a button to the Blueprint', () => {
    const email = blueprintReplyEmail({ ...input, kind: 'approved', note: null }, ['manager@admitlabs.example']);
    assert.equal(email.kind, 'blueprint_reply');
    assert.deepEqual(email.to, ['manager@admitlabs.example']);
    assert.equal(email.subject, 'Brightpath Skills Academy approved the Blueprint, version 2');
    assert.match(email.text, /Ritu Bora approved the Blueprint, version 2, for Brightpath Skills Academy\./);
    assert.ok(email.html.includes(input.url));
  });

  test('changes asked for: the note, and what to do next', () => {
    const email = blueprintReplyEmail({ ...input, kind: 'changes', note: 'Add the January open days.' }, ['admin@admitlabs.example']);
    assert.equal(email.subject, 'Brightpath Skills Academy asked for changes to the Blueprint, version 2');
    assert.match(email.text, /Their note: Add the January open days\./);
    assert.match(email.text, /Upload the next version/);
    for (const part of [email.subject, email.text, email.html]) assert.ok(!/[\u2013\u2014]/.test(part));
  });
});

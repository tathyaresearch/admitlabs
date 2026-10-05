import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { WordView } from '../audit/places.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { summaryEmail } from './summary-email.ts';
import {
  buildSummary,
  enquiriesLine,
  moveLine,
  parseSummary,
  summaryLine,
  summarySubject,
  summaryTargets,
  thingLine,
  thingMeta,
  wordsLine,
  type MonthlySummary,
} from './summary.ts';
import { fixThing, pickThing } from './things.ts';
import type { FixView } from '../audit/places.ts';

// The monthly summary (spec section 24): how you're doing, the 3 things, one rival move and a
// Client's enquiries, kept with the report and sent by email.

function word(pillar: WordView['pillar'], name: string, value: WordView['word'], score: number, moved: string | null = null): WordView {
  return { pillar, name, question: `${name}?`, word: value, score, fixFirst: null, moved };
}

const WORDS = [word('discovered', 'Visibility', 'Strong', 75), word('trusted', 'Trust', 'Okay', 62, 'Up from Weak in August'), word('chosen', 'Chosen', 'Strong', 74)];

const FIX: FixView = {
  id: 'check:fees_shown',
  kind: 'check',
  rank: 1,
  title: 'Show your full BBA fees',
  place: 'website',
  label: 'Fees',
  checkKey: 'fees_shown',
  findingKey: null,
  findingKind: null,
  impact: 'high',
  effort: 'easy',
  programs: ['BBA'],
  results: [],
  found: [],
  why: null,
  advice: [],
  readyFix: null,
  open: true,
};

const SUMMARY: MonthlySummary = buildSummary({
  month: '2026-09',
  words: WORDS,
  firstAudit: false,
  previousRunAt: istDate('2026-08-15', 10).toISOString(),
  things: [
    fixThing(FIX),
    pickThing({
      month: '2026-09',
      rank: 1,
      idea: {
        title: 'Last year’s BBA placements, one student per reel',
        text: 'Brief.',
        why: 'Asked about 91 times in Guwahati this month. Not answered yet.',
        hook: '',
        points: [],
        format: 'reel',
        effort: 'medium',
        topic: 'placements',
        programName: 'BBA',
        programKey: 'bba',
        region: 'Guwahati',
        basedOn: null,
        asked: 91,
        askedOn: 'question',
        language: 'en',
        trend: null,
        trendWord: null,
        sourceUrl: 'https://quora.example/q',
        platform: 'quora',
        foundAt: '2026-09-28T00:30:00.000Z',
      },
    }),
  ],
  move: { rival: 'Silverline College', description: 'Announced 2027 admission dates.', detectedAt: istDate('2026-09-20', 9).toISOString() },
  hasRivals: true,
  leads: { count: 23, before: 17, top: { name: 'Reel: Data Analytics placements', count: 11 } },
});

describe('the monthly summary', () => {
  test('how you are doing: the words that moved, or that none did, or the first Audit', () => {
    assert.equal(wordsLine(WORDS, { firstAudit: false, previousRunAt: '2026-08-15T04:30:00.000Z' }), 'Trust is up from Weak in August, now 62/100 (Okay).');
    const held = WORDS.map((entry) => ({ ...entry, moved: null }));
    assert.equal(wordsLine(held, { firstAudit: false, previousRunAt: '2026-08-15T04:30:00.000Z' }), 'No word moved since August: Visibility 75/100 (Strong), Trust 62/100 (Okay) and Chosen 74/100 (Strong).');
    assert.equal(wordsLine(held, { firstAudit: true, previousRunAt: null }), 'Your first Audit: Visibility 75/100 (Strong), Trust 62/100 (Okay) and Chosen 74/100 (Strong).');
    assert.deepEqual(
      SUMMARY.words.map((entry) => entry.note),
      ['Visibility?', 'Up from Weak in August', 'Chosen?'],
    );
  });

  test('each thing with where it comes from and its small label', () => {
    assert.deepEqual(SUMMARY.lines.things, ['Show your full BBA fees', 'Last year’s BBA placements, one student per reel']);
    assert.equal(thingMeta(fixThing(FIX)), 'Website · Fees · Impact High · Effort Quick');
    assert.equal(thingLine(SUMMARY.things[0] as MonthlySummary['things'][number]), 'From your Audit · Website · Fees · Impact High · Effort Quick');
    assert.equal(thingLine(SUMMARY.things[1] as MonthlySummary['things'][number]), 'Make these 3 · Reel · BBA · Asked about 91 times in Guwahati this month.');
    assert.equal(thingLine({ source: 'rivals', meta: 'Learned from Silverline College · Effort Medium' }), 'Learned from Silverline College · Effort Medium');
  });

  test('one rival move, or what to expect without one', () => {
    assert.equal(SUMMARY.lines.move, 'Silverline College: Announced 2027 admission dates.');
    assert.equal(moveLine(null, { month: '2026-09', hasRivals: true }), 'No rival moves found in September. Drishti checks their public pages every week.');
    assert.equal(moveLine(null, { month: '2026-09', hasRivals: false }), 'Pick 3 to 5 rivals in Drishti, and their moves show here.');
  });

  test('a Client’s enquiries: more, the same, fewer, none, and the first month', () => {
    assert.equal(SUMMARY.lines.enquiries, 'Your content brought 23 enquiries in September, 6 more than in August. Most came from Reel: Data Analytics placements.');
    assert.equal(enquiriesLine({ count: 17, before: 17, top: null }, '2026-09'), 'Your content brought 17 enquiries in September, the same as in August.');
    assert.equal(enquiriesLine({ count: 12, before: 17, top: null }, '2026-09'), 'Your content brought 12 enquiries in September. August had 17.');
    assert.equal(enquiriesLine({ count: 1, before: 0, top: { name: 'Instagram bio', count: 1 } }, '2026-01'), 'Your content brought 1 enquiry in January. Most came from Instagram bio.');
    assert.equal(enquiriesLine({ count: 0, before: 4, top: null }, '2026-09'), 'No enquiries came in through your links in September. August had 4.');
    assert.equal(enquiriesLine({ count: 0, before: null, top: null }, '2026-09'), 'No enquiries came in through your links in September.');
  });

  test('the lines a review can fix, read back by their names; Paid has no enquiries line', () => {
    assert.deepEqual(summaryTargets(SUMMARY), ['words', 'things.1', 'things.2', 'move', 'enquiries']);
    assert.equal(summaryLine(SUMMARY, 'things.2'), 'Last year’s BBA placements, one student per reel');
    assert.equal(summaryLine(SUMMARY, 'things.3'), null);
    const paid = { ...SUMMARY, lines: { ...SUMMARY.lines, enquiries: null } };
    assert.deepEqual(summaryTargets(paid), ['words', 'things.1', 'things.2', 'move']);
  });

  test('kept as JSON and read back the same; anything else is not a summary', () => {
    assert.deepEqual(parseSummary(JSON.parse(JSON.stringify(SUMMARY))), SUMMARY);
    assert.equal(parseSummary(null), null);
    assert.equal(parseSummary({ ...SUMMARY, month: 'September' }), null);
    assert.equal(parseSummary({ ...SUMMARY, words: [{ pillar: 'discovered', name: 'Visibility', word: 'Great', note: '' }] }), null);
    assert.equal(parseSummary({ ...SUMMARY, things: [{ source: 'somewhere', meta: '' }] }), null);
  });

  test('the subject says the month and the three words', () => {
    assert.equal(summarySubject(SUMMARY), 'Your September: Visibility 75/100 (Strong), Trust 62/100 (Okay), Chosen 74/100 (Strong)');
    // A summary kept before the numbers showed still reads, with its words alone.
    const old = parseSummary({ ...SUMMARY, words: SUMMARY.words.map((word) => ({ pillar: word.pillar, name: word.name, word: word.word, note: word.note })) });
    assert.ok(old);
    assert.equal(summarySubject(old), 'Your September: Visibility Strong, Trust Okay, Chosen Strong');
  });

  test('no dashes in any line', () => {
    for (const text of [SUMMARY.lines.words, ...SUMMARY.lines.things, SUMMARY.lines.move, SUMMARY.lines.enquiries ?? '', ...SUMMARY.things.map((thing) => thing.meta)]) {
      assert.equal(hasDashes(text), false, text);
    }
  });
});

describe('the monthly summary by email', () => {
  const email = summaryEmail({ summary: SUMMARY, institution: 'Brightpath <Skills>', dashboardUrl: 'http://localhost:3000/', pdfUrl: 'http://localhost:3000/reports/2026-09' }, ['owner@brightpath-skills.example']);

  test('the subject, the kind, and one message per person', () => {
    assert.equal(email.kind, 'monthly_summary');
    assert.equal(email.subject, 'Your September: Visibility 75/100 (Strong), Trust 62/100 (Okay), Chosen 74/100 (Strong)');
    assert.deepEqual(email.to, ['owner@brightpath-skills.example']);
  });

  test('the same summary in the text and the laid out version, with Open Drishti and the PDF', () => {
    for (const line of [SUMMARY.lines.words, ...SUMMARY.lines.things, SUMMARY.lines.move, SUMMARY.lines.enquiries ?? '']) {
      assert.ok(email.text.includes(line), line);
    }
    assert.match(email.text, /Open Drishti: http:\/\/localhost:3000\//);
    assert.match(email.text, /Download the September report \(PDF\): http:\/\/localhost:3000\/reports\/2026-09/);
    assert.match(email.text, /Turn it off in Settings, Notifications\./);
    assert.match(email.html, /href="http:\/\/localhost:3000\/reports\/2026-09"/);
  });

  test('words from outside are escaped in the laid out version', () => {
    assert.ok(email.html.includes('Brightpath &lt;Skills&gt;'));
    assert.ok(!email.html.includes('<Skills>'));
  });

  test('no dashes in the email', () => {
    assert.equal(hasDashes(email.text), false);
    assert.equal(hasDashes(email.subject), false);
  });
});

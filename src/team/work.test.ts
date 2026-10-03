import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { checkWork, checkWorkLink, isOverdue, workByMonth, workCard, WORK_RULES, type WorkEntry } from './work.ts';

const NOW = istDate('2026-10-03', 12);
const EM_DASH = String.fromCharCode(0x2014);
const FORM = { kind: 'done', text: 'Added WhatsApp to every course page.', on: '2026-10-02', link: '' };
const error = (form: Partial<typeof FORM>, now = NOW) => {
  const result = checkWork({ ...FORM, ...form }, now);
  return result.ok ? null : result.error;
};

let ids = 0;
const entry = (kind: WorkEntry['kind'], on: string, text = `Work on ${on}`): WorkEntry => ({ id: String((ids += 1)), kind, text, on, link: null });

describe('what the team can save in the work log', () => {
  test('a piece of work done, with or without a link', () => {
    assert.deepEqual(checkWork(FORM, NOW), { ok: true, value: { kind: 'done', text: 'Added WhatsApp to every course page.', on: '2026-10-02', link: null } });
    const linked = checkWork({ ...FORM, link: ' https://brightpath-skills.example/courses ' }, NOW);
    assert.equal(linked.ok && linked.value.link, 'https://brightpath-skills.example/courses');
  });

  test('the words are tidied: spaces, and no em or en dashes', () => {
    const result = checkWork({ ...FORM, text: `  Posted four reels ${EM_DASH} real students  ` }, NOW);
    assert.equal(result.ok && result.value.text, 'Posted four reels - real students');
  });

  test('Done or Next only', () => {
    assert.equal(error({ kind: 'later' }), 'Pick Done or Next.');
    assert.equal(error({ kind: 'next', on: '2026-10-15' }), null);
  });

  test('the words are needed, and kept short', () => {
    assert.equal(error({ text: ' a ' }), 'Write what was done.');
    assert.equal(error({ kind: 'next', text: '', on: '2026-10-15' }), 'Write what the team does next.');
    assert.equal(error({ text: 'x'.repeat(WORK_RULES.textMax) }), null);
    assert.equal(error({ text: 'x'.repeat(WORK_RULES.textMax + 1) }), 'Keep it under 300 characters.');
  });

  test('a real day: done up to today, next from today, both within a year (India time)', () => {
    assert.equal(error({ on: '' }), 'Pick the day it was done.');
    assert.equal(error({ kind: 'next', on: '2026-02-30' }), 'Pick the day it is due.');
    assert.equal(error({ on: '2026-10-03' }), null);
    assert.equal(error({ on: '2026-10-04' }), 'Work that is done is dated today or earlier.');
    assert.equal(error({ kind: 'next', on: '2026-10-03' }), null);
    assert.equal(error({ kind: 'next', on: '2026-10-02' }), 'Next is due today or later.');
    assert.equal(error({ on: '2025-09-01' }), 'Pick a day in the last year.');
    assert.equal(error({ kind: 'next', on: '2027-11-01' }), 'Pick a day in the next year.');
    // Just after midnight in India it is already the 4th, while UTC still says the 3rd.
    assert.equal(error({ on: '2026-10-04' }, istDate('2026-10-04', 0, 10)), null);
  });

  test('links: http or https, a real host, no spaces; https added when left out', () => {
    assert.deepEqual(checkWorkLink(''), { ok: true, value: null });
    assert.deepEqual(checkWorkLink('brightpath-skills.example/courses'), { ok: true, value: 'https://brightpath-skills.example/courses' });
    assert.deepEqual(checkWorkLink('http://brightpath-skills.example/a?b=1'), { ok: true, value: 'http://brightpath-skills.example/a?b=1' });
    const message = 'Paste a link that starts with https://, or leave it empty.';
    for (const bad of ['ftp://files.example/x', 'javascript:alert(1)', 'not a link', 'localhost:3000', `https://a.example/${'x'.repeat(WORK_RULES.linkMax)}`]) {
      assert.deepEqual(checkWorkLink(bad), { ok: false, error: message }, bad);
    }
    assert.equal(error({ link: 'not a link' }), message);
  });
});

describe('the card on Home', () => {
  test('done this month, newest first, at most 3; next soonest first, at most 2', () => {
    const entries = [
      entry('done', '2026-10-01'),
      entry('done', '2026-10-02'),
      entry('done', '2026-09-29'),
      entry('next', '2026-10-20'),
      entry('next', '2026-10-15'),
      entry('next', '2026-11-02'),
    ];
    const card = workCard(entries, NOW);
    assert.equal(card.doneLabel, 'Done this month');
    assert.deepEqual(card.done.map((item) => item.on), ['2026-10-02', '2026-10-01']);
    assert.deepEqual(card.next.map((item) => item.on), ['2026-10-15', '2026-10-20']);
    assert.equal(card.more, 2);
  });

  test('nothing yet this month: the latest work instead', () => {
    const card = workCard([entry('done', '2026-09-12'), entry('done', '2026-09-29'), entry('done', '2026-08-30'), entry('done', '2026-09-22')], NOW);
    assert.equal(card.doneLabel, 'Latest work');
    assert.deepEqual(card.done.map((item) => item.on), ['2026-09-29', '2026-09-22', '2026-09-12']);
    assert.equal(card.more, 1);
  });

  test('work on the same day keeps the order it came in', () => {
    const first = entry('done', '2026-10-02', 'Added later');
    const second = entry('done', '2026-10-02', 'Added earlier');
    assert.deepEqual(workCard([first, second], NOW).done.map((item) => item.text), ['Added later', 'Added earlier']);
  });

  test('an empty log', () => {
    assert.deepEqual(workCard([], NOW), { doneLabel: 'Latest work', done: [], next: [], more: 0 });
  });
});

describe('the full list', () => {
  test('next first, then what was done by month, newest first', () => {
    const list = workByMonth([entry('done', '2026-09-12'), entry('next', '2026-10-20'), entry('done', '2026-10-02'), entry('done', '2026-09-29'), entry('next', '2026-10-15')]);
    assert.deepEqual(list.next.map((item) => item.on), ['2026-10-15', '2026-10-20']);
    assert.deepEqual(
      list.months.map((group) => [group.month, group.entries.map((item) => item.on)]),
      [
        ['2026-10', ['2026-10-02']],
        ['2026-09', ['2026-09-29', '2026-09-12']],
      ],
    );
  });

  test('next past its day is overdue, India time', () => {
    assert.equal(isOverdue(entry('next', '2026-10-02'), NOW), true);
    assert.equal(isOverdue(entry('next', '2026-10-03'), NOW), false);
    assert.equal(isOverdue(entry('done', '2026-09-01'), NOW), false);
  });
});

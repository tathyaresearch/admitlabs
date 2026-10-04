import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasBlanks, parseReadyFix, readyFixText, type ReadyFix } from './ready-fix.ts';

const TABLE: ReadyFix = {
  kind: 'table',
  title: 'BBA fees, 2026 to 2027',
  head: ['Year', 'Tuition', 'Total'],
  rows: [
    ['Year 1', '₹1,10,000', '₹[amount]'],
    ['Year 2', '₹1,10,000', '₹[amount]'],
  ],
  note: 'Say what each fee covers.',
  fromDetails: true,
};

describe('a ready fix to copy (spec 7.7)', () => {
  test('a stored text, table or outline reads back as it was saved', () => {
    const text: ReadyFix = { kind: 'text', title: 'A reply', text: 'Thank you, [name].' };
    const outline: ReadyFix = { kind: 'outline', title: 'A page', items: [{ heading: 'Fees', line: 'The full table.' }] };
    for (const fix of [text, TABLE, outline]) assert.deepEqual(parseReadyFix(JSON.parse(JSON.stringify(fix))), fix);
  });

  test('anything else is not a ready fix', () => {
    assert.equal(parseReadyFix(null), null);
    assert.equal(parseReadyFix({ kind: 'text', title: '', text: 'x' }), null);
    assert.equal(parseReadyFix({ kind: 'table', title: 'x', head: ['a', 'b'], rows: [['only one']] }), null);
    assert.equal(parseReadyFix({ kind: 'outline', title: 'x', items: [] }), null);
    assert.equal(parseReadyFix({ kind: 'video', title: 'x' }), null);
  });

  test('Copy gives plain text: a row a line, a heading a line', () => {
    assert.equal(readyFixText(TABLE), 'BBA fees, 2026 to 2027\nYear | Tuition | Total\nYear 1 | ₹1,10,000 | ₹[amount]\nYear 2 | ₹1,10,000 | ₹[amount]\nSay what each fee covers.');
    assert.equal(readyFixText({ kind: 'outline', title: 'A page', items: [{ heading: 'Fees', line: 'The full table.' }] }), 'A page\nFees: The full table.');
  });

  test('blanks in [brackets] are what is left to fill in', () => {
    assert.equal(hasBlanks(TABLE), true);
    assert.equal(hasBlanks({ kind: 'text', title: 'Done', text: 'Fees are ₹1,10,000 a year.' }), false);
  });
});

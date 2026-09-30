import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dashName, findDashes, hasDashes } from './copy.ts';

// Built from code points so this file never contains the characters it tests for.
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
const FIGURE = String.fromCharCode(0x2012);
const BAR = String.fromCharCode(0x2015);
const MINUS = String.fromCharCode(0x2212);

describe('dash guard', () => {
  test('finds em dashes and en dashes with line and column', () => {
    const text = `Plain line\nFees ${EM} shown\n2020${EN}2026`;
    assert.deepEqual(findDashes(text), [
      { line: 2, column: 6, char: EM },
      { line: 3, column: 5, char: EN },
    ]);
  });

  test('also catches the figure dash and horizontal bar', () => {
    assert.equal(findDashes(`a${FIGURE}b${BAR}c`).length, 2);
  });

  test('allows hyphens and the minus sign', () => {
    assert.equal(hasDashes(`tie-ups, 3-month, ${MINUS} 5`), false);
  });

  test('names each dash', () => {
    assert.equal(dashName(EM), 'em dash');
    assert.equal(dashName(EN), 'en dash');
  });
});

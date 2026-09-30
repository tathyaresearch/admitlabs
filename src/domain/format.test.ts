import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrastRatio } from './contrast.ts';
import { istDate } from './dates.ts';
import { formatCount, formatDate, formatDateLong, formatInr, formatMonth, formatMonthShort, groupIndian, hostAndPath, joinNames, ordinal, plural } from './format.ts';
import { scoreLabel } from './scores.ts';

describe('formatting for India', () => {
  test('dates read in India time', () => {
    assert.equal(formatDate(istDate('2026-09-30', 12)), '30 Sep 2026');
    assert.equal(formatDate('2026-09-30T19:00:00Z'), '1 Oct 2026');
    assert.equal(formatDateLong(istDate('2026-10-15', 10)), '15 October 2026');
  });

  test('months', () => {
    assert.equal(formatMonth('2026-09'), 'September 2026');
    assert.equal(formatMonthShort('2026-04'), 'Apr');
  });

  test('Indian digit grouping and rupees', () => {
    assert.equal(groupIndian(999), '999');
    assert.equal(groupIndian(9999), '9,999');
    assert.equal(groupIndian(120000), '1,20,000');
    assert.equal(groupIndian(12345678), '1,23,45,678');
    assert.equal(formatInr(9999), '₹9,999');
    assert.equal(formatCount(48200), '48,200');
    assert.equal(plural(1, 'program', 'programs'), '1 program');
    assert.equal(plural(3, 'program', 'programs'), '3 programs');
  });

  test('lists of names and places', () => {
    assert.equal(joinNames([]), '');
    assert.equal(joinNames(['Silverline College']), 'Silverline College');
    assert.equal(joinNames(['Eastgate University', 'Silverline College']), 'Eastgate University and Silverline College');
    assert.equal(joinNames(['BBA', 'BCA', 'B.Com']), 'BBA, BCA and B.Com');
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st']);
  });

  test('source links shorten to host and path', () => {
    assert.equal(hostAndPath('https://northbank-college.example/programs/bca#fees'), 'northbank-college.example/programs/bca');
    assert.equal(hostAndPath('https://www.eastgate-university.example/'), 'eastgate-university.example');
  });
});

describe('score labels from config', () => {
  test('bands and their edges', () => {
    assert.equal(scoreLabel(100), 'Strong');
    assert.equal(scoreLabel(70), 'Strong');
    assert.equal(scoreLabel(69), 'Needs work');
    assert.equal(scoreLabel(40), 'Needs work');
    assert.equal(scoreLabel(39), 'At risk');
    assert.equal(scoreLabel(0), 'At risk');
    assert.equal(scoreLabel(69.5), 'Strong');
  });
});

describe('brand contrast', () => {
  test('matches the numbers the tokens were chosen by', () => {
    assert.equal(contrastRatio('#F2E8D6', '#0A0A0C').toFixed(2), '16.29');
    assert.equal(contrastRatio('#8A8D94', '#0A0A0C').toFixed(2), '5.95');
    assert.equal(contrastRatio('#8A8D94', '#F2E8D6').toFixed(2), '2.74');
    assert.equal(contrastRatio('#5E6066', '#F2E8D6').toFixed(2), '5.17');
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { SAMPLE_BULK_LIST } from '../sample/bulk.ts';
import { checkList, readCity, readList, readProgram, readTable, readType } from './bulk.ts';

describe('reading a pasted list or a CSV file', () => {
  test('commas or tabs, quoted cells, blank lines, a byte order mark', () => {
    assert.deepEqual(readTable('﻿a,b\n\n"c, d","e ""f"""\r\ng,h'), [
      ['a', 'b'],
      ['c, d', 'e "f"'],
      ['g', 'h'],
    ]);
    assert.deepEqual(readTable('One\tTwo\tThree\nFour\tFive\tSix'), [
      ['One', 'Two', 'Three'],
      ['Four', 'Five', 'Six'],
    ]);
  });

  test('a header row names the columns in any order; without one, the usual order', () => {
    const withHeader = readList('Website,Name,Programs,City,Type\ncollege.example,A College,BBA,Guwahati,College');
    assert.deepEqual(withHeader, [{ position: 1, cells: { website: 'college.example', name: 'A College', programs: 'BBA', city: 'Guwahati', type: 'College' } }]);
    const plain = readList('A College,college.example,Guwahati,College,BBA; MBA,@acollege');
    assert.deepEqual(plain[0]?.cells, { name: 'A College', website: 'college.example', city: 'Guwahati', type: 'College', programs: 'BBA; MBA', instagram: '@acollege' });
  });

  test('types, programs and cities, however they are written', () => {
    assert.equal(readType('college'), 'college');
    assert.equal(readType('University'), 'university');
    assert.equal(readType('Skilling institute'), 'skilling');
    assert.equal(readType('school'), null);
    assert.deepEqual(readProgram('bcom'), { name: 'B.Com', programKey: 'bcom' });
    assert.deepEqual(readProgram('BSc Nursing'), { name: 'B.Sc Nursing', programKey: 'nursing' });
    assert.deepEqual(readProgram('Rare Program'), { name: 'Rare Program', programKey: null });
    assert.deepEqual(readCity('gauhati', ''), { city: 'Guwahati', state: 'Assam' });
    assert.deepEqual(readCity('Aurangabad', ''), { problem: 'Aurangabad is in more than one state. Add a state column.' });
    assert.deepEqual(readCity('Aurangabad', 'Bihar'), { city: 'Aurangabad', state: 'Bihar' });
    assert.deepEqual(readCity('Atlantis', ''), { problem: 'Atlantis is not on the city list.' });
  });
});

describe('checking every row before anything is added', () => {
  test('the sample list is ready as it is', () => {
    const { rows, error } = checkList(SAMPLE_BULK_LIST);
    assert.equal(error, null);
    assert.equal(rows.length, 5);
    assert.ok(rows.every((row) => row.status === 'ready'));
    const first = rows[0];
    assert.equal(first?.status === 'ready' && first.details.website, 'https://brahmaputra-valley.example');
    assert.deepEqual(first?.status === 'ready' && first.details.programs.map((program) => program.name), ['BBA', 'BCA', 'B.Com']);
    assert.equal(first?.status === 'ready' && first.details.instagram, 'brahmaputravalley');
  });

  test('a row that needs fixing says what to fix, in plain words', () => {
    const { rows } = checkList('name,website,city,type,programs\n,not a site,Atlantis,School,');
    const [row] = rows;
    assert.equal(row?.status, 'fix');
    assert.deepEqual(row?.status === 'fix' && row.problems, [
      'Add the name.',
      'Add the website, like college.edu.in.',
      'Atlantis is not on the city list.',
      'Add the type: College, University or Skilling institute.',
      'Add at least one program, separated by semicolons.',
    ]);
    assert.equal(row?.label, 'Row 1');
    for (const problem of row?.status === 'fix' ? row.problems : []) assert.equal(hasDashes(problem), false);
  });

  test('the same website never twice', () => {
    const { rows } = checkList('A College,a.example,Guwahati,College,BBA\nA College again,https://www.a.example/,Guwahati,College,BBA');
    assert.equal(rows[0]?.status, 'ready');
    assert.deepEqual(rows[1]?.status === 'fix' && rows[1].problems, ['Same website as row 1.']);
  });

  test('an empty list, or one over the limit, is sent back whole', () => {
    assert.equal(checkList('  \n ').error, 'Paste a list, or choose a CSV file.');
    const many = Array.from({ length: 4 }, (_, index) => `College ${index},c${index}.example,Guwahati,College,BBA`).join('\n');
    assert.equal(checkList(many, 3).error, 'Up to 3 institutions at a time. This list has 4.');
  });
});

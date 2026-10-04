import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { neededPulls, parseScope, pullKey, regionLabel, regionPlace, regionsFor } from './regions.ts';

describe('how wide to look', () => {
  test('city, state and All India for an institution', () => {
    assert.deepEqual(regionsFor({ city: 'Guwahati', state: 'Assam' }), {
      city: { scope: 'city', region: 'Guwahati', state: 'Assam' },
      state: { scope: 'state', region: 'Assam', state: 'Assam' },
      india: { scope: 'india', region: 'India', state: null },
    });
  });

  test('labels and the scope in the address', () => {
    assert.equal(regionLabel({ scope: 'city', region: 'Guwahati' }), 'Guwahati');
    assert.equal(regionLabel({ scope: 'state', region: 'Assam' }), 'Assam');
    assert.equal(regionLabel({ scope: 'india', region: 'India' }), 'All India');
    assert.equal(regionPlace({ scope: 'india', region: 'India' }), 'India');
    assert.equal(regionPlace({ scope: 'city', region: 'Guwahati' }), 'Guwahati');
    assert.equal(parseScope('state'), 'state');
    assert.equal(parseScope('india'), 'india');
    assert.equal(parseScope('anything else'), 'city');
    assert.equal(parseScope(undefined), 'city');
  });
});

describe('shared pulls: once per region and program', () => {
  test('every institution needs its city and its state, for each program with a key (All India is no longer pulled)', () => {
    const pulls = neededPulls([
      { city: 'Guwahati', state: 'Assam', programKeys: ['bba', 'bca'] },
      { city: 'Jorhat', state: 'Assam', programKeys: ['bba', null] },
      { city: 'Guwahati', state: 'Assam', programKeys: ['bba'] },
    ]);
    assert.deepEqual(pulls.map(pullKey), [
      'city|Guwahati|Assam|bba',
      'city|Guwahati|Assam|bca',
      'city|Jorhat|Assam|bba',
      'state|Assam|Assam|bba',
      'state|Assam|Assam|bca',
    ]);
  });

  test('the same city name in two states is two pulls', () => {
    const pulls = neededPulls([
      { city: 'Udaipur', state: 'Rajasthan', programKeys: ['bba'] },
      { city: 'Udaipur', state: 'Tripura', programKeys: ['bba'] },
    ]);
    assert.equal(pulls.filter((pull) => pull.scope === 'city').length, 2);
    assert.equal(pulls.filter((pull) => pull.scope === 'state').length, 2);
    assert.equal(pulls.filter((pull) => pull.scope === 'india').length, 0);
  });
});

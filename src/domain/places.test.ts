import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INDIA_CITIES, INDIA_STATES, UNION_TERRITORIES } from '../config/cities.ts';
import { SAMPLE_INSTITUTIONS } from '../sample/institutions.ts';
import { hasDashes } from './copy.ts';
import { findPlace, placeLabel, searchPlaces } from './places.ts';

describe('the city list', () => {
  test('covers all 28 states and 8 union territories', () => {
    assert.equal(INDIA_STATES.length, 36);
    for (const territory of UNION_TERRITORIES) assert.ok(INDIA_STATES.includes(territory), territory);
    for (const state of INDIA_STATES) assert.ok(INDIA_CITIES.some((city) => city.state === state), state);
  });

  test('each city is listed once per state, with no dashes', () => {
    const keys = INDIA_CITIES.map((city) => `${city.name}|${city.state}`);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(hasDashes(JSON.stringify(INDIA_CITIES)), false);
    for (const city of INDIA_CITIES) assert.ok(!city.aliases.includes(city.name), city.name);
  });

  test('every sample institution is in a listed city', () => {
    for (const sample of SAMPLE_INSTITUTIONS) assert.ok(findPlace(INDIA_CITIES, sample.city, sample.state), `${sample.city}, ${sample.state}`);
  });

  test('a few hundred cities, big enough for every state', () => {
    assert.ok(INDIA_CITIES.length > 500, String(INDIA_CITIES.length));
    assert.ok(INDIA_CITIES.filter((city) => city.state === 'Assam').length >= 20);
  });
});

describe('searching for a city', () => {
  const labels = (query: string, limit?: number) => searchPlaces(INDIA_CITIES, query, limit).map(placeLabel);

  test('the start of the name comes first', () => {
    assert.equal(labels('guw')[0], 'Guwahati, Assam');
    assert.equal(labels('Guwahati')[0], 'Guwahati, Assam');
    assert.equal(labels('jor')[0], 'Jorhat, Assam');
  });

  test('older names find the current one', () => {
    assert.equal(labels('bangalore')[0], 'Bengaluru, Karnataka');
    assert.equal(labels('gurgaon')[0], 'Gurugram, Haryana');
    assert.equal(labels('allahabad')[0], 'Prayagraj, Uttar Pradesh');
    assert.equal(labels('port blair')[0], 'Sri Vijaya Puram, Andaman and Nicobar Islands');
  });

  test('names shared by two states show both, with their states', () => {
    assert.deepEqual(labels('aurangabad'), ['Aurangabad, Bihar', 'Chhatrapati Sambhajinagar, Maharashtra']);
    const udaipur = labels('udaipur');
    assert.ok(udaipur.includes('Udaipur, Rajasthan') && udaipur.includes('Udaipur, Tripura'));
  });

  test('typing "City, State" narrows to that state', () => {
    assert.deepEqual(labels('bilaspur, him'), ['Bilaspur, Himachal Pradesh']);
  });

  test('a word inside the name matches too; nothing typed means nothing shown', () => {
    assert.ok(labels('lakhimpur').includes('North Lakhimpur, Assam'));
    assert.deepEqual(labels('   '), []);
    assert.deepEqual(labels('zzzz'), []);
    assert.equal(labels('a', 5).length, 5);
  });
});

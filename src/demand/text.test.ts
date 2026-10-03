import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { changeWords, countWords, LANGUAGE_TAGS, PLATFORM_LABELS, platformOf, sourcesCaption, spikeNotice, worrySentence } from './text.ts';

describe('Demand in words', () => {
  test('changes, never a minus sign', () => {
    assert.equal(changeWords(38), 'Up 38%');
    assert.equal(changeWords(-12), 'Down 12%');
    assert.equal(changeWords(0.2), 'No change');
    assert.equal(changeWords(null), '');
  });

  test('the spike alert', () => {
    assert.equal(spikeNotice('BCA with AI and Machine Learning', 'Guwahati', 47), 'Rising in Guwahati: BCA with AI and Machine Learning, up 47% this month.');
  });

  test('what students worry about most', () => {
    assert.equal(worrySentence('Guwahati', ['placements', 'fees']), 'Students in Guwahati worry most about placements and fees.');
    assert.equal(worrySentence('Assam', ['hostel']), 'Students in Assam worry most about hostels.');
    assert.equal(worrySentence('All India', ['new']), '');
  });

  test('how often, in words that fit the item', () => {
    assert.equal(countWords('question', 96), 'Asked about 96 times');
    assert.equal(countWords('question', 1), 'Asked about 1 time');
    assert.equal(countWords('worry', 140), 'Raised about 140 times');
    assert.equal(countWords('rising', 1240), 'About 1,240 searches');
    assert.equal(countWords('mention', 14), '14 mentions');
    assert.equal(sourcesCaption(['reddit', 'quora', 'trends'], ['en', 'hi', 'as']), 'From Reddit, Quora and Search trends, in English, Hindi and Assamese');
    assert.equal(sourcesCaption(['youtube'], []), 'From YouTube');
    // English first, then Hindi and Assamese, however they were found.
    assert.equal(sourcesCaption(['x'], ['as', 'en']), 'From X, in English and Assamese');
  });

  test('the platform behind a source link', () => {
    assert.equal(platformOf('https://reddit.example/r/assam/search?q=fees'), 'reddit');
    assert.equal(platformOf('https://www.youtube.com/results?search_query=bba'), 'youtube');
    assert.equal(platformOf('https://exams.example/assam/admission-year-2027'), null);
    assert.equal(platformOf('https://constructor.example/x'), null);
    assert.equal(platformOf('not a link'), null);
  });

  test('Hindi and Assamese are tagged; English needs no tag', () => {
    assert.equal(LANGUAGE_TAGS.en, null);
    assert.equal(LANGUAGE_TAGS.hi, 'Asked in Hindi');
    assert.equal(LANGUAGE_TAGS.as, 'Asked in Assamese');
  });

  test('no dashes anywhere', () => {
    for (const text of [...Object.values(PLATFORM_LABELS), ...Object.values(LANGUAGE_TAGS).filter((tag): tag is string => tag !== null)]) {
      assert.equal(hasDashes(text), false, text);
    }
  });
});

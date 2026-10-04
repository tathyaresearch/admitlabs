import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { askedLine, changeWords, countWords, filledInNote, LANGUAGE_TAGS, PLATFORM_LABELS, platformOf, risingLine, sourcesCaption, spikeNotice, topicLine, trendWord } from './text.ts';

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

  test('how often, in words that fit the item', () => {
    assert.equal(countWords('question', 96), 'Asked about 96 times');
    assert.equal(countWords('question', 1), 'Asked about 1 time');
    assert.equal(countWords('worry', 140), 'Raised about 140 times');
    assert.equal(countWords('rising', 1240), 'About 1,240 searches');
    assert.equal(countWords('mention', 14), '14 mentions');
    assert.equal(sourcesCaption(['reddit', 'quora', 'trends'], ['en', 'hi', 'as']), 'From Reddit, Quora and Search trends, in English, Hindi and Assamese');
    assert.equal(sourcesCaption(['youtube'], []), 'From YouTube');
    // English first, then Hindi and Assamese, however they were found.
    assert.equal(sourcesCaption(['forum'], ['as', 'en']), 'From Forums, in English and Assamese');
    assert.equal(countWords('topic', 140), 'Asked about 140 times');
    // A search trend without a count from the keyword tool shows no number at all.
    assert.equal(countWords('rising', null), '');
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

  test('a search trend in words: Rising fast from 40%, Rising from 10%, Falling from a 5% drop, else Steady (spec 9.5)', () => {
    assert.equal(trendWord(46), 'Rising fast');
    assert.equal(trendWord(40), 'Rising fast');
    assert.equal(trendWord(39.4), 'Rising');
    assert.equal(trendWord(10), 'Rising');
    assert.equal(trendWord(9.6), 'Rising', 'rounded first');
    assert.equal(trendWord(8), 'Steady');
    assert.equal(trendWord(-4), 'Steady');
    assert.equal(trendWord(-5), 'Falling');
    assert.equal(trendWord(-21), 'Falling');
    assert.equal(trendWord(null), null);
  });

  test('why an idea, and when the state fills in', () => {
    assert.equal(askedLine(96, 'Guwahati'), 'Asked about 96 times in Guwahati this month.');
    assert.equal(askedLine(1, 'Assam'), 'Asked about 1 time in Assam this month.');
    assert.equal(topicLine('BBA', 'fees', 140, 'Guwahati'), 'BBA fees came up in about 140 questions in Guwahati this month.');
    assert.equal(risingLine('Power BI and dashboards', 'Rising fast', 'Guwahati'), 'Searches for “Power BI and dashboards” are rising fast in Guwahati.');
    assert.equal(filledInNote('Tezpur', 'Assam', ['Digital Marketing', 'Hotel Management'], true), 'Tezpur has too little data yet, so Assam fills in.');
    assert.equal(filledInNote('Tezpur', 'Assam', ['Hotel Management'], false), 'Tezpur has too little data yet for Hotel Management, so Assam fills in there.');
    // The keyword tool is named in a sentence.
    assert.equal(sourcesCaption(['trends', 'keywords', 'reddit', 'quora'], ['en', 'hi', 'as']), 'From Search trends, the keyword tool, Reddit and Quora, in English, Hindi and Assamese');
  });

  test('no dashes anywhere', () => {
    for (const text of [...Object.values(PLATFORM_LABELS), ...Object.values(LANGUAGE_TAGS).filter((tag): tag is string => tag !== null)]) {
      assert.equal(hasDashes(text), false, text);
    }
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { scoreLabel, wordScoreText } from './scores.ts';

// Visibility, Trust and Chosen as numbers out of 100 (October 2026), each with its word beside it.

describe('a word with its number', () => {
  test('the number out of 100, rounded and held between 0 and 100, with its word', () => {
    assert.equal(wordScoreText('Visibility', 79.4), 'Visibility 79/100 (Strong)');
    assert.equal(wordScoreText('Trust', 69.5), 'Trust 70/100 (Strong)');
    assert.equal(wordScoreText('Chosen', 39), 'Chosen 39/100 (Weak)');
    assert.equal(wordScoreText('Chosen', 120), 'Chosen 100/100 (Strong)');
  });

  test('the word kept with a result, when it is given, so a stored summary reads as it was', () => {
    assert.equal(wordScoreText('Trust', 62, 'Okay'), 'Trust 62/100 (Okay)');
    assert.equal(scoreLabel(62), 'Okay');
  });
});

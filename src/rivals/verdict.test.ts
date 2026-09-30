import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import type { ScoreSet, Standing } from './compare.ts';
import { freeRivalsVerdict, rivalsVerdict, rivalVerdict } from './verdict.ts';

const s = (overall: number, discovered: number, trusted: number, chosen: number): ScoreSet => ({ overall, discovered, trusted, chosen });

// The sample world's scores (September 2026).
const EASTGATE = s(73, 79, 69, 70);
const SILVERLINE = s(74, 73, 72, 76);
const HIGHFIELD = s(51, 44, 66, 43);
const NORTHBANK = s(46, 47, 47, 44);
const BRIGHTPATH = s(63, 55, 61, 72);
const LOOMCRAFT = s(32, 35, 29, 34);

const FAILING = /fail|poor|bad|worst|losing|behind you are/i;

function readsWell(text: string): void {
  assert.match(text, / Next step: [a-z].+\.$/, text);
  assert.equal(hasDashes(text), false, text);
  assert.doesNotMatch(text, FAILING, text);
}

describe('Where you stand (Paid and Client): a strength, then the next step', () => {
  test('the sample institutions', () => {
    assert.equal(
      rivalsVerdict(EASTGATE, [
        { name: 'Silverline College', scores: SILVERLINE },
        { name: 'Highfield University', scores: HIGHFIELD },
        { name: 'Northbank College', scores: NORTHBANK },
      ]),
      "You're ahead of Highfield University and Northbank College. Next step: catching Silverline College on being chosen.",
    );
    assert.equal(
      rivalsVerdict(BRIGHTPATH, [
        { name: 'Loomcraft Skills Institute', scores: LOOMCRAFT },
        { name: 'Silverline College', scores: SILVERLINE },
        { name: 'Eastgate University', scores: EASTGATE },
      ]),
      "You're ahead of Loomcraft Skills Institute. Next step: catching Eastgate University on being found.",
    );
  });

  test('the next step is the rival just above you, on the pillar where it leads most', () => {
    const text = rivalsVerdict(s(50, 50, 50, 50), [
      { name: 'Far Ahead', scores: s(80, 90, 80, 70) },
      { name: 'Just Above', scores: s(55, 45, 62, 53) },
    ]);
    assert.equal(text, 'You lead Just Above on being found. Next step: catching Just Above on being trusted.');
  });

  test('ahead of every rival: keep the lead, or catch the one pillar where a rival still leads', () => {
    const rivals = [
      { name: 'Highfield University', scores: HIGHFIELD },
      { name: 'Northbank College', scores: NORTHBANK },
      { name: 'Loomcraft Skills Institute', scores: LOOMCRAFT },
    ];
    assert.equal(rivalsVerdict(EASTGATE, rivals), "You're ahead of all three of your rivals. Next step: keeping your lead.");
    assert.equal(
      rivalsVerdict(s(60, 60, 60, 60), rivals),
      "You're ahead of all three of your rivals. Next step: catching Highfield University on being trusted.",
    );
  });

  test('behind every rival: the strength is a pillar where you lead one of them', () => {
    assert.equal(
      rivalsVerdict(NORTHBANK, [
        { name: 'Silverline College', scores: SILVERLINE },
        { name: 'Eastgate University', scores: EASTGATE },
        { name: 'Highfield University', scores: HIGHFIELD },
      ]),
      'You lead Highfield University on being found. Next step: catching Highfield University on being trusted.',
    );
  });

  test('behind every rival on every pillar: still an opportunity, never a failing', () => {
    const text = rivalsVerdict(LOOMCRAFT, [
      { name: 'Silverline College', scores: SILVERLINE },
      { name: 'Eastgate University', scores: EASTGATE },
      { name: 'Brightpath Skills Academy', scores: BRIGHTPATH },
    ]);
    assert.equal(text, 'Each rival shows you something that works. Next step: catching Brightpath Skills Academy on being chosen.');
  });

  test('level with a rival', () => {
    assert.equal(
      rivalsVerdict(s(60, 60, 60, 60), [{ name: 'Twin College', scores: s(60, 55, 65, 60) }, { name: 'Top College', scores: s(70, 70, 70, 70) }]),
      "You're level with Twin College. Next step: catching Top College on being found.",
    );
  });

  test('every combination reads as a strength and a next step', () => {
    const values = [30, 50, 70];
    for (const overall of values) {
      for (const rivalOverall of values) {
        for (const pillar of values) {
          const text = rivalsVerdict(s(overall, pillar, 50, 50), [
            { name: 'Rival One', scores: s(rivalOverall, 50, pillar, 50) },
            { name: 'Rival Two', scores: s(50, 50, 50, pillar) },
            { name: 'Rival Three', scores: s(rivalOverall, pillar, pillar, pillar) },
          ]);
          readsWell(text);
        }
      }
    }
  });
});

describe('Where you stand on Free: ahead or behind only', () => {
  const rivals = (standings: Record<string, Standing>) => Object.entries(standings).map(([name, standing]) => ({ name, standing }));

  test('the sample: Northbank has three rivals ahead for now', () => {
    assert.equal(
      freeRivalsVerdict(rivals({ 'Silverline College': 'ahead', 'Eastgate University': 'ahead', 'Highfield University': 'ahead' })),
      'Each rival shows you something that works. Next step: catching up.',
    );
  });

  test('every rival ahead reads the same for 3, 4 or 5 rivals', () => {
    for (const names of [['A', 'B', 'C'], ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D', 'E']]) {
      const text = freeRivalsVerdict(names.map((name) => ({ name, standing: 'ahead' as const })));
      assert.equal(text, 'Each rival shows you something that works. Next step: catching up.');
    }
  });

  test('names only, never a score, and in name order so nothing hints at one', () => {
    const one = freeRivalsVerdict(rivals({ 'Silverline College': 'ahead', 'Highfield University': 'behind', 'Eastgate University': 'ahead' }));
    const two = freeRivalsVerdict(rivals({ 'Eastgate University': 'ahead', 'Silverline College': 'ahead', 'Highfield University': 'behind' }));
    assert.equal(one, "You're ahead of Highfield University. Next step: catching Eastgate University and Silverline College.");
    assert.equal(one, two);
    assert.doesNotMatch(one, /\d/);
  });

  test('ahead of every rival', () => {
    assert.equal(freeRivalsVerdict(rivals({ A: 'behind', B: 'behind' })), "You're ahead of both of your rivals. Next step: keeping your lead.");
  });

  test('level, and rivals not scored yet are left out', () => {
    assert.equal(freeRivalsVerdict(rivals({ A: 'level', B: 'ahead', C: 'unscored' })), "You're level with A. Next step: catching B.");
    assert.equal(freeRivalsVerdict(rivals({ A: 'unscored' })), '');
  });

  test('every combination reads well', () => {
    const options: Standing[] = ['ahead', 'behind', 'level'];
    for (const a of options) for (const b of options) for (const c of options) readsWell(freeRivalsVerdict(rivals({ Alpha: a, Beta: b, Gamma: c })));
  });
});

describe("One rival's page: you against them", () => {
  test('Eastgate against Silverline', () => {
    assert.equal(rivalVerdict(EASTGATE, SILVERLINE), 'You lead on being found. Next step: catching them on being chosen.');
  });

  test('ahead overall, with a pillar still to catch', () => {
    assert.equal(rivalVerdict(EASTGATE, HIGHFIELD), "You're ahead overall. Next step: keeping your lead.");
    assert.equal(rivalVerdict(s(60, 70, 55, 55), s(58, 50, 62, 60)), "You're ahead overall. Next step: catching them on being trusted.");
  });

  test('behind on all three: plenty to learn', () => {
    assert.equal(rivalVerdict(LOOMCRAFT, BRIGHTPATH), "They're ahead on all three for now, so there is plenty to learn. Next step: catching them on being chosen.");
  });

  test('always a strength and a next step', () => {
    for (const a of [30, 50, 70]) for (const b of [30, 50, 70]) readsWell(rivalVerdict(s(a, a, b, 50), s(b, b, a, 50)));
  });
});

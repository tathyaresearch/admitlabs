import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getCheck } from '../domain/checks.ts';
import type { CheckKey } from '../domain/types.ts';
import type { CheckComparison } from './compare.ts';
import { gapOpportunities, rivalOpportunities, type OpportunityInput } from './opportunities.ts';

function gap(key: CheckKey, size: number, programs: string[] = []): CheckComparison {
  return {
    key,
    pillar: getCheck(key).pillar,
    them: { kind: 'single', result: 'strong', share: 1 },
    you: { kind: 'single', result: 'weak', share: 0.3 },
    lead: size > 0 ? 'them' : size < 0 ? 'you' : 'level',
    gap: size,
    programs,
    theirParts: [],
    yourParts: [],
  };
}

const silverline = { id: 's', name: 'Silverline College' };
const highfield = { id: 'h', name: 'Highfield University' };

const post = (title: string, views: number) => ({ rival: silverline, platform: 'instagram' as const, title, views, whyItWorked: 'Real students.' });
const move = (kind: 'admission_dates' | 'fee_change' | 'new_page' | 'new_program', day: string) => ({
  rival: highfield,
  kind,
  description: 'A move.',
  detectedAt: `${day}T04:30:00.000Z`,
});

describe('the gaps where rivals lead you', () => {
  test('one item per check, naming every rival ahead, biggest lead first', () => {
    const gaps = gapOpportunities([
      { ...silverline, comparisons: [gap('fees_shown', 17.5, ['BBA']), gap('page_speed', 3), gap('youtube', -4)] },
      { ...highfield, comparisons: [gap('fees_shown', 10, ['BBA']), gap('placement_proof', 21, ['BBA'])] },
    ]);
    assert.deepEqual(
      gaps.map((item) => [item.key, item.rivals.map((rival) => rival.name), item.gap]),
      [
        ['placement_proof', ['Highfield University'], 21],
        ['fees_shown', ['Silverline College', 'Highfield University'], 17.5],
        ['page_speed', ['Silverline College'], 3],
      ],
    );
    assert.equal(gaps[1]?.yourResult, 'weak');
  });

  test('where you lead or are level is never a thing to do', () => {
    assert.deepEqual(gapOpportunities([{ ...silverline, comparisons: [gap('youtube', -4), gap('page_speed', 0)] }]), []);
  });
});

describe('the 3 things to do: a varied, fixed recipe', () => {
  const input: OpportunityInput = {
    rivals: [{ ...silverline, comparisons: [gap('fees_shown', 17.5, ['BBA']), gap('placement_proof', 21, ['BBA']), gap('page_speed', 3)] }],
    posts: [post('Campus tour', 12_000), post('An intern on her first day', 48_200)],
    moves: [move('new_page', '2026-09-12'), move('admission_dates', '2026-09-20')],
  };

  test('the biggest gap, the best post, then the next gap', () => {
    const picked = rivalOpportunities(input);
    assert.deepEqual(
      picked.map((item) => (item.type === 'gap' ? `gap:${item.key}` : item.type === 'content' ? `post:${item.title}` : `move:${item.kind}`)),
      ['gap:placement_proof', 'post:An intern on her first day', 'gap:fees_shown'],
    );
  });

  test('with one gap only, a move worth acting on takes the third place, admission dates first', () => {
    const picked = rivalOpportunities({ ...input, rivals: [{ ...silverline, comparisons: [gap('fees_shown', 17.5, ['BBA'])] }] });
    assert.deepEqual(
      picked.map((item) => item.type),
      ['gap', 'content', 'move'],
    );
    assert.equal(picked[2]?.type === 'move' ? picked[2].kind : null, 'admission_dates');
  });

  test('with no gaps and no posts, the moves fill in', () => {
    const picked = rivalOpportunities({ rivals: [], posts: [], moves: input.moves });
    assert.deepEqual(
      picked.map((item) => (item.type === 'move' ? item.kind : item.type)),
      ['admission_dates', 'new_page'],
    );
  });

  test('never more than three, never the same thing twice', () => {
    const picked = rivalOpportunities({ ...input, moves: [...input.moves, move('fee_change', '2026-09-03')] });
    assert.equal(picked.length, 3);
    assert.equal(new Set(picked).size, 3);
    assert.deepEqual(rivalOpportunities({ rivals: [], posts: [], moves: [] }), []);
  });
});

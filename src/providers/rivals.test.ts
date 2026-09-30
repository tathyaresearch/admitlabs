import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { CHECKS } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { classify, thresholdsFor } from '../domain/scoring/classify.ts';
import { RESULTS, RIVAL_MOVE_KINDS, type ScoringFamily } from '../domain/types.ts';
import { SAMPLE_CONTENT, SAMPLE_MOVES, sampleInstitution, toInstitutionRef } from '../sample/index.ts';
import { reviewCountOverTime, reviewRatingOverTime } from './mock/facts.ts';
import { rngFor } from './mock/random.ts';
import { mockMoves, mockPosts } from './mock/rival-activity.ts';
import { writeRivalAction } from './mock/rival-actions.ts';
import { getAnalysisProvider } from './registry.ts';
import type { InstitutionRef } from './types.ts';

const DAY_MS = 86_400_000;
const silverline = toInstitutionRef(sampleInstitution('silverline-college'));
const newcomer: InstitutionRef = {
  id: 'new-rival',
  slug: 'riverside-college-new',
  name: 'Riverside College',
  type: 'college',
  city: 'Guwahati',
  state: 'Assam',
  website: 'https://riverside-college.example',
  instagram: 'riversidecollege',
  youtube: null,
  otherLinks: {},
  programKeys: ['bba', 'bcom'],
};

describe('mock rival moves', () => {
  test('a sample rival shows the hand-written sample up to the sample\'s today', () => {
    const moves = mockMoves(silverline, istDate('2026-09-28', 9));
    const expected = SAMPLE_MOVES.filter((move) => move.slug === 'silverline-college' && move.detectedAt > '2026-08-28').map((move) => move.description);
    assert.deepEqual(
      moves.map((move) => move.description),
      expected,
    );
  });

  test('after that, and for any rival added later, a stable stream of plausible moves', () => {
    for (const institution of [silverline, newcomer]) {
      let found = 0;
      for (let week = 0; week < 16; week += 1) {
        const asOf = new Date(istDate('2026-10-05', 9).getTime() + week * 7 * DAY_MS);
        const moves = mockMoves(institution, asOf);
        assert.deepEqual(mockMoves(institution, asOf), moves, 'the same check finds the same moves');
        for (const move of moves) {
          const at = new Date(move.detectedAt).getTime();
          assert.ok(at <= asOf.getTime() && at > asOf.getTime() - 31 * DAY_MS, 'inside the weeks before the check');
          assert.ok(RIVAL_MOVE_KINDS.includes(move.kind));
          assert.equal(hasDashes(move.description), false, move.description);
          assert.match(move.description, /^[A-Z].+\.$/, move.description);
        }
        found += moves.length;
      }
      assert.ok(found > 0, `${institution.name} has moves over four months`);
    }
  });
});

describe('mock rival posts', () => {
  test('a sample rival shows its sample posts, up to the time of the check', () => {
    const posts = mockPosts(silverline, 'instagram', istDate('2026-09-28', 9));
    const expected = SAMPLE_CONTENT.filter((item) => item.slug === 'silverline-college' && item.platform === 'instagram' && item.postedAt <= '2026-09-27').map((item) => item.title);
    assert.deepEqual(
      posts.map((post) => post.title),
      expected,
    );
    assert.ok(posts.every((post) => post.url.startsWith('https://instagram.example/p/')));
  });

  test('a rival added later has posts where it has an account, and none where it has not', () => {
    const asOf = istDate('2026-10-05', 9);
    const posts = mockPosts(newcomer, 'instagram', asOf);
    assert.ok(posts.length > 0);
    assert.deepEqual(mockPosts(newcomer, 'instagram', asOf), posts);
    assert.ok(posts.every((post) => (post.metrics.views ?? 0) > 0 && new Date(post.postedAt).getTime() <= asOf.getTime()));
    assert.deepEqual(mockPosts(newcomer, 'youtube', asOf), []);
  });
});

describe('mock reviews build up over time', () => {
  const thresholds = thresholdsFor(SCORING_V1);
  const families: ScoringFamily[] = ['college_university', 'skilling'];

  test('every month lands on the intended result', () => {
    for (const family of families) {
      for (const result of RESULTS) {
        for (let seed = 0; seed < 25; seed += 1) {
          for (let month = 0; month < 18; month += 1) {
            const count = reviewCountOverTime(result, rngFor('reviews', seed), family, month);
            assert.equal(classify('google_profile', { exists: result !== 'missing', reviewCount: count }, { family, thresholds }), result);
            const rating = reviewRatingOverTime(result, rngFor('rating', seed), rngFor('replies', seed, month), Math.max(count, result === 'missing' ? 0 : 1), month);
            assert.equal(classify('review_rating', rating, { family, thresholds }), result, `${family} ${result} seed ${seed} month ${month}`);
          }
        }
      }
    }
  });

  test('counts only grow, and ratings move by small steps', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      let lastCount = 0;
      let lastRating: number | null = null;
      for (let month = 0; month < 12; month += 1) {
        const count = reviewCountOverTime('okay', rngFor('reviews', seed), 'college_university', month);
        assert.ok(count >= lastCount);
        lastCount = count;
        const rating = reviewRatingOverTime('strong', rngFor('rating', seed), rngFor('replies', seed, month), 150, month).rating;
        if (lastRating !== null && rating !== null) assert.ok(Math.abs(rating - lastRating) <= 0.1 + 1e-9);
        lastRating = rating;
      }
    }
  });
});

describe('mock Rivals 3 things to do', () => {
  const rival = { id: 's', name: 'Silverline College' };

  test('every check has a plain title and a reason, with no dashes', () => {
    for (const check of CHECKS) {
      for (const programs of [[], ['BBA'], ['BBA', 'BCA']]) {
        const text = writeRivalAction({ type: 'gap', key: check.key, pillar: check.pillar, programs, rivals: [rival], gap: 5, yourResult: 'weak' }, 'college');
        assert.match(text.text, /^[A-Z]/, text.text);
        assert.doesNotMatch(text.text, /\{programs\}/);
        assert.match(text.detail, /^Silverline College is ahead of you here\. /);
        for (const line of [text.text, text.detail]) {
          assert.equal(hasDashes(line), false, line);
          assert.doesNotMatch(line, /\bcopy\b|fail|poor/i, line);
        }
      }
    }
    assert.equal(
      writeRivalAction({ type: 'gap', key: 'approvals', pillar: 'trusted', programs: [], rivals: [rival], gap: 5, yourResult: 'weak' }, 'skilling').text,
      'Show your skilling recognition on your website',
    );
  });

  test('two rivals ahead are named together', () => {
    const text = writeRivalAction(
      { type: 'gap', key: 'fees_shown', pillar: 'chosen', programs: ['BBA'], rivals: [rival, { id: 'e', name: 'Eastgate University' }], gap: 5, yourResult: 'weak' },
      'college',
    );
    assert.equal(text.text, 'Show your full BBA fees');
    assert.match(text.detail, /^Silverline College and Eastgate University are ahead of you here\./);
  });

  test('a post is something to learn from, never to copy', () => {
    const text = writeRivalAction({ type: 'content', rival, platform: 'instagram', title: 'Campus tour', views: 12_400, whyItWorked: 'Real students.' }, 'college');
    assert.equal(text.text, "Learn from Silverline College's top post");
    assert.equal(text.detail, '"Campus tour" reached 12,400 views. Real students. Take the idea, not the post: tell it with your own students.');
  });

  test('every kind of move has an action', () => {
    for (const kind of RIVAL_MOVE_KINDS) {
      const text = writeRivalAction({ type: 'move', rival, kind, description: 'Announced 2027 admission dates.', detectedAt: '2026-09-20T03:30:00.000Z' }, 'college');
      assert.match(text.detail, /^Silverline College announced 2027 admission dates\. [A-Z]/);
      assert.equal(hasDashes(text.text + text.detail), false);
    }
  });

  test('the provider returns one per opportunity, in order', async () => {
    const texts = await getAnalysisProvider({}).rivalActions({
      institutionType: 'college',
      opportunities: [
        { type: 'gap', key: 'page_speed', pillar: 'chosen', programs: [], rivals: [rival], gap: 3, yourResult: 'weak' },
        { type: 'content', rival, platform: 'youtube', title: 'Hostel tour', views: 900, whyItWorked: null },
      ],
    });
    assert.deepEqual(
      texts.map((text) => text.text),
      ['Make your website load faster', "Learn from Silverline College's top post"],
    );
  });
});

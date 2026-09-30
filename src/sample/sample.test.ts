import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checksForLevel } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { paidPlanEndsAt } from '../domain/tiers.ts';
import { CHECK_KEYS } from '../domain/types.ts';
import {
  ADMIN_EMAIL,
  DEMAND_FIXTURES,
  MENTION_FIXTURES,
  PROFILE_MONTHS,
  SAMPLE_ADS,
  SAMPLE_CONTENT,
  SAMPLE_INSTITUTIONS,
  SAMPLE_MOVES,
  SAMPLE_NOTES,
  SAMPLE_PROFILES,
  SAMPLE_PROGRAM_KEYS,
  SAMPLE_RIVALS,
  SAMPLE_RUNS,
  SAMPLE_USERS,
  TEAM_EMAIL,
  profileResult,
  sampleId,
  trackResult,
} from './index.ts';

const bySlug = new Map(SAMPLE_INSTITUTIONS.map((institution) => [institution.slug, institution]));

describe('sample institutions (spec section 20)', () => {
  test('8 institutions in Assam: 3 colleges, 2 universities, 3 skilling institutes', () => {
    assert.equal(SAMPLE_INSTITUTIONS.length, 8);
    const count = (type: string) => SAMPLE_INSTITUTIONS.filter((institution) => institution.type === type).length;
    assert.deepEqual([count('college'), count('university'), count('skilling')], [3, 2, 3]);
    assert.ok(SAMPLE_INSTITUTIONS.every((institution) => institution.state === 'Assam'));
  });

  test('mostly Guwahati, some other Assam cities', () => {
    const guwahati = SAMPLE_INSTITUTIONS.filter((institution) => institution.city === 'Guwahati').length;
    assert.ok(guwahati > SAMPLE_INSTITUTIONS.length / 2);
    assert.ok(guwahati < SAMPLE_INSTITUTIONS.length);
  });

  test('every link uses a .example host, so nothing points at a real site or account', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      const links = [institution.website, institution.youtube, institution.otherLinks.facebook, institution.otherLinks.linkedin].filter(Boolean);
      for (const link of links) assert.ok(new URL(link as string).hostname.endsWith('.example'), link as string);
    }
    for (const user of SAMPLE_USERS) assert.ok(user.email.endsWith('.example'), user.email);
  });

  test('one institution on each tier, plus 2 prospects visible only to the team', () => {
    const tiers = SAMPLE_INSTITUTIONS.flatMap((institution) => (institution.plan ? [institution.plan.tier] : []));
    for (const tier of ['free', 'paid', 'client'] as const) assert.ok(tiers.includes(tier), tier);
    const prospects = SAMPLE_INSTITUTIONS.filter((institution) => institution.isProspect);
    assert.equal(prospects.length, 2);
    for (const prospect of prospects) {
      assert.equal(prospect.owner, null);
      assert.equal(prospect.plan, null);
      assert.equal(prospect.claimedAt, null);
    }
  });

  test('every signed-up institution has exactly one owner; unclaimed records have none', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      const owners = SAMPLE_USERS.filter((user) => user.institutionSlug === institution.slug && user.membershipRole === 'owner');
      assert.equal(owners.length, institution.claimedAt ? 1 : 0, institution.slug);
    }
    assert.ok(SAMPLE_USERS.some((user) => user.email === TEAM_EMAIL && user.teamRole === 'team'));
    assert.ok(SAMPLE_USERS.some((user) => user.email === ADMIN_EMAIL && user.teamRole === 'admin'));
    assert.ok(SAMPLE_USERS.some((user) => user.membershipRole === 'member'));
  });

  test('the Paid plan runs exactly 6 months from its start', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      if (institution.plan?.tier !== 'paid') continue;
      assert.equal(paidPlanEndsAt(istDate(institution.plan.startsAt, 10)).toISOString(), istDate(institution.plan.endsAt ?? '', 10).toISOString());
    }
  });

  test('Free plans name a program the institution offers', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      if (institution.plan?.tier !== 'free') continue;
      assert.ok(institution.programs.some((program) => program.programKey === institution.plan?.freeProgramKey), institution.slug);
    }
  });

  test('stable ids', () => {
    assert.equal(sampleId('institution', 'eastgate-university'), sampleId('institution', 'eastgate-university'));
    assert.notEqual(sampleId('institution', 'a'), sampleId('institution', 'b'));
    assert.match(sampleId('x'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('sample rivals', () => {
  test('each signed-up institution tracks 3 to 5 rivals, never itself, never a prospect', () => {
    for (const institution of SAMPLE_INSTITUTIONS.filter((candidate) => candidate.claimedAt)) {
      const rivals = SAMPLE_RIVALS.filter(([tracker]) => tracker === institution.slug);
      assert.ok(rivals.length >= 3 && rivals.length <= 5, `${institution.slug} tracks ${rivals.length}`);
      for (const [, rival] of rivals) {
        assert.notEqual(rival, institution.slug);
        assert.equal(bySlug.get(rival)?.isProspect, false);
      }
    }
  });

  test('moves, content and ads belong to tracked rivals', () => {
    const tracked = new Set(SAMPLE_RIVALS.map(([, rival]) => rival));
    for (const item of [...SAMPLE_MOVES, ...SAMPLE_CONTENT, ...SAMPLE_ADS]) assert.ok(tracked.has(item.slug), item.slug);
  });

  test('every tracked rival has its top 5 posts of the month', () => {
    const tracked = new Set(SAMPLE_RIVALS.map(([, rival]) => rival));
    for (const slug of tracked) assert.equal(SAMPLE_CONTENT.filter((item) => item.slug === slug).length, 5, slug);
  });

  test('team notes are only about real sample institutions', () => {
    for (const note of SAMPLE_NOTES) assert.ok(bySlug.has(note.slug));
  });
});

describe('sample profiles', () => {
  const programChecks = new Set(checksForLevel('program').map((check) => check.key));

  test('every institution has a result for every check, program and month', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      assert.ok(SAMPLE_PROFILES[institution.slug], institution.slug);
      for (const month of PROFILE_MONTHS) {
        for (const key of CHECK_KEYS) {
          const programKeys = programChecks.has(key) ? institution.programs.map((program) => program.programKey) : [null];
          for (const programKey of programKeys) assert.ok(profileResult(institution.slug, key, programKey, month), `${institution.slug} ${key} ${programKey} ${month}`);
        }
      }
    }
  });

  test('profiles agree with the accounts each institution has', () => {
    const latest = PROFILE_MONTHS.at(-1) as string;
    for (const institution of SAMPLE_INSTITUTIONS) {
      const result = (key: (typeof CHECK_KEYS)[number]) => profileResult(institution.slug, key, null, latest);
      assert.equal(result('youtube') === 'missing', institution.youtube === null, `${institution.slug} youtube`);
      const hasOtherLinks = Boolean(institution.otherLinks.facebook || institution.otherLinks.linkedin);
      assert.equal(result('other_socials') === 'missing', !hasOtherLinks, `${institution.slug} other socials`);
      assert.notEqual(result('instagram_activity'), 'missing', `${institution.slug} has an Instagram handle`);
      for (const month of PROFILE_MONTHS) {
        const at = (key: (typeof CHECK_KEYS)[number]) => profileResult(institution.slug, key, null, month);
        assert.equal(at('google_profile') === 'missing', at('review_rating') === 'missing', `${institution.slug} reviews ${month}`);
        assert.equal(at('mobile_friendly') === 'missing', at('page_speed') === 'missing', `${institution.slug} site loads ${month}`);
      }
    }
  });

  test('tracks read month by month and clamp outside the range', () => {
    assert.equal(trackResult('WWOOSS', '2026-04'), 'weak');
    assert.equal(trackResult('WWOOSS', '2026-07'), 'okay');
    assert.equal(trackResult('WWOOSS', '2026-12'), 'strong');
    assert.equal(trackResult('WWOOSS', '2025-01'), 'weak');
    assert.equal(trackResult('M', '2026-06'), 'missing');
    assert.throws(() => trackResult('SSX', '2026-06'));
  });

  test('every institution has run dates', () => {
    for (const institution of SAMPLE_INSTITUTIONS) assert.ok((SAMPLE_RUNS[institution.slug] ?? []).length > 0, institution.slug);
    assert.equal(SAMPLE_RUNS['eastgate-university']?.length, 6);
    assert.equal(SAMPLE_RUNS['brightpath-skills']?.length, 6);
  });
});

describe('sample demand', () => {
  test('every sample program has demand fixtures with 5 questions and 5 ideas', () => {
    for (const key of SAMPLE_PROGRAM_KEYS) {
      const fixture = DEMAND_FIXTURES[key];
      assert.ok(fixture, key);
      assert.equal(fixture.questions.length, 5, key);
      assert.equal(fixture.ideas.length, 5, key);
      assert.ok(fixture.rising.length >= 1 && fixture.falling.length >= 1, key);
      for (const idea of fixture.ideas) assert.ok(fixture.questions[idea.question], `${key} idea points at a question`);
      assert.ok(fixture.questions.some((question) => question.language === 'hi' && question.original), `${key} Hindi`);
      assert.ok(fixture.questions.some((question) => question.language === 'as' && question.original), `${key} Assamese`);
    }
  });

  test('top worries include fees, placements, hostel, safety and recognition', () => {
    for (const key of SAMPLE_PROGRAM_KEYS) {
      const texts = (DEMAND_FIXTURES[key]?.worries ?? []).map((worry) => worry.text.toLowerCase());
      for (const word of ['fees', 'placements', 'hostel', 'safety', 'recognition']) {
        assert.ok(
          texts.some((text) => text.includes(word)),
          `${key} ${word}`,
        );
      }
    }
  });

  test('mentions are grouped topics about sample institutions, never people', () => {
    for (const mention of MENTION_FIXTURES) {
      assert.ok(bySlug.has(mention.slug));
      assert.doesNotMatch(mention.text, /@\w/);
    }
  });

  test('no sample text uses an em dash or en dash', () => {
    const everything = JSON.stringify([
      SAMPLE_INSTITUTIONS,
      SAMPLE_MOVES,
      SAMPLE_CONTENT,
      SAMPLE_ADS,
      SAMPLE_NOTES,
      DEMAND_FIXTURES,
      MENTION_FIXTURES,
    ]);
    assert.equal(hasDashes(everything), false);
  });
});

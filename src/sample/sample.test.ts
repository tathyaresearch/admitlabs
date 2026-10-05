import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checksForLevel } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { auditSchedule, latestScheduledRun } from '../domain/schedule.ts';
import { paidPlanEndsAt } from '../domain/tiers.ts';
import { CHECK_KEYS } from '../domain/types.ts';
import { checkWork } from '../team/work.ts';
import {
  ADMIN_EMAIL,
  DEMAND_FIXTURES,
  PROFILE_MONTHS,
  SAMPLE_ADS,
  SAMPLE_CONTENT,
  SAMPLE_FIX_REQUESTS,
  SAMPLE_INSTITUTIONS,
  SAMPLE_LEAD_LINKS,
  SAMPLE_LEADS,
  SAMPLE_MARKS,
  SAMPLE_MOVES,
  SAMPLE_NOTES,
  SAMPLE_PROFILES,
  SAMPLE_PROGRAM_KEYS,
  SAMPLE_RIVALS,
  SAMPLE_RUNS,
  SAMPLE_SHARES,
  SAMPLE_TEAM_WORK,
  SAMPLE_TODAY,
  SAMPLE_USERS,
  TEAM_EMAIL,
  profileResult,
  sampleId,
  sampleToken,
  trackResult,
} from './index.ts';

const bySlug = new Map(SAMPLE_INSTITUTIONS.map((institution) => [institution.slug, institution]));

describe('sample institutions (spec section 20)', () => {
  test('8 institutions in Assam (3 colleges, 2 universities, 3 skilling institutes), plus 2 rival records added in version 2', () => {
    assert.equal(SAMPLE_INSTITUTIONS.length, 10);
    const count = (type: string) => SAMPLE_INSTITUTIONS.filter((institution) => institution.type === type).length;
    assert.deepEqual([count('college'), count('university'), count('skilling')], [3, 2, 5]);
    // The 2 rival records: a skilling institute in Guwahati and one in Tezpur, never signed up.
    for (const [slug, city] of [['pinegrove-skills', 'Guwahati'], ['kestrel-skills', 'Tezpur']] as const) {
      assert.equal(bySlug.get(slug)?.city, city);
      assert.equal(bySlug.get(slug)?.claimedAt, null);
    }
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

  test('a Paid plan runs exactly its period (1 or 3 months) from its start', () => {
    for (const institution of SAMPLE_INSTITUTIONS) {
      if (institution.plan?.tier !== 'paid') continue;
      assert.ok(institution.plan.paidMonths === 1 || institution.plan.paidMonths === 3, institution.slug);
      assert.equal(paidPlanEndsAt(istDate(institution.plan.startsAt, 10), institution.plan.paidMonths).toISOString(), istDate(institution.plan.endsAt ?? '', 10).toISOString());
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

  test('the work log is for a Client, and each entry is one the team could have added that day', () => {
    assert.ok(SAMPLE_TEAM_WORK.length > 0);
    for (const entry of SAMPLE_TEAM_WORK) {
      assert.equal(bySlug.get(entry.slug)?.plan?.tier, 'client', entry.slug);
      assert.ok(entry.addedOn <= SAMPLE_TODAY, entry.text);
      const saved = checkWork({ kind: entry.kind, text: entry.text, on: entry.on, link: entry.link ?? '' }, istDate(entry.addedOn, 16));
      assert.deepEqual(saved, { ok: true, value: { kind: entry.kind, text: entry.text, on: entry.on, link: entry.link } }, entry.text);
      if (entry.link) assert.ok(new URL(entry.link).hostname.endsWith('.example'), entry.link);
    }
    // Something done and something next, so the card has both.
    assert.ok(SAMPLE_TEAM_WORK.some((entry) => entry.kind === 'done' && entry.on <= SAMPLE_TODAY));
    assert.ok(SAMPLE_TEAM_WORK.some((entry) => entry.kind === 'next' && entry.on > SAMPLE_TODAY));
  });

  test('sample share links are for prospects, made after their team Audit', () => {
    assert.ok(SAMPLE_SHARES.length > 0);
    for (const share of SAMPLE_SHARES) {
      assert.equal(bySlug.get(share.slug)?.isProspect, true, share.slug);
      assert.ok((SAMPLE_RUNS[share.slug] ?? []).some((run) => run.kind === 'team' && run.day < share.createdAt), share.slug);
      assert.match(sampleToken(share.slug), /^[0-9a-f]{32}$/);
    }
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

  test('every institution has runs; 6 months of history for Eastgate and Brightpath', () => {
    for (const institution of SAMPLE_INSTITUTIONS) assert.ok((SAMPLE_RUNS[institution.slug] ?? []).length > 0, institution.slug);
    // Eastgate: 6 monthly Audits, and September's extra refresh.
    assert.equal(SAMPLE_RUNS['eastgate-university']?.filter((run) => run.kind === 'own' && run.trigger !== 'manual').length, 6);
    assert.equal(SAMPLE_RUNS['brightpath-skills']?.filter((run) => run.kind === 'own').length, 6);
  });

  test('own runs follow the plan schedule; rival and team runs only where they belong', () => {
    const tracked = new Set(SAMPLE_RIVALS.map(([, rival]) => rival));
    // The first day anyone tracked each rival: no rival Audit before it.
    const since = new Map<string, string>();
    for (const [, rival, , addedOn] of SAMPLE_RIVALS) if (!since.has(rival) || addedOn < (since.get(rival) as string)) since.set(rival, addedOn);
    for (const institution of SAMPLE_INSTITUTIONS) {
      const runs = SAMPLE_RUNS[institution.slug] ?? [];
      assert.deepEqual(
        runs.map((run) => run.day),
        [...runs.map((run) => run.day)].sort(),
        `${institution.slug} runs in date order`,
      );
      for (const run of runs) {
        if (run.kind === 'own' && run.trigger === 'manual') {
          // An extra refresh is Paid's, once a month.
          assert.equal(institution.plan?.tier, 'paid', `${institution.slug} ${run.day} refresh`);
          continue;
        }
        if (run.kind === 'own') {
          assert.ok(institution.plan && institution.claimedAt, `${institution.slug} own runs need a signup`);
          // A renewed Paid plan's history runs from when Paid first began.
          const plan = { tier: institution.plan.tier, startsAt: istDate(institution.plan.paidSince ?? institution.plan.startsAt, 10), endsAt: institution.plan.endsAt ? istDate(institution.plan.endsAt, 10) : null };
          const schedule = auditSchedule(plan, istDate(run.day, 10));
          assert.ok(schedule, institution.slug);
          assert.equal(latestScheduledRun(schedule, istDate(run.day, 23))?.toISOString(), istDate(run.day, 10).toISOString(), `${institution.slug} ${run.day} is a scheduled day`);
          if (run.trigger === 'signup') assert.equal(run.day, institution.claimedAt, `${institution.slug} signup Audit on the signup day`);
        }
        if (run.kind === 'rival') assert.ok(tracked.has(institution.slug), `${institution.slug} rival runs need someone tracking it`);
        if (run.kind === 'rival') assert.ok(run.day >= (since.get(institution.slug) as string), `${institution.slug} rival run on ${run.day} comes after tracking began`);
        if (run.kind === 'team') assert.ok(institution.isProspect, `${institution.slug} team runs are for prospects`);
      }
    }
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
      for (const idea of fixture.ideas) {
        assert.ok(idea.question === undefined ? fixture.topics.some((topic) => topic.topic === idea.topic) : fixture.questions[idea.question], `${key} idea stands on a question`);
      }
      assert.ok(fixture.questions.some((question) => question.language === 'hi' && question.original), `${key} Hindi`);
      assert.ok(fixture.questions.some((question) => question.language === 'as' && question.original), `${key} Assamese`);
    }
  });

  test('what students ask covers fees, placements, scholarships, hostel and careers, each with its top question', () => {
    for (const key of SAMPLE_PROGRAM_KEYS) {
      const topics = DEMAND_FIXTURES[key]?.topics ?? [];
      assert.deepEqual(topics.map((topic) => topic.topic).sort(), ['careers', 'fees', 'hostel', 'placements', 'scholarships'], key);
      for (const topic of topics) {
        assert.ok(topic.question.text.endsWith('?'), `${key} ${topic.topic}`);
        assert.doesNotMatch(topic.question.text, /@\w/);
      }
    }
  });

  test('each program has its best months, and Make these 3 ideas have a hook and 3 or 4 key points', () => {
    for (const key of SAMPLE_PROGRAM_KEYS) {
      const fixture = DEMAND_FIXTURES[key];
      assert.ok(fixture && fixture.bestMonths.length >= 3, key);
      for (const idea of fixture?.ideas ?? []) assert.ok(idea.hook.startsWith('“') && idea.points.length >= 3 && idea.points.length <= 4, `${key}: ${idea.title}`);
    }
  });

  test('no sample text uses an em dash or en dash', () => {
    const everything = JSON.stringify([
      SAMPLE_INSTITUTIONS,
      SAMPLE_MOVES,
      SAMPLE_CONTENT,
      SAMPLE_ADS,
      SAMPLE_NOTES,
      SAMPLE_TEAM_WORK,
      DEMAND_FIXTURES,
      SAMPLE_LEAD_LINKS,
      SAMPLE_FIX_REQUESTS,
    ]);
    assert.equal(hasDashes(everything), false);
  });
});

describe('version 2 sample', () => {
  test('Loomcraft in Tezpur tracks one rival in Tezpur and two from Guwahati, its Nearby city', () => {
    const rivals = SAMPLE_RIVALS.filter(([tracker]) => tracker === 'loomcraft-skills').map(([, rival]) => bySlug.get(rival)?.city);
    assert.deepEqual([...rivals].sort(), ['Guwahati', 'Guwahati', 'Tezpur']);
    assert.equal(bySlug.get('loomcraft-skills')?.city, 'Tezpur');
  });

  test('every Guwahati institution that has signed up tracks 3 or more rivals in its own city', () => {
    for (const institution of SAMPLE_INSTITUTIONS.filter((entry) => entry.city === 'Guwahati' && entry.claimedAt && entry.plan?.tier !== 'free')) {
      const local = SAMPLE_RIVALS.filter(([tracker, rival]) => tracker === institution.slug && bySlug.get(rival)?.city === 'Guwahati');
      assert.ok(local.length >= 3, institution.slug);
    }
  });

  test('To review: a Free sign up and a Paid refresh wait; Brightpath goes out automatically', () => {
    const waiting = Object.entries(SAMPLE_RUNS).flatMap(([slug, runs]) => runs.filter((run) => run.waiting).map((run) => [slug, run.trigger]));
    assert.deepEqual(waiting.sort(), [
      ['eastgate-university', 'manual'],
      ['loomcraft-skills', 'signup'],
    ]);
    assert.equal(bySlug.get('brightpath-skills')?.reviewFirst, false);
    assert.ok(SAMPLE_INSTITUTIONS.filter((entry) => entry.slug !== 'brightpath-skills').every((entry) => entry.reviewFirst !== false));
  });

  test('marks done: on checks and on one finding', () => {
    assert.ok(SAMPLE_MARKS.some((mark) => mark.finding === 'eastgate-quora-mba-hostel'));
    assert.equal(SAMPLE_MARKS.filter((mark) => mark.check).length, 3);
  });

  test('Let AdmitLabs fix this: one open request, one handled', () => {
    assert.equal(SAMPLE_FIX_REQUESTS.filter((request) => request.handledOn === null).length, 1);
    assert.equal(SAMPLE_FIX_REQUESTS.filter((request) => request.handledOn !== null).length, 1);
  });

  test('Leads only for Brightpath, a Client: 4 links from July and 10, 17 and 23 enquiries', () => {
    assert.ok(SAMPLE_LEAD_LINKS.every((link) => link.slug === 'brightpath-skills' && link.createdOn.startsWith('2026-07')));
    assert.equal(SAMPLE_LEAD_LINKS.length, 4);
    assert.equal(bySlug.get('brightpath-skills')?.plan?.tier, 'client');
    const byMonth = new Map<string, number>();
    for (const lead of SAMPLE_LEADS) byMonth.set(lead.sentOn.slice(0, 7), (byMonth.get(lead.sentOn.slice(0, 7)) ?? 0) + 1);
    assert.deepEqual([...byMonth.entries()], [
      ['2026-07', 10],
      ['2026-08', 17],
      ['2026-09', 23],
    ]);
    const programs = new Set(bySlug.get('brightpath-skills')?.programs.map((program) => program.programKey));
    for (const lead of SAMPLE_LEADS) {
      assert.ok(programs.has(lead.programKey), lead.name);
      assert.match(lead.email, /@mail\.example$/);
      // Made up numbers: 00000 can never be a real Indian mobile number.
      assert.match(lead.phone, /^\+9100000\d{5}$/);
      const link = SAMPLE_LEAD_LINKS.find((entry) => entry.code === lead.linkCode);
      assert.ok(link && lead.sentOn > link.createdOn, lead.name);
    }
    assert.equal(new Set(SAMPLE_LEADS.map((lead) => lead.phone)).size, SAMPLE_LEADS.length);
  });
});

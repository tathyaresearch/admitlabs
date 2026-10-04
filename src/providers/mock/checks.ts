// Mock providers for the Audit checks, in version 2's slots. Each returns raw facts with a source
// link and the time they were checked. Source links use .example hosts only.
//
//   website     the institution's own pages: program pages, fees, placements, admission steps,
//               enquiry, faculty, the approvals it shows, and rival moves on its site
//   search      the city's search results for each program, the official listings behind its
//               approvals, and what the search tool finds about it (Quora, forums, news, listings)
//   places      the Google profile, reviews and rating, and a big jump in reviews
//   pagespeed   mobile and speed
//   facebook    the Facebook page (light)
//   ai_answers  what AI assistants answer
//   manual      the team's entries, read from the database

import { monthKey } from '../../domain/dates.ts';
import { scoringFamily } from '../../domain/types.ts';
import { SAMPLE_REVIEW_JUMPS } from '../../sample/rivals.ts';
import { PROVIDER_TARGETS } from '../targets.ts';
import { makeSignal, type AnySignal, type InstitutionRef, type Provider, type Target } from '../types.ts';
import {
  admissionStepsFacts,
  aiAnswersFacts,
  approvalsShownFacts,
  easyEnquiryFacts,
  facultyLeadersFacts,
  feesShownFacts,
  googleProfileFacts,
  googleSearchFacts,
  instagramFacts,
  mobileFriendlyFacts,
  otherSocialsFacts,
  pageSpeedFacts,
  placementProofFacts,
  programPageFacts,
  reviewCountOverTime,
  reviewRatingOverTime,
  studentsInContentFacts,
  youtubeFacts,
} from './facts.ts';
import { findingSignals } from './findings.ts';
import { rngFor } from './random.ts';
import { mockMoves, mockPosts } from './rival-activity.ts';
import { exampleUrl, intendedResult, sitePage, slugify } from './shared.ts';

const DAY_MS = 86_400_000;
/** A jump in reviews shows on checks this long after it (the weekly check looks back a month). */
const JUMP_LOOKBACK_DAYS = 31;

/** Approvals or recognition an institution holds, as the mock official records see it. */
export function heldApprovals(institution: InstitutionRef): string[] {
  if (institution.type === 'skilling') return ['NSDC', 'Skill India'];
  const held = institution.type === 'university' ? ['UGC', 'NAAC', 'NIRF'] : ['UGC', 'NAAC'];
  if (institution.programKeys.some((key) => key === 'mba' || key === 'bba' || key === 'bca')) held.push('AICTE');
  if (institution.programKeys.includes('nursing')) held.push('INC');
  return held;
}

// Website reader ------------------------------------------------------------------------------

function programSignals(target: Extract<Target, { kind: 'program' }>, asOf: Date): AnySignal[] {
  const { institution, program } = target;
  const month = monthKey(asOf);
  const key = program.programKey ?? slugify(program.name);
  const rng = (name: string) => rngFor(name, institution.slug, key, month);
  const programUrl = sitePage(institution, `/programs/${key}`);
  return [
    makeSignal('website', 'fees_shown', target, feesShownFacts(intendedResult(institution, 'fees_shown', program, asOf), rng('fees'), `${programUrl}#fees`), `${programUrl}#fees`, asOf),
    makeSignal(
      'website',
      'program_page',
      target,
      programPageFacts(intendedResult(institution, 'program_page', program, asOf), rng('page'), programUrl, sitePage(institution, '/programs')),
      programUrl,
      asOf,
    ),
    makeSignal('website', 'admission_steps', target, admissionStepsFacts(intendedResult(institution, 'admission_steps', program, asOf)), sitePage(institution, '/admissions'), asOf),
    makeSignal(
      'website',
      'placement_proof',
      target,
      placementProofFacts(intendedResult(institution, 'placement_proof', program, asOf), rng('placements'), Number(month.slice(0, 4))),
      sitePage(institution, `/placements#${key}`),
      asOf,
    ),
  ];
}

function institutionSiteSignals(target: Extract<Target, { kind: 'institution' }>, asOf: Date): AnySignal[] {
  const { institution } = target;
  const month = monthKey(asOf);
  const shown = approvalsShownFacts(intendedResult(institution, 'approvals', null, asOf), rngFor('approvals', institution.slug, month), heldApprovals(institution));
  const signals: AnySignal[] = [
    makeSignal('website', 'easy_enquiry', target, easyEnquiryFacts(intendedResult(institution, 'easy_enquiry', null, asOf), rngFor('enquiry', institution.slug, month)), sitePage(institution, '/contact'), asOf),
    makeSignal('website', 'faculty_leaders', target, facultyLeadersFacts(intendedResult(institution, 'faculty_leaders', null, asOf)), sitePage(institution, '/faculty'), asOf),
    makeSignal('website', 'approvals', target, { source: 'site', ...shown }, sitePage(institution, '/about/approvals'), asOf),
  ];

  // Moves on the site in the weeks up to this check (rival moves are checked weekly).
  for (const move of mockMoves(institution, asOf)) {
    const detected = new Date(move.detectedAt);
    signals.push(makeSignal('website', 'rival_move', target, { kind: move.kind, description: move.description, detectedAt: move.detectedAt }, sitePage(institution, move.path), detected));
  }
  return signals;
}

export const mockWebsite: Provider = {
  key: 'website',
  mode: 'mock',
  targets: PROVIDER_TARGETS.website,
  async collect(target, asOf) {
    if (target.kind === 'program') return programSignals(target, asOf);
    if (target.kind === 'institution') return institutionSiteSignals(target, asOf);
    return [];
  },
};

// Search tool, city specific ------------------------------------------------------------------

/** The city's search results for one program, as a student there sees them. */
export function searchProgramSignals(target: Extract<Target, { kind: 'program' }>, asOf: Date): AnySignal[] {
  const { institution, program } = target;
  const query = `${program.name} in ${institution.city}`;
  const result = intendedResult(institution, 'google_search', program, asOf);
  const value = googleSearchFacts(result, rngFor('search', institution.slug, program.programKey, monthKey(asOf)), query, institution.city);
  const url = `https://search.example/search?q=${encodeURIComponent(query)}&near=${encodeURIComponent(institution.city)}`;
  return [makeSignal('search', 'google_search', target, value, url, asOf)];
}

/** The official listings behind the approvals an institution holds, and what the search tool finds about it. */
export function searchInstitutionSignals(target: Extract<Target, { kind: 'institution' }>, asOf: Date): AnySignal[] {
  const { institution } = target;
  const recognition: 'skilling' | 'statutory' = institution.type === 'skilling' ? 'skilling' : 'statutory';
  return [
    makeSignal('search', 'approvals', target, { source: 'official', recognition, held: heldApprovals(institution) }, `https://official-data.example/records/${institution.slug}`, asOf),
    ...findingSignals('search', target, asOf),
  ];
}

// Google Places -------------------------------------------------------------------------------

/** A big jump in reviews within the last month, as a rival alert. */
function reviewJumps(target: Extract<Target, { kind: 'institution' }>, asOf: Date): AnySignal[] {
  const since = asOf.getTime() - JUMP_LOOKBACK_DAYS * DAY_MS;
  return SAMPLE_REVIEW_JUMPS.filter((jump) => jump.slug === target.institution.slug).flatMap((jump) => {
    const at = new Date(`${jump.on}T03:30:00.000Z`);
    if (at.getTime() > asOf.getTime() || at.getTime() <= since) return [];
    return [
      makeSignal(
        'places',
        'rival_move',
        target,
        { kind: 'reviews_jump', description: jump.description, detectedAt: at.toISOString() },
        `https://maps.example/place/${target.institution.slug}/reviews`,
        at,
      ),
    ];
  });
}

export const mockPlaces: Provider = {
  key: 'places',
  mode: 'mock',
  targets: PROVIDER_TARGETS.places,
  async collect(target, asOf) {
    if (target.kind !== 'institution') return [];
    const { institution } = target;
    const month = monthKey(asOf);
    const profileResult = intendedResult(institution, 'google_profile', null, asOf);
    const ratingResult = intendedResult(institution, 'review_rating', null, asOf);
    // The institution's own listing, when it gave one in Settings: the profile is there, and it is the source.
    const listing = institution.otherLinks.googleMaps ?? null;
    const exists = listing !== null || profileResult !== 'missing';
    const [year, monthNumber] = month.split('-').map(Number) as [number, number];
    const monthsIn = (year - 2026) * 12 + (monthNumber - 1);
    const reviewCount = exists ? reviewCountOverTime(profileResult, rngFor('reviews', institution.slug), scoringFamily(institution.type), monthsIn) : 0;
    const source =
      listing ??
      (exists ? `https://maps.example/place/${institution.slug}` : `https://maps.example/search?q=${encodeURIComponent(`${institution.name} ${institution.city}`)}`);
    const rating = reviewRatingOverTime(ratingResult, rngFor('rating', institution.slug), rngFor('replies', institution.slug, month), reviewCount, monthsIn);
    return [
      makeSignal('places', 'google_profile', target, googleProfileFacts(reviewCount, exists), source, asOf),
      makeSignal('places', 'review_rating', target, rating, listing ?? `${source}/reviews`, asOf),
      ...reviewJumps(target, asOf),
    ];
  },
};

// Google PageSpeed ----------------------------------------------------------------------------

export const mockPagespeed: Provider = {
  key: 'pagespeed',
  mode: 'mock',
  targets: PROVIDER_TARGETS.pagespeed,
  async collect(target, asOf) {
    if (target.kind !== 'institution') return [];
    const { institution } = target;
    const month = monthKey(asOf);
    const report = `https://pagespeed.example/report?url=${encodeURIComponent(institution.website)}&form_factor=mobile`;
    return [
      makeSignal('pagespeed', 'mobile_friendly', target, mobileFriendlyFacts(intendedResult(institution, 'mobile_friendly', null, asOf), rngFor('mobile', institution.slug, month)), report, asOf),
      makeSignal('pagespeed', 'page_speed', target, pageSpeedFacts(intendedResult(institution, 'page_speed', null, asOf), rngFor('speed', institution.slug, month)), report, asOf),
    ];
  },
};

// Instagram and YouTube -----------------------------------------------------------------------

/** A rival's posts on one platform in the weeks before `asOf`, for its best content of the month. */
export function contentFor(platform: 'instagram' | 'youtube', target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'institution') return [];
  return mockPosts(target.institution, platform, asOf).map((post) =>
    makeSignal(platform, 'rival_content', target, { platform, url: post.url, title: post.title, postedAt: post.postedAt, metrics: post.metrics }, post.url, asOf),
  );
}

export function instagramInstitutionSignals(target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'institution') return [];
  const { institution } = target;
  const month = monthKey(asOf);
  const profile = institution.instagram
    ? `https://instagram.example/${institution.instagram}`
    : `https://instagram.example/search?q=${encodeURIComponent(institution.name)}`;
  return [
    makeSignal('instagram', 'instagram_activity', target, instagramFacts(intendedResult(institution, 'instagram_activity', null, asOf), rngFor('instagram', institution.slug, month), institution.instagram), profile, asOf),
    makeSignal('instagram', 'students_in_content', target, studentsInContentFacts(intendedResult(institution, 'students_in_content', null, asOf), rngFor('students', institution.slug, month)), profile, asOf),
    ...contentFor('instagram', target, asOf),
  ];
}

export function youtubeInstitutionSignals(target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'institution') return [];
  const { institution } = target;
  const channel = institution.youtube ? exampleUrl(institution.youtube) : null;
  const source = channel ?? `https://youtube.example/results?search_query=${encodeURIComponent(institution.name)}`;
  return [
    makeSignal('youtube', 'youtube', target, youtubeFacts(intendedResult(institution, 'youtube', null, asOf), rngFor('youtube', institution.slug, monthKey(asOf)), channel), source, asOf),
    ...contentFor('youtube', target, asOf),
  ];
}

// Facebook, light -----------------------------------------------------------------------------

export const mockFacebook: Provider = {
  key: 'facebook',
  mode: 'mock',
  targets: PROVIDER_TARGETS.facebook,
  async collect(target, asOf) {
    if (target.kind !== 'institution') return [];
    const { institution } = target;
    const value = otherSocialsFacts(intendedResult(institution, 'other_socials', null, asOf), rngFor('socials', institution.slug, monthKey(asOf)), institution.otherLinks);
    const link = institution.otherLinks.facebook;
    const source = link ? exampleUrl(link) : `https://facebook.example/search?q=${encodeURIComponent(institution.name)}`;
    return [makeSignal('facebook', 'other_socials', target, value, source, asOf)];
  },
};

// AI answers ----------------------------------------------------------------------------------

export const mockAiAnswers: Provider = {
  key: 'ai_answers',
  mode: 'mock',
  targets: PROVIDER_TARGETS.ai_answers,
  async collect(target, asOf) {
    if (target.kind !== 'program') return [];
    const { institution, program } = target;
    const month = monthKey(asOf);
    const question = `best ${program.name} in ${institution.city}`;
    const value = aiAnswersFacts(intendedResult(institution, 'ai_answers', program, asOf), rngFor('ai', institution.slug, program.programKey, month), question);
    const key = program.programKey ?? slugify(program.name);
    return [makeSignal('ai_answers', 'ai_answers', target, value, `https://ai-answers.example/checks/${institution.slug}/${key}/${month}`, asOf)];
  },
};

// Team entry ----------------------------------------------------------------------------------

export const mockManual: Provider = {
  key: 'manual',
  mode: 'mock',
  targets: PROVIDER_TARGETS.manual,
  // Team entries (rival ads, and anything a provider cannot collect yet) are read from the
  // database rather than collected. The sample seed writes them as if the team had entered them.
  async collect() {
    return [];
  },
};

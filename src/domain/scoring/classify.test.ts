import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../../config/scoring.v1.ts';
import type { CheckFacts } from '../facts.ts';
import { CHECK_KEYS, RESULTS, type CheckKey, type CheckResult, type ScoringFamily } from '../types.ts';
import { classify, thresholdsFor } from './classify.ts';

// Spec 7.5, one boundary at a time. Every number here is the edge of a band in config v1.

const thresholds = SCORING_V1.thresholds;
const college: ScoringFamily = 'college_university';

interface Case<K extends CheckKey = CheckKey> {
  key: K;
  name: string;
  facts: CheckFacts[K];
  expected: CheckResult;
  family?: ScoringFamily;
}

const cases: Case[] = [];
function add<K extends CheckKey>(key: K, name: string, facts: CheckFacts[K], expected: CheckResult, family: ScoringFamily = college) {
  cases.push({ key, name, facts, expected, family } as Case);
}

// google_search: top 3, rest of page 1, page 2, not in the top 20.
const search = (position: number | null): CheckFacts['google_search'] => ({ query: 'BBA in Guwahati', position, resultsChecked: 20 });
add('google_search', 'first', search(1), 'strong');
add('google_search', 'third', search(3), 'strong');
add('google_search', 'fourth', search(4), 'okay');
add('google_search', 'tenth', search(10), 'okay');
add('google_search', 'eleventh', search(11), 'weak');
add('google_search', 'twentieth', search(20), 'weak');
add('google_search', 'twenty first', search(21), 'missing');
add('google_search', 'not found', search(null), 'missing');
add('google_search', 'a position of 0 is not a result', search(0), 'missing');

// instagram_activity: 3+ a week mostly reels, 1 to 2 a week, less than once a week, no account.
const insta = (postsPerWeek: number, reelShare: number, exists = true): CheckFacts['instagram_activity'] => ({
  handle: exists ? 'college' : null,
  exists,
  postsPerWeek,
  reelShare,
  weeksChecked: 4,
});
add('instagram_activity', '3 a week, half reels', insta(3, 0.5), 'strong');
add('instagram_activity', '3 a week, just under half reels', insta(3, 0.49), 'okay');
add('instagram_activity', '2.9 a week, all reels', insta(2.9, 1), 'okay');
add('instagram_activity', 'once a week', insta(1, 0.2), 'okay');
add('instagram_activity', 'just under once a week', insta(0.9, 0.9), 'weak');
add('instagram_activity', 'an account with no posts', insta(0, 0), 'weak');
add('instagram_activity', 'no account', insta(0, 0, false), 'missing');

// google_profile: review counts differ for colleges and universities and for skilling.
const profile = (reviewCount: number, exists = true): CheckFacts['google_profile'] => ({ exists, reviewCount });
add('google_profile', 'college 100 reviews', profile(100), 'strong');
add('google_profile', 'college 99 reviews', profile(99), 'okay');
add('google_profile', 'college 30 reviews', profile(30), 'okay');
add('google_profile', 'college 29 reviews', profile(29), 'weak');
add('google_profile', 'college 1 review', profile(1), 'weak');
add('google_profile', 'college profile, no reviews yet', profile(0), 'weak');
add('google_profile', 'college no profile', profile(0, false), 'missing');
add('google_profile', 'skilling 50 reviews', profile(50), 'strong', 'skilling');
add('google_profile', 'skilling 49 reviews', profile(49), 'okay', 'skilling');
add('google_profile', 'skilling 15 reviews', profile(15), 'okay', 'skilling');
add('google_profile', 'skilling 14 reviews', profile(14), 'weak', 'skilling');
add('google_profile', 'skilling 1 review', profile(1), 'weak', 'skilling');
add('google_profile', 'skilling no profile', profile(0, false), 'missing', 'skilling');
add('google_profile', 'the same 60 reviews is Okay for a college', profile(60), 'okay');
add('google_profile', 'and Strong for a skilling institute', profile(60), 'strong', 'skilling');

// youtube: new videos every month, posted in the last 3 months, older, no channel.
const youtube = (monthsWithUploads: number, lastUploadDaysAgo: number | null, exists = true): CheckFacts['youtube'] => ({
  exists,
  channelUrl: exists ? 'https://youtube.example/@college' : null,
  lastUploadDaysAgo,
  monthsWithUploads,
  monthsChecked: 3,
});
add('youtube', 'uploads in all 3 months', youtube(3, 4), 'strong');
add('youtube', '2 of 3 months, last upload 90 days ago', youtube(2, 90), 'okay');
add('youtube', 'last upload 91 days ago', youtube(1, 91), 'weak');
add('youtube', 'a channel with no uploads', youtube(0, null), 'weak');
add('youtube', 'no channel', youtube(0, null, false), 'missing');

// ai_answers: named by 2+, named by 1, only when asked by name, not known.
const ai = (assistantsNaming: number, knownWhenAskedByName: boolean): CheckFacts['ai_answers'] => ({
  question: 'best BBA in Guwahati',
  assistantsAsked: 3,
  assistantsNaming,
  knownWhenAskedByName,
});
add('ai_answers', 'named by 3', ai(3, true), 'strong');
add('ai_answers', 'named by 2', ai(2, true), 'strong');
add('ai_answers', 'named by 1', ai(1, true), 'okay');
add('ai_answers', 'known only by name', ai(0, true), 'weak');
add('ai_answers', 'not known', ai(0, false), 'missing');

// other_socials: active monthly, occasional, inactive, none. The most active page decides.
type Platform = CheckFacts['other_socials']['platforms'][number];
const socials = (...platforms: Platform[]): CheckFacts['other_socials'] => ({ platforms });
const fb = (daysSinceLastPost: number | null, exists = true): Platform => ({ platform: 'facebook', exists, daysSinceLastPost });
const li = (daysSinceLastPost: number | null): Platform => ({ platform: 'linkedin', exists: true, daysSinceLastPost });
add('other_socials', 'posted 31 days ago', socials(fb(31)), 'strong');
add('other_socials', 'posted 32 days ago', socials(fb(32)), 'okay');
add('other_socials', 'posted 90 days ago', socials(fb(90)), 'okay');
add('other_socials', 'posted 91 days ago', socials(fb(91)), 'weak');
add('other_socials', 'a page with no posts', socials(fb(null)), 'weak');
add('other_socials', 'an old Facebook and an active LinkedIn', socials(fb(200), li(12)), 'strong');
add('other_socials', 'no pages', socials(), 'missing');
add('other_socials', 'a page that does not exist', socials(fb(null, false)), 'missing');

// placement_proof: numbers, companies, year, updated in the last year; numbers only or
// older; vague claims; nothing.
const placement = (overrides: Partial<CheckFacts['placement_proof']>): CheckFacts['placement_proof'] => ({
  found: true,
  hasNumbers: true,
  hasCompanies: true,
  year: 2026,
  updatedDaysAgo: 30,
  vagueClaimsOnly: false,
  ...overrides,
});
add('placement_proof', 'full proof, updated 365 days ago', placement({ updatedDaysAgo: 365 }), 'strong');
add('placement_proof', 'full proof, updated 366 days ago', placement({ updatedDaysAgo: 366 }), 'okay');
add('placement_proof', 'numbers without companies', placement({ hasCompanies: false }), 'okay');
add('placement_proof', 'numbers without a year', placement({ year: null }), 'okay');
add('placement_proof', 'vague claims only', placement({ hasNumbers: false, hasCompanies: false, year: null, vagueClaimsOnly: true }), 'weak');
add('placement_proof', 'found, but no numbers', placement({ hasNumbers: false }), 'weak');
add('placement_proof', 'nothing found', placement({ found: false, hasNumbers: false, hasCompanies: false, year: null, updatedDaysAgo: null }), 'missing');

// review_rating: 4.3+ and replies to most, 4.0 to 4.2 or few replies, below 4.0, no reviews.
const rating = (value: number | null, replyRate: number, reviewCount = 120): CheckFacts['review_rating'] => ({ reviewCount, rating: value, replyRate });
add('review_rating', '4.3 with half replied', rating(4.3, 0.5), 'strong');
add('review_rating', '4.3 with few replies', rating(4.3, 0.49), 'okay');
add('review_rating', '4.2 with every reply', rating(4.2, 1), 'okay');
add('review_rating', '4.0', rating(4.0, 0.2), 'okay');
add('review_rating', '3.9', rating(3.9, 0.9), 'weak');
add('review_rating', 'no reviews', rating(null, 0, 0), 'missing');
add('review_rating', 'a rating with no review count', rating(4.5, 0.9, 0), 'missing');

// approvals: all shown with proof, mentioned without proof, some missing, none.
const approvals = (shown: string[], withProof: string[], held: string[] | null): CheckFacts['approvals'] => ({ shown, withProof, held });
const HELD = ['UGC', 'NAAC', 'AICTE'];
add('approvals', 'all shown with proof', approvals(HELD, HELD, HELD), 'strong');
add('approvals', 'all shown, no proof', approvals(HELD, [], HELD), 'okay');
add('approvals', 'all shown, some proof', approvals(HELD, ['UGC'], HELD), 'okay');
add('approvals', 'one held approval not shown', approvals(['UGC', 'NAAC'], ['UGC', 'NAAC'], HELD), 'weak');
add('approvals', 'nothing shown', approvals([], [], HELD), 'missing');
add('approvals', 'no official record: judged on what is shown', approvals(['UGC'], ['UGC'], null), 'strong');
add('approvals', 'skilling recognition, one of two shown', approvals(['NSDC'], ['NSDC'], ['NSDC', 'Skill India']), 'weak', 'skilling');
add('approvals', 'skilling recognition, all shown with proof', approvals(['NSDC', 'Skill India'], ['NSDC', 'Skill India'], ['NSDC', 'Skill India']), 'strong', 'skilling');

// faculty_leaders: full faculty page and leaders in content, faculty page only, names only, none.
const faculty = (overrides: Partial<CheckFacts['faculty_leaders']>): CheckFacts['faculty_leaders'] => ({
  facultyPage: true,
  names: true,
  photos: true,
  qualifications: true,
  leadersInContent: true,
  ...overrides,
});
add('faculty_leaders', 'everything', faculty({}), 'strong');
add('faculty_leaders', 'leaders missing from content', faculty({ leadersInContent: false }), 'okay');
add('faculty_leaders', 'a faculty page without qualifications', faculty({ qualifications: false }), 'okay');
add('faculty_leaders', 'names only', faculty({ facultyPage: false, photos: false, qualifications: false, leadersInContent: false }), 'weak');
add('faculty_leaders', 'none', faculty({ facultyPage: false, names: false, photos: false, qualifications: false, leadersInContent: false }), 'missing');

// students_in_content: every month, sometimes, rarely or stock photos, never.
const students = (monthsWithStudents: number, mostlyStockPhotos = false): CheckFacts['students_in_content'] => ({ monthsChecked: 6, monthsWithStudents, mostlyStockPhotos });
add('students_in_content', '6 of 6 months', students(6), 'strong');
add('students_in_content', '5 of 6 months', students(5), 'okay');
add('students_in_content', '2 of 6 months', students(2), 'okay');
add('students_in_content', '1 of 6 months', students(1), 'weak');
add('students_in_content', 'stock photos', students(0, true), 'weak');
add('students_in_content', 'every month, but stock photos', students(6, true), 'weak');
add('students_in_content', 'never', students(0), 'missing');

// fees_shown: full fees, range or partial, contact us, nothing.
const fees = (disclosure: CheckFacts['fees_shown']['disclosure']): CheckFacts['fees_shown'] => ({ disclosure, amountText: null, pageUrl: null });
add('fees_shown', 'full fees', fees('full'), 'strong');
add('fees_shown', 'a range', fees('partial'), 'okay');
add('fees_shown', 'contact us for fees', fees('on_request'), 'weak');
add('fees_shown', 'nothing', fees('none'), 'missing');

// program_page: own detailed page, short page, combined page, not on the site.
const page = (ownPage: boolean, wordCount: number | null, onCombinedPage = false): CheckFacts['program_page'] => ({ ownPage, onCombinedPage, wordCount, pageUrl: null });
add('program_page', 'own page, 500 words', page(true, 500), 'strong');
add('program_page', 'own page, 499 words', page(true, 499), 'okay');
add('program_page', 'own page, words not counted', page(true, null), 'okay');
add('program_page', 'combined page only', page(false, 80, true), 'weak');
add('program_page', 'not on the site', page(false, null), 'missing');

// easy_enquiry: form and WhatsApp on every page, one of them, hidden on the contact page,
// nothing that works.
const enquiry = (pagesWithForm: number, pagesWithWhatsapp: number, formWorks = true): CheckFacts['easy_enquiry'] => ({
  pagesChecked: 20,
  pagesWithForm,
  pagesWithWhatsapp,
  contactPageOnly: pagesWithForm <= 1,
  formWorks,
});
add('easy_enquiry', 'both on every page', enquiry(20, 20), 'strong');
add('easy_enquiry', 'form everywhere, no WhatsApp', enquiry(20, 0), 'okay');
add('easy_enquiry', 'WhatsApp everywhere, form on the contact page', enquiry(1, 20), 'okay');
add('easy_enquiry', 'WhatsApp everywhere, form broken', enquiry(20, 20, false), 'okay');
add('easy_enquiry', 'form on 19 of 20 pages', enquiry(19, 0), 'weak');
add('easy_enquiry', 'form on the contact page only', enquiry(1, 0), 'weak');
add('easy_enquiry', 'WhatsApp on a few pages', enquiry(0, 3), 'weak');
add('easy_enquiry', 'form broken, no WhatsApp', enquiry(1, 0, false), 'missing');

// admission_steps: steps with dates, steps without dates, vague, none.
const steps = (stepsListed: boolean, datesListed: boolean, vague: boolean): CheckFacts['admission_steps'] => ({ stepsListed, datesListed, vague });
add('admission_steps', 'steps and dates', steps(true, true, false), 'strong');
add('admission_steps', 'steps, no dates', steps(true, false, false), 'okay');
add('admission_steps', 'vague', steps(false, false, true), 'weak');
add('admission_steps', 'none', steps(false, false, false), 'missing');

// mobile_friendly: works fully, small issues, hard to use, broken.
const mobile = (loads: boolean, issues: string[]): CheckFacts['mobile_friendly'] => ({ loads, issues });
add('mobile_friendly', 'no issues', mobile(true, []), 'strong');
add('mobile_friendly', 'one issue', mobile(true, ['Text too small to read']), 'okay');
add('mobile_friendly', 'two issues', mobile(true, ['Text too small to read', 'Buttons too close together']), 'weak');
add('mobile_friendly', 'does not load', mobile(false, []), 'missing');

// page_speed: 90+, 50 to 89, below 50, does not load.
const speed = (loads: boolean, mobileScore: number | null): CheckFacts['page_speed'] => ({ loads, mobileScore });
add('page_speed', '90', speed(true, 90), 'strong');
add('page_speed', '89', speed(true, 89), 'okay');
add('page_speed', '50', speed(true, 50), 'okay');
add('page_speed', '49', speed(true, 49), 'weak');
add('page_speed', 'does not load', speed(false, null), 'missing');
add('page_speed', 'loads, but no score', speed(true, null), 'missing');

describe('classify: fixed thresholds from spec 7.5', () => {
  for (const item of cases) {
    test(`${item.key}: ${item.name} is ${item.expected}`, () => {
      assert.equal(classify(item.key, item.facts as never, { family: item.family ?? college, thresholds }), item.expected);
    });
  }

  test('every check reaches all four results', () => {
    for (const key of CHECK_KEYS) {
      const reached = new Set(cases.filter((item) => item.key === key).map((item) => item.expected));
      assert.deepEqual([...reached].sort(), [...RESULTS].sort(), key);
    }
  });
});

describe('thresholds: fixed now, peer comparison later', () => {
  test('fixed mode uses the config values as they are', () => {
    assert.equal(thresholdsFor(SCORING_V1), SCORING_V1.thresholds);
  });

  test('peer mode needs peer data, and uses it when given', () => {
    const peerConfig = { thresholds: { ...SCORING_V1.thresholds, mode: 'peer' as const } };
    assert.throws(() => thresholdsFor(peerConfig), /peer data/);
    const stricter = thresholdsFor(peerConfig, (fixed) => ({ ...fixed, page_speed: { strongMinScore: 95, okayMinScore: 70 } }));
    assert.equal(classify('page_speed', speed(true, 92), { family: college, thresholds: stricter }), 'okay');
    assert.equal(classify('page_speed', speed(true, 92), { family: college, thresholds: SCORING_V1.thresholds }), 'strong');
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../copy.ts';
import type { CheckFacts } from '../facts.ts';
import { CHECK_KEYS, type CheckKey } from '../types.ts';
import { describeFinding, type FindingContext } from './findings.ts';

// "What Drishti found": plain, factual, no dashes, and never empty.

const college: FindingContext = { institutionType: 'college', programName: 'BBA' };
const skilling: FindingContext = { institutionType: 'skilling', programName: 'Digital Marketing' };

// Four examples per check, one for each result band.
const EXAMPLES: { [K in CheckKey]: ReadonlyArray<CheckFacts[K]> } = {
  google_search: [
    { query: 'BBA in Guwahati', position: 2, resultsChecked: 20 },
    { query: 'BBA in Guwahati', position: 7, resultsChecked: 20 },
    { query: 'BBA in Guwahati', position: 14, resultsChecked: 20 },
    { query: 'BBA in Guwahati', position: null, resultsChecked: 20 },
  ],
  instagram_activity: [
    { handle: 'college', exists: true, postsPerWeek: 4.2, reelShare: 0.7, weeksChecked: 4 },
    { handle: 'college', exists: true, postsPerWeek: 1.5, reelShare: 0.3, weeksChecked: 4 },
    { handle: 'college', exists: true, postsPerWeek: 0, reelShare: 0, weeksChecked: 4 },
    { handle: null, exists: false, postsPerWeek: 0, reelShare: 0, weeksChecked: 4 },
  ],
  google_profile: [
    { exists: true, reviewCount: 212 },
    { exists: true, reviewCount: 45 },
    { exists: true, reviewCount: 1 },
    { exists: false, reviewCount: 0 },
  ],
  youtube: [
    { exists: true, channelUrl: 'https://youtube.example/@c', lastUploadDaysAgo: 4, monthsWithUploads: 3, monthsChecked: 3 },
    { exists: true, channelUrl: 'https://youtube.example/@c', lastUploadDaysAgo: 40, monthsWithUploads: 1, monthsChecked: 3 },
    { exists: true, channelUrl: 'https://youtube.example/@c', lastUploadDaysAgo: null, monthsWithUploads: 0, monthsChecked: 3 },
    { exists: false, channelUrl: null, lastUploadDaysAgo: null, monthsWithUploads: 0, monthsChecked: 3 },
  ],
  ai_answers: [
    { question: 'best BBA in Guwahati', assistantsAsked: 3, assistantsNaming: 2, knownWhenAskedByName: true },
    { question: 'best BBA in Guwahati', assistantsAsked: 3, assistantsNaming: 1, knownWhenAskedByName: true },
    { question: 'best BBA in Guwahati', assistantsAsked: 3, assistantsNaming: 0, knownWhenAskedByName: true },
    { question: 'best BBA in Guwahati', assistantsAsked: 3, assistantsNaming: 0, knownWhenAskedByName: false },
  ],
  other_socials: [
    { platforms: [{ platform: 'facebook', exists: true, daysSinceLastPost: 3 }, { platform: 'linkedin', exists: true, daysSinceLastPost: 1 }] },
    { platforms: [{ platform: 'facebook', exists: true, daysSinceLastPost: 60 }] },
    { platforms: [{ platform: 'linkedin', exists: true, daysSinceLastPost: null }] },
    { platforms: [] },
  ],
  placement_proof: [
    { found: true, hasNumbers: true, hasCompanies: true, year: 2026, updatedDaysAgo: 30, vagueClaimsOnly: false },
    { found: true, hasNumbers: true, hasCompanies: false, year: 2025, updatedDaysAgo: 200, vagueClaimsOnly: false },
    { found: true, hasNumbers: false, hasCompanies: false, year: null, updatedDaysAgo: 90, vagueClaimsOnly: true },
    { found: false, hasNumbers: false, hasCompanies: false, year: null, updatedDaysAgo: null, vagueClaimsOnly: false },
  ],
  review_rating: [
    { reviewCount: 212, rating: 4.5, replyRate: 0.8 },
    { reviewCount: 45, rating: 4.1, replyRate: 0.2 },
    { reviewCount: 12, rating: 3.6, replyRate: 0 },
    { reviewCount: 0, rating: null, replyRate: 0 },
  ],
  approvals: [
    { shown: ['UGC', 'NAAC'], withProof: ['UGC', 'NAAC'], held: ['UGC', 'NAAC'] },
    { shown: ['UGC', 'NAAC'], withProof: [], held: ['UGC', 'NAAC'] },
    { shown: ['UGC'], withProof: [], held: ['UGC', 'NAAC', 'AICTE'] },
    { shown: [], withProof: [], held: ['UGC', 'NAAC'] },
  ],
  faculty_leaders: [
    { facultyPage: true, names: true, photos: true, qualifications: true, leadersInContent: true },
    { facultyPage: true, names: true, photos: true, qualifications: false, leadersInContent: false },
    { facultyPage: false, names: true, photos: false, qualifications: false, leadersInContent: false },
    { facultyPage: false, names: false, photos: false, qualifications: false, leadersInContent: false },
  ],
  students_in_content: [
    { monthsChecked: 6, monthsWithStudents: 6, mostlyStockPhotos: false },
    { monthsChecked: 6, monthsWithStudents: 3, mostlyStockPhotos: false },
    { monthsChecked: 6, monthsWithStudents: 0, mostlyStockPhotos: true },
    { monthsChecked: 6, monthsWithStudents: 0, mostlyStockPhotos: false },
  ],
  fees_shown: [
    { disclosure: 'full', amountText: '₹1,20,000 a year, all fees listed', pageUrl: null },
    { disclosure: 'partial', amountText: '₹1,00,000 to ₹1,50,000 a year', pageUrl: null },
    { disclosure: 'on_request', amountText: 'Contact us for fees', pageUrl: null },
    { disclosure: 'none', amountText: null, pageUrl: null },
  ],
  program_page: [
    { ownPage: true, onCombinedPage: false, wordCount: 820, pageUrl: null },
    { ownPage: true, onCombinedPage: false, wordCount: 240, pageUrl: null },
    { ownPage: false, onCombinedPage: true, wordCount: 90, pageUrl: null },
    { ownPage: false, onCombinedPage: false, wordCount: null, pageUrl: null },
  ],
  easy_enquiry: [
    { pagesChecked: 24, pagesWithForm: 24, pagesWithWhatsapp: 24, contactPageOnly: false, formWorks: true },
    { pagesChecked: 24, pagesWithForm: 24, pagesWithWhatsapp: 0, contactPageOnly: false, formWorks: true },
    { pagesChecked: 24, pagesWithForm: 1, pagesWithWhatsapp: 0, contactPageOnly: true, formWorks: true },
    { pagesChecked: 24, pagesWithForm: 1, pagesWithWhatsapp: 0, contactPageOnly: true, formWorks: false },
  ],
  admission_steps: [
    { stepsListed: true, datesListed: true, vague: false },
    { stepsListed: true, datesListed: false, vague: false },
    { stepsListed: false, datesListed: false, vague: true },
    { stepsListed: false, datesListed: false, vague: false },
  ],
  mobile_friendly: [
    { loads: true, issues: [] },
    { loads: true, issues: ['Text too small to read'] },
    { loads: true, issues: ['Text too small to read', 'Buttons too close together', 'Pop up covers the page'] },
    { loads: false, issues: [] },
  ],
  page_speed: [
    { loads: true, mobileScore: 94 },
    { loads: true, mobileScore: 62 },
    { loads: true, mobileScore: 31 },
    { loads: false, mobileScore: null },
  ],
};

describe('what Drishti found', () => {
  test('every check, every band: a full sentence with no dashes', () => {
    for (const key of CHECK_KEYS) {
      for (const context of [college, skilling]) {
        for (const facts of EXAMPLES[key]) {
          const text = describeFinding(key, facts as never, context);
          assert.ok(text.length > 10, `${key}: "${text}"`);
          assert.match(text, /\.$/, `${key} ends with a full stop: "${text}"`);
          assert.equal(hasDashes(text), false, `${key}: "${text}"`);
          assert.doesNotMatch(text, /undefined|null|NaN/, `${key}: "${text}"`);
        }
      }
    }
  });

  test('says exactly what was found', () => {
    assert.equal(describeFinding('google_search', EXAMPLES.google_search[1] as never, college), 'Position 7 on Google for “BBA in Guwahati”.');
    assert.equal(describeFinding('google_search', EXAMPLES.google_search[3] as never, college), 'Not in the top 20 Google results for “BBA in Guwahati”.');
    assert.equal(describeFinding('review_rating', EXAMPLES.review_rating[1] as never, college), 'Rated 4.1 from 45 reviews. Replies to 20% of reviews.');
    assert.equal(describeFinding('fees_shown', EXAMPLES.fees_shown[2] as never, college), 'The BBA page says “Contact us for fees”.');
    assert.equal(describeFinding('fees_shown', EXAMPLES.fees_shown[3] as never, college), 'No fees found for BBA.');
    assert.equal(describeFinding('approvals', EXAMPLES.approvals[2] as never, college), 'Shows UGC. NAAC and AICTE are held but not shown.');
    assert.equal(describeFinding('approvals', EXAMPLES.approvals[0] as never, college), 'Shows UGC and NAAC, each with proof or a link.');
    assert.equal(describeFinding('approvals', EXAMPLES.approvals[3] as never, skilling), 'No skilling recognition shown on the website.');
    assert.equal(describeFinding('instagram_activity', EXAMPLES.instagram_activity[0] as never, college), 'About 4.2 posts a week over the last 4 weeks. 70% of them are reels.');
    assert.equal(describeFinding('mobile_friendly', EXAMPLES.mobile_friendly[2] as never, college), 'On a phone: Text too small to read, buttons too close together and pop up covers the page.');
    assert.equal(describeFinding('program_page', EXAMPLES.program_page[1] as never, skilling), 'Digital Marketing has its own page, about 240 words.');
    assert.equal(describeFinding('other_socials', EXAMPLES.other_socials[0] as never, college), 'Facebook: last post 3 days ago. LinkedIn: last post 1 day ago.');
  });
});

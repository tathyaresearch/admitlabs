// Turns an intended result (Strong, Okay, Weak, Missing) into realistic raw facts that sit
// inside that result's band under scoring config v1. Mocks use this so the sample data lands
// where the sample profiles say, while still storing facts the way a real provider would.

import { SCORING_V1 } from '../../config/scoring.v1.ts';
import type { CheckResult, ScoringFamily } from '../../domain/types.ts';
import type {
  AdmissionStepsValue,
  AiAnswersValue,
  EasyEnquiryValue,
  FacultyLeadersValue,
  FeesShownValue,
  GoogleProfileValue,
  GoogleSearchValue,
  InstagramActivityValue,
  MobileFriendlyValue,
  OtherSocialsValue,
  PageSpeedValue,
  PlacementProofValue,
  ProgramPageValue,
  ReviewRatingValue,
  StudentsInContentValue,
  YoutubeValue,
} from '../signals.ts';
import type { Rng } from './random.ts';

const T = SCORING_V1.thresholds;

export function googleSearchFacts(result: CheckResult, rng: Rng, query: string): GoogleSearchValue {
  const t = T.google_search;
  const position =
    result === 'strong'
      ? rng.int(1, t.strongMaxPosition)
      : result === 'okay'
        ? rng.int(t.strongMaxPosition + 1, t.okayMaxPosition)
        : result === 'weak'
          ? rng.int(t.okayMaxPosition + 1, t.weakMaxPosition)
          : null;
  return { query, position, resultsChecked: t.weakMaxPosition };
}

export function instagramFacts(result: CheckResult, rng: Rng, handle: string | null): InstagramActivityValue {
  const t = T.instagram_activity;
  const weeksChecked = 4;
  if (result === 'missing' || !handle) return { handle: null, exists: false, postsPerWeek: 0, reelShare: 0, weeksChecked };
  if (result === 'strong') {
    return { handle, exists: true, postsPerWeek: rng.between(t.strongMinPostsPerWeek, 6), reelShare: rng.between(0.55, 0.85, 2), weeksChecked };
  }
  if (result === 'okay') {
    return { handle, exists: true, postsPerWeek: rng.between(t.okayMinPostsPerWeek, 2.8), reelShare: rng.between(0.2, 0.6, 2), weeksChecked };
  }
  return { handle, exists: true, postsPerWeek: rng.between(0.2, 0.8), reelShare: rng.between(0, 0.4, 2), weeksChecked };
}

/** Review count for a Google profile result. Shared by google_profile and review_rating. */
export function reviewCountFor(result: CheckResult, rng: Rng, family: ScoringFamily): number {
  const t = T.google_profile[family];
  if (result === 'strong') return rng.int(t.strongMinReviews, t.strongMinReviews * 3);
  if (result === 'okay') return rng.int(t.okayMinReviews, t.strongMinReviews - 1);
  if (result === 'weak') return rng.int(t.weakMinReviews, t.okayMinReviews - 1);
  return 0;
}

export function googleProfileFacts(reviewCount: number, exists: boolean): GoogleProfileValue {
  return { exists, reviewCount: exists ? reviewCount : 0 };
}

export function reviewRatingFacts(result: CheckResult, rng: Rng, reviewCount: number): ReviewRatingValue {
  const t = T.review_rating;
  if (result === 'missing' || reviewCount === 0) return { reviewCount: 0, rating: null, replyRate: 0 };
  if (result === 'strong') {
    return { reviewCount, rating: rng.between(t.strongMinRating, 4.8), replyRate: rng.between(t.strongMinReplyRate + 0.05, 0.92, 2) };
  }
  if (result === 'okay') {
    // Either 4.0 to 4.2, or 4.3 and above with few replies.
    return rng.chance(0.6)
      ? { reviewCount, rating: rng.between(t.okayMinRating, t.strongMinRating - 0.1), replyRate: rng.between(0.1, 0.8, 2) }
      : { reviewCount, rating: rng.between(t.strongMinRating, 4.7), replyRate: rng.between(0.05, t.strongMinReplyRate - 0.1, 2) };
  }
  return { reviewCount, rating: rng.between(3.1, t.okayMinRating - 0.1), replyRate: rng.between(0, 0.3, 2) };
}

export function youtubeFacts(result: CheckResult, rng: Rng, channelUrl: string | null): YoutubeValue {
  const t = T.youtube;
  if (result === 'missing' || !channelUrl) {
    return { exists: false, channelUrl: null, lastUploadDaysAgo: null, monthsWithUploads: 0, monthsChecked: t.monthsChecked };
  }
  if (result === 'strong') {
    return { exists: true, channelUrl, lastUploadDaysAgo: rng.int(1, 20), monthsWithUploads: t.strongMonthsWithUploads, monthsChecked: t.monthsChecked };
  }
  if (result === 'okay') {
    return {
      exists: true,
      channelUrl,
      lastUploadDaysAgo: rng.int(12, t.okayMaxDaysSinceUpload - 5),
      monthsWithUploads: rng.int(1, t.strongMonthsWithUploads - 1),
      monthsChecked: t.monthsChecked,
    };
  }
  return { exists: true, channelUrl, lastUploadDaysAgo: rng.int(t.okayMaxDaysSinceUpload + 30, 640), monthsWithUploads: 0, monthsChecked: t.monthsChecked };
}

export function aiAnswersFacts(result: CheckResult, rng: Rng, question: string): AiAnswersValue {
  const t = T.ai_answers;
  const base = { question, assistantsAsked: t.assistantsAsked };
  if (result === 'strong') return { ...base, assistantsNaming: rng.int(t.strongMinAssistants, t.assistantsAsked), knownWhenAskedByName: true };
  if (result === 'okay') return { ...base, assistantsNaming: t.okayMinAssistants, knownWhenAskedByName: true };
  if (result === 'weak') return { ...base, assistantsNaming: 0, knownWhenAskedByName: true };
  return { ...base, assistantsNaming: 0, knownWhenAskedByName: false };
}

export function otherSocialsFacts(
  result: CheckResult,
  rng: Rng,
  links: { facebook?: string; linkedin?: string },
): OtherSocialsValue {
  const t = T.other_socials;
  const present = (['facebook', 'linkedin'] as const).filter((platform) => Boolean(links[platform]));
  if (result === 'missing' || present.length === 0) return { platforms: [] };
  const bestDays =
    result === 'strong'
      ? rng.int(1, t.strongMaxDaysSincePost - 6)
      : result === 'okay'
        ? rng.int(t.strongMaxDaysSincePost + 4, t.okayMaxDaysSincePost - 5)
        : rng.int(t.okayMaxDaysSincePost + 30, 420);
  return {
    platforms: present.map((platform, index) => ({
      platform,
      exists: true,
      daysSinceLastPost: index === 0 ? bestDays : bestDays + rng.int(8, 120),
    })),
  };
}

export function placementProofFacts(result: CheckResult, rng: Rng, year: number): PlacementProofValue {
  const t = T.placement_proof;
  if (result === 'strong') {
    return { found: true, hasNumbers: true, hasCompanies: true, year, updatedDaysAgo: rng.int(12, t.strongMaxAgeDays - 120), vagueClaimsOnly: false };
  }
  if (result === 'okay') {
    // Numbers only, or proof that has gone stale.
    return rng.chance(0.6)
      ? { found: true, hasNumbers: true, hasCompanies: false, year, updatedDaysAgo: rng.int(20, 300), vagueClaimsOnly: false }
      : { found: true, hasNumbers: true, hasCompanies: true, year: year - 2, updatedDaysAgo: rng.int(t.strongMaxAgeDays + 60, 900), vagueClaimsOnly: false };
  }
  if (result === 'weak') {
    return { found: true, hasNumbers: false, hasCompanies: false, year: null, updatedDaysAgo: rng.int(60, 700), vagueClaimsOnly: true };
  }
  return { found: false, hasNumbers: false, hasCompanies: false, year: null, updatedDaysAgo: null, vagueClaimsOnly: false };
}

export function approvalsShownFacts(result: CheckResult, rng: Rng, held: readonly string[]): { shown: string[]; withProof: string[] } {
  if (result === 'strong') return { shown: [...held], withProof: [...held] };
  if (result === 'okay') return { shown: [...held], withProof: [] };
  if (result === 'weak') {
    const keep = Math.max(1, held.length - rng.int(1, Math.max(1, held.length - 1)));
    return { shown: held.slice(0, keep), withProof: [] };
  }
  return { shown: [], withProof: [] };
}

export function facultyLeadersFacts(result: CheckResult): FacultyLeadersValue {
  if (result === 'strong') return { facultyPage: true, names: true, photos: true, qualifications: true, leadersInContent: true };
  if (result === 'okay') return { facultyPage: true, names: true, photos: true, qualifications: false, leadersInContent: false };
  if (result === 'weak') return { facultyPage: false, names: true, photos: false, qualifications: false, leadersInContent: false };
  return { facultyPage: false, names: false, photos: false, qualifications: false, leadersInContent: false };
}

export function studentsInContentFacts(result: CheckResult, rng: Rng): StudentsInContentValue {
  const t = T.students_in_content;
  if (result === 'strong') return { monthsChecked: t.monthsChecked, monthsWithStudents: t.strongMinMonths, mostlyStockPhotos: false };
  if (result === 'okay') return { monthsChecked: t.monthsChecked, monthsWithStudents: rng.int(t.okayMinMonths, t.strongMinMonths - 1), mostlyStockPhotos: false };
  if (result === 'weak') {
    return rng.chance(0.5)
      ? { monthsChecked: t.monthsChecked, monthsWithStudents: 1, mostlyStockPhotos: false }
      : { monthsChecked: t.monthsChecked, monthsWithStudents: 0, mostlyStockPhotos: true };
  }
  return { monthsChecked: t.monthsChecked, monthsWithStudents: 0, mostlyStockPhotos: false };
}

const inr = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export function feesShownFacts(result: CheckResult, rng: Rng, pageUrl: string): FeesShownValue {
  const base = rng.int(6, 18) * 10_000;
  if (result === 'strong') return { disclosure: 'full', amountText: `${inr(base)} a year, all fees listed`, pageUrl };
  if (result === 'okay') return { disclosure: 'partial', amountText: `${inr(base - 20_000)} to ${inr(base + 30_000)} a year`, pageUrl };
  if (result === 'weak') return { disclosure: 'on_request', amountText: 'Contact us for fees', pageUrl };
  return { disclosure: 'none', amountText: null, pageUrl: null };
}

export function programPageFacts(result: CheckResult, rng: Rng, pageUrl: string, combinedUrl: string): ProgramPageValue {
  const t = T.program_page;
  if (result === 'strong') return { ownPage: true, onCombinedPage: false, wordCount: rng.int(t.strongMinWords + 100, 1500), pageUrl };
  if (result === 'okay') return { ownPage: true, onCombinedPage: false, wordCount: rng.int(120, t.strongMinWords - 60), pageUrl };
  if (result === 'weak') return { ownPage: false, onCombinedPage: true, wordCount: rng.int(40, 140), pageUrl: combinedUrl };
  return { ownPage: false, onCombinedPage: false, wordCount: null, pageUrl: null };
}

export function easyEnquiryFacts(result: CheckResult, rng: Rng): EasyEnquiryValue {
  const pagesChecked = rng.int(18, 40);
  if (result === 'strong') return { pagesChecked, pagesWithForm: pagesChecked, pagesWithWhatsapp: pagesChecked, contactPageOnly: false, formWorks: true };
  if (result === 'okay') {
    return rng.chance(0.5)
      ? { pagesChecked, pagesWithForm: pagesChecked, pagesWithWhatsapp: 0, contactPageOnly: false, formWorks: true }
      : { pagesChecked, pagesWithForm: 1, pagesWithWhatsapp: pagesChecked, contactPageOnly: false, formWorks: true };
  }
  if (result === 'weak') return { pagesChecked, pagesWithForm: 1, pagesWithWhatsapp: 0, contactPageOnly: true, formWorks: true };
  return { pagesChecked, pagesWithForm: 1, pagesWithWhatsapp: 0, contactPageOnly: true, formWorks: false };
}

export function admissionStepsFacts(result: CheckResult): AdmissionStepsValue {
  if (result === 'strong') return { stepsListed: true, datesListed: true, vague: false };
  if (result === 'okay') return { stepsListed: true, datesListed: false, vague: false };
  if (result === 'weak') return { stepsListed: false, datesListed: false, vague: true };
  return { stepsListed: false, datesListed: false, vague: false };
}

const MOBILE_ISSUES = [
  'Text too small to read',
  'Buttons too close together',
  'Page wider than the screen',
  'Menu hard to open',
  'Pop up covers the page',
] as const;

export function mobileFriendlyFacts(result: CheckResult, rng: Rng): MobileFriendlyValue {
  const t = T.mobile_friendly;
  if (result === 'missing') return { loads: false, issues: [] };
  const count = result === 'strong' ? 0 : result === 'okay' ? t.okayMaxIssues : rng.int(t.okayMaxIssues + 1, 4);
  const start = rng.int(0, MOBILE_ISSUES.length - 1);
  const issues = Array.from({ length: count }, (_, index) => MOBILE_ISSUES[(start + index) % MOBILE_ISSUES.length] as string);
  return { loads: true, issues };
}

export function pageSpeedFacts(result: CheckResult, rng: Rng): PageSpeedValue {
  const t = T.page_speed;
  if (result === 'strong') return { loads: true, mobileScore: rng.int(t.strongMinScore, 99) };
  if (result === 'okay') return { loads: true, mobileScore: rng.int(t.okayMinScore, t.strongMinScore - 1) };
  if (result === 'weak') return { loads: true, mobileScore: rng.int(12, t.okayMinScore - 1) };
  return { loads: false, mobileScore: null };
}

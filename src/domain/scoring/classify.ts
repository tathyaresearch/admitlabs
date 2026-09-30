// Facts in, Strong, Okay, Weak or Missing out: the rules in spec section 7.5, one function
// per check. Every number comes from the thresholds in the scoring config.
//
// Thresholds are worked out in one step before any check is classified (thresholdsFor).
// Today that step returns the fixed values. When enough institutions are audited, peer
// comparison can supply cut-offs from peer data instead, and nothing below changes.

import type { CheckFacts } from '../facts.ts';
import type { ScoringConfig, Thresholds } from '../scoring-config.ts';
import type { CheckKey, CheckResult, ScoringFamily } from '../types.ts';

export interface ClassifyContext {
  family: ScoringFamily;
  thresholds: Thresholds;
}

/** Cut-offs worked out from peers (same type, same region). Not built yet: the seam for later. */
export type PeerThresholds = (fixed: Thresholds) => Thresholds;

export function thresholdsFor(config: Pick<ScoringConfig, 'thresholds'>, peer?: PeerThresholds): Thresholds {
  if (config.thresholds.mode === 'fixed') return config.thresholds;
  if (!peer) throw new Error('This scoring config compares with peers, but no peer data was given.');
  return peer(config.thresholds);
}

type Classifier<K extends CheckKey> = (facts: CheckFacts[K], context: ClassifyContext) => CheckResult;

const CLASSIFIERS: { readonly [K in CheckKey]: Classifier<K> } = {
  // Strong: top 3. Okay: rest of page 1. Weak: page 2. Missing: not in the top 20.
  google_search(facts, { thresholds }) {
    const t = thresholds.google_search;
    const position = facts.position;
    if (position === null || position < 1) return 'missing';
    if (position <= t.strongMaxPosition) return 'strong';
    if (position <= t.okayMaxPosition) return 'okay';
    if (position <= t.weakMaxPosition) return 'weak';
    return 'missing';
  },

  // Strong: 3+ posts a week, mostly reels. Okay: 1 to 2 a week. Weak: less than once a week.
  // Missing: no account. Plenty of posts without reels still counts as Okay.
  instagram_activity(facts, { thresholds }) {
    const t = thresholds.instagram_activity;
    if (!facts.exists) return 'missing';
    if (facts.postsPerWeek >= t.strongMinPostsPerWeek && facts.reelShare >= t.strongMinReelShare) return 'strong';
    if (facts.postsPerWeek >= t.okayMinPostsPerWeek) return 'okay';
    return 'weak';
  },

  // Missing means no profile. A profile with no reviews yet still exists, so it counts as Weak.
  google_profile(facts, { thresholds, family }) {
    const t = thresholds.google_profile[family];
    if (!facts.exists) return 'missing';
    if (facts.reviewCount >= t.strongMinReviews) return 'strong';
    if (facts.reviewCount >= t.okayMinReviews) return 'okay';
    return 'weak';
  },

  // Strong: new videos every month. Okay: posted in the last 3 months. Weak: older, or a
  // channel with no uploads. Missing: no channel.
  youtube(facts, { thresholds }) {
    const t = thresholds.youtube;
    if (!facts.exists) return 'missing';
    if (facts.monthsWithUploads >= t.strongMonthsWithUploads) return 'strong';
    if (facts.lastUploadDaysAgo !== null && facts.lastUploadDaysAgo <= t.okayMaxDaysSinceUpload) return 'okay';
    return 'weak';
  },

  // Strong: named by 2+ assistants. Okay: named by 1. Weak: only known when asked by name.
  // Missing: not known.
  ai_answers(facts, { thresholds }) {
    const t = thresholds.ai_answers;
    if (facts.assistantsNaming >= t.strongMinAssistants) return 'strong';
    if (facts.assistantsNaming >= t.okayMinAssistants) return 'okay';
    if (facts.knownWhenAskedByName) return 'weak';
    return 'missing';
  },

  // Strong: active monthly. Okay: occasional. Weak: inactive. Missing: none.
  // The most active of Facebook and LinkedIn decides.
  other_socials(facts, { thresholds }) {
    const t = thresholds.other_socials;
    const present = facts.platforms.filter((platform) => platform.exists);
    if (present.length === 0) return 'missing';
    const days = present.flatMap((platform) => (platform.daysSinceLastPost === null ? [] : [platform.daysSinceLastPost]));
    const freshest = days.length ? Math.min(...days) : null;
    if (freshest !== null && freshest <= t.strongMaxDaysSincePost) return 'strong';
    if (freshest !== null && freshest <= t.okayMaxDaysSincePost) return 'okay';
    return 'weak';
  },

  // Strong: numbers, companies, year, updated in the last year. Okay: numbers only, or older.
  // Weak: vague claims. Missing: nothing.
  placement_proof(facts, { thresholds }) {
    const t = thresholds.placement_proof;
    if (!facts.found) return 'missing';
    if (facts.vagueClaimsOnly || !facts.hasNumbers) return 'weak';
    const recent = facts.updatedDaysAgo !== null && facts.updatedDaysAgo <= t.strongMaxAgeDays;
    if (facts.hasCompanies && facts.year !== null && recent) return 'strong';
    return 'okay';
  },

  // Strong: 4.3+ and replies to most. Okay: 4.0 to 4.2, or few replies. Weak: below 4.0.
  // Missing: no reviews.
  review_rating(facts, { thresholds }) {
    const t = thresholds.review_rating;
    if (facts.reviewCount <= 0 || facts.rating === null) return 'missing';
    if (facts.rating >= t.strongMinRating && facts.replyRate >= t.strongMinReplyRate) return 'strong';
    if (facts.rating >= t.okayMinRating) return 'okay';
    return 'weak';
  },

  // Strong: all shown, with proof or a link. Okay: mentioned, no proof. Weak: some missing.
  // Missing: none. "All" means everything official records say the institution holds.
  approvals(facts) {
    if (facts.shown.length === 0) return 'missing';
    const expected = facts.held && facts.held.length > 0 ? facts.held : facts.shown;
    if (expected.some((name) => !facts.shown.includes(name))) return 'weak';
    if (expected.every((name) => facts.withProof.includes(name))) return 'strong';
    return 'okay';
  },

  // Strong: faculty page with names, photos, qualifications, and leaders in content.
  // Okay: faculty page only. Weak: names only. Missing: none.
  faculty_leaders(facts) {
    if (facts.facultyPage && facts.names && facts.photos && facts.qualifications && facts.leadersInContent) return 'strong';
    if (facts.facultyPage) return 'okay';
    if (facts.names) return 'weak';
    return 'missing';
  },

  // Strong: every month. Okay: sometimes. Weak: rarely, or stock photos. Missing: never.
  students_in_content(facts, { thresholds }) {
    const t = thresholds.students_in_content;
    if (facts.monthsWithStudents >= t.strongMinMonths && !facts.mostlyStockPhotos) return 'strong';
    if (facts.monthsWithStudents >= t.okayMinMonths && !facts.mostlyStockPhotos) return 'okay';
    if (facts.monthsWithStudents >= 1 || facts.mostlyStockPhotos) return 'weak';
    return 'missing';
  },

  // Strong: full fees for the program. Okay: range or partial. Weak: "Contact us for fees".
  // Missing: nothing.
  fees_shown(facts) {
    if (facts.disclosure === 'full') return 'strong';
    if (facts.disclosure === 'partial') return 'okay';
    if (facts.disclosure === 'on_request') return 'weak';
    return 'missing';
  },

  // Strong: its own detailed page. Okay: short or thin page. Weak: only on a combined page.
  // Missing: not on the site.
  program_page(facts, { thresholds }) {
    const t = thresholds.program_page;
    if (facts.ownPage && (facts.wordCount ?? 0) >= t.strongMinWords) return 'strong';
    if (facts.ownPage) return 'okay';
    if (facts.onCombinedPage) return 'weak';
    return 'missing';
  },

  // Strong: form and WhatsApp on every page. Okay: one of them. Weak: hidden on the contact
  // page. Missing: no way to enquire that works.
  easy_enquiry(facts) {
    const pages = Math.max(1, facts.pagesChecked);
    const formEverywhere = facts.formWorks && facts.pagesWithForm >= pages;
    const whatsappEverywhere = facts.pagesWithWhatsapp >= pages;
    if (formEverywhere && whatsappEverywhere) return 'strong';
    if (formEverywhere || whatsappEverywhere) return 'okay';
    const somewhere = (facts.formWorks && facts.pagesWithForm > 0) || facts.pagesWithWhatsapp > 0;
    return somewhere ? 'weak' : 'missing';
  },

  // Strong: step by step with dates. Okay: steps, no dates. Weak: vague. Missing: none.
  admission_steps(facts) {
    if (facts.stepsListed && facts.datesListed) return 'strong';
    if (facts.stepsListed) return 'okay';
    if (facts.vague) return 'weak';
    return 'missing';
  },

  // Strong: works fully. Okay: small issues. Weak: hard to use. Missing: broken.
  mobile_friendly(facts, { thresholds }) {
    const t = thresholds.mobile_friendly;
    if (!facts.loads) return 'missing';
    if (facts.issues.length === 0) return 'strong';
    if (facts.issues.length <= t.okayMaxIssues) return 'okay';
    return 'weak';
  },

  // Strong: Google speed score 90+. Okay: 50 to 89. Weak: below 50. Missing: does not load.
  page_speed(facts, { thresholds }) {
    const t = thresholds.page_speed;
    if (!facts.loads || facts.mobileScore === null) return 'missing';
    if (facts.mobileScore >= t.strongMinScore) return 'strong';
    if (facts.mobileScore >= t.okayMinScore) return 'okay';
    return 'weak';
  },
};

/** The result for one check. */
export function classify<K extends CheckKey>(key: K, facts: CheckFacts[K], context: ClassifyContext): CheckResult {
  const classifier = CLASSIFIERS[key] as Classifier<K>;
  return classifier(facts, context);
}

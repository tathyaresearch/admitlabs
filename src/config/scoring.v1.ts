// Scoring config version 1: the starting values from spec sections 7.4 and 7.5.
// Every number here is [ADJUSTABLE]. Change them by adding a new version, not by editing
// code in the engine. Seeded into the scoring_config table by scripts/seed.ts.

import type { ScoringConfig } from '../domain/scoring-config.ts';

const CHOSEN_WEIGHTS = {
  fees_shown: 25,
  program_page: 20,
  easy_enquiry: 20,
  admission_steps: 15,
  mobile_friendly: 10,
  page_speed: 10,
} as const;

export const SCORING_V1: ScoringConfig = {
  version: 1,

  resultShares: {
    strong: 1,
    okay: 0.6,
    weak: 0.3,
    missing: 0,
  },

  weights: {
    college_university: {
      discovered: {
        google_search: 30,
        instagram_activity: 25,
        google_profile: 20,
        youtube: 10,
        ai_answers: 10,
        other_socials: 5,
      },
      trusted: {
        placement_proof: 30,
        review_rating: 25,
        approvals: 20,
        faculty_leaders: 15,
        students_in_content: 10,
      },
      chosen: CHOSEN_WEIGHTS,
    },
    // Skilling: Google profile and reviews count more; YouTube and AI answers count less.
    skilling: {
      discovered: {
        google_search: 30,
        instagram_activity: 25,
        google_profile: 30,
        youtube: 5,
        ai_answers: 5,
        other_socials: 5,
      },
      trusted: {
        placement_proof: 30,
        review_rating: 30,
        approvals: 20,
        faculty_leaders: 10,
        students_in_content: 10,
      },
      chosen: CHOSEN_WEIGHTS,
    },
  },

  labels: [
    { label: 'Strong', min: 70, max: 100 },
    { label: 'Needs work', min: 40, max: 69 },
    { label: 'Getting started', min: 0, max: 39 },
  ],

  thresholds: {
    mode: 'fixed',
    // Strong: top 3. Okay: rest of page 1. Weak: page 2. Missing: not in the top 20.
    google_search: { strongMaxPosition: 3, okayMaxPosition: 10, weakMaxPosition: 20 },
    // Strong: 3+ posts a week, mostly reels. Okay: 1 to 2 a week. Weak: less than once a week. Missing: no account.
    instagram_activity: { strongMinPostsPerWeek: 3, strongMinReelShare: 0.5, okayMinPostsPerWeek: 1 },
    // Missing: no profile.
    google_profile: {
      college_university: { strongMinReviews: 100, okayMinReviews: 30, weakMinReviews: 1 },
      skilling: { strongMinReviews: 50, okayMinReviews: 15, weakMinReviews: 1 },
    },
    // Strong: new videos every month. Okay: posted in the last 3 months. Weak: older. Missing: no channel.
    youtube: { strongMonthsWithUploads: 3, monthsChecked: 3, okayMaxDaysSinceUpload: 90 },
    // Strong: named by 2+ assistants. Okay: named by 1. Weak: only when asked by name. Missing: not known.
    ai_answers: { assistantsAsked: 3, strongMinAssistants: 2, okayMinAssistants: 1 },
    // Strong: active monthly. Okay: occasional. Weak: inactive. Missing: none.
    other_socials: { strongMaxDaysSincePost: 31, okayMaxDaysSincePost: 90 },
    // Strong: numbers, companies, year, updated in the last year. Okay: numbers only, or older.
    // Weak: vague claims. Missing: nothing.
    placement_proof: { strongMaxAgeDays: 365 },
    // Strong: 4.3+ and replies to most. Okay: 4.0 to 4.2, or few replies. Weak: below 4.0. Missing: no reviews.
    review_rating: { strongMinRating: 4.3, strongMinReplyRate: 0.5, okayMinRating: 4.0 },
    // Strong: all shown with proof or link. Okay: mentioned, no proof. Weak: some missing. Missing: none.
    approvals: {},
    // Strong: faculty page with names, photos, qualifications, and leaders in content.
    // Okay: faculty page only. Weak: names only. Missing: none.
    faculty_leaders: {},
    // Strong: every month. Okay: sometimes. Weak: rarely, or stock photos. Missing: never.
    students_in_content: { monthsChecked: 6, strongMinMonths: 6, okayMinMonths: 2 },
    // Strong: full fees. Okay: range or partial. Weak: "Contact us for fees". Missing: nothing.
    fees_shown: {},
    // Strong: own detailed page. Okay: short or thin page. Weak: only on a combined page. Missing: not on site.
    program_page: { strongMinWords: 500 },
    // Strong: form and WhatsApp on every page. Okay: one of them. Weak: hidden on the contact page. Missing: not working.
    easy_enquiry: {},
    // Strong: step by step with dates. Okay: steps, no dates. Weak: vague. Missing: none.
    admission_steps: {},
    // Strong: works fully. Okay: small issues. Weak: hard to use. Missing: broken.
    mobile_friendly: { okayMaxIssues: 1 },
    // Strong: Google speed score 90+. Okay: 50 to 89. Weak: below 50. Missing: does not load.
    page_speed: { strongMinScore: 90, okayMinScore: 50 },
  },
};

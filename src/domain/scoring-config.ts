// Shape of a scoring config. Every value in it is [ADJUSTABLE] (spec section 7.4 and 7.5).
// The active version lives in the scoring_config table; src/config/scoring.v1.ts is version 1.

import type { CheckKey, CheckResult, Pillar, ScoringFamily } from './types.ts';

export type PillarWeights = Readonly<Partial<Record<CheckKey, number>>>;

export interface ScoreLabelBand {
  label: 'Strong' | 'Needs work' | 'At risk';
  min: number;
  max: number;
}

interface ReviewCountBands {
  strongMinReviews: number;
  okayMinReviews: number;
  weakMinReviews: number;
}

/**
 * Fixed rules from spec section 7.5. `mode` leaves room for the later switch to peer
 * comparison (same type, same region) without changing the shape of the rest.
 */
export interface Thresholds {
  mode: 'fixed' | 'peer';
  google_search: { strongMaxPosition: number; okayMaxPosition: number; weakMaxPosition: number };
  instagram_activity: { strongMinPostsPerWeek: number; strongMinReelShare: number; okayMinPostsPerWeek: number };
  google_profile: Readonly<Record<ScoringFamily, ReviewCountBands>>;
  youtube: { strongMonthsWithUploads: number; monthsChecked: number; okayMaxDaysSinceUpload: number };
  ai_answers: { assistantsAsked: number; strongMinAssistants: number; okayMinAssistants: number };
  other_socials: { strongMaxDaysSincePost: number; okayMaxDaysSincePost: number };
  placement_proof: { strongMaxAgeDays: number };
  review_rating: { strongMinRating: number; strongMinReplyRate: number; okayMinRating: number };
  approvals: Readonly<Record<string, never>>;
  faculty_leaders: Readonly<Record<string, never>>;
  students_in_content: { monthsChecked: number; strongMinMonths: number; okayMinMonths: number };
  fees_shown: Readonly<Record<string, never>>;
  program_page: { strongMinWords: number };
  easy_enquiry: Readonly<Record<string, never>>;
  admission_steps: Readonly<Record<string, never>>;
  mobile_friendly: { okayMaxIssues: number };
  page_speed: { strongMinScore: number; okayMinScore: number };
}

export interface ScoringConfig {
  version: number;
  /** Share of a check's points for each result. */
  resultShares: Readonly<Record<CheckResult, number>>;
  /** Points per check, per pillar, per weight family. Each pillar adds up to 100. */
  weights: Readonly<Record<ScoringFamily, Readonly<Record<Pillar, PillarWeights>>>>;
  labels: readonly ScoreLabelBand[];
  thresholds: Thresholds;
}

// Raw facts each provider returns, one shape per signal key. These are measurements a real
// provider would report (a search position, a review count), never a Strong or Weak result.
// Turning facts into results is the scoring engine's job.

import type { ContentPlatform, DemandKind, Language, RivalMoveKind, Sentiment } from '../domain/types.ts';

export interface GoogleSearchValue {
  query: string;
  /** Position in Google results, or null when not in the top `resultsChecked`. */
  position: number | null;
  resultsChecked: number;
}

export interface InstagramActivityValue {
  handle: string | null;
  exists: boolean;
  postsPerWeek: number;
  /** Share of posts that are reels, 0 to 1. */
  reelShare: number;
  weeksChecked: number;
}

export interface GoogleProfileValue {
  exists: boolean;
  reviewCount: number;
}

export interface YoutubeValue {
  exists: boolean;
  channelUrl: string | null;
  lastUploadDaysAgo: number | null;
  monthsWithUploads: number;
  monthsChecked: number;
}

export interface AiAnswersValue {
  question: string;
  assistantsAsked: number;
  assistantsNaming: number;
  knownWhenAskedByName: boolean;
}

export interface OtherSocialsValue {
  platforms: { platform: 'facebook' | 'linkedin'; exists: boolean; daysSinceLastPost: number | null }[];
}

export interface PlacementProofValue {
  found: boolean;
  hasNumbers: boolean;
  hasCompanies: boolean;
  year: number | null;
  updatedDaysAgo: number | null;
  vagueClaimsOnly: boolean;
}

export interface ReviewRatingValue {
  reviewCount: number;
  rating: number | null;
  /** Share of reviews with a reply from the institution, 0 to 1. */
  replyRate: number;
}

/** Two providers feed approvals: the website (what is shown) and official records (what is held). */
export type ApprovalsValue =
  | { source: 'site'; shown: string[]; withProof: string[] }
  | { source: 'official'; recognition: 'statutory' | 'skilling'; held: string[] };

export interface FacultyLeadersValue {
  facultyPage: boolean;
  names: boolean;
  photos: boolean;
  qualifications: boolean;
  leadersInContent: boolean;
}

export interface StudentsInContentValue {
  monthsChecked: number;
  monthsWithStudents: number;
  mostlyStockPhotos: boolean;
}

export interface FeesShownValue {
  disclosure: 'full' | 'partial' | 'on_request' | 'none';
  amountText: string | null;
  pageUrl: string | null;
}

export interface ProgramPageValue {
  ownPage: boolean;
  onCombinedPage: boolean;
  wordCount: number | null;
  pageUrl: string | null;
}

export interface EasyEnquiryValue {
  pagesChecked: number;
  pagesWithForm: number;
  pagesWithWhatsapp: number;
  contactPageOnly: boolean;
  formWorks: boolean;
}

export interface AdmissionStepsValue {
  stepsListed: boolean;
  datesListed: boolean;
  vague: boolean;
}

export interface MobileFriendlyValue {
  loads: boolean;
  issues: string[];
}

export interface PageSpeedValue {
  loads: boolean;
  /** Google speed score for mobile, 0 to 100. */
  mobileScore: number | null;
}

export interface RivalMoveValue {
  kind: RivalMoveKind;
  description: string;
  detectedAt: string;
}

export interface RivalContentValue {
  platform: ContentPlatform;
  url: string;
  title: string;
  postedAt: string;
  metrics: { views?: number; likes?: number; comments?: number; shares?: number };
}

/** A grouped demand item: a topic, a count and a source. Never a person. */
export interface DemandItemValue {
  kind: DemandKind;
  /** English wording shown in the product. */
  text: string;
  /** Original wording when the source language is Hindi or Assamese. */
  originalText: string | null;
  language: Language;
  count: number;
  changePct: number | null;
  rank: number | null;
  /** For mentions: which institution the grouped mention is about. */
  about: { slug: string; name: string } | null;
  sentiment: Sentiment | null;
  meta: Readonly<Record<string, string | number | boolean | null>>;
}

export interface SignalValues {
  google_search: GoogleSearchValue;
  instagram_activity: InstagramActivityValue;
  google_profile: GoogleProfileValue;
  youtube: YoutubeValue;
  ai_answers: AiAnswersValue;
  other_socials: OtherSocialsValue;
  placement_proof: PlacementProofValue;
  review_rating: ReviewRatingValue;
  approvals: ApprovalsValue;
  faculty_leaders: FacultyLeadersValue;
  students_in_content: StudentsInContentValue;
  fees_shown: FeesShownValue;
  program_page: ProgramPageValue;
  easy_enquiry: EasyEnquiryValue;
  admission_steps: AdmissionStepsValue;
  mobile_friendly: MobileFriendlyValue;
  page_speed: PageSpeedValue;
  rival_move: RivalMoveValue;
  rival_content: RivalContentValue;
  demand_item: DemandItemValue;
}

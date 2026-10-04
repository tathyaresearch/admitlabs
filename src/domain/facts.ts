// Raw facts for each Audit check: measurements a provider reports (a search position, a
// review count), never a Strong or Weak result. Providers produce these; the scoring engine
// turns them into results. Kept in the domain so the engine depends on nothing else.

import type { AiAssistant } from './types.ts';

export interface GoogleSearchValue {
  query: string;
  /** Position in Google results, or null when not in the top `resultsChecked`. */
  position: number | null;
  resultsChecked: number;
  /** The city the search was made from, so the results are the ones a local student sees. */
  searchedFrom?: string | null;
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
  /** Each assistant asked, and whether it named the institution. The score uses the counts above. */
  assistants?: Array<{ assistant: AiAssistant; named: boolean }>;
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

/** Approvals as the engine reads them: what the site shows, set against what is officially held. */
export interface ApprovalsFacts {
  shown: readonly string[];
  withProof: readonly string[];
  /** What official records say the institution holds, or null when there is no official record. */
  held: readonly string[] | null;
}

/** The facts the engine needs for each check. */
export interface CheckFacts {
  google_search: GoogleSearchValue;
  instagram_activity: InstagramActivityValue;
  google_profile: GoogleProfileValue;
  youtube: YoutubeValue;
  ai_answers: AiAnswersValue;
  other_socials: OtherSocialsValue;
  placement_proof: PlacementProofValue;
  review_rating: ReviewRatingValue;
  approvals: ApprovalsFacts;
  faculty_leaders: FacultyLeadersValue;
  students_in_content: StudentsInContentValue;
  fees_shown: FeesShownValue;
  program_page: ProgramPageValue;
  easy_enquiry: EasyEnquiryValue;
  admission_steps: AdmissionStepsValue;
  mobile_friendly: MobileFriendlyValue;
  page_speed: PageSpeedValue;
}

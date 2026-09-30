// Raw facts each provider returns, one shape per signal key. These are measurements a real
// provider would report (a search position, a review count), never a Strong or Weak result.
// Turning facts into results is the scoring engine's job. The Audit check shapes live in
// the domain (src/domain/facts.ts) so the engine depends on nothing here.

import type { ContentPlatform, DemandKind, Language, RivalMoveKind, Sentiment } from '../domain/types.ts';
import type {
  AdmissionStepsValue,
  AiAnswersValue,
  ApprovalsValue,
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
} from '../domain/facts.ts';

export type {
  AdmissionStepsValue,
  AiAnswersValue,
  ApprovalsValue,
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
} from '../domain/facts.ts';

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

// Raw facts each provider returns, one shape per signal key. These are measurements a real
// provider would report (a search position, a review count), never a Strong or Weak result.
// Turning facts into results is the scoring engine's job. The Audit check shapes live in
// the domain (src/domain/facts.ts) so the engine depends on nothing here.

import type { ListingProblem } from '../domain/finding-rules.ts';
import type { ContentPlatform, DemandKind, FindingKind, FindingPlace, Language, RivalMoveKind, Sentiment } from '../domain/types.ts';
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

/**
 * Something found about an institution in What people say or Other places (spec 7.2): one short
 * line in Drishti's words, where it was found and its link. Never the author's name or profile.
 */
export interface FindingValue {
  place: FindingPlace;
  kind: FindingKind;
  /** One short line of what was seen. */
  line: string;
  /** Where it was found, by name: "Reddit", "Quora", "collegeguide.example". */
  source: string;
  /** The same finding month after month: a thread, a listing. */
  key: string;
  /** How many times the same point came up (a complaint three students make is 3). */
  repeats: number;
  /** For a listing or directory entry: what is wrong with it, or null when it is right. */
  listing: ListingProblem | null;
}

/** Searches a month for a topic in a region, from the keyword tool: the only real count a search topic gets. */
export interface SearchVolumeValue {
  text: string;
  /** Searches a month. */
  monthly: number;
}

/** A grouped demand item: a topic, a count and a source. Never a person. */
export interface DemandItemValue {
  kind: DemandKind;
  /** English wording shown in the product. */
  text: string;
  /** Original wording when the source language is Hindi or Assamese. */
  originalText: string | null;
  language: Language;
  /** A real count from the source (questions counted, or searches a month), or null when the source gives none. */
  count: number | null;
  changePct: number | null;
  rank: number | null;
  /** For mentions: which institution the grouped mention is about. */
  about: { id: string | null; slug: string; name: string } | null;
  sentiment: Sentiment | null;
  meta: Readonly<Record<string, DemandMetaValue>>;
}

/** What a Demand item's meta can hold: a word, a number, or a short list (a best month's months). */
export type DemandMetaValue = string | number | boolean | null | readonly number[] | readonly string[];

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
  finding: FindingValue;
  search_volume: SearchVolumeValue;
}

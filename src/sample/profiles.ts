// Intended Audit results for each sample institution, month by month. Mock providers turn
// these into raw facts; the scoring engine (Phase 2) turns the facts back into results.
//
// Letters: S strong, O okay, W weak, M missing. One letter holds for every month; six
// letters cover April to September 2026 in order.
//
// Target bands for September 2026 under scoring v1:
//   Strong:     Eastgate University (about 73), Silverline College (about 74)
//   Needs work: Northbank College BBA (about 46, up from 41 in June), Brightpath Skills
//               (about 63, up from about 28 in April), Highfield University (about 51),
//               Cedar Skill Institute (about 50)
//   At risk:    Loomcraft Skills Institute (about 32), Riverbend College (about 27)

import { checksForLevel } from '../domain/checks.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';

export const PROFILE_MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] as const;

export type InstitutionCheckKey =
  | 'instagram_activity'
  | 'google_profile'
  | 'youtube'
  | 'other_socials'
  | 'review_rating'
  | 'approvals'
  | 'faculty_leaders'
  | 'students_in_content'
  | 'easy_enquiry'
  | 'mobile_friendly'
  | 'page_speed';

export type ProgramCheckKey = 'google_search' | 'ai_answers' | 'placement_proof' | 'fees_shown' | 'program_page' | 'admission_steps';

/** One letter for every month, or one letter per month in PROFILE_MONTHS. */
export type Track = string;

export interface SampleProfile {
  institution: Readonly<Record<InstitutionCheckKey, Track>>;
  /** One track for every program, or a track per program key. */
  program: Readonly<Record<ProgramCheckKey, Track | Readonly<Record<string, Track>>>>;
}

export const SAMPLE_PROFILES: Readonly<Record<string, SampleProfile>> = {
  // Paid. Improves steadily and crosses into Strong in July. Data Analytics is new and holds it back.
  'eastgate-university': {
    institution: {
      instagram_activity: 'OOSSSS',
      google_profile: 'S',
      youtube: 'WWOOOO',
      other_socials: 'WWWOOO',
      review_rating: 'O',
      approvals: 'S',
      faculty_leaders: 'WOOOOO',
      students_in_content: 'WWWWOO',
      easy_enquiry: 'WWOOOO',
      mobile_friendly: 'OOOSSS',
      page_speed: 'WWWOOO',
    },
    program: {
      google_search: { mba: 'S', bba: 'S', bca: 'O', nursing: 'O', 'data-analytics': 'MMWWWW' },
      ai_answers: { mba: 'O', bba: 'WWOOOO', bca: 'W', nursing: 'W', 'data-analytics': 'M' },
      placement_proof: { mba: 'S', bba: 'O', bca: 'O', nursing: 'S', 'data-analytics': 'M' },
      fees_shown: { mba: 'S', bba: 'O', bca: 'S', nursing: 'O', 'data-analytics': 'WWOOOO' },
      program_page: { mba: 'S', bba: 'S', bca: 'O', nursing: 'O', 'data-analytics': 'WOOOOO' },
      admission_steps: { mba: 'O', bba: 'O', bca: 'W', nursing: 'O', 'data-analytics': 'MWWWWW' },
    },
  },

  // Client. Starts At risk in April and climbs as the AdmitLabs team fixes things.
  'brightpath-skills': {
    institution: {
      instagram_activity: 'WWOOOO',
      google_profile: 'WWWOOO',
      youtube: 'MMWWOO',
      other_socials: 'WWWOOO',
      review_rating: 'WWOOOO',
      approvals: 'WOOOOO',
      faculty_leaders: 'WWWOOO',
      students_in_content: 'WWOOOO',
      easy_enquiry: 'WOOOOO',
      mobile_friendly: 'OOSSSS',
      page_speed: 'WWWOOO',
    },
    program: {
      google_search: { 'digital-marketing': 'WWOOOO', 'data-analytics': 'MMWWWW', 'hotel-management': 'WOOOOO' },
      ai_answers: { 'digital-marketing': 'MMMWWW', 'data-analytics': 'M', 'hotel-management': 'MMWWWW' },
      placement_proof: { 'digital-marketing': 'WWOOOO', 'data-analytics': 'MMWWWW', 'hotel-management': 'WOSSSS' },
      fees_shown: { 'digital-marketing': 'WOSSSS', 'data-analytics': 'WWOOOO', 'hotel-management': 'OSSSSS' },
      program_page: { 'digital-marketing': 'WWOOOO', 'data-analytics': 'WWWOOO', 'hotel-management': 'WOSSSS' },
      admission_steps: { 'digital-marketing': 'WWOOOO', 'data-analytics': 'MWWWWW', 'hotel-management': 'WOOOOO' },
    },
  },

  // Free. Audited in June and September. Started showing BCA fees as a range in September.
  'northbank-college': {
    institution: {
      instagram_activity: 'WWWOOO',
      google_profile: 'W',
      youtube: 'M',
      other_socials: 'W',
      review_rating: 'O',
      approvals: 'O',
      faculty_leaders: 'W',
      students_in_content: 'W',
      easy_enquiry: 'WWWOOO',
      mobile_friendly: 'O',
      page_speed: 'W',
    },
    program: {
      google_search: { bba: 'O', bca: 'O', bcom: 'S' },
      ai_answers: { bba: 'W', bca: 'M', bcom: 'W' },
      placement_proof: { bba: 'W', bca: 'O', bcom: 'W' },
      fees_shown: { bba: 'W', bca: 'WWWWWO', bcom: 'M' },
      program_page: { bba: 'O', bca: 'W', bcom: 'W' },
      admission_steps: { bba: 'O', bca: 'W', bcom: 'O' },
    },
  },

  // Free, and the strongest rival in Guwahati.
  'silverline-college': {
    institution: {
      instagram_activity: 'S',
      google_profile: 'O',
      youtube: 'W',
      other_socials: 'O',
      review_rating: 'O',
      approvals: 'O',
      faculty_leaders: 'O',
      students_in_content: 'S',
      easy_enquiry: 'O',
      mobile_friendly: 'S',
      page_speed: 'O',
    },
    program: {
      google_search: { bba: 'S', bcom: 'S', 'hotel-management': 'O' },
      ai_answers: { bba: 'O', bcom: 'W', 'hotel-management': 'W' },
      placement_proof: { bba: 'S', bcom: 'O', 'hotel-management': 'S' },
      fees_shown: { bba: 'S', bcom: 'S', 'hotel-management': 'O' },
      program_page: { bba: 'S', bcom: 'O', 'hotel-management': 'S' },
      admission_steps: 'O',
    },
  },

  // Unclaimed rival. Took MBA fee amounts off its site in August.
  'highfield-university': {
    institution: {
      instagram_activity: 'W',
      google_profile: 'O',
      youtube: 'O',
      other_socials: 'W',
      review_rating: 'O',
      approvals: 'S',
      faculty_leaders: 'O',
      students_in_content: 'W',
      easy_enquiry: 'W',
      mobile_friendly: 'O',
      page_speed: 'W',
    },
    program: {
      google_search: { mba: 'O', bca: 'W', nursing: 'O' },
      ai_answers: { mba: 'W', bca: 'M', nursing: 'W' },
      placement_proof: { mba: 'O', bca: 'W', nursing: 'S' },
      fees_shown: { mba: 'OOOOOW', bca: 'W', nursing: 'O' },
      program_page: { mba: 'O', bca: 'W', nursing: 'O' },
      admission_steps: { mba: 'O', bca: 'W', nursing: 'O' },
    },
  },

  // Unclaimed rival. Added WhatsApp to every page in late August.
  'loomcraft-skills': {
    institution: {
      instagram_activity: 'O',
      google_profile: 'W',
      youtube: 'M',
      other_socials: 'W',
      review_rating: 'W',
      approvals: 'W',
      faculty_leaders: 'W',
      students_in_content: 'O',
      easy_enquiry: 'WWWWWO',
      mobile_friendly: 'O',
      page_speed: 'W',
    },
    program: {
      google_search: 'W',
      ai_answers: 'M',
      placement_proof: { 'digital-marketing': 'W', 'hotel-management': 'M' },
      fees_shown: { 'digital-marketing': 'M', 'hotel-management': 'W' },
      program_page: 'W',
      admission_steps: { 'digital-marketing': 'W', 'hotel-management': 'M' },
    },
  },

  // Prospect.
  'riverbend-college': {
    institution: {
      instagram_activity: 'W',
      google_profile: 'W',
      youtube: 'M',
      other_socials: 'M',
      review_rating: 'W',
      approvals: 'O',
      faculty_leaders: 'W',
      students_in_content: 'M',
      easy_enquiry: 'W',
      mobile_friendly: 'W',
      page_speed: 'W',
    },
    program: {
      google_search: { bcom: 'O', bba: 'W' },
      ai_answers: 'M',
      placement_proof: { bcom: 'W', bba: 'M' },
      fees_shown: { bcom: 'W', bba: 'M' },
      program_page: 'W',
      admission_steps: { bcom: 'W', bba: 'M' },
    },
  },

  // Prospect. Strong on Instagram, no fees on its site.
  'cedar-skill-institute': {
    institution: {
      instagram_activity: 'S',
      google_profile: 'O',
      youtube: 'W',
      other_socials: 'O',
      review_rating: 'O',
      approvals: 'O',
      faculty_leaders: 'W',
      students_in_content: 'S',
      easy_enquiry: 'O',
      mobile_friendly: 'S',
      page_speed: 'O',
    },
    program: {
      google_search: { 'digital-marketing': 'O', 'data-analytics': 'W' },
      ai_answers: { 'digital-marketing': 'W', 'data-analytics': 'M' },
      placement_proof: { 'digital-marketing': 'W', 'data-analytics': 'M' },
      fees_shown: 'M',
      program_page: { 'digital-marketing': 'O', 'data-analytics': 'W' },
      admission_steps: 'W',
    },
  },
};

const LETTERS: Readonly<Record<string, CheckResult>> = { S: 'strong', O: 'okay', W: 'weak', M: 'missing' };

const PROGRAM_CHECK_KEYS = new Set<CheckKey>(checksForLevel('program').map((check) => check.key));

/** The letter a track gives for a month. Months before or after the range use the nearest end. */
export function trackResult(track: Track, month: string): CheckResult {
  if (track.length !== 1 && track.length !== PROFILE_MONTHS.length) {
    throw new Error(`Track "${track}" must have 1 or ${PROFILE_MONTHS.length} letters`);
  }
  let index = 0;
  if (track.length > 1) {
    const first = PROFILE_MONTHS[0];
    const last = PROFILE_MONTHS[PROFILE_MONTHS.length - 1] as string;
    index = month <= first ? 0 : month >= last ? PROFILE_MONTHS.length - 1 : PROFILE_MONTHS.indexOf(month as (typeof PROFILE_MONTHS)[number]);
  }
  const letter = track[index] ?? '';
  const result = LETTERS[letter];
  if (!result) throw new Error(`Track "${track}" has an unknown letter "${letter}"`);
  return result;
}

/** Intended result for a sample institution, or null when the institution has no profile. */
export function profileResult(slug: string, checkKey: CheckKey, programKey: string | null, month: string): CheckResult | null {
  const profile = SAMPLE_PROFILES[slug];
  if (!profile) return null;
  if (PROGRAM_CHECK_KEYS.has(checkKey)) {
    const entry = profile.program[checkKey as ProgramCheckKey];
    if (typeof entry === 'string') return trackResult(entry, month);
    const track = programKey ? entry[programKey] : undefined;
    if (!track) throw new Error(`No ${checkKey} track for program "${programKey}" in ${slug}`);
    return trackResult(track, month);
  }
  return trackResult(profile.institution[checkKey as InstitutionCheckKey], month);
}

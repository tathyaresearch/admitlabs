// The 17 Audit checks (spec section 7.2). Program checks are scored per program;
// institution checks are scored once and shared by every program.

import type { CheckKey, InstitutionType, Pillar } from './types.ts';

export type CheckLevel = 'program' | 'institution';

export interface CheckDefinition {
  key: CheckKey;
  pillar: Pillar;
  level: CheckLevel;
  /** Short name for lists, tables and meters. */
  name: string;
  /** What the check looks at, in the spec's words. */
  looksAt: string;
}

export const CHECKS: readonly CheckDefinition[] = [
  { key: 'google_search', pillar: 'discovered', level: 'program', name: 'Google search', looksAt: 'Shows up on Google for "[program] in [city]"' },
  { key: 'instagram_activity', pillar: 'discovered', level: 'institution', name: 'Instagram', looksAt: 'Instagram posting and reels' },
  { key: 'google_profile', pillar: 'discovered', level: 'institution', name: 'Google profile', looksAt: 'Google profile exists, number of reviews' },
  { key: 'youtube', pillar: 'discovered', level: 'institution', name: 'YouTube', looksAt: 'YouTube activity' },
  { key: 'ai_answers', pillar: 'discovered', level: 'program', name: 'AI answers', looksAt: 'Named when a student asks AI assistants "best [program] in [city]"' },
  { key: 'other_socials', pillar: 'discovered', level: 'institution', name: 'Other socials', looksAt: 'Facebook, LinkedIn activity' },
  { key: 'placement_proof', pillar: 'trusted', level: 'program', name: 'Placement proof', looksAt: 'Placement or results proof' },
  { key: 'review_rating', pillar: 'trusted', level: 'institution', name: 'Review rating', looksAt: 'Google review rating and replies' },
  { key: 'approvals', pillar: 'trusted', level: 'institution', name: 'Approvals', looksAt: 'Approvals and official data shown' },
  { key: 'faculty_leaders', pillar: 'trusted', level: 'institution', name: 'Faculty and leaders', looksAt: 'Faculty and leaders visible' },
  { key: 'students_in_content', pillar: 'trusted', level: 'institution', name: 'Students in content', looksAt: 'Real students and alumni in content' },
  { key: 'fees_shown', pillar: 'chosen', level: 'program', name: 'Fees shown', looksAt: 'Fees shown clearly' },
  { key: 'program_page', pillar: 'chosen', level: 'program', name: 'Program page', looksAt: 'Program has its own page' },
  { key: 'easy_enquiry', pillar: 'chosen', level: 'institution', name: 'Easy enquiry', looksAt: 'Enquiry form and WhatsApp' },
  { key: 'admission_steps', pillar: 'chosen', level: 'program', name: 'Admission steps', looksAt: 'Admission steps clear' },
  { key: 'mobile_friendly', pillar: 'chosen', level: 'institution', name: 'Mobile friendly', looksAt: 'Website works on phone' },
  { key: 'page_speed', pillar: 'chosen', level: 'institution', name: 'Page speed', looksAt: 'Website loads fast' },
];

const BY_KEY = new Map<CheckKey, CheckDefinition>(CHECKS.map((check) => [check.key, check]));

export function getCheck(key: CheckKey): CheckDefinition {
  const check = BY_KEY.get(key);
  if (!check) throw new Error(`Unknown check: ${key}`);
  return check;
}

export function checksForPillar(pillar: Pillar): CheckDefinition[] {
  return CHECKS.filter((check) => check.pillar === pillar);
}

export function checksForLevel(level: CheckLevel): CheckDefinition[] {
  return CHECKS.filter((check) => check.level === level);
}

/**
 * For skilling institutes the approvals check means skilling recognition instead of
 * NIRF, NAAC, AICTE or UGC (spec section 7.3).
 */
export function checkName(key: CheckKey, type: InstitutionType): string {
  if (key === 'approvals' && type === 'skilling') return 'Skilling recognition';
  return getCheck(key).name;
}

export function checkLooksAt(key: CheckKey, type: InstitutionType): string {
  if (key === 'approvals') {
    return type === 'skilling'
      ? 'Skilling recognition shown'
      : 'Official data and approvals such as NIRF, NAAC, AICTE, UGC shown';
  }
  return getCheck(key).looksAt;
}

// Shared vocabulary for Drishti. Values match the Postgres enums in supabase/migrations.
// Framework free: imported by the app, the scripts and the tests alike.

export const INSTITUTION_TYPES = ['college', 'university', 'skilling'] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const TIERS = ['free', 'paid', 'client'] as const;
export type Tier = (typeof TIERS)[number];

export const MEMBERSHIP_ROLES = ['owner', 'member'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const TEAM_ROLES = ['team', 'admin'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const PILLARS = ['discovered', 'trusted', 'chosen'] as const;
export type Pillar = (typeof PILLARS)[number];

export const RESULTS = ['strong', 'okay', 'weak', 'missing'] as const;
export type CheckResult = (typeof RESULTS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const CHECK_KEYS = [
  'google_search',
  'instagram_activity',
  'google_profile',
  'youtube',
  'ai_answers',
  'other_socials',
  'placement_proof',
  'review_rating',
  'approvals',
  'faculty_leaders',
  'students_in_content',
  'fees_shown',
  'program_page',
  'easy_enquiry',
  'admission_steps',
  'mobile_friendly',
  'page_speed',
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

export const AUDIT_KINDS = ['free', 'paid', 'client', 'team', 'rival'] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

/** How an Audit started: at signup, on its schedule, or by a manual refresh. */
export const AUDIT_TRIGGERS = ['signup', 'scheduled', 'manual'] as const;
export type AuditTrigger = (typeof AUDIT_TRIGGERS)[number];

export const RIVAL_MOVE_KINDS = ['new_program', 'fee_change', 'new_page', 'admission_dates'] as const;
export type RivalMoveKind = (typeof RIVAL_MOVE_KINDS)[number];

/** The AI assistants the AI answers check asks, in this order. */
export const AI_ASSISTANTS = ['chatgpt', 'gemini', 'perplexity'] as const;
export type AiAssistant = (typeof AI_ASSISTANTS)[number];

export const AI_ASSISTANT_LABELS: Readonly<Record<AiAssistant, string>> = { chatgpt: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity' };

export const CONTENT_PLATFORMS = ['instagram', 'youtube'] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const DEMAND_SCOPES = ['city', 'state', 'india'] as const;
export type DemandScope = (typeof DEMAND_SCOPES)[number];

export const DEMAND_KINDS = ['rising', 'falling', 'question', 'worry', 'mention', 'season', 'idea'] as const;
export type DemandKind = (typeof DEMAND_KINDS)[number];

export const LANGUAGES = ['en', 'hi', 'as'] as const;
export type Language = (typeof LANGUAGES)[number];

export const SENTIMENTS = ['positive', 'negative'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const FEATURES = ['audit', 'rivals', 'demand'] as const;
export type Feature = (typeof FEATURES)[number];

/** Which weight table applies. Colleges and universities share one; skilling institutes have their own. */
export type ScoringFamily = 'college_university' | 'skilling';

export function scoringFamily(type: InstitutionType): ScoringFamily {
  return type === 'skilling' ? 'skilling' : 'college_university';
}

// Display words. Plain language, no dashes.

export const INSTITUTION_TYPE_LABELS: Readonly<Record<InstitutionType, string>> = {
  college: 'College',
  university: 'University',
  skilling: 'Skilling institute',
};

export const TIER_LABELS: Readonly<Record<Tier, string>> = {
  free: 'Free',
  paid: 'Paid',
  client: 'Client',
};

export const PILLAR_LABELS: Readonly<Record<Pillar, string>> = {
  discovered: 'Discovered',
  trusted: 'Trusted',
  chosen: 'Chosen',
};

export const RESULT_LABELS: Readonly<Record<CheckResult, string>> = {
  strong: 'Strong',
  okay: 'Okay',
  weak: 'Weak',
  missing: 'Missing',
};

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  en: 'English',
  hi: 'Hindi',
  as: 'Assamese',
};

export const DEMAND_SCOPE_LABELS: Readonly<Record<DemandScope, string>> = {
  city: 'City',
  state: 'State',
  india: 'All India',
};

export const TEAM_ROLE_LABELS: Readonly<Record<TeamRole, string>> = {
  team: 'Team',
  admin: 'Admin',
};

export const MEMBERSHIP_ROLE_LABELS: Readonly<Record<MembershipRole, string>> = {
  owner: 'Owner',
  member: 'Member',
};

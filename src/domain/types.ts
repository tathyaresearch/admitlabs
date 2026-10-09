// Shared vocabulary for Drishti. Values match the Postgres enums in supabase/migrations.
// Framework free: imported by the app, the scripts and the tests alike.

export const INSTITUTION_TYPES = ['college', 'university', 'skilling'] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const TIERS = ['free', 'paid', 'client'] as const;
export type Tier = (typeof TIERS)[number];

export const MEMBERSHIP_ROLES = ['owner', 'member'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/** The team's access levels (spec section 27): Admin, Team member, and a Client manager who looks after some Clients only. */
export const TEAM_ROLES = ['admin', 'team', 'client_manager'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Admin or Team member: the whole team area. A Client manager sees their Clients only. */
export function isFullTeam(role: TeamRole | null | undefined): role is 'admin' | 'team' {
  return role === 'admin' || role === 'team';
}

export const PILLARS = ['discovered', 'trusted', 'chosen'] as const;
export type Pillar = (typeof PILLARS)[number];

export const RESULTS = ['strong', 'okay', 'weak', 'missing'] as const;
export type CheckResult = (typeof RESULTS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** What a content idea asks you to make, as the analysis provider writes it. */
export const IDEA_FORMATS = ['post', 'reel', 'video', 'faq', 'page'] as const;
export type IdeaFormat = (typeof IDEA_FORMATS)[number];

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

/** What a rival alert is about (spec 8.3). Started ads come from what the team enters; a jump in reviews from Google. */
export const RIVAL_MOVE_KINDS = ['new_program', 'fee_change', 'new_page', 'admission_dates', 'started_ads', 'reviews_jump'] as const;
export type RivalMoveKind = (typeof RIVAL_MOVE_KINDS)[number];

/** Where a check or a finding sits in the Audit (spec 7.2), in the order the Audit shows them. */
export const PLACES = ['website', 'google', 'social', 'people', 'other'] as const;
export type Place = (typeof PLACES)[number];

/** The places that hold findings instead of scored checks. */
export const FINDING_PLACES = ['people', 'other'] as const;
export type FindingPlace = (typeof FINDING_PLACES)[number];

/** What a finding is: something good, a complaint, a question nobody answered, a listing, a news story, a directory entry. */
export const FINDING_KINDS = ['good', 'bad', 'unanswered', 'listing', 'news', 'directory'] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

/** How much a fix could do (spec 7.7), in place of points on screen. */
export const IMPACTS = ['high', 'medium', 'low'] as const;
export type Impact = (typeof IMPACTS)[number];

/** What students ask about a program (spec 9.4), and any new topic found. */
export const ASK_TOPICS = ['fees', 'placements', 'scholarships', 'hostel', 'careers', 'other'] as const;
export type AskTopic = (typeof ASK_TOPICS)[number];

/** Where a Leads tracking link is used (spec 23). */
export const LEAD_SOURCES = ['instagram', 'youtube', 'facebook', 'website', 'whatsapp', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Whether a new Audit or monthly summary has been through the team's review (spec 25). */
export const REVIEW_STATES = ['waiting', 'approved'] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/** The AI assistants the AI answers check asks, in this order. */
export const AI_ASSISTANTS = ['chatgpt', 'gemini', 'perplexity'] as const;
export type AiAssistant = (typeof AI_ASSISTANTS)[number];

export const AI_ASSISTANT_LABELS: Readonly<Record<AiAssistant, string>> = { chatgpt: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity' };

export const CONTENT_PLATFORMS = ['instagram', 'youtube'] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const DEMAND_SCOPES = ['city', 'state', 'india'] as const;
export type DemandScope = (typeof DEMAND_SCOPES)[number];

/**
 * Grouped Demand items (spec 9.4). Version 2 adds what students ask about each program (topic), what
 * gets attention (content) and the best months to post (best_month). Worries, mentions and the
 * season clock are version 1's; old rows keep them.
 */
export const DEMAND_KINDS = ['rising', 'falling', 'question', 'worry', 'mention', 'season', 'idea', 'topic', 'content', 'best_month'] as const;
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

/** The three words on screen (spec 7.4). Inside the code and the database the keys stay as they were. */
export const PILLAR_LABELS: Readonly<Record<Pillar, string>> = {
  discovered: 'Discovered',
  trusted: 'Trusted',
  chosen: 'Chosen',
};

/** The question each part of the score answers, said under its name in plain words. */
export const PILLAR_QUESTIONS: Readonly<Record<Pillar, string>> = {
  discovered: 'Can students find you?',
  trusted: 'Do they believe you?',
  chosen: 'Is it easy to pick you?',
};

export const RESULT_LABELS: Readonly<Record<CheckResult, string>> = {
  strong: 'Strong',
  okay: 'Okay',
  weak: 'Weak',
  missing: 'Missing',
};

/** How big a job a fix is, in the product's words: Quick, Medium, Big (stored as easy, medium, hard). */
export const EFFORT_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: 'Quick',
  medium: 'Medium',
  hard: 'Big',
};

export const PLACE_LABELS: Readonly<Record<Place, string>> = {
  website: 'Website',
  google: 'Google',
  social: 'Social media',
  people: 'What people say',
  other: 'Other places',
};

/** What each place covers, in one line under its name. */
export const PLACE_COVERS: Readonly<Record<Place, string>> = {
  website: 'Program pages, fees, placements, admission steps, enquiry, mobile and speed',
  google: 'Search from your city, your Google profile, reviews and rating, AI answers',
  social: 'Instagram, YouTube and Facebook: how active, and what works',
  people: 'Reddit, Quora and forums: good, bad and unanswered',
  other: 'News, college listing sites and directories',
};

export const FINDING_KIND_LABELS: Readonly<Record<FindingKind, string>> = {
  good: 'Good',
  bad: 'Complaint',
  unanswered: 'Unanswered',
  listing: 'Listing',
  news: 'News',
  directory: 'Directory',
};

export const IMPACT_LABELS: Readonly<Record<Impact, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const ASK_TOPIC_LABELS: Readonly<Record<AskTopic, string>> = {
  fees: 'Fees',
  placements: 'Placements',
  scholarships: 'Scholarships',
  hostel: 'Hostel',
  careers: 'Careers',
  other: 'Other',
};

export const LEAD_SOURCE_LABELS: Readonly<Record<LeadSource, string>> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  website: 'Website',
  whatsapp: 'WhatsApp',
  other: 'Other',
};

export const IDEA_FORMAT_LABELS: Readonly<Record<IdeaFormat, string>> = {
  post: 'Post',
  reel: 'Reel',
  video: 'Video',
  faq: 'FAQ',
  page: 'Web page',
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
  admin: 'Admin',
  team: 'Team member',
  client_manager: 'Client manager',
};

/** What each level opens, in a line (the Team page). */
export const TEAM_ROLE_LINES: Readonly<Record<TeamRole, string>> = {
  admin: 'Everything: every institution, Audits, Enquiries and Clients, plans, and the team on this page.',
  team: 'Everything except plans and this page. They also make a won enquiry a Client.',
  client_manager: 'Only the Clients assigned to them (each page, Client Brain and dashboard), and the Enquiries they own.',
};

export const MEMBERSHIP_ROLE_LABELS: Readonly<Record<MembershipRole, string>> = {
  owner: 'Owner',
  member: 'Member',
};

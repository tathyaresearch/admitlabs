// The Client Brain (spec section 26): one living knowledge base per Client college, shared by its
// owner, its members and the AdmitLabs team. What it holds, section by section, and in which
// shape. Facts that already live elsewhere stay there (one source): the institution record
// (name, city, type, public links), the details added by you (approvals, address, each
// program's fees, dates and placements) and the team's private notes. Everything else is a
// Brain fact (brain_items), one kind each. Pure.

import type { LineIconName as IconName } from '../graphics/icons.ts';
import type { InstitutionDetails, ProgramDetails } from '../domain/details.ts';
import type { InstitutionType } from '../domain/types.ts';

export const BRAIN_SECTIONS = ['blueprint', 'basics', 'programs', 'brand', 'proof', 'links', 'calendar', 'content', 'notes'] as const;
export type BrainSection = (typeof BRAIN_SECTIONS)[number];

/** The sections of facts: every one but the Blueprint, which is PDF versions (the kickoff call goes through these). */
export const FACT_SECTIONS = BRAIN_SECTIONS.filter((section): section is Exclude<BrainSection, 'blueprint'> => section !== 'blueprint');

export const SECTION_INFO: Readonly<Record<BrainSection, { name: string; hint: string; icon: IconName; intro: string }>> = {
  blueprint: { name: 'Blueprint', hint: 'The plan, as PDF versions', icon: 'compass', intro: 'The plan AdmitLabs makes with the college, as a PDF. Each upload is the next version; the college sees a version once it is shared, and approves it or asks for changes.' },
  basics: { name: 'Basics', hint: 'Contacts, approvals, goals', icon: 'team', intro: 'Who to talk to, what the college is, and what it wants this year.' },
  programs: { name: 'Programs', hint: 'Fees, seats, dates', icon: 'briefcase', intro: 'The same programs and details as Settings, Programs: one list, so a change here shows there too.' },
  brand: { name: 'Brand', hint: 'Logo, colours, voice', icon: 'palette', intro: 'How the college looks and sounds. Every post, fix and idea follows it.' },
  proof: { name: 'Proof', hint: 'Awards, placements, alumni', icon: 'seal', intro: 'What proves the college is worth choosing, each with a link.' },
  links: { name: 'Links', hint: 'Website, socials, Drive', icon: 'link', intro: 'Where everything lives. Links only: paste a Drive link instead of uploading.' },
  calendar: { name: 'Calendar', hint: 'Admissions, events, exams', icon: 'calendar', intro: 'What’s coming up. Admission dates come from each program’s details too.' },
  content: { name: 'Content', hint: 'Plan, scripts, what worked', icon: 'video', intro: 'What the team makes, what was approved, and what worked.' },
  notes: { name: 'Notes and decisions', hint: 'Meetings, feedback, decisions', icon: 'note', intro: 'What was said and decided, with who and when. No student details here: those stay in Leads.' },
};

// Kinds of fact --------------------------------------------------------------------------------

export const BRAIN_KINDS = [
  'contact',
  'talk',
  'goals',
  'target',
  'rivals',
  'regions',
  'logo',
  'colours',
  'fonts',
  'tagline',
  'tone',
  'avoid',
  'dos',
  'guidelines',
  'award',
  'placement_list',
  'alumnus',
  'review',
  'link',
  'date',
  'plan',
  'script',
  'worked',
  'note',
  'skip',
  'found',
] as const;
export type BrainKind = (typeof BRAIN_KINDS)[number];

/** Kinds a college has at most one of. A second save replaces the first. */
export const SINGLE_KINDS: ReadonlySet<BrainKind> = new Set(['talk', 'goals', 'target', 'rivals', 'regions', 'logo', 'colours', 'fonts', 'tagline', 'tone', 'avoid', 'dos', 'guidelines']);

/** The section each kind of fact sits in. A skip, and a fact Drishti found for the details, sit with the fact they stand for. */
export const KIND_SECTION: Readonly<Record<Exclude<BrainKind, 'skip' | 'found'>, BrainSection>> = {
  contact: 'basics',
  talk: 'basics',
  goals: 'basics',
  target: 'basics',
  rivals: 'basics',
  regions: 'basics',
  logo: 'brand',
  colours: 'brand',
  fonts: 'brand',
  tagline: 'brand',
  tone: 'brand',
  avoid: 'brand',
  dos: 'brand',
  guidelines: 'brand',
  award: 'proof',
  placement_list: 'proof',
  alumnus: 'proof',
  review: 'proof',
  link: 'links',
  date: 'calendar',
  plan: 'content',
  script: 'content',
  worked: 'content',
  note: 'notes',
};

export const KIND_LABELS: Readonly<Record<BrainKind, string>> = {
  contact: 'Contact',
  talk: 'How they like to talk',
  goals: 'Top goals this year',
  target: 'Admission target',
  rivals: 'Main rivals',
  regions: 'Where students should come from',
  logo: 'Logo',
  colours: 'Colours',
  fonts: 'Fonts',
  tagline: 'Tagline',
  tone: 'Tone',
  avoid: 'Words or topics to avoid',
  dos: 'Do',
  guidelines: 'Brand guidelines',
  award: 'Ranking or award',
  placement_list: 'Placement list',
  alumnus: 'Known alumni',
  review: 'Student review',
  link: 'Link',
  date: 'Date',
  plan: 'Content plan',
  script: 'Script',
  worked: 'What worked',
  note: 'Note',
  skip: 'Doesn’t apply',
  found: 'Found by Drishti',
};

// The fields of each kind ----------------------------------------------------------------------

export const CONTACT_ROLES = ['main', 'approver', 'other'] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];
export const CONTACT_ROLE_LABELS: Readonly<Record<ContactRole, string>> = { main: 'Main contact', approver: 'Approves our content', other: 'Contact' };

export const TONES = ['friendly', 'formal'] as const;
export type Tone = (typeof TONES)[number];
export const TONE_LABELS: Readonly<Record<Tone, string>> = { friendly: 'Friendly', formal: 'Formal' };

export const AWARD_TYPES = ['ranking', 'award'] as const;
export type AwardType = (typeof AWARD_TYPES)[number];

export const LINK_TYPES = ['drive', 'shiksha', 'collegedunia', 'portal', 'brochure', 'photos', 'videos', 'other'] as const;
export type LinkType = (typeof LINK_TYPES)[number];
export const LINK_TYPE_LABELS: Readonly<Record<LinkType, string>> = {
  drive: 'Shared Drive folder',
  shiksha: 'Shiksha',
  collegedunia: 'CollegeDunia',
  portal: 'Admission portal',
  brochure: 'Brochure',
  photos: 'Photos',
  videos: 'Videos',
  other: 'Other link',
};

export const DATE_TYPES = ['season', 'exam', 'fest', 'event', 'convocation', 'open_day', 'no_post'] as const;
export type DateType = (typeof DATE_TYPES)[number];
export const DATE_TYPE_LABELS: Readonly<Record<DateType, string>> = {
  season: 'Admission season',
  exam: 'Exams',
  fest: 'Fest',
  event: 'Event',
  convocation: 'Convocation',
  open_day: 'Open day',
  no_post: 'Don’t post',
};

export const SCRIPT_FORMATS = ['reel', 'post', 'video', 'other'] as const;
export type ScriptFormat = (typeof SCRIPT_FORMATS)[number];
export const SCRIPT_FORMAT_LABELS: Readonly<Record<ScriptFormat, string>> = { reel: 'Reel', post: 'Post', video: 'Video', other: 'Other' };

export const NOTE_TYPES = ['meeting', 'decision', 'feedback', 'note'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];
export const NOTE_TYPE_LABELS: Readonly<Record<NoteType, string>> = { meeting: 'Meeting notes', decision: 'Decision', feedback: 'Feedback', note: 'Note' };

/** A file kept in the Brain's private bucket. */
export interface BrainFile {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface BrainFields {
  contact: { role: ContactRole; name: string; title: string | null; phone: string | null; email: string | null; best: string | null; approves: string | null };
  talk: { how: string };
  goals: { goals: string[] };
  target: { count: number; note: string | null };
  rivals: { names: string[] };
  regions: { places: string[] };
  logo: { link: string | null; file: BrainFile | null };
  colours: { colours: Array<{ name: string; hex: string }> };
  fonts: { text: string };
  tagline: { text: string };
  tone: { tone: Tone; line: string | null };
  avoid: { items: string[] };
  dos: { items: string[] };
  guidelines: { link: string | null; file: BrainFile | null };
  award: { type: AwardType; title: string; year: number | null; link: string | null };
  placement_list: { programId: string | null; year: number | null; link: string };
  alumnus: { name: string; line: string; program: string | null; link: string | null };
  review: { quote: string; by: string; link: string | null; consent: true };
  link: { type: LinkType; label: string | null; url: string; shared: boolean };
  date: { type: DateType; title: string; from: string; to: string | null };
  plan: { month: string; link: string | null; status: 'draft' | 'agreed'; agreedBy: string | null; note: string | null };
  script: { format: ScriptFormat; title: string; link: string | null; status: 'waiting' | 'approved'; approver: string | null };
  worked: { month: string; line: string; link: string | null };
  note: { type: NoteType; title: string | null; body: string; on: string | null; link: string | null };
  skip: { slot: string; reason: string };
  /**
   * What Drishti found for the details added by you, waiting to be confirmed: a program's fees
   * ('program:<id>:fees') or page ('program:<id>:page'), or the approvals ('about:approvals').
   * Confirming writes it into the details, the one place it lives.
   */
  found: {
    target: string;
    label: string;
    value: string;
    feesAmount: number | null;
    feesPeriod: 'year' | 'total' | null;
    pageUrl: string | null;
    approvals: { ugc: boolean; aicte: boolean; naac: boolean; other: string[] } | null;
  };
}

export type ItemSource = 'drishti' | 'college' | 'team';

/** One stored fact. */
export interface BrainItem<K extends BrainKind = BrainKind> {
  id: string;
  kind: K;
  fields: BrainFields[K];
  /** Drishti pre-filled it and nobody has confirmed it yet. */
  toConfirm: boolean;
  source: ItemSource;
  /** Saved from Help us know you. */
  viaHelp: boolean;
  /** Where Drishti found it, and when. */
  sourceUrl: string | null;
  foundAt: string | null;
  checkedAt: string;
  checkedBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export type AnyBrainItem = { [K in BrainKind]: BrainItem<K> }[BrainKind];

/** One fact of the details added by you, kept as a unit for Needs checking. */
export type DetailFact = 'about' | `program:${string}:fees` | `program:${string}:dates` | `program:${string}:details`;

export interface BrainProgram {
  id: string;
  name: string;
  details: ProgramDetails;
  /** One of the programs to push most. */
  push: boolean;
}

export const STEPS = ['drive_shared', 'brand_kit', 'social_access', 'media_received', 'approver_confirmed', 'plan_agreed'] as const;
export type BrainStep = (typeof STEPS)[number];
export const STEP_INFO: Readonly<Record<BrainStep, { name: string; note?: string; needs?: string }>> = {
  drive_shared: { name: 'Drive folder shared', needs: 'Needs a shared Drive folder in Links' },
  brand_kit: { name: 'Brand kit received' },
  social_access: {
    name: 'Social media access given',
    note: 'Through each platform’s own team invite: Meta Business Suite partner access for Instagram and Facebook, channel permissions for YouTube. Never passwords.',
  },
  media_received: { name: 'Photos and videos received' },
  approver_confirmed: { name: 'Approval contact confirmed', needs: 'Needs who approves content in Basics' },
  plan_agreed: { name: 'First month’s content plan agreed', needs: 'Needs an agreed content plan in Content' },
};

export interface Stamp {
  at: string;
  by: string | null;
}

/** Everything the Brain shows, as loaded for one college. */
export interface Brain {
  institution: {
    id: string;
    name: string;
    type: InstitutionType;
    city: string;
    state: string;
    website: string;
    instagram: string | null;
    youtube: string | null;
    facebook: string | null;
    linkedin: string | null;
    googleMaps: string | null;
  };
  status: 'onboarding' | 'ready';
  started: Stamp;
  ready: Stamp | null;
  items: AnyBrainItem[];
  details: InstitutionDetails;
  programs: BrainProgram[];
  /** When each detail fact was last changed or said to be still right. */
  checks: ReadonlyMap<string, Stamp>;
  steps: ReadonlyMap<BrainStep, Stamp>;
}

export function itemsOf<K extends BrainKind>(brain: Pick<Brain, 'items'>, kind: K): Array<BrainItem<K>> {
  return brain.items.filter((item): item is BrainItem<K> & AnyBrainItem => item.kind === kind) as Array<BrainItem<K>>;
}

export function firstOf<K extends BrainKind>(brain: Pick<Brain, 'items'>, kind: K): BrainItem<K> | null {
  return itemsOf(brain, kind).find((item) => !item.toConfirm) ?? null;
}

export function contactOf(brain: Pick<Brain, 'items'>, role: ContactRole): BrainItem<'contact'> | null {
  return itemsOf(brain, 'contact').find((item) => !item.toConfirm && item.fields.role === role) ?? null;
}

/** The skip that stands for a missing fact, by its slot. */
export function skipOf(brain: Pick<Brain, 'items'>, slot: string): BrainItem<'skip'> | null {
  return itemsOf(brain, 'skip').find((item) => item.fields.slot === slot) ?? null;
}

/** The section a stored item sits in. */
export function sectionOf(item: Pick<AnyBrainItem, 'kind' | 'fields'>): BrainSection {
  if (item.kind === 'skip') return targetSection((item.fields as BrainFields['skip']).slot);
  if (item.kind === 'found') return targetSection((item.fields as BrainFields['found']).target);
  return KIND_SECTION[item.kind];
}

/** The section a slot or a target ('program:<id>:fees', 'about:approvals', 'logo') belongs to. */
export function targetSection(key: string): BrainSection {
  if (key.startsWith('program:')) return 'programs';
  if (key === 'logo' || key === 'colours' || key === 'tone' || key === 'avoid') return 'brand';
  if (key === 'awards' || key === 'placements') return 'proof';
  if (key === 'drive') return 'links';
  if (key === 'season') return 'calendar';
  if (key === 'plan') return 'content';
  return 'basics';
}

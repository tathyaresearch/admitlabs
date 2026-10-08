// The Client Brain in the sample world (spec sections 20 and 26). Brightpath Skills Academy has a
// Brain made Ready on 16 March, lived in since: two facts need checking before admissions open on
// 1 December (Hotel Management's fees and dates, last checked in March). Silverline College became
// a Client on 1 October: its Brain started on 3 October, Drishti pre-filled what its latest Audit
// found, the kickoff call was on 6 October and Meera filled Help us know you on 7 October; it is
// 80% complete with 4 of 6 checklist steps done. People, phone numbers and links are made up:
// phone numbers start with 0 and links use .example.

import type { BrainFields, BrainKind, BrainStep } from '../brain/model.ts';
import type { ProgramDetails } from '../domain/details.ts';
import { ADMIN_EMAIL, MANAGER_EMAIL, TEAM_EMAIL } from './institutions.ts';

/** Each sample person's name, as they set it once. Everyone else shows by email. */
export const SAMPLE_NAMES: Readonly<Record<string, string>> = {
  'owner@brightpath-skills.example': 'Ritu Bora',
  'anjali@brightpath-skills.example': 'Anjali Das',
  'owner@silverline-college.example': 'Meera Kalita',
  [TEAM_EMAIL]: 'Kabir Sen',
  [ADMIN_EMAIL]: 'Nisha Rao',
  [MANAGER_EMAIL]: 'Farhan Ali',
};

const RITU = 'owner@brightpath-skills.example';
const ANJALI = 'anjali@brightpath-skills.example';
const MEERA = 'owner@silverline-college.example';
const KABIR = TEAM_EMAIL;

export interface SampleFact<K extends Exclude<BrainKind, 'found'> = Exclude<BrainKind, 'found'>> {
  kind: K;
  fields: BrainFields[K];
  by: string;
  /** 'YYYY-MM-DD', India time; the hour keeps a day's facts in order. */
  on: string;
  hour?: number;
  viaHelp?: boolean;
}

type AnyFact = { [K in Exclude<BrainKind, 'found'>]: SampleFact<K> }[Exclude<BrainKind, 'found'>];

const fact = <K extends Exclude<BrainKind, 'found'>>(kind: K, fields: BrainFields[K], by: string, on: string, extra: { hour?: number; viaHelp?: boolean } = {}): AnyFact => ({ kind, fields, by, on, ...extra }) as AnyFact;

const contact = (role: BrainFields['contact']['role'], name: string, title: string, phone: string, email: string, best: string | null, approves: string | null = null): BrainFields['contact'] => ({ role, name, title, phone, email, best, approves });
const link = (type: BrainFields['link']['type'], url: string, label: string | null = null, shared = false): BrainFields['link'] => ({ type, url, label, shared });
const date = (type: BrainFields['date']['type'], title: string, from: string, to: string | null = null): BrainFields['date'] => ({ type, title, from, to });
const note = (type: BrainFields['note']['type'], title: string | null, body: string, on: string | null, href: string | null = null): BrainFields['note'] => ({ type, title, body, on, link: href });

/** A change to the details added by you, as the Brain makes it (merged into what is there). */
export interface SampleDetailChange {
  /** A program by its key, or null for the college's own details. */
  programKey: string | null;
  details: Partial<ProgramDetails> & Record<string, unknown>;
  push?: boolean;
  by: string;
  on: string;
  hour?: number;
}

export interface SampleBrain {
  slug: string;
  started: { on: string; by: string };
  ready: { on: string; by: string } | null;
  /** Run Start onboarding's pre-fill from the latest Audit (after the Audits are made). */
  prefill: boolean;
  /** What the team did with what Drishti found, by target or link. A correction to the details says what it set. */
  outcomes: ReadonlyArray<{ match: string; outcome: 'confirmed' | 'corrected' | 'not_right'; by: string; on: string; details?: Record<string, unknown> }>;
  details: readonly SampleDetailChange[];
  facts: readonly AnyFact[];
  steps: ReadonlyArray<{ step: BrainStep; by: string; on: string }>;
  /** "Still right" on facts of the details, by program key (or 'about'), group and day. */
  checks: ReadonlyArray<{ programKey: string | null; group: 'fees' | 'dates' | 'details'; by: string; on: string }>;
}

export const SAMPLE_BRAINS: readonly SampleBrain[] = [
  {
    slug: 'brightpath-skills',
    started: { on: '2026-03-02', by: KABIR },
    ready: { on: '2026-03-16', by: KABIR },
    prefill: false,
    outcomes: [],
    details: [
      {
        programKey: 'digital-marketing',
        details: { level: 'certificate', eligibility: '12th pass in any stream', highlights: 'Live projects with Guwahati brands. Google and Meta certificates.', applicationsOpen: '2026-12-01', applicationsClose: '2027-01-10' },
        push: true,
        by: RITU,
        on: '2026-03-06',
      },
      {
        programKey: 'data-analytics',
        details: { level: 'certificate', durationValue: 6, durationUnit: 'months', feesAmount: 55000, feesPeriod: 'total', seats: 30, eligibility: 'A degree in any stream', highlights: 'Excel, SQL and Power BI, with a final project on tea trade data.', applicationsOpen: '2026-09-15', applicationsClose: '2027-01-20' },
        by: RITU,
        on: '2026-03-06',
        hour: 11,
      },
      {
        programKey: 'hotel-management',
        details: { level: 'diploma', durationValue: 1, durationUnit: 'years', feesAmount: 85000, feesPeriod: 'total', seats: 35, eligibility: '12th pass in any stream', highlights: 'Kitchen and front office training at partner hotels in Guwahati.', applicationsOpen: '2026-12-01', applicationsClose: '2027-01-15' },
        by: RITU,
        on: '2026-03-06',
        hour: 12,
      },
      { programKey: 'data-analytics', details: { placementYear: 2026, placedPercent: 68, averagePackage: 3.4 }, by: RITU, on: '2026-09-20', hour: 11 },
      { programKey: 'data-analytics', details: { feesAmount: 60000 }, by: RITU, on: '2026-09-20', hour: 12 },
    ],
    facts: [
      fact('link', link('drive', 'https://drive.google.example/brightpath-shared', 'Brightpath x AdmitLabs', true), KABIR, '2026-03-04'),
      fact('contact', contact('main', 'Ritu Bora', 'Director', '+91 00000 23140', 'ritu@brightpath-skills.example', 'WhatsApp, 10 am to 6 pm'), RITU, '2026-03-06', { hour: 11 }),
      fact('contact', contact('approver', 'Anjali Das', 'Marketing head', '+91 00000 41203', 'anjali@brightpath-skills.example', 'WhatsApp, replies within the hour', 'Reels and posts. Anything that names a fee goes to Ritu.'), KABIR, '2026-03-06', { hour: 12 }),
      fact('talk', { how: 'A WhatsApp group for everyday things, email for anything about fees, and a call every second Tuesday at 4 pm. English, and Assamese on calls.' }, KABIR, '2026-03-06', { hour: 13 }),
      fact('goals', { goals: ['Fill the January Digital Marketing batch by December', 'Grow Hotel Management to a full batch of 35', 'Reach 300 Google reviews'] }, RITU, '2026-03-06', { hour: 14 }),
      fact('target', { count: 120, note: 'Across the three programs, this academic year' }, RITU, '2026-03-06', { hour: 14 }),
      fact('rivals', { names: ['Pinegrove Skills Hub', 'Cedar Skill Institute'] }, RITU, '2026-03-06', { hour: 15 }),
      fact('tone', { tone: 'friendly', line: 'Like a senior who just got the job: plain English, short lines, a little Assamese.' }, KABIR, '2026-03-06', { hour: 15 }),
      fact('avoid', { items: ['“100% placement”', 'Stock photos', 'Naming other institutes'] }, RITU, '2026-03-06', { hour: 16 }),
      fact('link', link('portal', 'https://apply.brightpath-skills.example', null), RITU, '2026-03-06', { hour: 16 }),
      fact('note', note('meeting', 'Kickoff call', 'Brand voice, contacts and the three programs agreed.\nAnjali approves posts; anything about fees goes to Ritu.', '2026-03-06'), KABIR, '2026-03-06', { hour: 17 }),
      fact('regions', { places: ['Guwahati', 'Nalbari', 'Barpeta', 'Shillong'] }, ANJALI, '2026-03-10'),
      fact('logo', { link: 'https://drive.google.example/brightpath-logos', file: null }, ANJALI, '2026-03-10', { hour: 11 }),
      fact('colours', { colours: [{ name: 'Brightpath Teal', hex: '#0F6E6A' }, { name: 'Sunrise Orange', hex: '#F28C28' }, { name: 'Ink', hex: '#1C1C1C' }, { name: 'Cloud', hex: '#F5F5F2' }] }, ANJALI, '2026-03-10', { hour: 11 }),
      fact('fonts', { text: 'Poppins for headings, Open Sans for text' }, ANJALI, '2026-03-10', { hour: 11 }),
      fact('tagline', { text: 'Skills that get you hired.' }, ANJALI, '2026-03-10', { hour: 12 }),
      fact('award', { type: 'award', title: 'Best Skilling Partner, Assam Startup Week', year: 2025, link: 'https://news.example/assam-startup-week-2025' }, ANJALI, '2026-03-10', { hour: 12 }),
      fact('link', link('brochure', 'https://drive.google.example/brightpath-brochure-2026', 'Brochure 2026, PDF'), ANJALI, '2026-03-10', { hour: 13 }),
      fact('link', link('shiksha', 'https://shiksha.example/brightpath-skills-academy'), KABIR, '2026-03-11'),
      fact('plan', { month: '2026-03', link: 'https://docs.google.example/brightpath-mar', status: 'agreed', agreedBy: 'Anjali Das', note: 'First month: 8 reels, 4 posts' }, KABIR, '2026-03-12'),
      fact('note', note('decision', 'Ads', 'No paid ads this season. Content only.', '2026-03-12'), RITU, '2026-03-12', { hour: 12 }),
      fact('link', link('videos', 'https://drive.google.example/brightpath-videos', 'Raw videos and student interviews'), ANJALI, '2026-07-02'),
      fact('alumnus', { name: 'Pallavi Sharma', line: 'Social media executive at a Guwahati tea brand', program: 'Digital Marketing, 2025', link: 'https://drive.google.example/brightpath-alumni-pallavi' }, ANJALI, '2026-07-14'),
      fact('alumnus', { name: 'Rahul Deka', line: 'Analyst at a logistics firm in Kolkata', program: 'Data Analytics, 2025', link: 'https://brightpath-skills.example/stories/analyst' }, ANJALI, '2026-07-14', { hour: 11 }),
      fact('review', { quote: 'The trainers had us running real campaigns from week two.', by: 'Digital Marketing student, 2025 batch', link: 'https://maps.google.example/brightpath/reviews', consent: true }, ANJALI, '2026-07-14', { hour: 12 }),
      fact('worked', { month: '2026-07', line: 'The fee in the first line of a caption brought more messages', link: null }, ANJALI, '2026-08-04'),
      fact('placement_list', { programId: 'digital-marketing', year: 2026, link: 'https://docs.google.example/brightpath-dm-2026' }, RITU, '2026-08-12'),
      fact('worked', { month: '2026-08', line: 'Reels led by students beat reels led by faculty', link: null }, KABIR, '2026-09-02'),
      fact('note', note('decision', 'Reels', 'Reels in English, with Assamese captions.', '2026-09-02'), ANJALI, '2026-09-02', { hour: 12 }),
      fact('date', date('exam', 'Digital Marketing final assessments', '2026-10-20', '2026-10-24'), RITU, '2026-09-02', { hour: 13 }),
      fact('date', date('event', 'Placement drive with 12 Guwahati employers', '2026-11-28'), RITU, '2026-09-20'),
      fact('placement_list', { programId: 'data-analytics', year: 2026, link: 'https://docs.google.example/brightpath-da-2026' }, RITU, '2026-09-20', { hour: 13 }),
      fact('plan', { month: '2026-10', link: 'https://docs.google.example/brightpath-oct', status: 'agreed', agreedBy: 'Anjali Das', note: '12 reels, 4 posts, 1 video' }, KABIR, '2026-09-29'),
      fact('link', link('photos', 'https://drive.google.example/brightpath-photos-sep', 'Campus and class photos, September'), ANJALI, '2026-09-30'),
      fact('worked', { month: '2026-09', line: 'Assamese captions on reels: twice the saves of English only', link: null }, KABIR, '2026-10-01'),
      fact('date', date('open_day', 'Open day on campus, 11 am', '2026-11-15'), ANJALI, '2026-10-01', { hour: 11 }),
      fact('date', date('no_post', 'Results week', '2026-10-26', '2026-10-28'), ANJALI, '2026-10-01', { hour: 12 }),
      fact('note', note('feedback', 'September posts', 'They felt formal. Keep it warmer.', '2026-10-01'), ANJALI, '2026-10-01', { hour: 13 }),
      fact('dos', { items: ['Show real students and real workplaces', 'Say the fee in full', 'Use Assamese captions on reels'] }, ANJALI, '2026-10-02'),
      fact('script', { format: 'reel', title: 'A day in a Digital Marketing class', link: 'https://docs.google.example/brightpath-reel-day', status: 'approved', approver: 'Anjali Das' }, ANJALI, '2026-10-02', { hour: 12 }),
      fact('script', { format: 'reel', title: 'Hotel Management kitchen tour', link: 'https://docs.google.example/brightpath-reel-kitchen', status: 'approved', approver: 'Anjali Das' }, ANJALI, '2026-10-05'),
      fact('script', { format: 'video', title: 'Where our 2026 batch works now', link: 'https://docs.google.example/brightpath-yt-batch', status: 'waiting', approver: 'Ritu Bora' }, KABIR, '2026-10-06'),
      fact('plan', { month: '2026-11', link: 'https://docs.google.example/brightpath-nov', status: 'draft', agreedBy: 'Anjali Das', note: 'Hotel Management push' }, KABIR, '2026-10-06', { hour: 12 }),
      fact('note', note('meeting', 'Monthly call', 'Push Hotel Management in November.\nRitu confirms the 2027 fees by 15 Oct.\nFilm the open day invite by 15 Oct.', '2026-10-06', 'https://docs.google.example/brightpath-call-oct'), KABIR, '2026-10-06', { hour: 13 }),
    ],
    steps: [
      { step: 'drive_shared', by: KABIR, on: '2026-03-04' },
      { step: 'approver_confirmed', by: KABIR, on: '2026-03-06' },
      { step: 'social_access', by: KABIR, on: '2026-03-07' },
      { step: 'brand_kit', by: KABIR, on: '2026-03-10' },
      { step: 'media_received', by: KABIR, on: '2026-03-11' },
      { step: 'plan_agreed', by: KABIR, on: '2026-03-12' },
    ],
    checks: [
      { programKey: 'digital-marketing', group: 'fees', by: RITU, on: '2026-08-12' },
      { programKey: 'digital-marketing', group: 'dates', by: RITU, on: '2026-08-12' },
      { programKey: 'digital-marketing', group: 'details', by: RITU, on: '2026-08-12' },
      { programKey: 'data-analytics', group: 'dates', by: RITU, on: '2026-09-20' },
      { programKey: null, group: 'details', by: RITU, on: '2026-09-02' },
    ],
  },
  {
    slug: 'silverline-college',
    started: { on: '2026-10-03', by: KABIR },
    ready: null,
    prefill: true,
    outcomes: [
      { match: 'about:approvals', outcome: 'corrected', details: { naacGrade: 'A', ugcRecognised: true, aicteApproved: true }, by: KABIR, on: '2026-10-06' },
      { match: 'collegeguide.example', outcome: 'confirmed', by: KABIR, on: '2026-10-06' },
      { match: 'citydirectory.example', outcome: 'not_right', by: KABIR, on: '2026-10-06' },
      { match: 'Hotel Management fees', outcome: 'not_right', by: KABIR, on: '2026-10-07' },
    ],
    details: [
      { programKey: null, details: { foundedYear: 2009, campusAddress: 'GS Road, Christian Basti, Guwahati 781005' }, by: KABIR, on: '2026-10-06' },
      {
        programKey: 'bba',
        details: { level: 'ug', durationValue: 3, durationUnit: 'years', seats: 120, eligibility: '12th pass with 45% marks', applicationsOpen: '2027-01-05', applicationsClose: '2027-05-31', placementYear: 2026, placedPercent: 82, averagePackage: 3.6, highestPackage: 7.2, topRecruiters: ['Axis Bank', 'Teleperformance', 'Reliance Retail'] },
        push: true,
        by: MEERA,
        on: '2026-10-07',
      },
      { programKey: 'bcom', details: { level: 'ug', durationValue: 3, durationUnit: 'years', seats: 90, eligibility: '12th pass in commerce', applicationsOpen: '2027-01-05', applicationsClose: '2027-05-31' }, by: MEERA, on: '2026-10-07', hour: 11 },
      { programKey: 'hotel-management', details: { level: 'ug', durationValue: 3, durationUnit: 'years', feesAmount: 95000, feesPeriod: 'year', eligibility: '12th pass in any stream', applicationsOpen: '2027-01-05', applicationsClose: '2027-05-31' }, push: true, by: MEERA, on: '2026-10-07', hour: 12 },
    ],
    facts: [
      fact('link', link('drive', 'https://drive.google.example/silverline-shared', 'Silverline x AdmitLabs', true), KABIR, '2026-10-06', { hour: 11 }),
      fact('talk', { how: 'Email for anything official, WhatsApp for quick questions, and a call every Monday at 11 am.' }, KABIR, '2026-10-06', { hour: 12 }),
      fact('regions', { places: ['Guwahati', 'Shillong', 'Arunachal Pradesh', 'Nagaland'] }, KABIR, '2026-10-06', { hour: 12 }),
      fact('rivals', { names: ['Eastgate University', 'Northbank College'] }, KABIR, '2026-10-06', { hour: 12 }),
      fact('tone', { tone: 'friendly', line: 'Warm and proud, never loud.' }, KABIR, '2026-10-06', { hour: 13 }),
      fact('avoid', { items: ['Comparing with other colleges', '“Guaranteed jobs”'] }, KABIR, '2026-10-06', { hour: 13 }),
      fact('award', { type: 'award', title: 'Best Hospitality Program, North East Education Awards', year: 2025, link: 'https://newsassam.example/2025/12/education-awards' }, KABIR, '2026-10-06', { hour: 14 }),
      fact('date', date('season', '', '2027-01-05', '2027-05-31'), KABIR, '2026-10-06', { hour: 14 }),
      fact('date', date('fest', 'Hospitality fest', '2026-12-12', '2026-12-13'), KABIR, '2026-10-06', { hour: 14 }),
      fact('plan', { month: '2026-10', link: 'https://docs.google.example/silverline-oct', status: 'draft', agreedBy: 'Meera Kalita', note: 'First month: 8 reels, 4 posts' }, KABIR, '2026-10-06', { hour: 15 }),
      fact('note', note('meeting', 'Kickoff call', 'Voice, contacts, programs and the first month agreed in outline.\nMeera wants two sample reels before agreeing October’s plan.', '2026-10-06'), KABIR, '2026-10-06', { hour: 16 }),
      fact('contact', contact('main', 'Arup Baruah', 'Admissions head', '+91 00000 51870', 'arup@silverline-college.example', 'Phone, 10 am to 5 pm'), MEERA, '2026-10-07', { viaHelp: true }),
      fact('contact', contact('approver', 'Meera Kalita', 'Principal', '+91 00000 51801', 'meera@silverline-college.example', 'WhatsApp', 'Reels and posts. Arup approves anything that names admission dates.'), MEERA, '2026-10-07', { hour: 11, viaHelp: true }),
      fact('goals', { goals: ['Fill every BBA seat by June', 'Make Hotel Management known beyond Guwahati', 'Show our placements with real numbers'] }, MEERA, '2026-10-07', { hour: 11, viaHelp: true }),
      fact('target', { count: 600, note: 'New students across all programs' }, MEERA, '2026-10-07', { hour: 11, viaHelp: true }),
      fact('colours', { colours: [{ name: 'Silverline Navy', hex: '#1F3A5F' }, { name: 'Silver', hex: '#C0C4CC' }, { name: 'White', hex: '#FFFFFF' }] }, MEERA, '2026-10-07', { hour: 12, viaHelp: true }),
      fact('tagline', { text: 'Learn here. Lead anywhere.' }, MEERA, '2026-10-07', { hour: 12, viaHelp: true }),
      fact('alumnus', { name: 'Priya Hazarika', line: 'Cabin crew with a national airline', program: 'Hotel Management, 2024', link: 'https://quora.example/Silverline-College-placements' }, MEERA, '2026-10-07', { hour: 13, viaHelp: true }),
      fact('review', { quote: 'The fee page answered every question we had.', by: 'A parent, 2026 admissions', link: 'https://studentforum.example/t/silverline-fees', consent: true }, MEERA, '2026-10-07', { hour: 13, viaHelp: true }),
    ],
    steps: [
      { step: 'drive_shared', by: KABIR, on: '2026-10-06' },
      { step: 'social_access', by: KABIR, on: '2026-10-07' },
      { step: 'media_received', by: KABIR, on: '2026-10-07' },
      { step: 'approver_confirmed', by: KABIR, on: '2026-10-07' },
    ],
    checks: [],
  },
];

/** Silverline College moves from Free to Client on 1 October (an Admin switched it on). */
export const SAMPLE_NEW_CLIENTS: ReadonlyArray<{ slug: string; on: string; by: string }> = [{ slug: 'silverline-college', on: '2026-10-01', by: ADMIN_EMAIL }];

/** The team's work log for Silverline, from its first week as a Client. */
export const SAMPLE_NEW_CLIENT_WORK: ReadonlyArray<{ slug: string; kind: 'done' | 'next'; text: string; on: string; addedOn: string }> = [
  { slug: 'silverline-college', kind: 'done', text: 'Kickoff call with Meera and Arup: voice, contacts and programs', on: '2026-10-06', addedOn: '2026-10-06' },
  { slug: 'silverline-college', kind: 'done', text: 'Set up the shared Drive folder', on: '2026-10-06', addedOn: '2026-10-06' },
  { slug: 'silverline-college', kind: 'next', text: 'Agree October’s content plan with Meera', on: '2026-10-12', addedOn: '2026-10-06' },
  { slug: 'silverline-college', kind: 'next', text: 'First reel: a day at Silverline', on: '2026-10-16', addedOn: '2026-10-06' },
];

/** The team's own notes, which the college never sees. */
export const SAMPLE_BRAIN_NOTES: ReadonlyArray<{ slug: string; body: string; on: string }> = [
  { slug: 'brightpath-skills', body: 'Ritu decides on calls, not on WhatsApp. Anjali replies on WhatsApp within the hour.', on: '2026-10-06' },
  { slug: 'brightpath-skills', body: 'The November shoot budget is tight. Offer a phone shoot with two students first.', on: '2026-10-06' },
  { slug: 'silverline-college', body: 'Meera wants to see two reels before agreeing the October plan. Send them by Friday.', on: '2026-10-07' },
];

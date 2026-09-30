// The 8 fictional sample institutions (spec section 20). All names are made up and every
// website uses a .example domain. Social links also use .example hosts, so no sample link
// can ever point at a real account.

import type { AuditTrigger, InstitutionType, Tier } from '../domain/types.ts';

export interface SampleProgram {
  name: string;
  programKey: string;
}

export interface SampleInstitution {
  slug: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string;
  youtube: string | null;
  otherLinks: { facebook?: string; linkedin?: string };
  programs: readonly SampleProgram[];
  /** When the record was first created (by a signup, a rival add, or the team). */
  createdAt: string;
  /** Who created it: an owner email, or the team. */
  createdBy: string | null;
  claimedAt: string | null;
  isProspect: boolean;
  owner: string | null;
  members: readonly string[];
  plan: { tier: Tier; startsAt: string; endsAt: string | null; setBy: string | null; freeProgramKey: string | null } | null;
  /** How this institution is used in the sample, for the seed summary. */
  role: string;
}

const P = {
  bba: { name: 'BBA', programKey: 'bba' },
  mba: { name: 'MBA', programKey: 'mba' },
  bca: { name: 'BCA', programKey: 'bca' },
  bcom: { name: 'B.Com', programKey: 'bcom' },
  nursing: { name: 'B.Sc Nursing', programKey: 'nursing' },
  hotel: { name: 'Hotel Management', programKey: 'hotel-management' },
  digital: { name: 'Digital Marketing', programKey: 'digital-marketing' },
  data: { name: 'Data Analytics', programKey: 'data-analytics' },
  dataDegree: { name: 'B.Sc Data Analytics', programKey: 'data-analytics' },
} as const satisfies Record<string, SampleProgram>;

export const SAMPLE_PROGRAM_KEYS = [
  'bba',
  'mba',
  'bca',
  'bcom',
  'nursing',
  'hotel-management',
  'digital-marketing',
  'data-analytics',
] as const;

export const TEAM_EMAIL = 'team@admitlabs.example';
export const ADMIN_EMAIL = 'admin@admitlabs.example';

export const SAMPLE_INSTITUTIONS: readonly SampleInstitution[] = [
  {
    slug: 'northbank-college',
    name: 'Northbank College',
    type: 'college',
    city: 'Guwahati',
    state: 'Assam',
    website: 'https://northbank-college.example',
    instagram: 'northbankcollege',
    youtube: null,
    otherLinks: { facebook: 'https://facebook.example/northbankcollege' },
    programs: [P.bba, P.bca, P.bcom],
    createdAt: '2026-04-15',
    createdBy: 'owner@eastgate-university.example',
    claimedAt: '2026-06-10',
    isProspect: false,
    owner: 'owner@northbank-college.example',
    members: [],
    plan: { tier: 'free', startsAt: '2026-06-10', endsAt: null, setBy: null, freeProgramKey: 'bba' },
    role: 'Free tier. Tracked by Eastgate before it signed up, then claimed its record.',
  },
  {
    slug: 'eastgate-university',
    name: 'Eastgate University',
    type: 'university',
    city: 'Guwahati',
    state: 'Assam',
    website: 'https://eastgate-university.example',
    instagram: 'eastgateuniversity',
    youtube: 'https://youtube.example/@eastgateuniversity',
    otherLinks: { facebook: 'https://facebook.example/eastgateuniversity', linkedin: 'https://linkedin.example/school/eastgate-university' },
    programs: [P.mba, P.bba, P.bca, P.nursing, P.dataDegree],
    createdAt: '2026-03-02',
    createdBy: 'owner@brightpath-skills.example',
    claimedAt: '2026-03-20',
    isProspect: false,
    owner: 'owner@eastgate-university.example',
    members: ['member@eastgate-university.example'],
    plan: { tier: 'paid', startsAt: '2026-04-15', endsAt: '2026-10-15', setBy: ADMIN_EMAIL, freeProgramKey: null },
    role: 'Paid tier, 6 months of history. Plan ends 15 Oct 2026, so the 30 day reminder shows.',
  },
  {
    slug: 'brightpath-skills',
    name: 'Brightpath Skills Academy',
    type: 'skilling',
    city: 'Guwahati',
    state: 'Assam',
    website: 'https://brightpath-skills.example',
    instagram: 'brightpathskills',
    youtube: 'https://youtube.example/@brightpathskills',
    otherLinks: { facebook: 'https://facebook.example/brightpathskills', linkedin: 'https://linkedin.example/company/brightpath-skills' },
    programs: [P.digital, P.data, P.hotel],
    createdAt: '2026-03-02',
    createdBy: 'owner@brightpath-skills.example',
    claimedAt: '2026-03-02',
    isProspect: false,
    owner: 'owner@brightpath-skills.example',
    members: [],
    plan: { tier: 'client', startsAt: '2026-03-02', endsAt: null, setBy: ADMIN_EMAIL, freeProgramKey: null },
    role: 'Client tier, 6 months of history, rising as the AdmitLabs team acts on it.',
  },
  {
    slug: 'silverline-college',
    name: 'Silverline College',
    type: 'college',
    city: 'Guwahati',
    state: 'Assam',
    website: 'https://silverline-college.example',
    instagram: 'silverlinecollege',
    youtube: 'https://youtube.example/@silverlinecollege',
    otherLinks: { facebook: 'https://facebook.example/silverlinecollege' },
    programs: [P.bba, P.bcom, P.hotel],
    createdAt: '2026-03-02',
    createdBy: 'owner@brightpath-skills.example',
    claimedAt: '2026-07-22',
    isProspect: false,
    owner: 'owner@silverline-college.example',
    members: [],
    plan: { tier: 'free', startsAt: '2026-07-22', endsAt: null, setBy: null, freeProgramKey: 'bba' },
    role: 'Free tier. Tracks 3 rivals, and is tracked by 3 institutions without knowing.',
  },
  {
    slug: 'loomcraft-skills',
    name: 'Loomcraft Skills Institute',
    type: 'skilling',
    city: 'Tezpur',
    state: 'Assam',
    website: 'https://loomcraft-skills.example',
    instagram: 'loomcraftskills',
    youtube: null,
    otherLinks: { facebook: 'https://facebook.example/loomcraftskills' },
    programs: [P.digital, P.hotel],
    createdAt: '2026-03-02',
    createdBy: 'owner@brightpath-skills.example',
    claimedAt: null,
    isProspect: false,
    owner: null,
    members: [],
    plan: null,
    role: 'Rival record, unclaimed.',
  },
  {
    slug: 'highfield-university',
    name: 'Highfield University',
    type: 'university',
    city: 'Dibrugarh',
    state: 'Assam',
    website: 'https://highfield-university.example',
    instagram: 'highfielduniversity',
    youtube: 'https://youtube.example/@highfielduniversity',
    otherLinks: { facebook: 'https://facebook.example/highfielduniversity' },
    programs: [P.mba, P.bca, P.nursing],
    createdAt: '2026-04-15',
    createdBy: 'owner@eastgate-university.example',
    claimedAt: null,
    isProspect: false,
    owner: null,
    members: [],
    plan: null,
    role: 'Rival record, unclaimed.',
  },
  {
    slug: 'riverbend-college',
    name: 'Riverbend College',
    type: 'college',
    city: 'Jorhat',
    state: 'Assam',
    website: 'https://riverbend-college.example',
    instagram: 'riverbendcollege',
    youtube: null,
    otherLinks: {},
    programs: [P.bcom, P.bba],
    createdAt: '2026-09-18',
    createdBy: TEAM_EMAIL,
    claimedAt: null,
    isProspect: true,
    owner: null,
    members: [],
    plan: null,
    role: 'Prospect. Visible to the team only.',
  },
  {
    slug: 'cedar-skill-institute',
    name: 'Cedar Skill Institute',
    type: 'skilling',
    city: 'Guwahati',
    state: 'Assam',
    website: 'https://cedar-skills.example',
    instagram: 'cedarskills',
    youtube: 'https://youtube.example/@cedarskills',
    otherLinks: { facebook: 'https://facebook.example/cedarskills' },
    programs: [P.digital, P.data],
    createdAt: '2026-09-18',
    createdBy: TEAM_EMAIL,
    claimedAt: null,
    isProspect: true,
    owner: null,
    members: [],
    plan: null,
    role: 'Prospect. Visible to the team only.',
  },
];

export function sampleInstitution(slug: string): SampleInstitution {
  const found = SAMPLE_INSTITUTIONS.find((institution) => institution.slug === slug);
  if (!found) throw new Error(`Unknown sample institution: ${slug}`);
  return found;
}

/** Rivals each signed-up institution tracks: [tracker, rival, suggested by Drishti, added on]. */
export const SAMPLE_RIVALS: ReadonlyArray<readonly [string, string, boolean, string]> = [
  ['northbank-college', 'silverline-college', true, '2026-06-10'],
  ['northbank-college', 'eastgate-university', false, '2026-06-10'],
  ['northbank-college', 'highfield-university', false, '2026-06-10'],
  ['eastgate-university', 'highfield-university', true, '2026-04-15'],
  ['eastgate-university', 'silverline-college', false, '2026-04-15'],
  ['eastgate-university', 'northbank-college', false, '2026-04-15'],
  ['brightpath-skills', 'loomcraft-skills', true, '2026-03-02'],
  ['brightpath-skills', 'silverline-college', false, '2026-03-02'],
  ['brightpath-skills', 'eastgate-university', false, '2026-03-02'],
  ['silverline-college', 'northbank-college', true, '2026-07-22'],
  ['silverline-college', 'eastgate-university', false, '2026-07-22'],
  ['silverline-college', 'brightpath-skills', false, '2026-07-22'],
];

/**
 * One Audit run in the sample world. `own` runs are the institution's own Audits on its plan
 * (Free, Paid or Client); `rival` runs score a record others track; `team` runs are prospect
 * Audits the AdmitLabs team ran. Days are India dates; runs happen at 10 am.
 */
export interface SampleRun {
  day: string;
  kind: 'own' | 'rival' | 'team';
  trigger: AuditTrigger;
}

const monthly = (days: readonly string[]): SampleRun[] => days.map((day) => ({ day, kind: 'own', trigger: 'scheduled' }));

/** Drishti's own monthly rival Audit, on the 1st, for an institution others track. */
const rivalRuns = (days: readonly string[]): SampleRun[] => days.map((day) => ({ day, kind: 'rival', trigger: 'scheduled' }));

const byDay = (runs: readonly SampleRun[]): SampleRun[] => [...runs].sort((a, b) => a.day.localeCompare(b.day));

/** Every Audit run in the sample, in date order per institution. Rival scores come from rival runs only. */
export const SAMPLE_RUNS: Readonly<Record<string, readonly SampleRun[]>> = {
  // Paid from 15 Apr: monthly on the 15th. The extra refresh is left unused, so it can be tried.
  'eastgate-university': byDay([
    ...monthly(['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15']),
    ...rivalRuns(['2026-08-01', '2026-09-01']),
  ]),
  // Client from 2 Mar: monthly on the 2nd (history kept from April).
  'brightpath-skills': byDay([
    ...monthly(['2026-04-02', '2026-05-02', '2026-06-02', '2026-07-02', '2026-08-02', '2026-09-02']),
    ...rivalRuns(['2026-08-01', '2026-09-01']),
  ]),
  // Free from 10 Jun: at signup, then every 3 months on the 10th.
  'northbank-college': byDay([
    { day: '2026-06-10', kind: 'own', trigger: 'signup' },
    { day: '2026-09-10', kind: 'own', trigger: 'scheduled' },
    ...rivalRuns(['2026-08-01', '2026-09-01']),
  ]),
  // Free from 22 Jul (next free Audit 22 Oct). Tracked by three institutions, without knowing.
  'silverline-college': byDay([{ day: '2026-07-22', kind: 'own', trigger: 'signup' }, ...rivalRuns(['2026-08-01', '2026-09-01'])]),
  'highfield-university': rivalRuns(['2026-08-01', '2026-09-01']),
  'loomcraft-skills': rivalRuns(['2026-08-01', '2026-09-01']),
  'riverbend-college': [{ day: '2026-09-18', kind: 'team', trigger: 'manual' }],
  'cedar-skill-institute': [{ day: '2026-09-18', kind: 'team', trigger: 'manual' }],
};

/** "Today" for the sample world. */
export const SAMPLE_TODAY = '2026-09-30';

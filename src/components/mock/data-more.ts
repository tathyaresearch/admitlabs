// Version 2 mock (Step 2, development only): Rivals by place, the Nearby city chooser, Demand with
// Make these 3, Leads, the review before sending and the two emails. Rival results come from the
// sample world's rival Audits through the real engine; everything new is written here. Server only.

import { istDate } from '@/domain/dates';
import type { CheckKey, CheckResult, Difficulty } from '@/domain/types';
import type { AuditRecord } from '@/audit/record';
import { sampleInstitution } from '@/sample/institutions';
import { sampleMoves, sampleRivalLessons, sampleRivals } from '@/sample/world';
import { SAMPLE_RIVALS } from '@/sample/institutions';
import { MOVE_KIND_LABELS } from '@/rivals/text';
import { auditSource, SAMPLE_DAY } from './data-audit';
import { CHECK_IN_A_LINE, CHECK_PLACE, PLACES, WORDS, checkNameV2, wordFor, type Impact, type PlaceKey, type Word } from './model';

// Rivals --------------------------------------------------------------------------------------

export interface PlaceStanding {
  share: number | null;
  word: Word | null;
  leads: boolean;
  /** What people say and Other places: what was found, in words. */
  note: string | null;
}

export interface RivalSide {
  id: string;
  name: string;
  you: boolean;
  city: string;
  nearby: boolean;
  score: number;
  words: readonly Word[];
  places: Readonly<Record<PlaceKey, PlaceStanding>>;
}

export interface RivalAlert {
  id: string;
  kind: string;
  rival: string;
  text: string;
  day: string;
  source: string;
}

export interface MockRivals {
  city: string;
  line: string;
  sides: readonly RivalSide[];
  lessons: ReadonlyArray<{ title: string; detail: string | null; rival: string; effort: Difficulty | null }>;
  alerts: readonly RivalAlert[];
  /** Check by check inside one place, for the opened place. */
  checks: ReadonlyArray<{ place: PlaceKey; name: string; results: ReadonlyArray<{ side: string; result: CheckResult; leads: boolean }> }>;
}

/** What people say and Other places for each side, as the search tool and Reddit would count them. */
const UNSCORED_NOTES: Readonly<Record<string, { people: string; other: string }>> = {
  'eastgate-university': { people: '2 good, 1 complaint, 2 unanswered', other: '1 old listing, 1 missing, 1 news story' },
  'silverline-college': { people: '6 good, no complaints, 1 unanswered', other: 'Listed on 3 sites, 2 news stories' },
  'highfield-university': { people: '3 good, 2 complaints', other: 'Listed on 2 sites' },
  'northbank-college': { people: 'Not much said yet', other: 'Listed on 1 site' },
  'brightpath-skills': { people: 'Not much said yet', other: '1 listing missing courses' },
};

/** Cities as version 2 has them: Highfield moves to Guwahati, so rivals are local. */
const V2_CITY: Readonly<Record<string, string>> = { 'highfield-university': 'Guwahati' };

function cityOf(slug: string): string {
  return V2_CITY[slug] ?? sampleInstitution(slug).city;
}

type CheckRow = AuditRecord['checks'][number];

function shareOf(checks: readonly CheckRow[]): number | null {
  const max = checks.reduce((sum, check) => sum + check.points_max, 0);
  return max ? checks.reduce((sum, check) => sum + check.points_awarded, 0) / max : null;
}

function keyShares(checks: readonly CheckRow[]): Map<CheckKey, number> {
  const byKey = new Map<CheckKey, CheckRow[]>();
  for (const check of checks) byKey.set(check.check_key, [...(byKey.get(check.check_key) ?? []), check]);
  return new Map([...byKey].map(([key, rows]) => [key, shareOf(rows) ?? 0]));
}

function weakestResult(checks: readonly CheckRow[]): CheckResult {
  const order: CheckResult[] = ['missing', 'weak', 'okay', 'strong'];
  return order.find((result) => checks.some((check) => check.result === result)) ?? 'strong';
}

export async function mockRivals(slug: string): Promise<MockRivals> {
  const [own, rivals] = await Promise.all([auditSource(slug), sampleRivals(slug, SAMPLE_DAY)]);
  const me = sampleInstitution(slug);
  const sides = [
    { id: 'you', slug, name: me.name, you: true, record: own.latest.record },
    ...rivals.flatMap((rival) => (rival.audit ? [{ id: rival.id, slug: rival.slug, name: rival.name, you: false, record: rival.audit.record }] : [])),
  ];

  const placeShares = sides.map((side) =>
    Object.fromEntries(PLACES.filter((place) => place.scored).map((place) => [place.key, shareOf(side.record.checks.filter((check) => CHECK_PLACE[check.check_key] === place.key))])),
  );
  const leaderOf = (place: PlaceKey) => {
    let best = -1;
    let leader = -1;
    placeShares.forEach((shares, index) => {
      const value = shares[place] ?? -1;
      if (value > best + 1e-9) {
        best = value;
        leader = index;
      }
    });
    return leader;
  };

  const built: RivalSide[] = sides.map((side, index) => {
    const notes = UNSCORED_NOTES[side.slug] ?? { people: 'Not checked yet', other: 'Not checked yet' };
    const places = Object.fromEntries(
      PLACES.map((place) => {
        if (!place.scored) return [place.key, { share: null, word: null, leads: false, note: place.key === 'people' ? notes.people : notes.other }];
        const share = placeShares[index]?.[place.key] ?? null;
        return [place.key, { share, word: share === null ? null : wordFor(share * 100), leads: leaderOf(place.key) === index, note: null }];
      }),
    ) as Record<PlaceKey, PlaceStanding>;
    return {
      id: side.id,
      name: side.name,
      you: side.you,
      city: cityOf(side.slug),
      nearby: cityOf(side.slug) !== me.city,
      score: side.record.overall,
      words: WORDS.map((word) => wordFor(side.record[word.pillar])),
      places,
    };
  });

  // The month's one line: the rival ahead on the most checks, and the two checks it leads by most.
  const mine = keyShares(own.latest.record.checks);
  const ranked = sides
    .filter((side) => !side.you)
    .map((side) => {
      const theirs = keyShares(side.record.checks);
      const leads = [...theirs].filter(([key, share]) => share > (mine.get(key) ?? 0) + 1e-9).map(([key, share]) => ({ key, gap: share - (mine.get(key) ?? 0) }));
      return { side, leads: leads.sort((a, b) => b.gap - a.gap) };
    })
    .sort((a, b) => b.leads.length - a.leads.length || b.side.record.overall - a.side.record.overall);
  const top = ranked[0];
  const line =
    top && top.leads.length
      ? `This month, ${top.side.name} is ahead on ${top.leads
          .slice(0, 2)
          .map((lead) => CHECK_IN_A_LINE[lead.key])
          .join(' and ')}.`
      : `This month, no rival in ${me.city} is ahead of you on any check.`;

  // Check by check in Social media, for the opened place in the mock.
  const checks = (['instagram_activity', 'youtube', 'other_socials', 'students_in_content'] as const).map((key) => {
    const results = sides.map((side) => {
      const rows = side.record.checks.filter((check) => check.check_key === key);
      return { side: side.you ? 'You' : side.name, result: weakestResult(rows), share: shareOf(rows) ?? 0 };
    });
    const best = Math.max(...results.map((result) => result.share));
    // Neutral names in a table of you and your rivals.
    const name = checkNameV2(key, me.city).replace('Students in your posts', 'Students in posts');
    return { place: 'social' as PlaceKey, name, results: results.map((result) => ({ side: result.side, result: result.result, leads: result.share === best && results.filter((other) => other.share === best).length === 1 })) };
  });

  const lessons = await sampleRivalLessons(slug, SAMPLE_DAY);
  const names = new Map(rivals.map((rival) => [rival.id, rival.name]));
  const rivalSlugs = SAMPLE_RIVALS.filter(([tracker]) => tracker === slug).map(([, rival]) => rival);
  const moves = sampleMoves(rivalSlugs, istDate('2026-09-01'), istDate(SAMPLE_DAY, 23)).map((move, index) => ({
    id: `move-${index}`,
    kind: MOVE_KIND_LABELS[move.kind],
    rival: names.get(move.rivalId) ?? 'A rival',
    text: move.description,
    day: move.detectedAt,
    source: move.sourceUrl,
  }));
  const extra: RivalAlert[] =
    slug === 'eastgate-university'
      ? [
          { id: 'ads', kind: 'Started ads', rival: 'Silverline College', text: 'Started Instagram ads for BBA admissions: “Placements up to ₹6 lakh”.', day: istDate('2026-09-22', 9).toISOString(), source: 'Entered by the AdmitLabs team, from Instagram' },
          { id: 'reviews', kind: 'Big jump in reviews', rival: 'Highfield University', text: '24 new Google reviews this month, up from 9 in August. Rating 4.1.', day: istDate('2026-09-18', 9).toISOString(), source: 'https://maps.example/place/highfield-university' },
        ]
      : [];

  return {
    city: me.city,
    line,
    sides: [...built].sort((a, b) => b.score - a.score),
    lessons: lessons.slice(0, 3).map((lesson) => ({ title: lesson.text, detail: lesson.detail, rival: lesson.rivalId ? (names.get(lesson.rivalId) ?? 'A rival') : 'Your rivals', effort: lesson.effort })),
    alerts: [...extra, ...moves].sort((a, b) => b.day.localeCompare(a.day)),
    checks,
  };
}

// The chooser for a college in a smaller city: Loomcraft, Tezpur ------------------------------

export const CHOOSER = {
  college: 'Loomcraft Skills Institute',
  city: 'Tezpur',
  nearCity: 'Guwahati',
  local: [{ name: 'Kestrel Skills Centre', type: 'Skilling institute', city: 'Tezpur', shared: ['Digital Marketing'], picked: true }],
  nearby: [
    { name: 'Brightpath Skills Academy', type: 'Skilling institute', city: 'Guwahati', shared: ['Digital Marketing', 'Hotel Management'], picked: true },
    { name: 'Pinegrove Skills Hub', type: 'Skilling institute', city: 'Guwahati', shared: ['Digital Marketing'], picked: true },
    { name: 'Silverline College', type: 'College', city: 'Guwahati', shared: ['Hotel Management'], picked: false },
  ],
} as const;

// Demand: Eastgate University, Guwahati -------------------------------------------------------

export interface Idea {
  title: string;
  why: string;
  program: string;
  format: string;
  hook: string;
  points: readonly string[];
  source: string;
  made?: boolean;
}

export const DEMAND = {
  place: 'Guwahati',
  updated: '28 Sep 2026',
  next: '28 Oct 2026',
  sources: 'From Search trends, the keyword tool, Reddit and Quora, in English, Hindi and Assamese',
  last: { month: 'August', made: 2, of: 3, stillRising: ['“Is a BBA from Guwahati worth it?” (BBA)'] },
  three: [
    {
      title: 'What an MBA at Eastgate really costs, year by year',
      why: 'Asked about 96 times this month. Your fee page does not answer it in one place yet.',
      program: 'MBA',
      format: 'Reel',
      hook: '“₹1.85 lakh a year. Here is everything it pays for.”',
      points: ['Tuition, books and exam fees, year by year', 'Hostel as its own line', 'Scholarships that bring it down', 'Where to see the full table'],
      source: 'Quora and Reddit',
    },
    {
      title: 'Your Data Analytics first batch: five real projects',
      why: 'Rising fast: “data analytics course Guwahati” is up 46% since August.',
      program: 'B.Sc Data Analytics',
      format: 'Carousel post',
      hook: '“They built these in year one.”',
      points: ['One project a slide, with the student’s name', 'The company it was for', 'The tools they used', 'How to apply for 2027'],
      source: 'Search trends',
    },
    {
      title: 'Is B.Sc Nursing in Guwahati worth it? A nurse answers',
      why: 'Asked about 61 times, mostly in Assamese. Nothing on your site answers it.',
      program: 'B.Sc Nursing',
      format: 'Video',
      hook: '“I studied here. This is my first hospital job.”',
      points: ['Where last year’s batch works now', 'Starting salary, honestly', 'Hostel and safety for students from outside', 'Admission dates'],
      source: 'Reddit and Quora',
    },
  ] as readonly [Idea, Idea, Idea],
  programs: [
    { name: 'BBA in Business Analytics', trend: 'Rising fast', searches: 1300, offered: false },
    { name: 'B.Sc Data Analytics', trend: 'Rising fast', searches: 880, offered: true },
    { name: 'MBA', trend: 'Rising', searches: 2400, offered: true },
    { name: 'B.Sc Nursing', trend: 'Steady', searches: 1900, offered: true },
    { name: 'BCA', trend: 'Steady', searches: null, offered: true },
    { name: 'General BBA with no specialisation', trend: 'Falling', searches: null, offered: true },
  ],
  gaps: [
    { name: 'BBA in Business Analytics', trend: 'Rising fast', note: 'Silverline added an Aviation specialisation; nobody in Guwahati offers this yet.' },
    { name: 'Integrated BBA and MBA', trend: 'Rising', note: 'Asked about 38 times, mostly by parents.' },
    { name: 'PG Diploma in Hospital Administration', trend: 'Rising', note: 'Nursing students ask what comes next.' },
  ],
  asks: [
    {
      program: 'MBA',
      topics: [
        { name: 'Fees', share: 38, question: 'What is the total MBA fee in Guwahati with hostel?', count: 96, source: 'Quora' },
        { name: 'Placements', share: 27, question: 'Which Guwahati MBA colleges place outside Assam?', count: 68, source: 'Reddit' },
        { name: 'Scholarships', share: 14, question: 'Is there a scholarship for MBA for girls in Assam?', count: 35, source: 'Quora' },
        { name: 'Careers', share: 12, question: 'MBA in marketing or finance for a job in Guwahati?', count: 30, source: 'Reddit' },
        { name: 'Hostel', share: 9, question: 'Are MBA hostels in Guwahati safe for girls?', count: 22, source: 'Reddit' },
      ],
    },
    {
      program: 'B.Sc Nursing',
      topics: [
        { name: 'Careers', share: 34, question: 'Is B.Sc Nursing in Guwahati worth it?', count: 61, source: 'Reddit' },
        { name: 'Fees', share: 28, question: 'Total nursing fees in Guwahati private colleges?', count: 50, source: 'Quora' },
        { name: 'Hostel', share: 21, question: 'Do nursing colleges give a hostel in the first year?', count: 38, source: 'Quora' },
        { name: 'Placements', share: 17, question: 'Which hospitals hire freshers from Guwahati?', count: 31, source: 'Reddit' },
      ],
    },
  ],
  attention: [
    { topic: 'Placement stories', format: 'Reels', level: 'Most attention' },
    { topic: 'Fee breakdowns', format: 'Carousel posts', level: 'A lot' },
    { topic: 'Campus walks', format: 'YouTube videos', level: 'A lot' },
    { topic: 'A day in class', format: 'Reels', level: 'Some' },
  ],
  months: [
    { program: 'MBA', best: [11, 12, 1, 2], text: 'November to February' },
    { program: 'BBA', best: [3, 4, 5, 6], text: 'March to June' },
    { program: 'B.Sc Nursing', best: [5, 6, 7], text: 'May to July' },
    { program: 'B.Sc Data Analytics', best: [4, 5, 6, 10], text: 'April to June, and October' },
  ],
  more: [
    {
      title: 'BCA or B.Sc IT: a student explains the difference',
      why: 'Asked about 44 times this month.',
      program: 'BCA',
      format: 'Reel',
      hook: '“I almost picked the wrong one.”',
      points: ['What each course teaches', 'Jobs after each', 'Fees side by side'],
      source: 'Quora',
    },
  ] satisfies Idea[],
};

/** Brightpath's own Demand bits, for its Home and its monthly summary. */
export const CLIENT_DEMAND: { idea: Idea; rising: string } = {
  idea: {
    title: 'What a Data Analytics fresher earns in Guwahati',
    why: 'Asked about 54 times this month. Your course page does not say it yet.',
    program: 'Data Analytics',
    format: 'Reel',
    hook: '“My first salary, and the three tools that got me the job.”',
    points: ['A real learner, in their own words', 'The starting salary, honestly', 'The tools the course teaches', 'When the next batch starts'],
    source: 'Reddit and Quora',
  },
  rising: 'Data analytics courses are rising fast in Guwahati: 46% more searches than in August.',
};

// Leads: Brightpath Skills Academy (Client) ---------------------------------------------------

export type UsedOn = 'instagram' | 'youtube' | 'facebook' | 'website' | 'whatsapp' | 'other';

export const USED_ON_LABELS: Readonly<Record<UsedOn, string>> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  website: 'Website',
  whatsapp: 'WhatsApp',
  other: 'Other',
};

export interface LeadLink {
  id: string;
  name: string;
  usedOn: UsedOn;
  program: string;
  code: string;
  thisMonth: number;
  lastMonth: number;
  total: number;
  since: string;
}

export const LEAD_LINKS: readonly LeadLink[] = [
  { id: 'l1', name: 'Reel: Data Analytics placements', usedOn: 'instagram', program: 'Data Analytics', code: 'bp-dat9', thisMonth: 9, lastMonth: 6, total: 18, since: '14 Jul 2026' },
  { id: 'l2', name: 'Instagram bio', usedOn: 'instagram', program: 'Digital Marketing', code: 'bp-ig2k', thisMonth: 7, lastMonth: 6, total: 17, since: '8 Jul 2026' },
  { id: 'l3', name: 'YouTube: Hotel Management campus tour', usedOn: 'youtube', program: 'Hotel Management', code: 'bp-yt5m', thisMonth: 5, lastMonth: 3, total: 10, since: '2 Aug 2026' },
  { id: 'l4', name: 'Facebook page', usedOn: 'facebook', program: 'Digital Marketing', code: 'bp-fb7q', thisMonth: 2, lastMonth: 2, total: 5, since: '8 Jul 2026' },
];

export interface Lead {
  id: string;
  name: string;
  course: string;
  link: string;
  day: string;
  phone: string;
  email: string;
  city: string;
}

const LEAD_PEOPLE: ReadonlyArray<readonly [string, string, string, string]> = [
  ['Ankita Das', 'Data Analytics', 'Reel: Data Analytics placements', 'Guwahati'],
  ['Rahul Bora', 'Digital Marketing', 'Instagram bio', 'Guwahati'],
  ['Priyanka Kalita', 'Hotel Management', 'YouTube: Hotel Management campus tour', 'Nalbari'],
  ['Dhruba Gogoi', 'Data Analytics', 'Reel: Data Analytics placements', 'Jorhat'],
  ['Nisha Sarma', 'Digital Marketing', 'Instagram bio', 'Guwahati'],
  ['Arjun Deka', 'Data Analytics', 'Reel: Data Analytics placements', 'Guwahati'],
  ['Moumita Baruah', 'Hotel Management', 'YouTube: Hotel Management campus tour', 'Tezpur'],
  ['Kunal Saikia', 'Digital Marketing', 'Facebook page', 'Nagaon'],
  ['Rimpi Talukdar', 'Data Analytics', 'Reel: Data Analytics placements', 'Barpeta'],
  ['Bikash Nath', 'Digital Marketing', 'Instagram bio', 'Guwahati'],
  ['Pallavi Choudhury', 'Data Analytics', 'Reel: Data Analytics placements', 'Guwahati'],
  ['Sourav Medhi', 'Hotel Management', 'YouTube: Hotel Management campus tour', 'Guwahati'],
];

export const LEADS: readonly Lead[] = LEAD_PEOPLE.map(([name, course, link, city], index) => {
  const [first = '', last = ''] = name.toLowerCase().split(' ');
  const day = 29 - Math.floor(index * 2.2);
  return {
    id: `lead-${index}`,
    name,
    course,
    link,
    day: istDate(`2026-09-${String(day).padStart(2, '0')}`, 11).toISOString(),
    phone: `+91 90000 ${String(10011 + index * 37).slice(0, 5)}`,
    email: `${first}.${last}@mail.example`,
    city,
  };
});

export const LEADS_SUMMARY = { thisMonth: 23, lastMonth: 17, total: 50, keepMonths: 12, alertTo: ['admissions@brightpath-skills.example'] } as const;

// Review before sending -----------------------------------------------------------------------

export interface ReviewItem {
  id: string;
  college: string;
  what: string;
  plan: string;
  waiting: string;
  line: string;
  href: string;
}

export const REVIEW_QUEUE: readonly ReviewItem[] = [
  { id: 'r1', college: 'Eastgate University', what: 'September summary', plan: 'Paid', waiting: '2 days', line: '3 things to do, 1 rival move, the September report', href: '/mock/team/review/eastgate-summary' },
  { id: 'r2', college: 'Northbank College', what: 'New Audit, every 3 months', plan: 'Free, BBA', waiting: '1 day', line: 'Visibility Weak to Okay, 2 checks moved, 1 new finding', href: '/mock/team/review/northbank' },
  { id: 'r3', college: 'Eastgate University', what: 'New Audit, extra refresh', plan: 'Paid', waiting: '20 hours', line: 'No word moved, 1 check moved', href: '/mock/team/review/eastgate' },
  { id: 'r4', college: 'Loomcraft Skills Institute', what: 'First Audit, at sign up', plan: 'Free, Digital Marketing', waiting: '3 hours', line: 'First Audit: nothing to compare with', href: '/mock/team/review/loomcraft' },
];

export interface ReviewEdit {
  check: string;
  program: string | null;
  before: CheckResult;
  after: CheckResult;
  reason: string;
  by: string;
  at: string;
}

export const REVIEW_EDIT: ReviewEdit = {
  check: 'Fees',
  program: 'BBA',
  before: 'weak',
  after: 'okay',
  reason: 'The BBA page shows a yearly fee range since 9 Sep. The reader missed the new table.',
  by: 'team@admitlabs.example',
  at: istDate('2026-10-04', 10).toISOString(),
};

// Home: the 3 things, and what changed ----------------------------------------------------------

export interface HomeThing {
  source: 'Audit' | 'Rivals' | 'Make these 3';
  title: string;
  label: string;
  programs: readonly string[];
  weight: string;
  impact: Impact | null;
  effort: Difficulty | null;
  fix: boolean;
}

export const ENQUIRY_CARD = { thisMonth: 23, change: 6, topLink: 'Reel: Data Analytics placements', topCount: 9 } as const;

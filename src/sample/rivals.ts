// Rival activity for the sample world: moves, best content of the month, and ads entered by
// the team. "Why it worked" explains a principle to learn from. Drishti never suggests copying.

import type { ContentPlatform, RivalMoveKind } from '../domain/types.ts';

export interface SampleMove {
  slug: string;
  kind: RivalMoveKind;
  description: string;
  /** India date the weekly check found it. */
  detectedAt: string;
  /** Page on the rival's own website where it was found. */
  path: string;
}

export const SAMPLE_MOVES: readonly SampleMove[] = [
  { slug: 'silverline-college', kind: 'fee_change', description: 'Shows BBA fees as ₹92,000 a year, up from ₹86,000.', detectedAt: '2026-09-03', path: '/fees' },
  { slug: 'silverline-college', kind: 'new_page', description: 'Added a page for a new BBA specialisation in Aviation Management.', detectedAt: '2026-09-12', path: '/programs/bba-aviation' },
  { slug: 'silverline-college', kind: 'admission_dates', description: 'Announced 2027 admission dates. Forms open on 5 January 2027.', detectedAt: '2026-09-20', path: '/admissions' },
  { slug: 'eastgate-university', kind: 'new_program', description: 'Launched a one year PG Diploma in Business Analytics.', detectedAt: '2026-08-18', path: '/programs/pgd-business-analytics' },
  { slug: 'eastgate-university', kind: 'admission_dates', description: 'Opened early applications for the January MBA intake.', detectedAt: '2026-09-08', path: '/admissions/mba-january' },
  { slug: 'highfield-university', kind: 'new_page', description: 'Published a placement report page for the 2026 batch.', detectedAt: '2026-08-06', path: '/placements/2026' },
  { slug: 'highfield-university', kind: 'fee_change', description: 'Replaced MBA fee amounts with "Contact us for fees".', detectedAt: '2026-08-20', path: '/programs/mba' },
  { slug: 'northbank-college', kind: 'fee_change', description: 'Now shows BCA fees as a yearly range.', detectedAt: '2026-09-10', path: '/programs/bca' },
  { slug: 'brightpath-skills', kind: 'new_page', description: 'Added a results page for the Digital Marketing course.', detectedAt: '2026-08-12', path: '/results/digital-marketing' },
  { slug: 'brightpath-skills', kind: 'new_program', description: 'Started a weekend batch in Data Analytics with Power BI.', detectedAt: '2026-09-06', path: '/courses/data-analytics-weekend' },
  { slug: 'pinegrove-skills', kind: 'fee_change', description: 'Shows the Digital Marketing course at ₹28,000, down from ₹32,000.', detectedAt: '2026-09-04', path: '/courses/digital-marketing' },
  { slug: 'pinegrove-skills', kind: 'new_page', description: 'Added a placements page with 2026 learners and companies.', detectedAt: '2026-09-19', path: '/placements' },
  { slug: 'kestrel-skills', kind: 'new_program', description: 'Started a 6 week course in Instagram Marketing for shops.', detectedAt: '2026-09-25', path: '/courses/instagram-marketing' },
];

export interface SampleContent {
  slug: string;
  month: string;
  platform: ContentPlatform;
  title: string;
  postedAt: string;
  metrics: { views: number; likes: number; comments: number; shares: number };
  whyItWorked: string;
}

const c = (
  slug: string,
  platform: ContentPlatform,
  postedAt: string,
  title: string,
  [views, likes, comments, shares]: [number, number, number, number],
  whyItWorked: string,
): SampleContent => ({ slug, month: postedAt.slice(0, 7), platform, title, postedAt, metrics: { views, likes, comments, shares }, whyItWorked });

export const SAMPLE_CONTENT: readonly SampleContent[] = [
  c('silverline-college', 'instagram', '2026-09-04', "A hotel management student's first day as an intern at a 5 star hotel", [48_200, 3_150, 212, 640], 'Opens on a real student in a real workplace. The outcome is visible in the first two seconds.'),
  c('silverline-college', 'instagram', '2026-09-09', 'BBA or B.Com? A professor answers in 30 seconds', [31_900, 2_040, 356, 410], 'Answers a question students already search for, in plain words.'),
  c('silverline-college', 'instagram', '2026-09-15', '2026 BBA placements: 42 students, 18 companies', [22_400, 1_380, 97, 520], 'Numbers, company names and the year in one post. Easy to trust.'),
  c('silverline-college', 'youtube', '2026-09-18', 'Campus walk shot on a phone, no voiceover', [12_800, 610, 48, 90], 'Feels honest. Nothing is staged, so people watch to the end.'),
  c('silverline-college', 'instagram', '2026-09-24', 'An alumna now working with an airline answers student questions', [9_700, 720, 88, 130], 'A familiar face from the same city makes the result feel reachable.'),

  c('eastgate-university', 'instagram', '2026-09-03', 'An MBA student explains her internship offer in 20 seconds', [41_000, 2_870, 190, 560], 'A real result, told by the student, with the company named.'),
  c('eastgate-university', 'youtube', '2026-09-07', 'What an MBA at Eastgate really costs: fees, hostel and books', [18_300, 940, 121, 210], 'Answers the fee worry head on. Clear numbers build trust.'),
  c('eastgate-university', 'instagram', '2026-09-12', 'Nursing lab tour: what first year students practise', [26_700, 1_760, 83, 300], 'Shows the facility students ask about, not a stock image.'),
  c('eastgate-university', 'instagram', '2026-09-19', 'Data Analytics: 5 projects from the first batch', [11_900, 690, 41, 150], 'Proof of skill for a new program that has no placement record yet.'),
  c('eastgate-university', 'instagram', '2026-09-26', 'The director answers the top 3 questions from parents', [15_600, 1_020, 144, 170], 'A visible leader answering real worries builds trust with parents.'),

  c('highfield-university', 'instagram', '2026-09-05', 'Nursing graduates on their first day at a Guwahati hospital', [14_300, 1_110, 64, 180], 'Shows where graduates end up, close to home.'),
  c('highfield-university', 'youtube', '2026-09-10', 'MBA placement report 2026, explained in 4 minutes', [6_200, 280, 37, 40], 'Walks through the numbers instead of making a big claim.'),
  c('highfield-university', 'instagram', '2026-09-14', 'Hostel room tour for new students', [9_800, 540, 71, 95], 'Answers the hostel worry for students coming from outside the city.'),
  c('highfield-university', 'instagram', '2026-09-21', 'NAAC A grade certificate, with a link to the official page', [4_100, 260, 12, 30], 'Proof with a source is easier to trust than a claim.'),
  c('highfield-university', 'instagram', '2026-09-27', 'A BCA student builds an app for a local shop', [7_600, 480, 39, 70], 'A small, real project shows skills better than a brochure.'),

  c('pinegrove-skills', 'instagram', '2026-09-03', 'A learner shows the dashboard she built for a local shop', [17_200, 1_190, 88, 240], 'A real project for a real business, finished on screen.'),
  c('pinegrove-skills', 'instagram', '2026-09-10', 'Weekend batch: 12 Saturdays to your first analyst job', [11_600, 720, 61, 130], 'One clear promise with a time frame working people can plan around.'),
  c('pinegrove-skills', 'youtube', '2026-09-17', 'Excel to Power BI in one hour, a free class', [8_200, 410, 52, 90], 'Teaches something useful for free before asking anything.'),
  c('pinegrove-skills', 'instagram', '2026-09-24', 'Three 2026 learners and the companies that hired them', [9_900, 640, 47, 160], 'Names and companies make the result easy to believe.'),
  c('pinegrove-skills', 'instagram', '2026-09-28', 'The fee in 3 parts, explained in 30 seconds', [6_400, 380, 44, 95], 'Answers the money question before anyone has to ask it.'),

  c('kestrel-skills', 'instagram', '2026-09-05', 'Before and after: a Tezpur bakery’s Instagram in 30 days', [5_600, 410, 33, 70], 'A visible result for a business people in the town already know.'),
  c('kestrel-skills', 'instagram', '2026-09-12', 'A shop owner in Tezpur explains what she learned in 6 weeks', [4_800, 330, 29, 60], 'A familiar local face makes the course feel close to home.'),
  c('kestrel-skills', 'youtube', '2026-09-18', 'How to shoot product photos on a phone, a free class', [2_900, 160, 21, 30], 'Useful even for people who never join, so it gets shared.'),
  c('kestrel-skills', 'instagram', '2026-09-22', 'Fees and batch timings for October, in one image', [2_400, 140, 26, 40], 'The two things people ask first, answered up front.'),
  c('kestrel-skills', 'instagram', '2026-09-26', 'New: Instagram Marketing for shops, starts in October', [3_100, 180, 17, 25], 'Simple and timely: the date and who it is for, in one post.'),

  c('northbank-college', 'instagram', '2026-09-06', 'BCA students demo their coding projects', [8_700, 590, 44, 80], 'Shows students doing real work, not posing.'),
  c('northbank-college', 'instagram', '2026-09-11', 'The principal welcomes the new batch', [4_500, 380, 52, 25], 'A known face from the college builds trust with parents.'),
  c('northbank-college', 'instagram', '2026-09-16', 'A day in the B.Com classroom', [5_100, 310, 18, 30], 'Real classroom moments feel honest.'),
  c('northbank-college', 'instagram', '2026-09-22', '5 things to check before choosing a college', [6_300, 420, 36, 240], 'Helpful first and promotional second, so people save and share it.'),
  c('northbank-college', 'instagram', '2026-09-28', 'Admissions still open for BBA, BCA and B.Com', [3_200, 150, 21, 15], 'Clear and simple, and it reached students during their search.'),

  c('brightpath-skills', 'instagram', '2026-09-03', 'A hotel management trainee plates her first dish for a real restaurant', [19_400, 1_420, 96, 260], 'Shows the skill in action, in a real kitchen, in under 20 seconds.'),
  c('brightpath-skills', 'instagram', '2026-09-08', 'Digital Marketing batch results: 21 learners, 14 placed in 60 days', [13_800, 890, 57, 310], 'A clear number and a clear time frame make the result easy to believe.'),
  c('brightpath-skills', 'youtube', '2026-09-13', 'Power BI in 10 minutes: a free class for beginners', [9_600, 520, 64, 120], 'Teaches something useful for free, which builds trust before anyone pays.'),
  c('brightpath-skills', 'instagram', '2026-09-20', 'Weekend batch: what a Saturday class looks like', [7_300, 460, 38, 70], 'Answers the timing question working people ask first.'),
  c('brightpath-skills', 'instagram', '2026-09-27', 'A trainer who runs campaigns for local brands shares one tip', [8_900, 610, 49, 150], 'A real practitioner makes the course feel close to the job.'),
];

export interface SampleAd {
  slug: string;
  promise: string;
  /** India date the team entered it. */
  enteredAt: string;
}

/** The weekly rival check runs every Monday at 9 am India time, from this Monday on. */
export const SAMPLE_WEEKLY_CHECKS_FROM = '2026-08-03';

/** Ads the team entered. Each entry also makes a "started ads" alert for whoever tracks that rival (spec 8.3). */
export const SAMPLE_ADS: readonly SampleAd[] = [
  { slug: 'silverline-college', promise: '100% placement support for every BBA student.', enteredAt: '2026-09-22' },
  { slug: 'eastgate-university', promise: 'Scholarships up to 40% for early MBA applicants.', enteredAt: '2026-09-09' },
  { slug: 'highfield-university', promise: 'NAAC A grade. Apply before 30 November.', enteredAt: '2026-09-14' },
  { slug: 'northbank-college', promise: "Guwahati's most affordable BCA.", enteredAt: '2026-08-28' },
  { slug: 'brightpath-skills', promise: 'Learn from trainers who work in the industry. Weekend batches open.', enteredAt: '2026-09-07' },
  { slug: 'pinegrove-skills', promise: 'Data Analytics in 12 weekends. Pay in 3 parts.', enteredAt: '2026-09-16' },
];

export interface SampleReviewJump {
  slug: string;
  /** India date Google showed the jump. */
  on: string;
  description: string;
}

/** Big jumps in Google reviews (spec 8.3: 20% or 15 reviews more in a month), as Places finds them. */
export const SAMPLE_REVIEW_JUMPS: readonly SampleReviewJump[] = [
  { slug: 'highfield-university', on: '2026-09-18', description: '24 new Google reviews this month, up from 9 in August. Rating 4.1.' },
  { slug: 'pinegrove-skills', on: '2026-08-21', description: '19 new Google reviews this month, up from 6 in July. Rating 4.4.' },
];

/**
 * The AdmitLabs team's work log for Brightpath, the sample Client: what the team did (dated the
 * day it was done) and what it does next (dated the day it is due), added on `addedOn`. Brightpath
 * sees it on Home and in its work list. Links point at its own site.
 */
export const SAMPLE_TEAM_WORK: ReadonlyArray<{
  slug: string;
  author: 'team' | 'admin';
  kind: 'done' | 'next';
  text: string;
  on: string;
  link: string | null;
  addedOn: string;
}> = [
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'done',
    text: 'Added the Hotel Management fees and batch dates to the Google listing.',
    on: '2026-08-12',
    link: null,
    addedOn: '2026-08-12',
  },
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'done',
    text: 'Ran a team Audit and went through the top three fixes with your team on a call.',
    on: '2026-08-27',
    link: null,
    addedOn: '2026-08-27',
  },
  {
    slug: 'brightpath-skills',
    author: 'admin',
    kind: 'done',
    text: "Refreshed the Data Analytics course page with this year's syllabus and the next batch date.",
    on: '2026-09-10',
    link: 'https://brightpath-skills.example/courses/data-analytics',
    addedOn: '2026-09-10',
  },
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'done',
    text: 'Added WhatsApp next to the enquiry form on every course page.',
    on: '2026-09-22',
    link: 'https://brightpath-skills.example/courses',
    addedOn: '2026-09-22',
  },
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'done',
    text: 'Posted four reels with real students from the Hotel Management batch.',
    on: '2026-09-29',
    link: null,
    addedOn: '2026-09-29',
  },
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'next',
    text: 'Publish the Data Analytics placement results, with company names and the year.',
    on: '2026-10-15',
    link: null,
    addedOn: '2026-09-29',
  },
  {
    slug: 'brightpath-skills',
    author: 'team',
    kind: 'next',
    text: 'Ask the last two batches for Google reviews, with a short link on WhatsApp.',
    on: '2026-10-20',
    link: null,
    addedOn: '2026-09-29',
  },
];

/** Private team notes. Never visible to institution users. */
export const SAMPLE_NOTES: ReadonlyArray<{ slug: string; author: 'team' | 'admin'; body: string; createdAt: string }> = [
  {
    slug: 'riverbend-college',
    author: 'team',
    body: 'Met the principal at the Jorhat education fair. Keen on placement proof. Share the Audit once we have reviewed it.',
    createdAt: '2026-09-19',
  },
  {
    slug: 'cedar-skill-institute',
    author: 'team',
    body: 'Strong on Instagram, but no fees anywhere on the site. Open the conversation with the fees gap.',
    createdAt: '2026-09-19',
  },
  {
    slug: 'northbank-college',
    author: 'admin',
    body: 'Owner asked about Paid on a call. Follow up after the September Audit.',
    createdAt: '2026-09-12',
  },
];

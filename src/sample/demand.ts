// Demand fixtures for the sample world (spec section 9). Grouped only: every item is a topic,
// a count and a source. Never a person. Hindi and Assamese items keep their original wording
// in `original`; the product shows the English wording (decision: Bricolage stays the only font).
// Counts are for Guwahati; other scopes scale them (see DEMAND_SCOPE_FACTOR).

import type { DemandScope, Language, Sentiment } from '../domain/types.ts';

export type DemandPlatform = 'reddit' | 'x' | 'quora' | 'trends' | 'instagram' | 'youtube';

export interface TrendFixture {
  text: string;
  /** Change against last month, in percent. */
  changePct: number;
  base: number;
}

export interface QuestionFixture {
  text: string;
  original?: string;
  language: Language;
  base: number;
  source: DemandPlatform;
}

/** The usual five worries (spec 9.4), and "new" for any other found this month. */
export type WorryTheme = 'fees' | 'placements' | 'hostel' | 'safety' | 'recognition' | 'new';

export interface WorryFixture {
  text: string;
  theme: WorryTheme;
  base: number;
  source: DemandPlatform;
  /** A worry found this month beyond the usual five. */
  isNew?: boolean;
}

export interface IdeaFixture {
  text: string;
  /** Index of the student question the idea is built on. */
  question: number;
}

export interface ProgramDemandFixture {
  rising: readonly TrendFixture[];
  falling: readonly TrendFixture[];
  questions: readonly QuestionFixture[];
  worries: readonly WorryFixture[];
  ideas: readonly IdeaFixture[];
}

/** The usual five worries (fees, placements, hostel, safety, recognition) plus any new one. */
function worries(
  [fees, placements, hostel, safety, recognition]: [number, number, number, number, number],
  newWorry: { text: string; base: number },
): WorryFixture[] {
  return [
    { text: 'Fees and hidden charges', theme: 'fees', base: fees, source: 'reddit' },
    { text: 'Placements that are real', theme: 'placements', base: placements, source: 'quora' },
    { text: 'Hostel quality and cost', theme: 'hostel', base: hostel, source: 'reddit' },
    { text: 'Safety on campus and in hostels', theme: 'safety', base: safety, source: 'x' },
    { text: 'Recognition of the course', theme: 'recognition', base: recognition, source: 'quora' },
    { text: newWorry.text, theme: 'new', base: newWorry.base, source: 'reddit', isNew: true },
  ];
}

export const DEMAND_FIXTURES: Readonly<Record<string, ProgramDemandFixture>> = {
  bba: {
    rising: [
      { text: 'BBA in Business Analytics', changePct: 38, base: 420 },
      { text: 'BBA in Aviation Management', changePct: 21, base: 260 },
      { text: 'Integrated BBA and MBA', changePct: 14, base: 310 },
    ],
    falling: [
      { text: 'General BBA with no specialisation', changePct: -12, base: 540 },
      { text: 'BBA in Retail Management', changePct: -8, base: 180 },
    ],
    questions: [
      { text: 'Which BBA colleges in Guwahati have real placements?', language: 'en', base: 96, source: 'quora' },
      { text: 'What is the total fee for BBA in Guwahati?', original: 'गुवाहाटी में बीबीए की कुल फीस कितनी है?', language: 'hi', base: 81, source: 'youtube' },
      { text: 'Which college is good for BBA in Guwahati?', original: 'গুৱাহাটীত বিবিএ পঢ়িবলৈ কোনখন কলেজ ভাল?', language: 'as', base: 74, source: 'instagram' },
      { text: 'Is BBA worth it after commerce in Class 12?', language: 'en', base: 58, source: 'reddit' },
      { text: 'BBA or B.Com: which one gets a better first job?', language: 'en', base: 52, source: 'quora' },
    ],
    worries: worries([140, 128, 66, 51, 44], { text: 'Too many BBA colleges, hard to compare', base: 38 }),
    ideas: [
      { text: "Show last year's BBA placements: company, role and salary, one student per reel.", question: 0 },
      { text: 'Post one clear BBA fee breakdown: tuition, exams and hostel, in a single image.', question: 1 },
      { text: 'Answer "which college is good for BBA" in Assamese, with a real day in class.', question: 2 },
      { text: 'A student who took commerce in Class 12 explains why BBA worked for them.', question: 3 },
      { text: 'A faculty member explains BBA and B.Com side by side in 30 seconds.', question: 4 },
    ],
  },

  mba: {
    rising: [
      { text: 'MBA in Business Analytics', changePct: 42, base: 380 },
      { text: 'MBA in Healthcare Management', changePct: 19, base: 160 },
      { text: 'Executive MBA for working people', changePct: 11, base: 210 },
    ],
    falling: [
      { text: 'MBA in Retail Management', changePct: -15, base: 140 },
      { text: 'Distance MBA', changePct: -9, base: 260 },
    ],
    questions: [
      { text: 'Which MBA colleges in Assam have the best placements?', language: 'en', base: 88, source: 'quora' },
      { text: 'Can I do an MBA without a CAT score?', original: 'क्या बिना कैट स्कोर के एमबीए कर सकते हैं?', language: 'hi', base: 72, source: 'youtube' },
      { text: 'Is there an evening MBA in Guwahati for working people?', original: 'গুৱাহাটীত চাকৰি কৰা মানুহৰ বাবে সন্ধিয়াৰ এমবিএ আছেনে?', language: 'as', base: 47, source: 'instagram' },
      { text: 'What is the real average salary after an MBA in Assam?', language: 'en', base: 64, source: 'reddit' },
      { text: 'Is an MBA in Business Analytics better than a general MBA?', language: 'en', base: 55, source: 'quora' },
    ],
    worries: worries([118, 131, 34, 29, 41], { text: 'Return on a high fee', base: 36 }),
    ideas: [
      { text: 'Share real MBA placement numbers for the last batch, with company names and the year.', question: 0 },
      { text: 'Explain every entrance route you accept, CAT and others, in one carousel.', question: 1 },
      { text: 'A working professional in the evening batch shows their weekly routine.', question: 2 },
      { text: 'An alumnus shares their first salary and what it took to get there.', question: 3 },
      { text: 'Compare a general MBA and an analytics MBA in a short faculty video.', question: 4 },
    ],
  },

  bca: {
    rising: [
      { text: 'BCA with AI and Machine Learning', changePct: 47, base: 350 },
      { text: 'BCA in Cyber Security', changePct: 23, base: 190 },
      { text: 'Cloud support careers', changePct: 15, base: 150 },
    ],
    falling: [
      { text: 'BCA in Multimedia', changePct: -10, base: 120 },
      { text: 'Computer hardware diploma', changePct: -18, base: 170 },
    ],
    questions: [
      { text: 'Which BCA colleges in Guwahati teach real coding?', language: 'en', base: 79, source: 'reddit' },
      { text: 'Can I get a job after BCA without an MCA?', original: 'क्या एमसीए के बिना बीसीए के बाद नौकरी मिल सकती है?', language: 'hi', base: 83, source: 'youtube' },
      { text: 'Can I study BCA without Maths in Class 12?', original: 'দ্বাদশ শ্ৰেণীত গণিত নোহোৱাকৈ বিচিএ পঢ়িব পাৰিনে?', language: 'as', base: 61, source: 'instagram' },
      { text: 'BCA or B.Tech in computer science: which is better for jobs?', language: 'en', base: 57, source: 'quora' },
      { text: 'Do BCA colleges in Assam help with internships?', language: 'en', base: 42, source: 'reddit' },
    ],
    worries: worries([92, 117, 38, 27, 35], { text: 'Outdated syllabus', base: 33 }),
    ideas: [
      { text: 'Film a student coding session from start to finish, ending on the working project.', question: 0 },
      { text: 'Show three BCA graduates who got jobs without an MCA, and what they do now.', question: 1 },
      { text: 'Explain the Class 12 subjects BCA needs, in Assamese, in under a minute.', question: 2 },
      { text: 'A faculty member compares BCA and B.Tech honestly: time, cost and jobs.', question: 3 },
      { text: 'List the internships your BCA students did this year, with company names.', question: 4 },
    ],
  },

  bcom: {
    rising: [
      { text: 'B.Com with ACCA', changePct: 29, base: 240 },
      { text: 'B.Com in Fintech', changePct: 22, base: 150 },
      { text: 'GST practitioner careers', changePct: 12, base: 130 },
    ],
    falling: [
      { text: 'B.Com Pass course', changePct: -11, base: 410 },
      { text: 'Bank clerk exam coaching', changePct: -7, base: 300 },
    ],
    questions: [
      { text: 'Which B.Com colleges in Guwahati help with CA preparation?', language: 'en', base: 71, source: 'quora' },
      { text: 'What jobs can I get after B.Com?', original: 'बी.कॉम के बाद कौन सी नौकरियाँ मिल सकती हैं?', language: 'hi', base: 94, source: 'youtube' },
      { text: 'Is B.Com honours better than a regular B.Com?', original: 'সাধাৰণ বি.কমতকৈ বি.কম অনাৰ্ছ ভাল নেকি?', language: 'as', base: 58, source: 'instagram' },
      { text: 'Can I do B.Com and a job at the same time?', language: 'en', base: 49, source: 'reddit' },
      { text: 'Is B.Com with GST and Tally worth it?', language: 'en', base: 37, source: 'quora' },
    ],
    worries: worries([76, 88, 31, 25, 22], { text: 'Weak link to CA or jobs', base: 29 }),
    ideas: [
      { text: 'Show how your B.Com timetable leaves room for CA classes.', question: 0 },
      { text: 'Five real jobs your B.Com graduates hold, one per slide.', question: 1 },
      { text: 'Explain honours and regular B.Com in Assamese, with the subjects side by side.', question: 2 },
      { text: 'A student who works part time walks through their week.', question: 3 },
      { text: 'A teacher files a sample GST return in class, on camera.', question: 4 },
    ],
  },

  nursing: {
    rising: [
      { text: 'B.Sc Nursing with placement abroad', changePct: 33, base: 280 },
      { text: 'Critical care nursing', changePct: 18, base: 140 },
      { text: 'Home healthcare careers', changePct: 12, base: 110 },
    ],
    falling: [
      { text: 'ANM course', changePct: -9, base: 160 },
      { text: 'GNM diploma', changePct: -6, base: 220 },
    ],
    questions: [
      { text: 'Which nursing colleges in Assam are recognised by the nursing council?', language: 'en', base: 86, source: 'quora' },
      { text: 'What is the fee for B.Sc Nursing in Assam?', original: 'असम में बी.एससी नर्सिंग की फीस कितनी है?', language: 'hi', base: 77, source: 'youtube' },
      { text: 'Is there a hostel for girls at nursing colleges in Guwahati?', original: 'গুৱাহাটীৰ নাৰ্ছিং কলেজত ছোৱালীৰ বাবে হোষ্টেল আছেনে?', language: 'as', base: 69, source: 'instagram' },
      { text: 'Do nursing colleges in Guwahati help with jobs abroad?', language: 'en', base: 54, source: 'reddit' },
      { text: 'Is the B.Sc Nursing entrance hard in Assam?', language: 'en', base: 41, source: 'quora' },
    ],
    worries: worries([97, 64, 88, 79, 102], { text: 'Hospital tie-ups for clinical training', base: 45 }),
    ideas: [
      { text: 'Show your nursing council recognition, with a link to the official list.', question: 0 },
      { text: 'Post the full B.Sc Nursing fee, year by year, in one image.', question: 1 },
      { text: 'The hostel warden gives a tour of the girls hostel, in Assamese.', question: 2 },
      { text: 'A graduate now working abroad explains the steps they took.', question: 3 },
      { text: 'Share the entrance pattern with three sample questions.', question: 4 },
    ],
  },

  'hotel-management': {
    rising: [
      { text: 'Cruise line careers', changePct: 36, base: 190 },
      { text: 'Culinary arts', changePct: 21, base: 170 },
      { text: 'Hotel management with internships abroad', changePct: 16, base: 150 },
    ],
    falling: [
      { text: 'Front office diploma', changePct: -10, base: 90 },
      { text: 'Travel agency courses', changePct: -8, base: 80 },
    ],
    questions: [
      { text: 'Which hotel management colleges in Assam offer internships in big hotels?', language: 'en', base: 63, source: 'quora' },
      { text: 'Do I get a job abroad after hotel management?', original: 'क्या होटल मैनेजमेंट के बाद विदेश में नौकरी मिलती है?', language: 'hi', base: 71, source: 'youtube' },
      { text: 'What does hotel management cost in Guwahati?', original: 'গুৱাহাটীত হোটেল মেনেজমেণ্ট পঢ়াৰ খৰচ কিমান?', language: 'as', base: 52, source: 'instagram' },
      { text: 'Is a hotel management diploma enough to get hired?', language: 'en', base: 46, source: 'reddit' },
      { text: 'What is the starting salary after hotel management?', language: 'en', base: 44, source: 'quora' },
    ],
    worries: worries([64, 71, 39, 28, 24], { text: 'Long working hours in the industry', base: 31 }),
    ideas: [
      { text: "Show where this year's students did their internships, hotel by hotel.", question: 0 },
      { text: 'An alumnus working on a cruise line answers questions in a live session.', question: 1 },
      { text: 'Post the full course cost in Assamese, including uniform and kit.', question: 2 },
      { text: 'Compare the diploma and degree paths in a 30 second reel.', question: 3 },
      { text: 'Share real starting salaries from last year, with the hotel names.', question: 4 },
    ],
  },

  'digital-marketing': {
    rising: [
      { text: 'Performance marketing', changePct: 44, base: 230 },
      { text: 'Social media management for small businesses', changePct: 27, base: 210 },
      { text: 'AI tools for marketers', changePct: 25, base: 260 },
    ],
    falling: [
      { text: 'SEO only courses', changePct: -14, base: 150 },
      { text: 'Print advertising', changePct: -12, base: 60 },
    ],
    questions: [
      { text: 'Which digital marketing course in Guwahati gives a certificate companies trust?', language: 'en', base: 68, source: 'quora' },
      { text: 'Can I learn digital marketing in 3 months and get a job?', original: 'क्या 3 महीने में डिजिटल मार्केटिंग सीखकर नौकरी मिल सकती है?', language: 'hi', base: 88, source: 'youtube' },
      { text: 'Are there weekend digital marketing classes in Guwahati?', original: 'গুৱাহাটীত সপ্তাহান্তত ডিজিটেল মাৰ্কেটিঙৰ ক্লাছ আছেনে?', language: 'as', base: 57, source: 'instagram' },
      { text: 'Do digital marketing courses include live projects?', language: 'en', base: 51, source: 'reddit' },
      { text: 'Is freelancing possible after a digital marketing course?', language: 'en', base: 62, source: 'reddit' },
    ],
    worries: worries([58, 74, 12, 10, 47], { text: 'Course content going out of date', base: 39 }),
    ideas: [
      { text: "Show the certificate and the companies that hired last batch's learners.", question: 0 },
      { text: 'Follow one learner from day one to a first job over 3 months, one reel a week.', question: 1 },
      { text: 'Announce weekend batch timings in Assamese, with the start date.', question: 2 },
      { text: 'Share a live client project your learners ran, with the results.', question: 3 },
      { text: 'A past learner explains how they found their first freelance client.', question: 4 },
    ],
  },

  'data-analytics': {
    rising: [
      { text: 'Power BI and dashboards', changePct: 39, base: 240 },
      { text: 'Data analytics for finance', changePct: 24, base: 160 },
      { text: 'SQL for beginners', changePct: 17, base: 200 },
    ],
    falling: [
      { text: 'Basic Excel only courses', changePct: -13, base: 170 },
      { text: 'Data entry jobs', changePct: -21, base: 230 },
    ],
    questions: [
      { text: 'Which data analytics course in Guwahati has placement support?', language: 'en', base: 66, source: 'quora' },
      { text: 'Can I learn data analytics without a coding background?', original: 'क्या बिना कोडिंग के डेटा एनालिटिक्स सीख सकते हैं?', language: 'hi', base: 79, source: 'youtube' },
      { text: 'Is a data analytics course useful for a B.Com graduate?', original: 'বি.কম স্নাতকৰ বাবে ডেটা এনালিটিক্স কোৰ্ছ উপকাৰী হয়নে?', language: 'as', base: 48, source: 'instagram' },
      { text: 'Excel, SQL or Python: what should I learn first?', language: 'en', base: 72, source: 'reddit' },
      { text: 'What does a fresher data analyst earn in Assam?', language: 'en', base: 53, source: 'quora' },
    ],
    worries: worries([61, 83, 14, 11, 43], { text: 'Too much theory, not enough projects', base: 41 }),
    ideas: [
      { text: 'Share placement support in numbers: learners, interviews and offers from the last batch.', question: 0 },
      { text: 'Teach one no-code dashboard in a 60 second reel.', question: 1 },
      { text: 'A B.Com graduate who became an analyst explains the switch, in Assamese.', question: 2 },
      { text: 'Post a simple learning path: Excel, then SQL, then Python, with the weeks for each.', question: 3 },
      { text: 'Show real fresher salary ranges from your last batch.', question: 4 },
    ],
  },
};

export interface SeasonFixture {
  text: string;
  stage: 'classes' | 'exams' | 'results' | 'counselling' | 'batches';
  from: string;
  to: string;
  /** True for the stage the admission year is in right now. */
  current: boolean;
}

/** Where we are in the admission year for degree programs. */
export const SEASON_DEGREE: readonly SeasonFixture[] = [
  { text: 'Classes have started. Most colleges close late admissions by mid October.', stage: 'classes', from: '2026-08-01', to: '2026-10-15', current: true },
  { text: 'Class 12 board exams run from February to March 2027.', stage: 'exams', from: '2027-02-01', to: '2027-03-31', current: false },
  { text: 'Board results are expected in May 2027.', stage: 'results', from: '2027-05-01', to: '2027-05-31', current: false },
  { text: 'Counselling and admissions run from May to August 2027.', stage: 'counselling', from: '2027-05-01', to: '2027-08-31', current: false },
];

/** Skilling courses run in rolling batches, so their year looks different. */
export const SEASON_SKILLS: readonly SeasonFixture[] = [
  { text: 'New batches start every month. Weekend batches fill fastest from October to December.', stage: 'batches', from: '2026-10-01', to: '2026-12-31', current: true },
  { text: 'Class 12 board exams run from February to March 2027. Enquiries dip in these months.', stage: 'exams', from: '2027-02-01', to: '2027-03-31', current: false },
  { text: 'Enquiries peak in the weeks after board results in May 2027.', stage: 'results', from: '2027-05-01', to: '2027-06-30', current: false },
];

export const SKILLS_PROGRAM_KEYS: ReadonlySet<string> = new Set(['digital-marketing', 'data-analytics']);

export interface MentionFixture {
  slug: string;
  sentiment: Sentiment;
  text: string;
  base: number;
  source: DemandPlatform;
}

/** Grouped public mentions of sample institutions. A topic and a count, never a person. */
export const MENTION_FIXTURES: readonly MentionFixture[] = [
  { slug: 'northbank-college', sentiment: 'positive', text: 'Students like the small class sizes', base: 14, source: 'reddit' },
  { slug: 'northbank-college', sentiment: 'negative', text: 'Slow replies to fee questions', base: 6, source: 'x' },
  { slug: 'eastgate-university', sentiment: 'positive', text: 'Praise for the MBA placement drive', base: 22, source: 'x' },
  { slug: 'eastgate-university', sentiment: 'negative', text: 'Complaints about hostel food', base: 9, source: 'reddit' },
  { slug: 'silverline-college', sentiment: 'positive', text: 'Hotel management internships are praised', base: 18, source: 'instagram' },
  { slug: 'silverline-college', sentiment: 'negative', text: 'Fees went up this year', base: 11, source: 'x' },
  { slug: 'brightpath-skills', sentiment: 'positive', text: 'Trainers who work in the industry', base: 16, source: 'reddit' },
  { slug: 'brightpath-skills', sentiment: 'negative', text: 'Batch timings change often', base: 7, source: 'x' },
  { slug: 'highfield-university', sentiment: 'positive', text: 'Nursing labs are praised', base: 12, source: 'reddit' },
  { slug: 'highfield-university', sentiment: 'negative', text: 'Campus is far from the city', base: 8, source: 'x' },
  { slug: 'loomcraft-skills', sentiment: 'positive', text: 'Short courses that lead to work', base: 9, source: 'instagram' },
  { slug: 'loomcraft-skills', sentiment: 'negative', text: 'Certificates take long to arrive', base: 5, source: 'reddit' },
];

export const DEMAND_REGIONS: ReadonlyArray<{ scope: DemandScope; region: string }> = [
  { scope: 'city', region: 'Guwahati' },
  { scope: 'state', region: 'Assam' },
  { scope: 'india', region: 'India' },
];

/** August lets September's rising, falling and spikes compare with something. */
export const DEMAND_MONTHS = ['2026-08', '2026-09'] as const;

/** How much bigger each scope's counts are than Guwahati's. */
export const DEMAND_SCOPE_FACTOR: Readonly<Record<DemandScope, number>> = { city: 1, state: 3.4, india: 42 };

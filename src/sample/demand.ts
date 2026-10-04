// Demand fixtures for the sample world (spec section 9). Grouped only: every item is a topic,
// a count and a source. Never a person. Hindi and Assamese items keep their original wording
// in `original`; the product shows the English wording (decision: Bricolage stays the only font).
// Counts are for Guwahati; the state's are bigger and a smaller city's much smaller (see
// DEMAND_SCOPE_FACTOR and CITY_FACTOR).
//
// Version 2: what students ask about each program (topics: fees, placements, scholarships,
// hostel, careers), what gets attention (topics and formats), the best months to post, and
// ideas with a title, a hook line and key points. Honest numbers: a search trend carries its
// change only; the keyword tool gives real search counts for some of them (KEYWORD_VOLUME).

import type { AskTopic, DemandScope, Difficulty, IdeaFormat, Language } from '../domain/types.ts';

/** Where a grouped item was found. Quora and forums come through the search tool. */
export type DemandPlatform = 'reddit' | 'quora' | 'forum' | 'trends' | 'instagram' | 'youtube' | 'keywords';

export interface TrendFixture {
  text: string;
  /** Change against last month, in percent. */
  changePct: number;
  /** Searches a month in Guwahati, for the trends the keyword tool counts (see KEYWORD_VOLUME). */
  base: number;
  /** False for a career or a skill, rather than a course an institution could offer. */
  course?: boolean;
}

export interface QuestionFixture {
  text: string;
  original?: string;
  language: Language;
  base: number;
  source: DemandPlatform;
  /** What the question is about. */
  topic: AskTopic;
}

/** One of what students ask about a program: how often, and the question asked most on it. */
export interface TopicFixture {
  topic: AskTopic;
  base: number;
  question: { text: string; original?: string; language: Language; source: DemandPlatform };
}

/** A topic and format that gets attention among institutions like this one, in the city. */
export interface ContentFixture {
  text: string;
  format: IdeaFormat;
  level: 'most' | 'high' | 'some';
}

export interface IdeaFixture {
  /** What to make, in a few words. `{institution}` becomes the institution's name. */
  title: string;
  /** The longer brief: what to show. */
  text: string;
  /** The student question the idea is built on: one of the program's questions, or the top question of a topic. */
  question?: number;
  topic?: AskTopic;
  /** Index of the rising search behind it, when there is one. */
  trend?: number;
  /** What to make, and how big a job it is. */
  format: IdeaFormat;
  effort: Difficulty;
  /** The first line, to stop the scroll. */
  hook: string;
  /** What to cover, 3 or 4 points. */
  points: readonly string[];
}

export interface ProgramDemandFixture {
  rising: readonly TrendFixture[];
  falling: readonly TrendFixture[];
  questions: readonly QuestionFixture[];
  topics: readonly TopicFixture[];
  content: readonly ContentFixture[];
  /** The months students pay most attention to this program, 1 to 12. */
  bestMonths: readonly number[];
  ideas: readonly IdeaFixture[];
}

/** Placement stories and fee breakdowns get the most attention for degree programs. */
export const DEGREE_CONTENT: readonly ContentFixture[] = [
  { text: 'Placement stories', format: 'reel', level: 'most' },
  { text: 'Fee breakdowns', format: 'post', level: 'high' },
  { text: 'Campus walks', format: 'video', level: 'high' },
  { text: 'A day in class', format: 'reel', level: 'some' },
];

/** Learner results and free mini classes get the most attention for short courses. */
export const SKILLS_CONTENT: readonly ContentFixture[] = [
  { text: 'Learner results with numbers', format: 'reel', level: 'most' },
  { text: 'Free mini classes', format: 'video', level: 'high' },
  { text: 'Fees and batch timings', format: 'post', level: 'high' },
  { text: 'Day one in class', format: 'reel', level: 'some' },
];

const q = (text: string, source: DemandPlatform, extra: { original?: string; language?: Language } = {}) => ({ text, source, language: extra.language ?? 'en', ...(extra.original ? { original: extra.original } : {}) });

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
      { text: 'Which BBA colleges in Guwahati have real placements?', language: 'en', base: 96, source: 'quora', topic: 'placements' },
      { text: 'What is the total fee for BBA in Guwahati?', original: 'गुवाहाटी में बीबीए की कुल फीस कितनी है?', language: 'hi', base: 81, source: 'youtube', topic: 'fees' },
      { text: 'Which college is good for BBA in Guwahati?', original: 'গুৱাহাটীত বিবিএ পঢ়িবলৈ কোনখন কলেজ ভাল?', language: 'as', base: 74, source: 'instagram', topic: 'other' },
      { text: 'Is BBA worth it after commerce in Class 12?', language: 'en', base: 58, source: 'reddit', topic: 'careers' },
      { text: 'BBA or B.Com: which one gets a better first job?', language: 'en', base: 52, source: 'quora', topic: 'careers' },
    ],
    topics: [
      { topic: 'fees', base: 140, question: q('What is the total fee for BBA in Guwahati?', 'youtube', { language: 'hi', original: 'गुवाहाटी में बीबीए की कुल फीस कितनी है?' }) },
      { topic: 'placements', base: 128, question: q('Which BBA colleges in Guwahati have real placements?', 'quora') },
      { topic: 'careers', base: 72, question: q('Is BBA worth it after commerce in Class 12?', 'reddit') },
      { topic: 'hostel', base: 66, question: q('Do BBA colleges in Guwahati give a hostel in the first year?', 'reddit') },
      { topic: 'scholarships', base: 54, question: q('Are there BBA scholarships for girls in Assam?', 'quora') },
    ],
    content: DEGREE_CONTENT,
    bestMonths: [3, 4, 5, 6],
    ideas: [
      {
        title: 'Last year’s BBA placements, one student per reel',
        text: "Show last year's BBA placements: company, role and salary, one student per reel.",
        question: 0,
        format: 'reel',
        effort: 'medium',
        hook: '“I got my offer in the final semester. Here is the company, and the salary.”',
        points: ['The company, the role and the salary', 'How the placement drive worked', 'What the student did to get ready'],
      },
      {
        title: 'Your full BBA fee in one image',
        text: 'Post one clear BBA fee breakdown: tuition, exams and hostel, in a single image.',
        topic: 'fees',
        format: 'post',
        effort: 'easy',
        hook: '“Every rupee of a BBA at {institution}, on one page.”',
        points: ['Tuition, exams and hostel, year by year', 'What each fee covers', 'Scholarships that bring it down'],
      },
      {
        title: 'Which college is good for BBA? Answered in Assamese',
        text: 'Answer "which college is good for BBA" in Assamese, with a real day in class.',
        question: 2,
        format: 'reel',
        effort: 'medium',
        hook: '“Choosing a BBA college? Spend one real day with us.”',
        points: ['A real day in class', 'What students like here, in their words', 'How to apply'],
      },
      {
        title: 'From commerce in Class 12 to BBA in Business Analytics',
        text: 'A BBA in Business Analytics student who took commerce in Class 12 shows a week of classes.',
        question: 3,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“I took commerce in Class 12. This is my week in Business Analytics.”',
        points: ['What the classes cover', 'The tools students learn', 'The jobs it leads to'],
      },
      {
        title: 'BBA or B.Com in 30 seconds',
        text: 'A faculty member explains BBA and B.Com side by side in 30 seconds.',
        question: 4,
        format: 'reel',
        effort: 'easy',
        hook: '“BBA or B.Com? Here is the honest difference.”',
        points: ['The subjects side by side', 'First jobs after each', 'Who each one suits'],
      },
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
      { text: 'Which MBA colleges in Assam have the best placements?', language: 'en', base: 88, source: 'quora', topic: 'placements' },
      { text: 'Can I do an MBA without a CAT score?', original: 'क्या बिना कैट स्कोर के एमबीए कर सकते हैं?', language: 'hi', base: 72, source: 'youtube', topic: 'other' },
      { text: 'Is there an evening MBA in Guwahati for working people?', original: 'গুৱাহাটীত চাকৰি কৰা মানুহৰ বাবে সন্ধিয়াৰ এমবিএ আছেনে?', language: 'as', base: 47, source: 'instagram', topic: 'other' },
      { text: 'What is the real average salary after an MBA in Assam?', language: 'en', base: 64, source: 'reddit', topic: 'careers' },
      { text: 'Is an MBA in Business Analytics better than a general MBA?', language: 'en', base: 55, source: 'quora', topic: 'careers' },
    ],
    topics: [
      { topic: 'placements', base: 131, question: q('Which MBA colleges in Assam have the best placements?', 'quora') },
      { topic: 'fees', base: 118, question: q('What is the total MBA fee in Guwahati with hostel?', 'quora') },
      { topic: 'careers', base: 64, question: q('What is the real average salary after an MBA in Assam?', 'reddit') },
      { topic: 'scholarships', base: 35, question: q('Is there a scholarship for MBA for girls in Assam?', 'quora') },
      { topic: 'hostel', base: 34, question: q('Are MBA hostels in Guwahati safe for girls?', 'reddit') },
    ],
    content: DEGREE_CONTENT,
    bestMonths: [11, 12, 1, 2],
    ideas: [
      {
        title: 'What an MBA at {institution} really costs, year by year',
        text: 'Post the full MBA cost: tuition, books, exams and hostel, year by year, with the scholarships that bring it down.',
        topic: 'fees',
        format: 'reel',
        effort: 'easy',
        hook: '“Here is everything an MBA at {institution} costs, and what it pays for.”',
        points: ['Tuition, books and exam fees, year by year', 'Hostel as its own line', 'Scholarships that bring it down', 'Where to see the full table'],
      },
      {
        title: 'Last year’s MBA placements in numbers',
        text: 'Share real MBA placement numbers for the last batch, with company names and the year.',
        question: 0,
        format: 'post',
        effort: 'medium',
        hook: '“42 students. 18 companies. Here is our 2026 MBA batch.”',
        points: ['Students placed and the average package', 'The companies, by name', 'The year, so it is easy to trust'],
      },
      {
        title: 'Every way into the MBA, CAT and others',
        text: 'Explain every entrance route you accept, CAT and others, in one carousel.',
        question: 1,
        format: 'post',
        effort: 'easy',
        hook: '“No CAT score? You can still apply. Here is how.”',
        points: ['Every entrance test you accept', 'The marks you need for each', 'The dates to apply'],
      },
      {
        title: 'A week in the evening MBA batch',
        text: 'A working professional in the evening batch shows their weekly routine.',
        question: 2,
        trend: 2,
        format: 'reel',
        effort: 'medium',
        hook: '“I work 9 to 6. This is how I do an MBA.”',
        points: ['Class timings', 'How assignments fit around work', 'What the employer thinks'],
      },
      {
        title: 'An alumnus on their first salary after the MBA',
        text: 'An alumnus shares their first salary and what it took to get there.',
        question: 3,
        format: 'video',
        effort: 'medium',
        hook: '“My first salary after the MBA, and the three things that got me there.”',
        points: ['The role and the salary', 'The project that mattered most', 'Advice for this year’s batch'],
      },
    ],
  },

  bca: {
    rising: [
      { text: 'BCA with AI and Machine Learning', changePct: 47, base: 350 },
      { text: 'BCA in Cyber Security', changePct: 23, base: 190 },
      { text: 'Cloud support careers', changePct: 15, base: 150, course: false },
    ],
    falling: [
      { text: 'BCA in Multimedia', changePct: -10, base: 120 },
      { text: 'Computer hardware diploma', changePct: -18, base: 170 },
    ],
    questions: [
      { text: 'Which BCA colleges in Guwahati teach real coding?', language: 'en', base: 79, source: 'reddit', topic: 'other' },
      { text: 'Can I get a job after BCA without an MCA?', original: 'क्या एमसीए के बिना बीसीए के बाद नौकरी मिल सकती है?', language: 'hi', base: 83, source: 'youtube', topic: 'careers' },
      { text: 'Can I study BCA without Maths in Class 12?', original: 'দ্বাদশ শ্ৰেণীত গণিত নোহোৱাকৈ বিচিএ পঢ়িব পাৰিনে?', language: 'as', base: 61, source: 'instagram', topic: 'other' },
      { text: 'BCA or B.Tech in computer science: which is better for jobs?', language: 'en', base: 57, source: 'quora', topic: 'careers' },
      { text: 'Do BCA colleges in Assam help with internships?', language: 'en', base: 42, source: 'reddit', topic: 'placements' },
    ],
    topics: [
      { topic: 'placements', base: 117, question: q('Do BCA colleges in Assam help with internships?', 'reddit') },
      { topic: 'fees', base: 92, question: q('What is the BCA fee in Guwahati private colleges?', 'quora') },
      { topic: 'careers', base: 83, question: q('Can I get a job after BCA without an MCA?', 'youtube', { language: 'hi', original: 'क्या एमसीए के बिना बीसीए के बाद नौकरी मिल सकती है?' }) },
      { topic: 'hostel', base: 38, question: q('Do BCA colleges in Guwahati have hostels?', 'reddit') },
      { topic: 'scholarships', base: 31, question: q('Are there scholarships for BCA in Assam?', 'quora') },
    ],
    content: DEGREE_CONTENT,
    bestMonths: [4, 5, 6, 7],
    ideas: [
      {
        title: 'A student builds an AI project, start to finish',
        text: 'Film a student building a small AI project from start to finish, ending on the working result.',
        question: 0,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“Day 1: an idea. Day 10: it works.”',
        points: ['The problem the project solves', 'The code, step by step', 'The working result'],
      },
      {
        title: 'Three BCA graduates who got jobs without an MCA',
        text: 'Show three BCA graduates who got jobs without an MCA, and what they do now.',
        question: 1,
        format: 'post',
        effort: 'medium',
        hook: '“No MCA. Three jobs. Here is how.”',
        points: ['Where each one works', 'Their role and first salary', 'What they learned at college that mattered'],
      },
      {
        title: 'BCA without Maths? Answered in Assamese',
        text: 'Explain the Class 12 subjects BCA needs, in Assamese, in under a minute.',
        question: 2,
        format: 'reel',
        effort: 'easy',
        hook: '“No Maths in Class 12? You can still study BCA here.”',
        points: ['The subjects you need', 'The marks you need', 'How to apply'],
      },
      {
        title: 'BCA or B.Tech, honestly',
        text: 'A faculty member compares BCA and B.Tech honestly: time, cost and jobs.',
        question: 3,
        format: 'video',
        effort: 'medium',
        hook: '“BCA or B.Tech? Time, cost and jobs, side by side.”',
        points: ['Years and fees', 'The jobs each leads to', 'Who each one suits'],
      },
      {
        title: 'This year’s BCA internships, company by company',
        text: 'List the internships your BCA students did this year, with company names.',
        question: 4,
        format: 'page',
        effort: 'medium',
        hook: '“Where our BCA students interned this year.”',
        points: ['Each company and the project', 'How students found the internship', 'How to apply for next year'],
      },
    ],
  },

  bcom: {
    rising: [
      { text: 'B.Com with ACCA', changePct: 29, base: 240 },
      { text: 'B.Com in Fintech', changePct: 22, base: 150 },
      { text: 'GST practitioner careers', changePct: 12, base: 130, course: false },
    ],
    falling: [
      { text: 'B.Com Pass course', changePct: -11, base: 410 },
      { text: 'Bank clerk exam coaching', changePct: -7, base: 300, course: false },
    ],
    questions: [
      { text: 'Which B.Com colleges in Guwahati help with CA preparation?', language: 'en', base: 71, source: 'quora', topic: 'careers' },
      { text: 'What jobs can I get after B.Com?', original: 'बी.कॉम के बाद कौन सी नौकरियाँ मिल सकती हैं?', language: 'hi', base: 94, source: 'youtube', topic: 'careers' },
      { text: 'Is B.Com honours better than a regular B.Com?', original: 'সাধাৰণ বি.কমতকৈ বি.কম অনাৰ্ছ ভাল নেকি?', language: 'as', base: 58, source: 'instagram', topic: 'other' },
      { text: 'Can I do B.Com and a job at the same time?', language: 'en', base: 49, source: 'reddit', topic: 'other' },
      { text: 'Is B.Com with GST and Tally worth it?', language: 'en', base: 37, source: 'forum', topic: 'careers' },
    ],
    topics: [
      { topic: 'careers', base: 94, question: q('What jobs can I get after B.Com?', 'youtube', { language: 'hi', original: 'बी.कॉम के बाद कौन सी नौकरियाँ मिल सकती हैं?' }) },
      { topic: 'placements', base: 88, question: q('Do B.Com colleges in Guwahati have campus placements?', 'quora') },
      { topic: 'fees', base: 76, question: q('What is the B.Com fee at private colleges in Guwahati?', 'reddit') },
      { topic: 'scholarships', base: 29, question: q('Which B.Com colleges give merit scholarships?', 'quora') },
      { topic: 'hostel', base: 25, question: q('Is a hostel needed for B.Com in Guwahati?', 'reddit') },
    ],
    content: DEGREE_CONTENT,
    bestMonths: [4, 5, 6],
    ideas: [
      {
        title: 'B.Com with room for CA classes',
        text: 'Show how your B.Com timetable leaves room for CA or ACCA classes.',
        question: 0,
        trend: 0,
        format: 'post',
        effort: 'easy',
        hook: '“B.Com in the morning. CA classes after. Here is the timetable.”',
        points: ['The class timings', 'Where CA or ACCA fits', 'Students who do both'],
      },
      {
        title: 'Five real jobs your B.Com graduates hold',
        text: 'Five real jobs your B.Com graduates hold, one per slide.',
        question: 1,
        format: 'post',
        effort: 'easy',
        hook: '“What do B.Com graduates actually do? Five of ours.”',
        points: ['One job a slide', 'The company and the role', 'The first salary range'],
      },
      {
        title: 'Honours or regular B.Com, in Assamese',
        text: 'Explain honours and regular B.Com in Assamese, with the subjects side by side.',
        question: 2,
        format: 'faq',
        effort: 'easy',
        hook: '“Honours or regular? The difference in one minute.”',
        points: ['The subjects side by side', 'What each leads to', 'How to choose'],
      },
      {
        title: 'A week of B.Com and a part time job',
        text: 'A student who works part time walks through their week.',
        question: 3,
        format: 'reel',
        effort: 'medium',
        hook: '“I study B.Com and work 4 hours a day. Here is my week.”',
        points: ['The class timings', 'How the job fits', 'What the college allows'],
      },
      {
        title: 'A GST return, filed in class',
        text: 'A teacher files a sample GST return in class, on camera.',
        question: 4,
        trend: 2,
        format: 'video',
        effort: 'medium',
        hook: '“This is what a GST practitioner does all day.”',
        points: ['The return, step by step', 'The software students learn', 'The jobs it leads to'],
      },
    ],
  },

  nursing: {
    rising: [
      { text: 'B.Sc Nursing with placement abroad', changePct: 33, base: 280 },
      { text: 'Critical care nursing', changePct: 18, base: 140 },
      { text: 'Home healthcare careers', changePct: 12, base: 110, course: false },
    ],
    falling: [
      { text: 'ANM course', changePct: -9, base: 160 },
      { text: 'GNM diploma', changePct: -6, base: 220 },
    ],
    questions: [
      { text: 'Which nursing colleges in Assam are recognised by the nursing council?', language: 'en', base: 86, source: 'quora', topic: 'other' },
      { text: 'What is the fee for B.Sc Nursing in Assam?', original: 'असम में बी.एससी नर्सिंग की फीस कितनी है?', language: 'hi', base: 77, source: 'youtube', topic: 'fees' },
      { text: 'Is there a hostel for girls at nursing colleges in Guwahati?', original: 'গুৱাহাটীৰ নাৰ্ছিং কলেজত ছোৱালীৰ বাবে হোষ্টেল আছেনে?', language: 'as', base: 69, source: 'instagram', topic: 'hostel' },
      { text: 'Do nursing colleges in Guwahati help with jobs abroad?', language: 'en', base: 54, source: 'reddit', topic: 'placements' },
      { text: 'Is the B.Sc Nursing entrance hard in Assam?', language: 'en', base: 41, source: 'quora', topic: 'other' },
    ],
    topics: [
      { topic: 'careers', base: 102, question: q('Is B.Sc Nursing in Guwahati worth it?', 'reddit') },
      { topic: 'fees', base: 97, question: q('What is the fee for B.Sc Nursing in Assam?', 'youtube', { language: 'hi', original: 'असम में बी.एससी नर्सिंग की फीस कितनी है?' }) },
      { topic: 'hostel', base: 88, question: q('Is there a hostel for girls at nursing colleges in Guwahati?', 'instagram', { language: 'as', original: 'গুৱাহাটীৰ নাৰ্ছিং কলেজত ছোৱালীৰ বাবে হোষ্টেল আছেনে?' }) },
      { topic: 'placements', base: 64, question: q('Which hospitals hire nursing freshers from Guwahati?', 'reddit') },
      { topic: 'scholarships', base: 33, question: q('Are there nursing scholarships for girls in Assam?', 'quora') },
    ],
    content: [{ text: 'Hospital training days', format: 'reel', level: 'most' }, ...DEGREE_CONTENT.slice(1)],
    bestMonths: [5, 6, 7],
    ideas: [
      {
        title: 'Is B.Sc Nursing in Guwahati worth it? A nurse answers',
        text: 'A graduate now working in a Guwahati hospital answers the question, honestly.',
        topic: 'careers',
        format: 'video',
        effort: 'medium',
        hook: '“I studied here. This is my first hospital job.”',
        points: ['Where last year’s batch works now', 'The starting salary, honestly', 'Hostel and safety for students from outside', 'The admission dates'],
      },
      {
        title: 'Your nursing council recognition, with the link',
        text: 'Show your nursing council recognition, with a link to the official list.',
        question: 0,
        format: 'page',
        effort: 'easy',
        hook: '“Recognised by the nursing council. Check it yourself.”',
        points: ['The council and the year', 'The link to the official list', 'Seats approved'],
      },
      {
        title: 'The full B.Sc Nursing fee, year by year',
        text: 'Post the full B.Sc Nursing fee, year by year, in one image.',
        question: 1,
        format: 'post',
        effort: 'easy',
        hook: '“Four years of B.Sc Nursing. Every fee, on one page.”',
        points: ['Tuition and clinical fees', 'Hostel and uniform', 'Scholarships'],
      },
      {
        title: 'A tour of the girls hostel, in Assamese',
        text: 'The hostel warden gives a tour of the girls hostel, in Assamese.',
        question: 2,
        format: 'video',
        effort: 'medium',
        hook: '“Your daughter’s room, the mess and the gate. A full tour.”',
        points: ['The rooms and the mess', 'Safety and timings', 'The hostel fee'],
      },
      {
        title: 'From Guwahati to a hospital abroad',
        text: 'A graduate now working abroad explains the steps they took.',
        question: 3,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“From this campus to a hospital in Dubai. The steps I took.”',
        points: ['The exams and the paperwork', 'How long it took', 'How the college helped'],
      },
    ],
  },

  'hotel-management': {
    rising: [
      { text: 'Cruise line careers', changePct: 36, base: 190, course: false },
      { text: 'Culinary arts', changePct: 21, base: 170 },
      { text: 'Hotel management with internships abroad', changePct: 16, base: 150 },
    ],
    falling: [
      { text: 'Front office diploma', changePct: -10, base: 90 },
      { text: 'Travel agency courses', changePct: -8, base: 80 },
    ],
    questions: [
      { text: 'Which hotel management colleges in Assam offer internships in big hotels?', language: 'en', base: 63, source: 'quora', topic: 'placements' },
      { text: 'Do I get a job abroad after hotel management?', original: 'क्या होटल मैनेजमेंट के बाद विदेश में नौकरी मिलती है?', language: 'hi', base: 71, source: 'youtube', topic: 'careers' },
      { text: 'What does hotel management cost in Guwahati?', original: 'গুৱাহাটীত হোটেল মেনেজমেণ্ট পঢ়াৰ খৰচ কিমান?', language: 'as', base: 52, source: 'instagram', topic: 'fees' },
      { text: 'Is a hotel management diploma enough to get hired?', language: 'en', base: 46, source: 'reddit', topic: 'careers' },
      { text: 'What is the starting salary after hotel management?', language: 'en', base: 44, source: 'quora', topic: 'careers' },
    ],
    topics: [
      { topic: 'placements', base: 71, question: q('Which hotel management colleges in Assam offer internships in big hotels?', 'quora') },
      { topic: 'fees', base: 64, question: q('What does hotel management cost in Guwahati?', 'instagram', { language: 'as', original: 'গুৱাহাটীত হোটেল মেনেজমেণ্ট পঢ়াৰ খৰচ কিমান?' }) },
      { topic: 'careers', base: 58, question: q('Do I get a job abroad after hotel management?', 'youtube', { language: 'hi', original: 'क्या होटल मैनेजमेंट के बाद विदेश में नौकरी मिलती है?' }) },
      { topic: 'hostel', base: 39, question: q('Do hotel management colleges give a hostel?', 'reddit') },
      { topic: 'scholarships', base: 21, question: q('Are there scholarships for hotel management in Assam?', 'quora') },
    ],
    content: [{ text: 'Students at work in real hotels', format: 'reel', level: 'most' }, ...DEGREE_CONTENT.slice(1)],
    bestMonths: [4, 5, 6, 10],
    ideas: [
      {
        title: 'This year’s internships, hotel by hotel',
        text: "Show where this year's students did their internships, hotel by hotel.",
        question: 0,
        trend: 2,
        format: 'post',
        effort: 'medium',
        hook: '“Six months in a 5 star hotel. Where our students trained this year.”',
        points: ['Each hotel and city', 'What students did there', 'Who got job offers after'],
      },
      {
        title: 'Life on a cruise line, from an alumnus',
        text: 'An alumnus working on a cruise line answers questions in a live session.',
        question: 1,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“I work on a cruise ship. Ask me anything.”',
        points: ['The job and the salary', 'How they got hired', 'What the course taught them'],
      },
      {
        title: 'The full course cost, in Assamese',
        text: 'Post the full course cost in Assamese, including uniform and kit.',
        question: 2,
        format: 'post',
        effort: 'easy',
        hook: '“Every cost of hotel management here, uniform and kit included.”',
        points: ['Tuition, year by year', 'Uniform, kit and trips', 'Scholarships'],
      },
      {
        title: 'Diploma or degree, in 30 seconds',
        text: 'Compare the diploma and degree paths in a 30 second reel.',
        question: 3,
        format: 'reel',
        effort: 'easy',
        hook: '“Diploma or degree? What hotels actually ask for.”',
        points: ['Years and fees', 'The jobs each leads to', 'Who each one suits'],
      },
      {
        title: 'Real starting salaries, with the hotel names',
        text: 'Share real starting salaries from last year, with the hotel names.',
        question: 4,
        format: 'post',
        effort: 'medium',
        hook: '“What our 2026 batch earns now.”',
        points: ['Salary ranges by role', 'The hotels, by name', 'The year'],
      },
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
      { text: 'Print advertising', changePct: -12, base: 60, course: false },
    ],
    questions: [
      { text: 'Which digital marketing course in Guwahati gives a certificate companies trust?', language: 'en', base: 68, source: 'quora', topic: 'placements' },
      { text: 'Can I learn digital marketing in 3 months and get a job?', original: 'क्या 3 महीने में डिजिटल मार्केटिंग सीखकर नौकरी मिल सकती है?', language: 'hi', base: 88, source: 'youtube', topic: 'careers' },
      { text: 'Are there weekend digital marketing classes in Guwahati?', original: 'গুৱাহাটীত সপ্তাহান্তত ডিজিটেল মাৰ্কেটিঙৰ ক্লাছ আছেনে?', language: 'as', base: 57, source: 'instagram', topic: 'other' },
      { text: 'Do digital marketing courses include live projects?', language: 'en', base: 51, source: 'reddit', topic: 'other' },
      { text: 'Is freelancing possible after a digital marketing course?', language: 'en', base: 62, source: 'reddit', topic: 'careers' },
    ],
    topics: [
      { topic: 'careers', base: 88, question: q('Can I learn digital marketing in 3 months and get a job?', 'youtube', { language: 'hi', original: 'क्या 3 महीने में डिजिटल मार्केटिंग सीखकर नौकरी मिल सकती है?' }) },
      { topic: 'placements', base: 74, question: q('Which digital marketing course in Guwahati gives a certificate companies trust?', 'quora') },
      { topic: 'fees', base: 58, question: q('How much does a digital marketing course cost in Guwahati?', 'reddit') },
      { topic: 'scholarships', base: 14, question: q('Is there an EMI option for digital marketing courses?', 'quora') },
      { topic: 'hostel', base: 10, question: q('Do digital marketing institutes help with a PG nearby?', 'reddit') },
    ],
    content: SKILLS_CONTENT,
    bestMonths: [10, 11, 12, 1],
    ideas: [
      {
        title: 'The certificate, and the companies that hired',
        text: "Show the certificate and the companies that hired last batch's learners.",
        question: 0,
        format: 'post',
        effort: 'easy',
        hook: '“This certificate got 14 learners hired. Here is where.”',
        points: ['The certificate and who issues it', 'The companies that hired', 'How long it took'],
      },
      {
        title: 'One learner, day one to a first job',
        text: 'Follow one learner from day one to a first job over 3 months, one reel a week.',
        question: 1,
        format: 'reel',
        effort: 'hard',
        hook: '“Week 1 of 12. Watch me go from zero to a job.”',
        points: ['What they learn each week', 'The project they build', 'The job at the end'],
      },
      {
        title: 'Weekend batch timings, in Assamese',
        text: 'Announce weekend batch timings in Assamese, with the start date.',
        question: 2,
        format: 'post',
        effort: 'easy',
        hook: '“Work on weekdays? Learn on Saturdays and Sundays.”',
        points: ['The timings', 'The start date', 'The fee'],
      },
      {
        title: 'A live performance marketing project, with the results',
        text: 'Share a live performance marketing project your learners ran, with the results.',
        question: 3,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“Our learners ran ads for a real shop. Here are the numbers.”',
        points: ['The shop and the goal', 'What the learners did', 'The results, in numbers'],
      },
      {
        title: 'How a past learner found a first freelance client',
        text: 'A past learner explains how they found their first freelance client.',
        question: 4,
        trend: 1,
        format: 'video',
        effort: 'medium',
        hook: '“My first client paid ₹15,000. This is how I found them.”',
        points: ['Where they looked', 'What they charged', 'What the course gave them'],
      },
    ],
  },

  'data-analytics': {
    rising: [
      { text: 'Power BI and dashboards', changePct: 46, base: 240 },
      { text: 'Data analytics for finance', changePct: 24, base: 160 },
      { text: 'SQL for beginners', changePct: 17, base: 200 },
    ],
    falling: [
      { text: 'Basic Excel only courses', changePct: -13, base: 170 },
      { text: 'Data entry jobs', changePct: -21, base: 230, course: false },
    ],
    questions: [
      { text: 'Which data analytics course in Guwahati has placement support?', language: 'en', base: 66, source: 'quora', topic: 'placements' },
      { text: 'Can I learn data analytics without a coding background?', original: 'क्या बिना कोडिंग के डेटा एनालिटिक्स सीख सकते हैं?', language: 'hi', base: 79, source: 'youtube', topic: 'other' },
      { text: 'Is a data analytics course useful for a B.Com graduate?', original: 'বি.কম স্নাতকৰ বাবে ডেটা এনালিটিক্স কোৰ্ছ উপকাৰী হয়নে?', language: 'as', base: 48, source: 'instagram', topic: 'careers' },
      { text: 'Excel, SQL or Python: what should I learn first?', language: 'en', base: 72, source: 'reddit', topic: 'other' },
      { text: 'What does a fresher data analyst earn in Assam?', language: 'en', base: 54, source: 'quora', topic: 'careers' },
    ],
    topics: [
      { topic: 'placements', base: 83, question: q('Which data analytics course in Guwahati has placement support?', 'quora') },
      { topic: 'careers', base: 71, question: q('What does a fresher data analyst earn in Assam?', 'quora') },
      { topic: 'fees', base: 61, question: q('How much is a data analytics course in Guwahati?', 'reddit') },
      { topic: 'scholarships', base: 14, question: q('Is there a pay later option for data analytics courses?', 'quora') },
      { topic: 'hostel', base: 11, question: q('Do data analytics institutes help with a PG nearby?', 'reddit') },
    ],
    content: SKILLS_CONTENT,
    bestMonths: [4, 5, 6, 10],
    ideas: [
      {
        title: 'What a Data Analytics fresher earns in Guwahati',
        text: 'A past learner shares their first salary and the tools that got them the job.',
        question: 4,
        format: 'reel',
        effort: 'easy',
        hook: '“My first salary, and the three tools that got me the job.”',
        points: ['A real learner, in their own words', 'The starting salary, honestly', 'The tools the course teaches', 'When the next batch starts'],
      },
      {
        title: 'Placement support in numbers',
        text: 'Share placement support in numbers: learners, interviews and offers from the last batch.',
        question: 0,
        format: 'post',
        effort: 'medium',
        hook: '“32 learners. 51 interviews. 19 offers.”',
        points: ['Learners in the batch', 'Interviews arranged', 'Offers, with company names'],
      },
      {
        title: 'A no code dashboard in 60 seconds',
        text: 'Teach one no code dashboard in a 60 second reel.',
        question: 1,
        trend: 0,
        format: 'reel',
        effort: 'easy',
        hook: '“No coding. One minute. Your first dashboard.”',
        points: ['The data you start with', 'The three clicks', 'The finished dashboard'],
      },
      {
        title: 'From B.Com to analyst, in Assamese',
        text: 'A B.Com graduate who became an analyst explains the switch, in Assamese.',
        question: 2,
        trend: 1,
        format: 'video',
        effort: 'medium',
        hook: '“I did B.Com. Now I am a data analyst.”',
        points: ['Why they switched', 'What they learned', 'Where they work now'],
      },
      {
        title: 'Excel, then SQL, then Python: a learning path',
        text: 'Post a simple learning path: Excel, then SQL, then Python, with the weeks for each.',
        question: 3,
        trend: 2,
        format: 'post',
        effort: 'easy',
        hook: '“Where to start? Excel, then SQL, then Python. Here is why.”',
        points: ['What each tool is for', 'The weeks each one takes', 'The first job each one opens'],
      },
    ],
  },
};

export const SKILLS_PROGRAM_KEYS: ReadonlySet<string> = new Set(['digital-marketing', 'data-analytics']);

/** The sample world's Demand regions: each sample city that has signed up, and its state. */
export const DEMAND_REGIONS: ReadonlyArray<{ scope: DemandScope; region: string }> = [
  { scope: 'city', region: 'Guwahati' },
  { scope: 'city', region: 'Tezpur' },
  { scope: 'state', region: 'Assam' },
];

/** August lets September's rising, falling and spikes compare with something. */
export const DEMAND_MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] as const;

/** How much bigger each scope's counts are than Guwahati's. All India (version 1) stays for old pulls. */
export const DEMAND_SCOPE_FACTOR: Readonly<Record<DemandScope, number>> = { city: 1, state: 3.4, india: 42 };

/**
 * Counts in a city are Guwahati's times this. A smaller city has too little of its own, so its
 * state fills in (spec 9.2). Cities not listed count as Guwahati does.
 */
export const CITY_FACTOR: Readonly<Record<string, number>> = { Guwahati: 1, Tezpur: 0.06, Jorhat: 0.08, Dibrugarh: 0.1 };

/** In the keyword tool's counts, the trends it covers: the first two rising and the first falling, per program. */
export const KEYWORD_VOLUME: { readonly rising: number; readonly falling: number } = { rising: 2, falling: 1 };

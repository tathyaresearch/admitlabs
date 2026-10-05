// The product page's words (spec section 15), in AdmitLabs' voice: short, plain, confident. Every
// number comes from config, so the page always says what the product does: prices, plan length,
// reminders, schedules, the places, the rivals and what makes a word. Pure, and checked by tests
// (no dashes, curly quotes, numbers from config).

import { PLAN_RULES } from '../config/plans.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { SCHEDULES } from '../config/schedules.ts';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { checksForPillar } from '../domain/checks.ts';
import { formatInr } from '../domain/format.ts';
import { PAID_PRICE } from '../domain/tiers.ts';
import { APP_OPEN } from '../lib/urls.ts';
import { PILLAR_LABELS, PILLAR_QUESTIONS, PILLARS, PLACE_LABELS, PLACES, type CheckKey } from '../domain/types.ts';
import { SAMPLE_REPORT_NOTE } from '../report/data.ts';

/** The one line of AdmitLabs proof, as the user worded it. No client names. */
export const PROOF_LINE = 'From AdmitLabs. 120+ education companies worked with.';

/**
 * While Drishti is not open yet (production, until it opens: src/lib/urls.ts), the lines that would
 * say people can sign up or start now say what fits today. The words for when it opens stay beside them.
 */
export const CLOSED = {
  firstStep: 'Your name, city, programs and public links.',
  plansTitle: 'Free to start.',
  freeNote: 'Free when Drishti opens.',
  paidNote: 'When Drishti opens, the AdmitLabs team switches Paid on for you.',
  faqTitle: 'Questions, answered.',
  finalText: 'Drishti opens soon. Talk to us to be one of the first institutions.',
} as const;

export const HERO = {
  /** The headline is the spec's; the last words sit in an inverted block. */
  title: 'See what the internet says about you, who’s ahead in your city, and what',
  highlight: 'students want.',
  lede: 'Drishti checks what students see about you in five places, tracks the rivals in your city, and listens to what students ask. Every month.',
  trust: 'Public data only. Every result shows its source and date.',
} as const;

export const CTA = {
  primary: 'Get your free Audit',
  paid: 'Start with a free Audit',
  paidNote: APP_OPEN ? 'For now, the AdmitLabs team switches Paid on for you.' : CLOSED.paidNote,
  signIn: 'Sign in',
} as const;

/**
 * The problem: most teams guess, Drishti checks. Shown as one wide Drishti card with the sample
 * university's answers to the three questions side by side, each with where it came from. The
 * card's words are here; every value on it comes from the sample (src/product/showcase.ts).
 */
export const PROBLEM = {
  title: 'Most teams guess. Drishti checks.',
  lede: 'Here’s what it found for a sample university, and where each answer came from.',
  card: {
    checked: 'Last checked',
    words: 'What does the internet say about us?',
    /** Under the three words, beside the five places' marks: where they came from. */
    wordsSource: 'From five places, public pages only',
    rivals: 'Who’s ahead in our city?',
    you: 'You',
    rivalsSource: 'From each one’s own Audit',
    demand: 'What are students asking?',
    /** Before the city: where the questions came from. */
    demandSource: 'Asked most in',
    /** Before the program rising fastest, under the questions. */
    rising: 'Rising fastest:',
    /** What a question's count is, for screen readers ("asked about 96 times"). */
    asked: 'asked about',
    times: 'times',
  },
} as const;

/** The features section's heading, for screen readers: each feature then opens with its own bar. */
export const FEATURES_HEAD = {
  title: ['Three questions.', 'Answered every month.'],
} as const;

export interface Feature {
  key: 'audit' | 'rivals' | 'demand';
  name: string;
  question: string;
  /** The website's line for the feature (its Drishti section). */
  lede: string;
  /** The product page's one short line under the feature's bar. */
  line: string;
}

export const FEATURES: readonly Feature[] = [
  {
    key: 'audit',
    name: 'Audit',
    question: 'What does the internet say about us?',
    lede: 'Five places, checked the way a student sees you. Three words: Visibility, Trust and Chosen. Then what to fix first.',
    line: 'Three words from five places, and what to fix first.',
  },
  {
    key: 'rivals',
    name: 'Rivals',
    question: 'Who’s ahead in our city?',
    lede: `Pick ${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals in your city. One line a month on who’s ahead and where, then every place side by side.`,
    line: 'One line a month on who’s ahead, then every place side by side.',
  },
  {
    key: 'demand',
    name: 'Demand',
    question: 'What do students want?',
    lede: 'What students in your city search for and ask. Then Make these 3: what to post this month, and why.',
    line: 'Make these 3 this month, and the programs rising in your city.',
  },
];

/** The rules every result follows, as one band: the promise, then what it means, and the one exception. */
export const TRUST = {
  name: 'Public data only',
  title: 'Only what anyone can see.',
  points: [
    'Every result shows what was found, where and when.',
    'Learn from rivals, never copy. They never know you track them.',
    'Demand is grouped. Never one student.',
    'Leads is the one exception: only what students send your college themselves.',
  ],
} as const;

/** A check's name as the website and this page list it, for any city and any type of institution. */
const LISTED_NAMES: Partial<Record<CheckKey, string>> = {
  google_search: 'Search from your city',
  approvals: 'Approvals or skilling recognition',
};

const [STRONG, OKAY, WEAK] = SCORING_V1.labels;

/**
 * How Drishti reads you, inside the Audit: five places, three words. Each word with its question
 * and the checks behind it, each with its place and its result; then what makes a word Strong,
 * Okay or Weak. No total score. The label names the feature it belongs to. `words` (with each
 * check by name) is also the website's.
 */
export const READS = {
  label: 'Inside Audit',
  title: 'Five places. Three words.',
  lede: 'Drishti checks what a student sees about you in five places. Each check feeds one of three words, and each word answers a question a student asks.',
  places: PLACES.map((place) => PLACE_LABELS[place]),
  keyTitle: 'What makes a word',
  /** Each word's range, out of 100, from the scoring settings. */
  key: [STRONG, OKAY, WEAK].flatMap((range) => (range ? [{ word: range.label, min: range.min, max: range.max }] : [])),
  keyNote: 'Each word comes from the points its checks earn. A check made for each program shows its weakest program.',
  words: PILLARS.map((pillar) => ({
    pillar,
    name: PILLAR_LABELS[pillar],
    question: PILLAR_QUESTIONS[pillar],
    checks: checksForPillar(pillar).map((check) => LISTED_NAMES[check.key] ?? check.name),
  })),
};

export const STEPS = {
  title: ['Four steps.', 'Then every month.'],
  items: [
    { title: 'Tell us who you are', text: APP_OPEN ? 'Your name, city, programs and public links. About two minutes.' : CLOSED.firstStep },
    { title: 'Drishti checks every place', text: 'Your website, Google, social media, what people say and other places. Public pages only.' },
    { title: 'See what the internet says', text: 'Three words, what’s good, and what to fix first.' },
    { title: 'Get a summary and a report every month', text: 'With Paid, an email and a short PDF on the 1st: the three words, your rivals, what students want, and 3 things to do.' },
  ],
} as const;

export const REPORT = {
  title: ['A short report on the 1st.', 'Read it in five minutes.'],
  lede: 'With Paid, a summary by email and one short PDF on the 1st of every month: the three words and what changed, what the internet says place by place, what to fix first, your rivals in your city, what students want, and 3 things to do.',
  /** The hero's second button, down to the sample. */
  see: 'See the sample report',
  download: 'Download the sample report',
  note: SAMPLE_REPORT_NOTE,
} as const;

const reminders = PLAN_RULES.paid.reminderDaysBefore.map((days) => `${days} days`).join(' and ');

export interface PlanCard {
  key: 'free' | 'paid';
  name: string;
  price: string;
  term: string;
  line: string;
  points: readonly string[];
  cta: string;
  note: string | null;
}

export const PLANS: { title: readonly [string, string]; lede: string; cards: readonly PlanCard[]; fine: string } = {
  /** Two lines: the start, then the next step. */
  title: [APP_OPEN ? 'Start free.' : CLOSED.plansTitle, 'Go deeper with Paid.'],
  lede: 'Free shows what the internet says about you. Paid shows what’s changing, every month.',
  cards: [
    {
      key: 'free',
      name: 'Free',
      price: formatInr(PLAN_RULES.free.priceInr),
      term: 'For as long as you like',
      line: 'Here’s what the internet says.',
      points: [
        'Visibility, Trust and Chosen, place by place',
        'Your top 3 fixes and strengths, with proof',
        'One program',
        'Ahead or behind each rival, and the month’s one line',
        'The first of Make these 3, and one rising program',
        `A new Audit every ${SCHEDULES.free.auditEveryMonths} months, with an email when it’s ready`,
      ],
      cta: CTA.primary,
      note: APP_OPEN ? 'No payment details needed.' : CLOSED.freeNote,
    },
    {
      key: 'paid',
      name: 'Paid',
      price: PAID_PRICE.amount,
      term: `${PAID_PRICE.tax} ${PAID_PRICE.term}`,
      line: 'Here’s what’s changing every month.',
      points: [
        'Everything in Free',
        'Everything we found, with proof, and every fix ranked',
        'All programs, and your progress month by month',
        'Your rivals place by place, what to learn from them, and alerts',
        'All of Make these 3, and everything students ask',
        'A summary by email and a PDF report every month',
        'A new Audit every month, plus one extra refresh',
      ],
      cta: CTA.paid,
      note: CTA.paidNote,
    },
  ],
  fine: `Paid starts the day you pay and does not renew on its own. We remind you ${reminders} before it ends. One plan, one price.`,
};

export const CLIENTS = {
  /** Who it is for, under the title: no label above it. */
  forWhom: 'For AdmitLabs clients',
  /** Two lines: the fact, then the promise. */
  title: ['Included.', 'And we act on it.'],
  text: 'Drishti comes with every AdmitLabs service. Each month our team reads what the internet says about you, your rivals and what students ask, then gets to work on it with you.',
  leads: 'And Leads shows the enquiries your content brings, link by link.',
  line: 'We’ll fix it for you.',
  cta: 'Talk to AdmitLabs',
  email: 'hello@admitlabs.in',
} as const;

export const FAQ_TITLE = APP_OPEN ? 'Before you start.' : CLOSED.faqTitle;

export const FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Where does Drishti get its data?',
    answer:
      'Only from what a student or parent can see, in five places: your website, Google, social media, what people say on Reddit, Quora and forums, and other places such as news and listing sites. Demand listens to search trends, YouTube, Instagram, Reddit and Quora. Every result shows where it was found and when.',
  },
  {
    question: 'What does “public data only” mean?',
    answer:
      'Drishti never signs in to your accounts or anyone else’s, and never reads anything private. It checks only what anyone can see without signing in, through each platform’s official access, never tools that break a platform’s rules.',
  },
  {
    question: 'Who can see our results?',
    answer:
      'People from your institution: the owner, and anyone the owner invites. The AdmitLabs team can see them too, to help. Rivals never know you track them. Demand counts topics and questions; it never stores or shows individual students.',
  },
  {
    question: 'What is Leads?',
    answer:
      'For AdmitLabs clients: the enquiries your content brings, link by link. Each post, reel or bio gets its own link to a short enquiry form. What a student sends there goes to your college, and only your college’s people see it. It is the one place Drishti keeps student details, and only what students send you themselves.',
  },
  {
    question: 'Does Paid renew on its own?',
    answer: `No. Paid lasts ${PLAN_RULES.paid.lengthMonths} months from the day you pay. We remind you ${reminders} before it ends. Then you move to Free and keep your last Audit.`,
  },
  {
    question: 'How often does Drishti check?',
    answer: `Free brings a new Audit every ${SCHEDULES.free.auditEveryMonths} months. Paid brings one every month, plus one extra refresh a month. Demand updates every month for both.`,
  },
  {
    question: 'What if a word says Weak?',
    answer: 'Then you know exactly where to start. Every fix shows what was found, why it matters to a student and how hard it is to do. The ones that matter most come first.',
  },
  {
    question: 'Who is Drishti for?',
    answer: 'Private colleges, private universities and skilling institutes, and the people who run them: directors and founders, marketing heads and admission heads.',
  },
];

export const FINAL = {
  title: 'See where you stand this month.',
  text: APP_OPEN ? 'Your first Audit is free. Setting up takes about two minutes.' : CLOSED.finalText,
} as const;

export const FOOTER = {
  tagline: 'See what the internet says about you, who’s ahead in your city, and what students want. Every month.',
  site: { label: 'AdmitLabs', href: 'https://admitlabs.in' },
  note: 'Public data only.',
} as const;

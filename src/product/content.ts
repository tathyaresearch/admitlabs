// The product page's words (spec section 15), in AdmitLabs' voice: short, plain, confident. Every
// number comes from config, so the page always says what the product does: prices, plan length,
// reminders, schedules, the number of checks and rivals. Pure, and checked by tests (no dashes,
// curly quotes, numbers from config).

import { PLAN_RULES } from '../config/plans.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { SCHEDULES } from '../config/schedules.ts';
import { CHECKS, checksForPillar } from '../domain/checks.ts';
import { formatInr } from '../domain/format.ts';
import { PILLAR_LABELS, PILLARS, type Pillar } from '../domain/types.ts';
import { SAMPLE_REPORT_NOTE } from '../report/data.ts';

/** The one line of AdmitLabs proof, as the user worded it. No client names. */
export const PROOF_LINE = 'From AdmitLabs. 120+ education companies worked with.';

export const HERO = {
  /** The headline is the spec's; the last words sit in an inverted block. */
  title: 'See where you stand, who’s ahead, and what',
  highlight: 'students want.',
  lede: 'Drishti checks how your institution looks to students online, tracks your rivals, and listens to what students ask. Every month.',
  trust: 'Public data only. Every result shows its source and date.',
} as const;

export const CTA = {
  primary: 'Get your free Audit',
  paid: 'Start with a free Audit',
  paidNote: 'For now, the AdmitLabs team switches Paid on for you.',
  signIn: 'Sign in',
} as const;

export const PROBLEM = {
  title: 'Most institutions are guessing.',
  lede: 'What students see when they look you up. What your rivals changed this month. What students are asking right now. Most teams find out late, or never.',
  items: [
    { guess: 'How you look', answer: `Drishti checks ${CHECKS.length} things a student sees when they look you up, each with its source.` },
    { guess: 'What rivals do', answer: `Drishti tracks ${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals: their scores, their moves and their best content.` },
    { guess: 'What students want', answer: 'Drishti listens to what students in your city search, ask and worry about.' },
  ],
} as const;

/** The features section: a bento grid of what Drishti does. */
export const FEATURES_HEAD = {
  eyebrow: 'What Drishti does',
  title: 'Three questions. Answered every month.',
} as const;

export interface Feature {
  key: 'audit' | 'rivals' | 'demand';
  name: string;
  question: string;
  lede: string;
}

export const FEATURES: readonly Feature[] = [
  {
    key: 'audit',
    name: 'Audit',
    question: 'How do we look?',
    lede: `A score out of 100 from ${CHECKS.length} checks: how easily students find you, trust you and choose you. Then what to fix first, ranked by the points it could add.`,
  },
  {
    key: 'rivals',
    name: 'Rivals',
    question: 'Who’s ahead of us?',
    lede: `Pick ${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals. See where you lead, where they lead, and what changed.`,
  },
  {
    key: 'demand',
    name: 'Demand',
    question: 'What do students want?',
    lede: 'What students in your city search for, ask and worry about, every month.',
  },
];

/** The report tile in the features grid. The full sample sits further down the page. */
export const REPORT_TILE = {
  name: 'Report',
  title: 'A short report on the 1st.',
  lede: 'With Paid, one PDF every month: your score, your rivals, what students want, and 3 things to do.',
  link: 'See the sample report',
} as const;

/** The rules every result follows, as one tile. */
export const TRUST_TILE = {
  name: 'Public data only',
  title: 'Nothing private. Ever.',
  points: ['Every result shows what was found, where and when.', 'Learn from rivals, never copy. They never know you track them.', 'Demand is grouped. Never one student.'],
} as const;

const PILLAR_QUESTIONS: Readonly<Record<Pillar, string>> = {
  discovered: 'Can students find you?',
  trusted: 'Do they believe you?',
  chosen: 'Is it easy to pick you?',
};

export const SCORE = {
  title: 'One score. Three questions.',
  lede: 'Your score is out of 100: the average of three pillars, each asking what a student asks. Every check is Strong, Okay, Weak or Missing, and always shows what was found.',
  pillars: PILLARS.map((pillar) => ({
    pillar,
    name: PILLAR_LABELS[pillar],
    question: PILLAR_QUESTIONS[pillar],
    checks: checksForPillar(pillar).map((check) => (check.key === 'approvals' ? 'Approvals or skilling recognition' : check.name)),
  })),
};

export const STEPS = {
  title: 'Four steps. Then every month.',
  items: [
    { title: 'Tell us who you are', text: 'Your name, city, programs and public links. About two minutes.' },
    { title: 'Drishti checks everything', text: 'Google, your website, social media, reviews and AI answers. Public pages only.' },
    { title: 'See where you stand', text: 'Your score, what’s working, and what to fix first.' },
    { title: 'Get a report every month', text: 'With Paid, a short PDF on the 1st: your score, your rivals, what students want, and 3 things to do.' },
  ],
} as const;

export const REPORT = {
  title: 'Read it in five minutes.',
  lede: 'One short PDF on the 1st of every month: your score and what changed, what to fix, your rivals, what students want in your city, and 3 things to do.',
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
  title: ['Start free.', 'Go deeper with Paid.'],
  lede: 'Free shows where you stand. Paid shows what’s changing, every month.',
  cards: [
    {
      key: 'free',
      name: 'Free',
      price: formatInr(PLAN_RULES.free.priceInr),
      term: 'For as long as you like',
      line: 'Here’s where you stand.',
      points: [
        'Your score, and Discovered, Trusted and Chosen',
        'Your top 3 strengths and top 3 fixes',
        'One program',
        'Ahead or behind each rival',
        'One rising trend in your city',
        `A new Audit every ${SCHEDULES.free.auditEveryMonths} months`,
      ],
      cta: CTA.primary,
      note: 'No payment details needed.',
    },
    {
      key: 'paid',
      name: 'Paid',
      price: formatInr(PLAN_RULES.paid.priceInr),
      term: `for ${PLAN_RULES.paid.lengthMonths} months`,
      line: 'Here’s what’s changing every month.',
      points: [
        'Everything in Free',
        'Every check, with its source and date',
        'All programs, every fix ranked, and your score history',
        'The full rival comparison, their best content, moves and ads',
        'Everything students ask and worry about, and what they say about you',
        'Alerts when a rival moves or demand spikes',
        'A PDF report every month',
        'A new Audit every month, plus one extra refresh',
      ],
      cta: CTA.paid,
      note: CTA.paidNote,
    },
  ],
  fine: `Paid starts the day you pay and does not renew on its own. We remind you ${reminders} before it ends. One plan, one price.`,
};

export const CLIENTS = {
  eyebrow: 'For AdmitLabs clients',
  /** Two lines: the fact, then the promise. */
  title: ['Included.', 'And we act on it.'],
  text: 'Drishti comes with every AdmitLabs service. Each month our team reads your Audit, your rivals and what students ask, then gets to work on it with you.',
  line: 'We’ll fix it for you.',
  cta: 'Talk to AdmitLabs',
  email: 'hello@admitlabs.in',
} as const;

export const FAQ_TITLE = 'Before you start.';

export const FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Where does Drishti get its data?',
    answer:
      'Only from places a student or parent can see: Google search and your Google profile, your website, Instagram, YouTube, Facebook and LinkedIn, Google’s page speed test, and the answers AI assistants give. Demand listens to Google, YouTube, Instagram, Reddit, X and Quora. Every result shows where it was found and when.',
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
    question: 'Does Paid renew on its own?',
    answer: `No. Paid lasts ${PLAN_RULES.paid.lengthMonths} months from the day you pay. We remind you ${reminders} before it ends. Then you move to Free and keep your last Audit score.`,
  },
  {
    question: 'How often does our score update?',
    answer: `Free brings a new Audit every ${SCHEDULES.free.auditEveryMonths} months. Paid brings one every month, plus one extra refresh a month.`,
  },
  {
    question: 'What if our score is low?',
    answer: 'Then you know exactly where to start. Every fix shows what was found, why it matters to a student and how hard it is to do, ranked by the points it could add.',
  },
  {
    question: 'Who is Drishti for?',
    answer: 'Private colleges, private universities and skilling institutes, and the people who run them: directors and founders, marketing heads and admission heads.',
  },
];

export const FINAL = {
  title: 'See where you stand this month.',
  text: 'Your first Audit is free. Setting up takes about two minutes.',
} as const;

export const FOOTER = {
  tagline: 'See where you stand, who’s ahead, and what students want. Every month.',
  site: { label: 'AdmitLabs', href: 'https://admitlabs.in' },
  note: 'Public data only.',
} as const;

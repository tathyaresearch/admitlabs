// The AdmitLabs website's words (admitlabs.in), in one place, as approved on 2026-10-01 and kept
// through the Spotlight redesign of 2026-10-02 (no small labels above headings, but the one the user
// asked for above Drishti). Short, confident, plain. No dashes, curly quotes only
// (src/site/content.test.ts checks). What the website's pictures show lives in ./scenes.ts.

import { SITE_SETTINGS } from '../config/site.ts';
import { APP_OPEN } from '../lib/urls.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { PILLAR_LABELS, PILLARS, PLACES, type Pillar } from '../domain/types.ts';
import { READS } from '../product/content.ts';

export const CTA = {
  primary: 'Get your free Audit',
  secondary: 'Work with us',
  /** Where "Work with us" goes, on the website's address. */
  enquiryPath: '/work-with-us',
  signIn: 'Sign in',
  /** While Drishti is not open yet, every way into it says this and opens /signup (src/site/way-in.ts). */
  talk: 'Talk to us',
} as const;

/**
 * While Drishti is not open yet (production, until it opens: src/lib/urls.ts), the two lines on the
 * home page that would send people to get their free Audit themselves say to talk to us instead.
 */
export const CLOSED = {
  howToStart: 'Talk to us. Tell us about your institution, and we’ll get back to you.',
  finalLine: 'Your first Audit is free. Talk to us to get started.',
} as const;

/** The products, in the header's Products menu and in the phone menu. Tathya opens in a new tab. */
export const PRODUCTS = {
  label: 'Products',
  items: [
    // Drishti shows its eye, still, before the name.
    { name: 'Drishti', for: 'For institutions', href: '/drishti', newTab: false, eye: true },
    { name: 'Tathya', for: 'For students', href: SITE_SETTINGS.tathyaUrl, newTab: true, eye: false },
  ],
} as const;

/** The header's links, to sections of the home page (from any page of the website), with the
 *  Products menu after Services. */
export const NAV = [
  { href: '/#services', label: 'Services' },
  { menu: 'products', label: PRODUCTS.label },
  { href: '/#how', label: 'How we work' },
  { href: '/#faq', label: 'FAQ' },
] as const;

export const HERO = {
  /** "Get discovered, trusted, and chosen.", set in two lines: "Get discovered, trusted," and "and chosen." */
  title: { before: 'Get', words: { discovered: 'discovered', trusted: 'trusted', chosen: 'chosen' } satisfies Record<Pillar, string> },
  lede: 'AdmitLabs helps colleges, universities and skilling institutes grow admissions. We measure where you stand, then build the content that makes students choose you.',
  ledeEnd: 'Every month.',
  proof: '120+ education companies worked with.',
} as const;

const PILLAR_LINES: Readonly<Record<Pillar, string>> = {
  discovered: 'Students find you when they search.',
  trusted: 'They believe what they see.',
  chosen: 'Saying yes is easy.',
};

export const SYSTEM = {
  title: ['One system.', 'Run the same way every month.'],
  lede: { strong: 'Drishti measures where you stand. Our services fix it.', rest: 'Three things decide whether a student picks you, and we work on all three.' },
  checksLabel: 'Drishti checks',
  pillars: PILLARS.map((pillar) => ({
    pillar,
    name: PILLAR_LABELS[pillar],
    line: PILLAR_LINES[pillar],
    checks: READS.words.find((entry) => entry.pillar === pillar)?.checks ?? [],
  })),
  loop: {
    title: 'Measure. Fix. Repeat.',
    note: 'The same loop every month, so you always know what changed and what comes next.',
    steps: [
      { name: 'Measure', who: 'Drishti', line: 'Your Audit: what the internet says about you, and what holds you back.' },
      { name: 'Fix', who: 'Our team', line: 'We build the content and pages that close the biggest gaps first.' },
      { name: 'Repeat', who: 'Every month', line: 'A summary and a report: what changed, where you stand in your city, and what to fix next.' },
    ],
    /** On the way back round the loop. */
    back: 'Next month',
  },
} as const;

export type ServiceKey = 'program-growth' | 'institution-branding' | 'admit-campaign';

export const SERVICES = {
  title: 'Three ways we grow your admissions.',
  items: [
    { key: 'program-growth', name: 'Program Growth', line: 'A content page for one program, with its own identity. Built for the students you want next. You own it.' },
    { key: 'institution-branding', name: 'Institution Branding', line: 'Content for your official page that shows your outcomes, your people and your proof.' },
    { key: 'admit-campaign', name: 'Admit Campaign', line: 'A focused content push for admission season.' },
  ] satisfies ReadonlyArray<{ key: ServiceKey; name: string; line: string }>,
  /** Each tile's link, to the enquiry form with that service already named. */
  link: 'Work with us',
  note: 'We create content. We don’t run ads.',
} as const;

/** What the enquiry form's message starts with when someone comes from a service tile. */
export function aboutService(key: string | null | undefined): string | null {
  const service = SERVICES.items.find((item) => item.key === key);
  return service ? `We’d like to talk about ${service.name}.` : null;
}

export const DRISHTI = {
  /** The page's only small label above a heading, as the user asked. */
  eyebrow: 'Product',
  title: 'Drishti by AdmitLabs.',
  lede: 'See what the internet says about you, who’s ahead in your city, and what students want.',
  stats: [
    { value: PLACES.length, label: 'places checked' },
    { value: RIVAL_RULES.max, label: 'rivals in your city' },
    { value: 1, label: 'report every month' },
  ],
  free: 'Free to start.',
  explore: 'Explore Drishti',
  explorePath: '/drishti',
} as const;

export const AUDIENCE = {
  title: 'Who we work with',
  lines: ['Private colleges.', 'Private universities.', 'Skilling and training institutes.'],
  programs: 'Professional and career programs.',
} as const;

/** Our work: built, and hidden until the content samples are ready (SITE_SETTINGS.showWork). */
export const WORK = {
  title: 'Content that students choose.',
} as const;

export const HOW = {
  title: ['Start with an Audit.', 'Then we run it with you.'],
  steps: [
    { name: 'Audit', line: 'We see where you stand today, with Drishti.' },
    { name: 'Blueprint', line: 'We plan what to build first, and why.' },
    { name: 'Run', line: 'Our team creates the content, every month.' },
    { name: 'Report', line: 'You see what changed, and what comes next.' },
  ],
} as const;

export const TATHYA = {
  forWhom: 'For students',
  name: 'Tathya',
  line: 'Every government opportunity a student qualifies for, with real odds. Sirf data.',
  link: 'Explore Tathya',
} as const;

export const FAQ = {
  title: 'Questions, answered.',
  more: 'Something else? Write to',
  items: [
    { question: 'Do you run ads?', answer: 'No. We create content only. We don’t run, buy or manage ads.' },
    { question: 'Who do you work with?', answer: 'Private colleges, private universities, and skilling and training institutes, for professional and career programs.' },
    { question: 'Do we own the pages and content?', answer: 'Yes. The pages we build and everything on them are yours.' },
    {
      question: 'Is Drishti free?',
      answer:
        'Yes, to start. Your first Audit is free, and Free stays free. Paid adds everything Drishti finds, your rivals in your city place by place, three things to make each month, and a summary and a report every month.',
    },
    {
      question: 'How do we start?',
      answer: APP_OPEN ? 'Get your free Audit. It takes about two minutes. Or tell us about your institution, and we’ll get back to you.' : CLOSED.howToStart,
    },
  ],
} as const;

export const FINAL = {
  title: 'See where you stand this month.',
  line: APP_OPEN ? 'Your first Audit is free. It takes about two minutes.' : CLOSED.finalLine,
} as const;

export const FOOTER = {
  name: 'AdmitLabs',
  email: SITE_SETTINGS.email,
  drishti: 'Drishti',
} as const;

/** The "Work with us" page. */
export const ENQUIRY = {
  title: 'Tell us about your institution.',
  lede: 'A few details, and we’ll reply within one working day.',
  orWrite: 'Or write to us at',
  /** While Drishti is not open yet there is no form to send: an email instead. */
  emailUs: 'Email us',
  fields: {
    name: { label: 'Your name' },
    institution: { label: 'Institution' },
    role: { label: 'Your role', placeholder: 'Choose one' },
    email: { label: 'Email' },
    phone: { label: 'Phone' },
    program: { label: 'Program to grow', hint: 'Optional. For example, BBA.' },
    message: { label: 'Anything else?', hint: 'Optional.' },
  },
  send: 'Send',
  consent: 'We use these details only to reply to you.',
  thanks: 'Thanks. We’ll reply within one working day.',
  home: 'Back to the home page',
  limit: 'You’ve already sent us a few today. We’ll be in touch soon.',
  failed: `That didn’t send. Please try again, or write to ${SITE_SETTINGS.email}.`,
} as const;

// The AdmitLabs website's words (admitlabs.in), in one place, as approved on 2026-10-01. Short,
// confident, plain. No dashes, curly quotes only (src/site/content.test.ts checks).

import { PILLAR_LABELS, PILLARS, type Pillar } from '../domain/types.ts';
import { SCORE } from '../product/content.ts';

export const CTA = {
  primary: 'Get your free Audit',
  secondary: 'Work with us',
  /** Where "Work with us" goes, on the website's address. */
  enquiryPath: '/work-with-us',
  signIn: 'Sign in',
} as const;

/** The header's links, to sections of the home page. */
export const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#drishti', label: 'Drishti' },
  { href: '#how', label: 'How we work' },
  { href: '#faq', label: 'FAQ' },
] as const;

export const HERO = {
  /** "Get discovered, trusted, and chosen." The three pillar words light up as the card measures them. */
  title: { before: 'Get', words: { discovered: 'discovered', trusted: 'trusted', chosen: 'chosen' } satisfies Record<Pillar, string> },
  lede: 'AdmitLabs helps colleges, universities and skilling institutes grow admissions. We measure where you stand, then build the content that makes students choose you.',
  ledeEnd: 'Every month.',
  proof: 'Education only. 120+ education companies worked with.',
  card: 'Drishti Audit',
  sample: 'Sample institution. Fictional data.',
} as const;

const PILLAR_LINES: Readonly<Record<Pillar, string>> = {
  discovered: 'Students find you when they search.',
  trusted: 'They believe what they see.',
  chosen: 'Saying yes is easy.',
};

export const SYSTEM = {
  eyebrow: 'The system',
  title: ['One system.', 'Run the same way every month.'],
  lede: { strong: 'Drishti measures where you stand. Our services fix it.', rest: 'Three things decide whether a student picks you, and we work on all three.' },
  checksLabel: 'Drishti checks',
  pillars: PILLARS.map((pillar) => ({
    pillar,
    name: PILLAR_LABELS[pillar],
    line: PILLAR_LINES[pillar],
    checks: SCORE.pillars.find((entry) => entry.pillar === pillar)?.checks ?? [],
  })),
  loop: {
    title: 'Measure. Fix. Repeat.',
    note: 'The same loop every month, so you always know what changed and what comes next.',
    steps: [
      { name: 'Measure', who: 'Drishti', line: 'Your Audit: where you stand on all three, and what holds you back.' },
      { name: 'Fix', who: 'Our team', line: 'We build the content and pages that close the biggest gaps first.' },
      { name: 'Repeat', who: 'A report every month', line: 'What changed, where you rank, and the next things to fix.' },
    ],
    /** On the way back round the loop. */
    back: 'Next month',
  },
} as const;

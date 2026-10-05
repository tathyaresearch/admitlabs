// Free's Audit ready email (spec section 24), as the version 2 mock was approved: when a free
// Audit is ready (the first, then every 3 months), Visibility, Trust and Chosen, the top 3 fixes
// each with Let AdmitLabs fix this, the way to the Audit, and Subscribe now. Each button opens the
// dashboard, where the owner asks with one click. Pure.

import { wordScoreText, type ScoreLabel } from '../domain/scores.ts';
import { PAID_BUTTONS, PAID_PRICE } from '../domain/tiers.ts';
import { blocksHtml, blocksText, TURN_OFF_FOOTER, type BlockEmail } from '../email/blocks.ts';
import type { EmailMessage } from '../providers/email.ts';

export interface AuditReadyInput {
  institution: string;
  /** The program the free Audit covers. */
  program: string | null;
  city: string;
  /** Visibility, Trust and Chosen, each with how it moved or its question. */
  words: ReadonlyArray<{ name: string; score: number | null; word: string; note: string }>;
  /** The top 3 fixes: what to do, where it is with its impact and effort, and where it opens. */
  fixes: ReadonlyArray<{ title: string; meta: string; url: string }>;
  /** The first free Audit, or one every 3 months after it. */
  first: boolean;
  /** The AdmitLabs team looked it over before it went out (Review first). */
  reviewed: boolean;
  /** Where the Audit opens: the Audit for a first one, What changed on Home after. */
  auditUrl: string;
  /** Where the owner subscribes (the Plan page). */
  planUrl: string;
  /** "10 Dec 2026", or null when there is none on Free. */
  nextAuditOn: string | null;
}

/** "Visibility 75/100 (Strong)". */
const wordText = (word: AuditReadyInput['words'][number]) => (word.score === null ? `${word.name} ${word.word}` : wordScoreText(word.name, word.score, word.word as ScoreLabel));

export function auditReadySubject(input: Pick<AuditReadyInput, 'words' | 'first'>): string {
  return `Your ${input.first ? 'free' : 'new free'} Audit is ready: ${input.words.map(wordText).join(', ')}`;
}

export function auditReadyParts(input: AuditReadyInput): BlockEmail {
  const checked = `Drishti checked what students see about ${input.institution} on Google, your website, social media and more.`;
  return {
    preview: input.words.map(wordText).join(', '),
    blocks: [
      { kind: 'kicker', text: ['Free Audit', input.institution, input.program].filter(Boolean).join(' · ') },
      { kind: 'title', text: input.first ? 'Your free Audit is ready.' : 'Your new free Audit is ready.' },
      { kind: 'text', text: input.reviewed ? `${checked} The AdmitLabs team looked it over before it came to you.` : checked },
      { kind: 'words', words: input.words },
      ...(input.fixes.length
        ? ([
            { kind: 'heading', text: 'Fix these first' },
            { kind: 'list', items: input.fixes.map((fix) => ({ title: fix.title, meta: fix.meta, link: { label: 'Let AdmitLabs fix this', url: fix.url } })) },
          ] as const)
        : ([{ kind: 'text', text: 'Nothing needs fixing right now. Keep it that way.' }] as const)),
      { kind: 'buttons', buttons: [{ label: input.first ? 'See your Audit' : 'See what changed', url: input.auditUrl }] },
      {
        kind: 'box',
        heading: 'Want the full picture?',
        text: `Paid shows every check with its proof, all your programs, your rivals in full and what students in ${input.city} ask, with a summary every month. ${PAID_PRICE.text} ${PAID_PRICE.term}, no auto-renew.`,
        button: { label: PAID_BUTTONS.ask_paid, url: input.planUrl },
      },
      ...(input.nextAuditOn ? ([{ kind: 'small', text: `Your next free Audit comes on ${input.nextAuditOn}.` }] as const) : []),
    ],
    footer: TURN_OFF_FOOTER,
  };
}

export function auditReadyEmail(input: AuditReadyInput, to: readonly string[]): EmailMessage {
  const parts = auditReadyParts(input);
  return { kind: 'audit_ready', to, subject: auditReadySubject(input), text: blocksText(parts), html: blocksHtml(parts) };
}

// The monthly summary by email (spec section 24), as the version 2 mock was approved: the month
// and the institution, "Here's your month in short.", how you're doing (the three words as tiles),
// the 3 things to do, one rival move, a Client's enquiries, then Open Drishti and the month's PDF.
// The same summary as Reports and the PDF, with any line the team fixed. Pure.

import { formatMonth, formatMonthName } from '../domain/format.ts';
import { blocksHtml, blocksText, TURN_OFF_FOOTER, type BlockEmail, type EmailBlock } from '../email/blocks.ts';
import type { EmailMessage } from '../providers/email.ts';
import { summarySubject, thingLine, type MonthlySummary } from './summary.ts';

export interface SummaryEmailInput {
  summary: MonthlySummary;
  institution: string;
  /** Home, on the dashboard's address. */
  dashboardUrl: string;
  /** The month's PDF, on the dashboard's address. */
  pdfUrl: string;
}

export function summaryEmailParts(input: SummaryEmailInput): BlockEmail {
  const { summary } = input;
  const blocks: EmailBlock[] = [
    { kind: 'kicker', text: `${formatMonth(summary.month)} · ${input.institution}` },
    { kind: 'title', text: 'Here’s your month in short.' },
    { kind: 'heading', text: 'How you’re doing' },
    { kind: 'text', text: summary.lines.words },
    { kind: 'words', words: summary.words },
    { kind: 'heading', text: '3 things to do this month' },
    {
      kind: 'list',
      items: summary.lines.things.map((title, index) => {
        const thing = summary.things[index];
        return { title, meta: thing ? thingLine(thing) : null };
      }),
    },
    { kind: 'heading', text: 'One rival move' },
    { kind: 'text', text: summary.lines.move },
    ...(summary.lines.enquiries ? ([{ kind: 'heading', text: 'Your enquiries' }, { kind: 'text', text: summary.lines.enquiries }] as const) : []),
    {
      kind: 'buttons',
      buttons: [
        { label: 'Open Drishti', url: input.dashboardUrl },
        { label: `Download the ${formatMonthName(summary.month)} report (PDF)`, url: input.pdfUrl, quiet: true },
      ],
    },
  ];
  return { preview: summary.lines.words, blocks, footer: TURN_OFF_FOOTER };
}

export function summaryEmail(input: SummaryEmailInput, to: readonly string[]): EmailMessage {
  const parts = summaryEmailParts(input);
  return { kind: 'monthly_summary', to, subject: summarySubject(input.summary), text: blocksText(parts), html: blocksHtml(parts) };
}

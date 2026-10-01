// Small building blocks for the report pages, written with createElement (Node runs this file
// as plain TypeScript, without a JSX step). Results are always a 3-segment meter plus the word,
// never colour; Strong sits in an inverted block, as on the dashboard.

import { createElement as h, type ReactElement, type ReactNode } from 'react';
import { Text, View, type Styles } from '@react-pdf/renderer';
import type { ScoreLabel } from '../../domain/scores.ts';
import { RESULT_LABELS, type CheckResult } from '../../domain/types.ts';
import { COLORS, FONT_NUMERIC, FONT_SEMI_CONDENSED, NUM, styles } from './theme.ts';

export type Style = Styles[string];

/**
 * At most this many lines, ending in an ellipsis. Every sentence that can grow has a limit, so
 * each page has a known largest size; everyday text never reaches it.
 */
export const clamp = (lines: number) => ({ maxLines: lines, textOverflow: 'ellipsis' as const });

const FILLED: Readonly<Record<CheckResult, number>> = { strong: 3, okay: 2, weak: 1, missing: 0 };

/** The 3-segment meter plus the word. `dark` for use on black. */
export function Meter({ result, dark = false, size = 'md' }: { result: CheckResult; dark?: boolean; size?: 'sm' | 'md' }): ReactElement {
  const inverted = result === 'strong';
  // Strong flips the block: black on ivory pages, ivory on black.
  const ink = inverted ? (dark ? COLORS.black : COLORS.ivory) : dark ? COLORS.ivory : COLORS.black;
  const block = inverted ? (dark ? COLORS.ivory : COLORS.black) : undefined;
  const segment = size === 'sm' ? { width: 6.5, height: 3.8 } : { width: 8, height: 4.6 };
  const filled = FILLED[result];
  return h(
    View,
    {
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingVertical: 2.2,
        paddingHorizontal: inverted ? 4.5 : 0,
        borderRadius: 2,
        backgroundColor: block,
      },
    },
    h(
      View,
      { style: { flexDirection: 'row', gap: 1.8 } },
      [0, 1, 2].map((index) =>
        h(View, {
          key: index,
          style: {
            ...segment,
            borderRadius: 0.8,
            borderWidth: 0.7,
            borderColor: ink,
            borderStyle: result === 'missing' ? 'dashed' : 'solid',
            backgroundColor: index < filled ? ink : undefined,
            opacity: index < filled || result === 'missing' ? 1 : 0.55,
          },
        }),
      ),
    ),
    h(Text, { style: { fontSize: size === 'sm' ? 7.5 : 8.5, fontWeight: 500, color: ink, lineHeight: 1 } }, RESULT_LABELS[result]),
  );
}

/** Strong, Needs work or At risk. Strong is inverted. */
export function LabelChip({ label, dark = false }: { label: ScoreLabel; dark?: boolean }): ReactElement {
  const inverted = label === 'Strong';
  const ink = dark ? COLORS.ivory : COLORS.black;
  const paper = dark ? COLORS.black : COLORS.ivory;
  return h(
    View,
    {
      style: {
        alignSelf: 'flex-start',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 2,
        borderWidth: 0.75,
        borderColor: inverted ? ink : dark ? COLORS.slate : COLORS.lineMedium,
        backgroundColor: inverted ? ink : undefined,
      },
    },
    h(Text, { style: { fontSize: 8, fontWeight: 500, lineHeight: 1, color: inverted ? paper : ink } }, label),
  );
}

/** The page head: eyebrow, title and one line on what the page shows. */
export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string | null }): ReactElement {
  return h(
    View,
    { style: styles.head },
    h(Text, { style: styles.eyebrow }, eyebrow),
    h(Text, { style: styles.title }, title),
    lead ? h(Text, { style: styles.lead }, lead) : null,
  );
}

export function SectionTitle({ title, lead }: { title: string; lead?: string | null }): ReactElement {
  return h(View, { style: { marginBottom: 6 } }, h(Text, { style: styles.sectionTitle }, title), lead ? h(Text, { style: styles.sectionLead }, lead) : null);
}

/** A big number in Inter, as the dashboard shows scores. */
export function BigNumber({ value, size, color }: { value: string | number; size: number; color?: string }): ReactElement {
  return h(Text, { style: { ...NUM, fontFamily: FONT_NUMERIC, fontWeight: 600, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.04, color } }, String(value));
}

/** "Up 47%" as a value: "↑ 47%". Null for anything that is not a change. */
export function arrowValue(text: string): string | null {
  const change = /^(Up|Down) ([\d,]+%?)$/.exec(text);
  return change ? `${change[1] === 'Up' ? '↑' : '↓'} ${change[2]}` : null;
}

/**
 * The report data's value words, shown as values with the number in Inter, as on the dashboard:
 * a change ("Up 3", "Down 2 since August") reads "↑ 3", "↓ 2 since August"; points ("Up to 4
 * points", "Worth 10 points of your score") read "+4 points", "10 points". Anything else, like
 * "No change" or a sentence, stays as it is.
 */
export function ValueText({ text, style }: { text: string; style?: Style }): ReactElement {
  const change = /^(Up|Down) ([\d,]+%?)(.*)$/.exec(text);
  if (change) return h(Text, { style }, h(Text, { style: NUM }, `${change[1] === 'Up' ? '↑' : '↓'} ${change[2]}`), change[3]);
  const gain = /^(?:Could add up to|Up to) ([\d,]+) (points?)$/.exec(text);
  if (gain) return h(Text, { style }, h(Text, { style: NUM }, `+${gain[1]}`), ` ${gain[2]}`);
  const worth = /^Worth ([\d,]+) (points?)(?: of your score)?$/.exec(text);
  if (worth) return h(Text, { style }, h(Text, { style: NUM }, worth[1]), ` ${worth[2]}`);
  if (/^(?:Could add less than|Less than|Worth less than) 1 point/.test(text)) return h(Text, { style }, 'Under ', h(Text, { style: NUM }, '1'), ' point');
  return h(Text, { style }, text);
}

/** A thin score bar: black fill on a light track. */
export function ScoreBar({ score, dark = false, height = 3 }: { score: number; dark?: boolean; height?: number }): ReactElement {
  const width = `${Math.max(0, Math.min(100, score))}%`;
  return h(
    View,
    { style: { height, borderRadius: height / 2, backgroundColor: dark ? COLORS.lineDark : COLORS.track, overflow: 'hidden' } },
    h(View, { style: { width, height, borderRadius: height / 2, backgroundColor: dark ? COLORS.ivory : COLORS.black } }),
  );
}

/** The footer on every page after the cover. */
export function Footer({ institution, month, note = null }: { institution: string; month: string; note?: string | null }): ReactElement {
  return h(Text, {
    style: styles.footer,
    fixed: true,
    render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      ['Drishti by AdmitLabs', institution, month, ...(note ? [note] : []), `Page ${pageNumber} of ${totalPages}`].join('  ·  '),
  });
}

/** "Drishti by AdmitLabs", as the product lockup: Drishti heavy and narrow, Admit heavy, Labs regular. */
export function Lockup({ size = 16, dark = true }: { size?: number; dark?: boolean }): ReactElement {
  const ink = dark ? COLORS.ivory : COLORS.black;
  const quiet = dark ? COLORS.slate : COLORS.muted;
  return h(
    Text,
    { style: { color: ink, lineHeight: 1 } },
    h(Text, { style: { fontFamily: FONT_SEMI_CONDENSED, fontWeight: 700, fontSize: size, letterSpacing: -size * 0.02 } }, 'Drishti'),
    h(Text, { style: { fontSize: size * 0.62, color: quiet } }, '  by '),
    h(Text, { style: { fontSize: size * 0.62, fontWeight: 800 } }, 'Admit'),
    h(Text, { style: { fontSize: size * 0.62, fontWeight: 400 } }, 'Labs'),
  );
}

/** A row that never splits across pages. */
export function Keep({ style, children }: { style?: Style | Style[]; children?: ReactNode }): ReactElement {
  return h(View, { wrap: false, style }, children);
}

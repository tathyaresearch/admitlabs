// Small building blocks for the report pages, written with createElement (Node runs this file
// as plain TypeScript, without a JSX step). Results are always the small half-circle gauge plus
// the word, never colour, in one style for every result, as on the dashboard. The gauges, icons
// and logos are drawn from the same geometry as the dashboard's (src/graphics).

import { createElement as h, type ReactElement, type ReactNode } from 'react';
import { Line, Path, Svg, Text, View, type Styles } from '@react-pdf/renderer';
import { bandStarts, type ScoreLabel } from '../../domain/scores.ts';
import { RESULT_LABELS, type CheckKey, type CheckResult, type Pillar } from '../../domain/types.ts';
import { BRAND_INK, BRAND_MARKS, YOUTUBE_PLAY } from '../../graphics/brands.ts';
import { RESULT_GAUGE, resultGauge, SCORE_GAUGE, scoreGauge } from '../../graphics/gauge.ts';
import { CHECK_ICONS, LINE_ICONS, PILLAR_ICONS, type IconRef } from '../../graphics/icons.ts';
import { PLATFORM_ICONS, type Platform } from '../../graphics/platforms.ts';
import { COLORS, FONT_NUMERIC, FONT_SEMI_CONDENSED, NUM, styles } from './theme.ts';

export type Style = Styles[string];

/**
 * At most this many lines, ending in an ellipsis. Every sentence that can grow has a limit, so
 * each page has a known largest size; everyday text never reaches it.
 */
export const clamp = (lines: number) => ({ maxLines: lines, textOverflow: 'ellipsis' as const });

/**
 * The small result gauge plus the word: three arc segments, Strong fills three, Okay two, Weak
 * one, and Missing is an empty dashed arc. `dark` for use on black.
 */
export function ResultGauge({ result, dark = false, size = 'md' }: { result: CheckResult; dark?: boolean; size?: 'sm' | 'md' }): ReactElement {
  const ink = dark ? COLORS.ivory : COLORS.black;
  const stroke = { on: ink, off: dark ? COLORS.lineDark : COLORS.lineMedium, missing: dark ? COLORS.slate : COLORS.muted };
  const width = size === 'sm' ? 14 : 16.5;
  const height = (width * RESULT_GAUGE.height) / RESULT_GAUGE.width;
  return h(
    View,
    { style: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingVertical: 1.5 } },
    h(
      Svg,
      { width, height, viewBox: `0 0 ${RESULT_GAUGE.width} ${RESULT_GAUGE.height}` },
      ...resultGauge(result).map((segment, index) =>
        h(Path, {
          key: index,
          d: segment.d,
          fill: 'none',
          stroke: stroke[segment.state],
          strokeWidth: RESULT_GAUGE.stroke,
          ...(segment.state === 'missing' ? { strokeDasharray: '3 2' } : {}),
        }),
      ),
    ),
    h(Text, { style: { fontSize: size === 'sm' ? 7.5 : 8.5, fontWeight: 500, color: ink, lineHeight: 1 } }, RESULT_LABELS[result]),
  );
}

/**
 * The overall score as the large half-circle gauge: filled to the score, with a notch where each
 * score band starts, and the number inside it in Inter, as on the dashboard.
 */
export function ScoreGauge({ score, width = 168, dark = false }: { score: number; width?: number; dark?: boolean }): ReactElement {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const shape = scoreGauge(value, bandStarts());
  const scale = width / SCORE_GAUGE.width;
  const height = SCORE_GAUGE.height * scale;
  const ink = dark ? COLORS.ivory : COLORS.black;
  const muted = dark ? COLORS.slate : COLORS.muted;
  const size = width * 0.27;
  const end = (at: readonly [number, number], label: string) =>
    h(Text, { style: { ...NUM, position: 'absolute', left: at[0] * scale - 12, top: at[1] * scale - 5, width: 24, textAlign: 'center', fontSize: 6.5, color: muted } }, label);
  return h(
    View,
    { style: { width, height: height + 8, position: 'relative' } },
    h(
      Svg,
      { width, height, viewBox: `0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}` },
      h(Path, { d: shape.track, fill: 'none', stroke: dark ? COLORS.lineDark : COLORS.track, strokeWidth: SCORE_GAUGE.stroke }),
      shape.value ? h(Path, { d: shape.value, fill: 'none', stroke: ink, strokeWidth: SCORE_GAUGE.stroke }) : null,
      ...shape.notches.map((notch, index) => h(Line, { key: index, ...notch, stroke: muted, strokeWidth: 1.5 })),
    ),
    h(
      View,
      { style: { position: 'absolute', left: 0, right: 0, top: height - size * 0.98, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' } },
      h(BigNumber, { value, size, color: ink }),
      h(Text, { style: { ...NUM, fontSize: size * 0.24, color: muted, marginLeft: 2, marginBottom: size * 0.06 } }, '/100'),
    ),
    end(shape.ends.zero, '0'),
    end(shape.ends.hundred, '100'),
  );
}

/**
 * A line icon of Drishti's own, or a brand's one-colour logo. The pages are ivory, so X is black
 * and YouTube its almost black with a white play button, as their guidelines ask.
 */
export function Mark({ icon, size = 10, color = COLORS.black }: { icon: IconRef; size?: number; color?: string }): ReactElement {
  if (icon.kind === 'brand') {
    const mark = BRAND_MARKS[icon.brand];
    return h(
      Svg,
      { width: size, height: size, viewBox: mark.viewBox },
      icon.brand === 'youtube' ? h(Path, { d: YOUTUBE_PLAY, fill: '#FFFFFF' }) : null,
      h(Path, { d: mark.path, fill: BRAND_INK[icon.brand].light ?? color }),
    );
  }
  return h(
    Svg,
    { width: size, height: size, viewBox: '0 0 24 24' },
    h(Path, { d: LINE_ICONS[icon.name], fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinecap: 'square', strokeLinejoin: 'miter' }),
  );
}

export function CheckIcon({ check, size = 10 }: { check: CheckKey; size?: number }): ReactElement {
  return h(Mark, { icon: CHECK_ICONS[check], size });
}

export function PillarIcon({ pillar, size = 10, color }: { pillar: Pillar; size?: number; color?: string }): ReactElement {
  return h(Mark, { icon: { kind: 'line', name: PILLAR_ICONS[pillar] }, size, color });
}

/** Where a source points: its platform's mark, or the website icon. */
export function PlatformIcon({ platform, size = 8, color = COLORS.muted }: { platform: Platform | null; size?: number; color?: string }): ReactElement {
  return h(Mark, { icon: PLATFORM_ICONS[platform ?? 'website'], size, color });
}

/** A thin bar for an amount next to the biggest in its list, at a set width. */
export function AmountBar({ value, max, width, height = 3 }: { value: number; max: number; width: number; height?: number }): ReactElement {
  const share = Math.max(0.03, Math.min(1, value / Math.max(max, 0.0001)));
  return h(
    View,
    { style: { width, height, borderRadius: height / 2, backgroundColor: COLORS.track } },
    h(View, { style: { width: width * share, height, borderRadius: height / 2, backgroundColor: COLORS.black } }),
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

// Small building blocks for the report pages, written with createElement (Node runs this file
// as plain TypeScript, without a JSX step). A result is always a thin bar of the points it earns
// plus the word, never colour, in one style for every result, as on the dashboard. The score
// gauge, icons and logos are drawn from the same geometry as the dashboard's (src/graphics).

import { createElement as h, type ReactElement, type ReactNode } from 'react';
import { Circle, Line, Path, Svg, Text, View, type Styles } from '@react-pdf/renderer';
import { bandStarts, resultShare, type ScoreLabel } from '../../domain/scores.ts';
import { RESULT_LABELS, type CheckKey, type CheckResult, type Pillar } from '../../domain/types.ts';
import { BRAND_INK, BRAND_MARKS, YOUTUBE_PLAY } from '../../graphics/brands.ts';
import { EYE_EM, EYE_IRIS, EYE_LASHES, EYE_LIDS, eyeBox } from '../../graphics/eye.ts';
import { SCORE_GAUGE, SCORE_TEXT, scoreGauge } from '../../graphics/gauge.ts';
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
 * A check's result: a thin bar of the points it earns against the points it could (what the result
 * earns, from the scoring config, when no points are given), then the word. Missing is an empty
 * dashed bar. `dark` for use on black.
 */
export function ResultBar({
  result,
  points,
  max,
  dark = false,
  size = 'md',
}: {
  result: CheckResult;
  points?: number;
  max?: number;
  dark?: boolean;
  size?: 'sm' | 'md';
}): ReactElement {
  const ink = dark ? COLORS.ivory : COLORS.black;
  const width = size === 'sm' ? 15 : 20;
  const height = 2.5;
  const share = max ? Math.max(0, Math.min(1, (points ?? 0) / max)) : resultShare(result);
  const bar =
    result === 'missing'
      ? h(View, { style: { width, height: 4, borderWidth: 0.6, borderStyle: 'dashed', borderColor: dark ? COLORS.slate : COLORS.muted, borderRadius: 2 } })
      : h(
          View,
          { style: { width, height, borderRadius: height / 2, backgroundColor: dark ? COLORS.lineDark : COLORS.track } },
          share > 0 ? h(View, { style: { width: width * share, height, borderRadius: height / 2, backgroundColor: ink } }) : null,
        );
  return h(
    View,
    { style: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingVertical: 1.5 } },
    bar,
    h(Text, { style: { fontSize: size === 'sm' ? 7.5 : 8.5, fontWeight: 500, color: ink, lineHeight: 1 } }, RESULT_LABELS[result]),
  );
}

/**
 * The overall score as the large half-circle gauge: filled to the score, with a notch where each
 * score band starts, and the number drawn with it, as on the dashboard: centred in the bowl on the
 * arc's baseline, "/100" after it on the same line, "0" and "100" under the two ends.
 */
export function ScoreGauge({ score, width = 168, dark = false }: { score: number; width?: number; dark?: boolean }): ReactElement {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const shape = scoreGauge(value, bandStarts());
  const height = (SCORE_GAUGE.height * width) / SCORE_GAUGE.width;
  const ink = dark ? COLORS.ivory : COLORS.black;
  const muted = dark ? COLORS.slate : COLORS.muted;
  const numeric = { fontFamily: FONT_NUMERIC, fontFeatureSettings: ['tnum'] };
  const end = (at: readonly [number, number], label: string) =>
    h(Text, { x: at[0], y: at[1], textAnchor: 'middle', style: { ...numeric, fontSize: SCORE_TEXT.end, fontWeight: 400 }, fill: muted }, label);
  return h(
    Svg,
    { width, height, viewBox: `0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}` },
    h(Path, { d: shape.track, fill: 'none', stroke: dark ? COLORS.lineDark : COLORS.track, strokeWidth: SCORE_GAUGE.stroke }),
    shape.value ? h(Path, { d: shape.value, fill: 'none', stroke: ink, strokeWidth: SCORE_GAUGE.stroke }) : null,
    ...shape.notches.map((notch, index) => h(Line, { key: index, ...notch, stroke: muted, strokeWidth: 1.5 })),
    h(Text, { x: shape.number.x, y: shape.number.y, textAnchor: 'middle', style: { ...numeric, fontSize: shape.number.size, fontWeight: 600 }, fill: ink }, String(value)),
    h(Text, { x: shape.number.ofX, y: shape.number.y, style: { ...numeric, fontSize: SCORE_TEXT.of, fontWeight: 500 }, fill: muted }, '/100'),
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

/** The Drishti eye, still and open, in one colour: 1.12 times the word's size wide, as on screen. */
function EyeDrawing({ size, color, lashes }: { size: number; color: string; lashes: boolean }): ReactElement {
  const box = eyeBox(lashes);
  const width = size * EYE_EM.width;
  return h(
    Svg,
    { width, height: (width * box.height) / box.width, viewBox: `${box.x} ${box.y} ${box.width} ${box.height}` },
    ...(lashes ? EYE_LASHES.map((lash) => h(Path, { d: lash.d, fill: color })) : []),
    h(Path, { d: EYE_LIDS, fill: color, fillRule: 'evenodd' }),
    h(Circle, { cx: EYE_IRIS.cx, cy: EYE_IRIS.cy, r: EYE_IRIS.r, fill: color }),
  );
}

/**
 * "Drishti by AdmitLabs", as the product lockup: the Drishti eye (still, with its lashes at this
 * size), then Drishti heavy and narrow, Admit heavy, Labs regular. The eye's foot sits on the
 * word's baseline, a touch below it, as on screen.
 */
export function Lockup({ size = 16, dark = true }: { size?: number; dark?: boolean }): ReactElement {
  const ink = dark ? COLORS.ivory : COLORS.black;
  const quiet = dark ? COLORS.slate : COLORS.muted;
  return h(
    View,
    { style: { flexDirection: 'row', alignItems: 'baseline' } },
    h(View, { style: { marginRight: size * EYE_EM.gap, marginBottom: -size * EYE_EM.drop } }, h(EyeDrawing, { size, color: ink, lashes: true })),
    h(
      Text,
      { style: { color: ink, lineHeight: 1 } },
      h(Text, { style: { fontFamily: FONT_SEMI_CONDENSED, fontWeight: 700, fontSize: size, letterSpacing: -size * 0.02 } }, 'Drishti'),
      h(Text, { style: { fontSize: size * 0.62, color: quiet } }, '  by '),
      h(Text, { style: { fontSize: size * 0.62, fontWeight: 800 } }, 'Admit'),
      h(Text, { style: { fontSize: size * 0.62, fontWeight: 400 } }, 'Labs'),
    ),
  );
}

/** A row that never splits across pages. */
export function Keep({ style, children }: { style?: Style | Style[]; children?: ReactNode }): ReactElement {
  return h(View, { wrap: false, style }, children);
}

// The report's pages, in the spec's order (section 12): the cover, the score summary with what's
// working, what to fix, by program, rivals, demand, then the 3 things to do with the sources and
// dates checked. Ivory pages, a black cover, whole numbers, no dashes. As on the dashboard: the
// overall score on its gauge, each result on the small gauge, each check and pillar with its icon,
// and bars for what each fix could add, how fast a trend rises and how often a question is asked.

import { createElement as h, type ReactElement } from 'react';
import { Circle, Line, Link, Page, Polyline, Svg, Text, View } from '@react-pdf/renderer';
import { ADDED_BY_YOU } from '../../domain/details.ts';
import { ordinal } from '../../domain/format.ts';
import { bandStarts, nextBandText } from '../../domain/scores.ts';
import { PILLAR_LABELS, PILLARS } from '../../domain/types.ts';
import { dotLanes } from '../../graphics/dots.ts';
import { pillarSpread, type Scored } from '../../rivals/trend.ts';
import { THING_SOURCE_LABELS, type Thing } from '../things.ts';
import type { ReportData, ReportFix, ReportFixRow } from '../data.ts';
import {
  AmountBar,
  arrowValue,
  BigNumber,
  CheckIcon,
  clamp,
  Footer,
  Keep,
  LabelChip,
  Lockup,
  PageHead,
  PillarIcon,
  PlatformIcon,
  ResultGauge,
  ScoreBar,
  ScoreGauge,
  SectionTitle,
  ValueText,
} from './parts.ts';
import { COLORS, NUM, PAGE, styles } from './theme.ts';

const CONTENT_WIDTH = PAGE.width - PAGE.side * 2;
const GRID_GAP = 10;
const HALF = (CONTENT_WIDTH - GRID_GAP) / 2;
const THIRD = (CONTENT_WIDTH - GRID_GAP * 2) / 3;

/**
 * Compact is the second try, used only when a report would run past the page cap: 3 fixes in
 * detail instead of 5 (the rest stay in the ranked list) and shorter limits on long sentences.
 */
export interface PageProps {
  data: ReportData;
  compact?: boolean;
}

/** An ivory page with the footer. */
export function ContentPage({ data, children }: { data: Pick<ReportData, 'institution' | 'monthLabel'> & { sample?: string | null }; children: ReactElement[] }): ReactElement {
  return h(Page, { size: 'A4', style: styles.page }, ...children, h(Footer, { institution: data.institution.name, month: data.monthLabel, note: data.sample ?? null }));
}

// 1. Cover ------------------------------------------------------------------------------------

export function CoverPage({ data }: PageProps): ReactElement {
  const quiet = { fontSize: 8, color: COLORS.slate };
  return h(
    Page,
    { size: 'A4', style: styles.cover },
    h(
      View,
      { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
      h(Lockup, { size: 17 }),
      h(Text, { style: { fontSize: 7.5, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.slate } }, data.sample ? 'Sample report' : 'Monthly report'),
    ),
    h(
      View,
      { style: { marginTop: 132 } },
      h(Text, { style: { fontSize: 11, fontWeight: 500, color: COLORS.slate, marginBottom: 12 } }, data.monthLabel),
      h(Text, { style: { fontSize: 36, fontWeight: 600, letterSpacing: -1, lineHeight: 1.08, ...clamp(3) } }, data.institution.name),
      h(Text, { style: { fontSize: 10, color: COLORS.slate, marginTop: 10 } }, `${data.institution.place}  ·  ${data.institution.website}`),
      // The sample report says so before anything else, in an inverted block.
      data.sample
        ? h(
            View,
            { style: { flexDirection: 'row', marginTop: 22 } },
            h(Text, { style: { backgroundColor: COLORS.ivory, color: COLORS.black, fontSize: 10, fontWeight: 600, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 3 } }, data.sample),
          )
        : null,
    ),
    h(View, { style: { flexGrow: 1 } }),
    h(
      View,
      { style: { borderTopWidth: 1, borderTopColor: COLORS.lineDark, paddingTop: 22 } },
      h(Text, { style: { fontSize: 7.5, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.slate } }, 'Overall score'),
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 } },
        h(BigNumber, { value: data.cover.score, size: 148, color: COLORS.ivory }),
        h(Text, { style: { ...NUM, fontSize: 15, color: COLORS.slate, marginLeft: 10, marginBottom: 14 } }, '/ 100'),
      ),
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 } },
        h(LabelChip, { label: data.cover.label, dark: true }),
        data.cover.change ? h(ValueText, { text: data.cover.change, style: { fontSize: 10, fontWeight: 500 } }) : null,
      ),
      h(Text, { style: { fontSize: 15, fontWeight: 500, lineHeight: 1.35, letterSpacing: -0.2, marginTop: 18, maxWidth: 400, ...clamp(3) } }, data.cover.verdict),
    ),
    h(
      View,
      { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineDark } },
      h(Text, { style: quiet }, `${data.cover.checkedOn}  ·  Made ${data.madeOn}`),
      h(Text, { style: quiet }, `${data.tierLabel} plan  ·  Public data only`),
    ),
  );
}

// 2. Score summary and what's working -----------------------------------------------------------

/** Six months of the overall score as a quiet line, with each month's score. */
function HistoryChart({ points }: { points: ReportData['summary']['history'] }): ReactElement {
  const width = 280;
  const height = 92;
  const top = 16;
  const bottom = 18;
  if (points.length < 2) {
    return h(Text, { style: { ...styles.caption, marginTop: 30 } }, 'Your score history builds from here, one point a month.');
  }
  const scores = points.map((point) => point.score);
  const low = Math.max(0, Math.floor((Math.min(...scores) - 8) / 10) * 10);
  const high = Math.min(100, Math.ceil((Math.max(...scores) + 8) / 10) * 10);
  const x = (index: number) => 12 + index * ((width - 24) / (points.length - 1));
  const y = (score: number) => top + (1 - (score - low) / Math.max(1, high - low)) * (height - top - bottom);
  const line = points.map((point, index) => `${x(index)},${y(point.score)}`).join(' ');
  return h(
    View,
    { style: { width, height, position: 'relative' } },
    h(
      Svg,
      { width, height },
      h(Line, { x1: 0, y1: height - bottom, x2: width, y2: height - bottom, stroke: COLORS.lineMedium, strokeWidth: 0.75 }),
      h(Polyline, { points: line, fill: 'none', stroke: COLORS.black, strokeWidth: 1.4 }),
      ...points.map((point, index) =>
        h(Circle, {
          key: point.month,
          cx: x(index),
          cy: y(point.score),
          r: index === points.length - 1 ? 3.2 : 2.3,
          fill: index === points.length - 1 ? COLORS.black : COLORS.ivory,
          stroke: COLORS.black,
          strokeWidth: 1.1,
        }),
      ),
    ),
    ...points.flatMap((point, index) => [
      h(
        Text,
        {
          key: `score-${point.month}`,
          style: { ...NUM, position: 'absolute', left: x(index) - 14, width: 28, top: y(point.score) - 13, textAlign: 'center', fontSize: 7.5, fontWeight: index === points.length - 1 ? 600 : 400 },
        },
        String(point.score),
      ),
      h(
        Text,
        { key: `month-${point.month}`, style: { position: 'absolute', left: x(index) - 14, width: 28, top: height - bottom + 5, textAlign: 'center', fontSize: 7, color: COLORS.muted } },
        point.label,
      ),
    ]),
  );
}

export function SummaryPage({ data }: PageProps): ReactElement {
  const summary = data.summary;
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, {
        key: 'head',
        eyebrow: 'Score summary',
        title: `Your score in ${data.monthLabel.split(' ')[0]}`,
        lead: 'Overall, and the three pillars: how easily students find you, trust you and choose you.',
      }),
      h(
        View,
        { key: 'overall', style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } },
        h(
          View,
          null,
          h(Text, { style: styles.caption }, 'Overall score'),
          h(View, { style: { marginTop: 8 } }, h(ScoreGauge, { score: summary.overall, width: 168 })),
          h(
            View,
            { style: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 } },
            h(LabelChip, { label: summary.label }),
            summary.change ? h(ValueText, { text: summary.change, style: { fontSize: 8.5, fontWeight: 500 } }) : null,
          ),
          h(Text, { style: { ...styles.caption, marginTop: 6 } }, nextBandText(summary.overall)),
        ),
        h(View, null, h(Text, { style: { ...styles.caption, marginBottom: 4 } }, 'Overall score, month by month'), h(HistoryChart, { points: summary.history })),
      ),
      h(
        View,
        { key: 'pillars', style: { flexDirection: 'row', gap: GRID_GAP, marginTop: 20 } },
        ...summary.pillars.map((pillar) =>
          h(
            View,
            { key: pillar.pillar, style: { width: THIRD, padding: 12, backgroundColor: COLORS.panel, borderRadius: 4 } },
            h(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 5 } }, h(PillarIcon, { pillar: pillar.pillar, size: 10 }), h(Text, { style: { fontSize: 9, fontWeight: 600 } }, pillar.name)),
            h(View, { style: { marginTop: 8, marginBottom: 8 } }, h(BigNumber, { value: pillar.score, size: 26 })),
            h(ScoreBar, { score: pillar.score }),
            h(
              View,
              { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 } },
              h(Text, { style: styles.caption }, pillar.label),
              pillar.change ? h(ValueText, { text: pillar.change, style: { ...styles.caption, color: COLORS.black } }) : null,
            ),
          ),
        ),
      ),
      ...(summary.note ? [h(Text, { key: 'note', style: { ...styles.caption, marginTop: 8 } }, summary.note)] : []),
      h(
        View,
        { key: 'working', style: styles.section },
        h(SectionTitle, { title: 'What’s working', lead: 'The three things doing the most for your score. Keep them up.' }),
        ...data.working.map((item, index) =>
          h(
            Keep,
            { key: item.rank, style: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
            h(Text, { style: { ...NUM, width: 22, fontSize: 10, fontWeight: 600 } }, String(index + 1)),
            h(
              View,
              { style: { flex: 1, paddingRight: 12 } },
              h(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } }, h(CheckIcon, { check: item.key, size: 10.5 }), h(Text, { style: { fontSize: 10.5, fontWeight: 600 } }, item.name)),
              item.programs ? h(Text, { style: { ...styles.caption, ...clamp(1) } }, item.programs) : null,
              item.finding ? h(Text, { style: { ...styles.small, color: COLORS.muted, marginTop: 3, ...clamp(2) } }, item.finding) : null,
            ),
            h(View, { style: { width: 128, alignItems: 'flex-end', gap: 5 } }, h(ResultGauge, { result: item.result }), h(ValueText, { text: item.worth, style: { ...styles.caption, textAlign: 'right' } })),
          ),
        ),
        ...(data.working.length === 0 ? [h(Text, { key: 'none', style: styles.small }, 'Your first strengths show here once a check reaches Okay.')] : []),
      ),
    ],
  });
}

// 3. What to fix ----------------------------------------------------------------------------------

/** The most any fix on the page could add, so each bar is measured against the biggest. */
export function biggestGain(fixes: ReadonlyArray<{ points: number }>): number {
  return Math.max(0, ...fixes.map((fix) => fix.points));
}

export function FixBlock({ fix, first, compact, maxPoints }: { fix: ReportFix; first: boolean; compact: boolean; maxPoints: number }): ReactElement {
  const single = fix.results.length === 1 && fix.results[0]?.program === null ? fix.results[0] : null;
  return h(
    Keep,
    { style: { flexDirection: 'row', paddingTop: first ? 2 : 10, paddingBottom: 10, borderTopWidth: first ? 0 : 0.75, borderTopColor: COLORS.line } },
    h(View, { style: { width: 34 } }, h(BigNumber, { value: fix.rank, size: 24 })),
    h(
      View,
      { style: { flex: 1 } },
      h(
        View,
        { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } },
        h(
          View,
          { style: { flex: 1, paddingRight: 12 } },
          h(
            View,
            { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
            h(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } }, h(CheckIcon, { check: fix.key, size: 11 }), h(Text, { style: { fontSize: 11.5, fontWeight: 600, letterSpacing: -0.1 } }, fix.name)),
            // An institution check has one result, shown beside its name.
            single ? h(ResultGauge, { result: single.result, size: 'sm' }) : null,
          ),
          // Program results name their programs; with too many to list, say how many.
          fix.resultsNote ? h(Text, { style: styles.caption }, fix.resultsNote) : null,
        ),
        h(
          View,
          { style: { alignItems: 'flex-end' } },
          h(
            View,
            { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
            h(AmountBar, { value: fix.points, max: maxPoints, width: 44 }),
            h(ValueText, { text: fix.gain, style: { fontSize: 8.5, fontWeight: 600 } }),
          ),
          fix.difficulty ? h(Text, { style: styles.caption }, fix.difficulty) : null,
        ),
      ),
      fix.results.length && !single
        ? h(
            View,
            { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5, alignItems: 'center' } },
            ...fix.results.map((part, index) =>
              h(
                View,
                { key: index, style: { flexDirection: 'row', alignItems: 'center', gap: 5 } },
                part.program ? h(Text, { style: { fontSize: 7.5, color: COLORS.muted } }, part.program) : null,
                h(ResultGauge, { result: part.result, size: 'sm' }),
              ),
            ),
          )
        : null,
      fix.finding
        ? h(Text, { style: { ...styles.small, marginTop: 6, color: COLORS.muted, ...clamp(compact ? 1 : 2) } }, h(Text, { style: { fontWeight: 600, color: COLORS.black } }, 'Found  '), fix.finding)
        : null,
      fix.howToFix
        ? h(Text, { style: { ...styles.small, marginTop: 3, ...clamp(compact ? 2 : 3) } }, h(Text, { style: { fontWeight: 600 } }, 'How to fix  '), fix.howToFix)
        : null,
      // What the institution said about itself: labelled, and never part of the score.
      fix.added
        ? h(
            Text,
            { style: { ...styles.small, marginTop: 3, color: COLORS.muted, ...clamp(compact ? 1 : 2) } },
            h(Text, { style: { fontWeight: 600, color: COLORS.black } }, `${ADDED_BY_YOU}  `),
            `${fix.added.lines.join('. ')}.${fix.howToFix && fix.added.advice ? ` ${fix.added.advice}` : ''}`,
          )
        : null,
    ),
  );
}

/** In a compact report, 3 fixes in detail; the rest join the ranked list. */
const COMPACT_FIXES = 3;

export function FixesPage({ data, compact = false }: PageProps): ReactElement {
  const detailed = compact ? data.fixes.slice(0, COMPACT_FIXES) : data.fixes;
  const rows: ReportFixRow[] = [...data.fixes.slice(detailed.length).map((fix) => fix.row), ...data.moreFixes];
  const columns = [rows.slice(0, Math.ceil(rows.length / 2)), rows.slice(Math.ceil(rows.length / 2))];
  const maxPoints = biggestGain([...data.fixes, ...data.moreFixes]);
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'What to fix', title: 'What to fix, ranked', lead: 'Ranked by how much each could add to your score. Start at the top.' }),
      ...(detailed.length
        ? detailed.map((fix, index) => h(FixBlock, { key: fix.rank, fix, first: index === 0, compact, maxPoints }))
        : [h(Text, { key: 'none', style: styles.small }, 'Every check is Strong. Keep it that way.')]),
      ...(rows.length
        ? [
            h(
              View,
              { key: 'more', style: { marginTop: 12 }, wrap: false },
              h(SectionTitle, { title: 'Also worth fixing' }),
              h(
                View,
                { style: { flexDirection: 'row', gap: GRID_GAP } },
                ...columns.map((column, index) =>
                  h(
                    View,
                    { key: index, style: { width: HALF } },
                    ...column.map((item) =>
                      h(
                        View,
                        { key: item.rank, style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 5, borderTopWidth: 0.75, borderTopColor: COLORS.line } },
                        h(
                          View,
                          { style: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8 } },
                          h(Text, { style: { ...NUM, fontSize: 8.5, fontWeight: 500 } }, `${item.rank}.`),
                          h(CheckIcon, { check: item.key, size: 8.5 }),
                          h(
                            Text,
                            { style: { flex: 1, fontSize: 8.5, fontWeight: 500, ...clamp(1) } },
                            item.name,
                            item.programs ? h(Text, { style: { fontSize: 7, fontWeight: 400, color: COLORS.muted } }, `   ${item.programs}`) : null,
                          ),
                        ),
                        h(Text, { style: { ...styles.caption, textAlign: 'right' } }, h(ValueText, { text: item.gain }), item.difficulty ? `  ·  ${item.difficulty}` : ''),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ]
        : []),
    ],
  });
}

// 4. By program -------------------------------------------------------------------------------------

/** Up to this many programs show as cards; more show as table rows. */
const PROGRAM_CARDS = 6;

function ProgramCard({ program }: { program: ReportData['programs'][number] }): ReactElement {
  return h(
    Keep,
    { style: { width: HALF, padding: 14, backgroundColor: COLORS.panel, borderRadius: 4 } },
    h(Text, { style: { fontSize: 11.5, fontWeight: 600, letterSpacing: -0.1, ...clamp(1) } }, program.name),
    h(
      View,
      { style: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 } },
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'flex-end' } },
        h(BigNumber, { value: program.score, size: 34 }),
        h(Text, { style: { ...NUM, fontSize: 8.5, color: COLORS.muted, marginLeft: 4, marginBottom: 4 } }, '/ 100'),
      ),
      h(View, { style: { alignItems: 'flex-end', gap: 4 } }, h(LabelChip, { label: program.label }), program.change ? h(ValueText, { text: program.change, style: styles.caption }) : null),
    ),
    h(
      View,
      { style: { flexDirection: 'row', gap: 8, marginTop: 12 } },
      ...PILLARS.map((pillar) =>
        h(
          View,
          { key: pillar, style: { flex: 1 } },
          h(
            View,
            { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 } },
            h(Text, { style: { fontSize: 7.5, color: COLORS.muted } }, PILLAR_LABELS[pillar]),
            h(Text, { style: { ...NUM, fontSize: 7.5, fontWeight: 600 } }, String(program.pillars[pillar])),
          ),
          h(ScoreBar, { score: program.pillars[pillar], height: 2.5 }),
        ),
      ),
    ),
    h(
      View,
      { style: { marginTop: 12, paddingTop: 8, borderTopWidth: 0.75, borderTopColor: COLORS.line } },
      program.topFix
        ? h(Text, { style: { ...styles.small, ...clamp(2) } }, h(Text, { style: { fontWeight: 600 } }, 'Top fix  '), `${program.topFix}. ${program.topFixGain ?? ''}.`)
        : h(Text, { style: styles.small }, 'Every check is Strong for this program.'),
      program.added
        ? h(Text, { style: { ...styles.small, marginTop: 3, color: COLORS.muted, ...clamp(1) } }, h(Text, { style: { fontWeight: 600, color: COLORS.black } }, `${ADDED_BY_YOU}  `), program.added)
        : null,
    ),
  );
}

// One line a program, so up to 30 programs fit on the page.
const PROGRAM_COLUMNS = [
  { key: 'name', label: 'Program', width: 0 },
  { key: 'score', label: 'Score', width: 36 },
  { key: 'change', label: 'Change', width: 56 },
  { key: 'discovered', label: 'Discovered', width: 50 },
  { key: 'trusted', label: 'Trusted', width: 42 },
  { key: 'chosen', label: 'Chosen', width: 42 },
  { key: 'fix', label: 'Top fix', width: 104 },
] as const;

function ProgramTable({ programs }: { programs: ReportData['programs'] }): ReactElement {
  const cell = (key: (typeof PROGRAM_COLUMNS)[number]['key']) => {
    const column = PROGRAM_COLUMNS.find((entry) => entry.key === key);
    const numeric = key === 'score' || key === 'discovered' || key === 'trusted' || key === 'chosen';
    return column?.width ? { width: column.width, textAlign: numeric ? ('right' as const) : ('left' as const), paddingLeft: numeric ? 0 : 8 } : { flex: 1 };
  };
  return h(
    View,
    null,
    h(
      View,
      { style: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
      ...PROGRAM_COLUMNS.map((column) => h(Text, { key: column.key, style: { ...cell(column.key), fontSize: 7, fontWeight: 500, color: COLORS.muted } }, column.label)),
    ),
    ...programs.map((program, index) =>
      h(
        View,
        { key: index, wrap: false, style: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: COLORS.line } },
        h(Text, { style: { ...cell('name'), fontSize: 8, fontWeight: 500, ...clamp(1) } }, program.name),
        h(Text, { style: { ...NUM, ...cell('score'), fontSize: 9, fontWeight: 600 } }, String(program.score)),
        h(ValueText, { text: program.change ?? '', style: { ...cell('change'), fontSize: 7, color: COLORS.muted } }),
        h(Text, { style: { ...NUM, ...cell('discovered'), fontSize: 8 } }, String(program.pillars.discovered)),
        h(Text, { style: { ...NUM, ...cell('trusted'), fontSize: 8 } }, String(program.pillars.trusted)),
        h(Text, { style: { ...NUM, ...cell('chosen'), fontSize: 8 } }, String(program.pillars.chosen)),
        h(Text, { style: { ...cell('fix'), fontSize: 7, color: COLORS.muted, ...clamp(1) } }, program.topFix ?? 'Every check is Strong'),
      ),
    ),
  );
}

export function ProgramsPage({ data }: { data: Pick<ReportData, 'institution' | 'monthLabel' | 'programs' | 'morePrograms'>; compact?: boolean }): ReactElement {
  const cards = data.programs.length <= PROGRAM_CARDS;
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'By program', title: 'Program by program', lead: 'Each program’s score, and the one fix that would help it most.' }),
      cards
        ? h(View, { key: 'grid', style: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP } }, ...data.programs.map((program, index) => h(ProgramCard, { key: index, program })))
        : h(ProgramTable, { key: 'table', programs: data.programs }),
      ...(data.morePrograms ? [h(Text, { key: 'more', style: { ...styles.caption, marginTop: 8 } }, `And ${data.morePrograms} more ${data.morePrograms === 1 ? 'program' : 'programs'} in Drishti.`)] : []),
    ],
  });
}

// 5. Rivals -------------------------------------------------------------------------------------------

const RIVAL_COLUMNS = [
  { key: 'rank', label: 'Rank', width: 34 },
  { key: 'name', label: 'Institution', width: 0 },
  { key: 'overall', label: 'Overall', width: 50 },
  { key: 'discovered', label: 'Discovered', width: 60 },
  { key: 'trusted', label: 'Trusted', width: 52 },
  { key: 'chosen', label: 'Chosen', width: 52 },
  { key: 'change', label: 'Change', width: 58 },
] as const;

/** Each pillar on one line from 0 to 100: you filled with your score, each rival open, your place on the right. */
function RivalPillars({ rows }: { rows: NonNullable<ReportData['rivals']>['rows'] }): ReactElement | null {
  const toScored = (row: (typeof rows)[number]): Scored => ({
    id: row.name,
    name: row.name,
    scores: row.pillars && row.overall !== null ? { overall: row.overall, ...row.pillars } : null,
  });
  const you = rows.find((row) => row.you);
  if (!you?.pillars) return null;
  const spread = pillarSpread(
    toScored(you),
    rows.filter((row) => !row.you).map(toScored),
  );
  const label = 96;
  const rank = 60;
  const plot = CONTENT_WIDTH - label - rank - 16;
  const pad = 6;
  const x = (score: number) => pad + (Math.max(0, Math.min(100, score)) / 100) * (plot - pad * 2);
  const radius = { you: 4.2, rival: 3.6, gap: 1 };
  const mid = 15;
  const lane = 7.5;
  return h(
    View,
    { wrap: false, style: { marginTop: 4 } },
    h(
      View,
      { style: { flexDirection: 'row', gap: 14, marginBottom: 4 } },
      h(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 4 } }, h(View, { style: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.black } }), h(Text, { style: styles.caption }, 'You')),
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', gap: 4 } },
        h(View, { style: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 0.9, borderColor: COLORS.muted } }),
        h(Text, { style: styles.caption }, 'Your rivals'),
      ),
    ),
    ...spread.map((row) => {
      const at = row.entries.map((entry) => ({ ...entry, x: x(entry.score) }));
      const lanes = dotLanes(at, radius);
      const height = mid + Math.max(0, ...lanes) * lane + 7;
      const mine = at.find((entry) => entry.you);
      return h(
        View,
        { key: row.pillar, style: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 0.75, borderTopColor: COLORS.line } },
        h(View, { style: { width: label, flexDirection: 'row', alignItems: 'center', gap: 5 } }, h(PillarIcon, { pillar: row.pillar, size: 9.5 }), h(Text, { style: { fontSize: 8.5, fontWeight: 600 } }, PILLAR_LABELS[row.pillar])),
        h(
          View,
          { style: { width: plot, height, position: 'relative' } },
          h(
            Svg,
            { width: plot, height },
            h(Line, { x1: x(0), y1: mid, x2: x(100), y2: mid, stroke: COLORS.lineMedium, strokeWidth: 1.2 }),
            ...bandStarts().map((start) => h(Line, { key: start, x1: x(start), y1: mid - 4.5, x2: x(start), y2: mid + 4.5, stroke: COLORS.muted, strokeWidth: 0.8 })),
            ...at.flatMap((entry, index) =>
              entry.you ? [] : [h(Circle, { key: entry.id, cx: entry.x, cy: mid + (lanes[index] ?? 0) * lane, r: radius.rival, fill: COLORS.ivory, stroke: COLORS.muted, strokeWidth: 0.9 })],
            ),
            mine ? h(Circle, { cx: mine.x, cy: mid, r: radius.you, fill: COLORS.black, stroke: COLORS.ivory, strokeWidth: 1 }) : null,
          ),
          mine ? h(Text, { style: { ...NUM, position: 'absolute', left: mine.x - 12, width: 24, top: mid - 15, textAlign: 'center', fontSize: 7, fontWeight: 600 } }, String(Math.round(mine.score))) : null,
        ),
        h(
          Text,
          { style: { width: rank, textAlign: 'right', fontSize: 8, color: COLORS.muted } },
          row.rank ? h(Text, { style: { ...NUM, fontWeight: 600, color: COLORS.black } }, ordinal(row.rank)) : '',
          row.rank ? ` of ${row.of}` : '',
        ),
      );
    }),
    h(
      View,
      { style: { flexDirection: 'row', gap: 8, borderTopWidth: 0.75, borderTopColor: COLORS.line, paddingTop: 3 } },
      h(View, { style: { width: label } }),
      h(
        View,
        { style: { width: plot, height: 9, position: 'relative' } },
        ...[0, ...bandStarts(), 100].map((tick) => h(Text, { key: tick, style: { ...NUM, position: 'absolute', left: x(tick) - 10, width: 20, textAlign: 'center', fontSize: 6.5, color: COLORS.muted } }, String(tick))),
      ),
    ),
  );
}

export function RivalsPage({ data, compact = false }: PageProps): ReactElement {
  const rivals = data.rivals;
  const cell = (key: (typeof RIVAL_COLUMNS)[number]['key']) => {
    const column = RIVAL_COLUMNS.find((entry) => entry.key === key);
    return column && column.width ? { width: column.width, textAlign: key === 'name' || key === 'rank' ? ('left' as const) : ('right' as const) } : { flex: 1 };
  };
  if (!rivals) {
    return h(ContentPage, {
      data,
      children: [
        h(PageHead, { key: 'head', eyebrow: 'Rivals', title: 'You and your rivals', lead: null }),
        h(Text, { key: 'none', style: styles.small }, 'Pick 3 to 5 rivals in Drishti, and next month this page shows where you stand against each of them.'),
      ],
    });
  }
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'Rivals', title: 'You and your rivals', lead: rivals.verdict }),
      h(SectionTitle, { key: 'table-title', title: 'Head to head', lead: 'Overall and pillar scores from the latest Audit of each. Highest first.' }),
      h(
        View,
        { key: 'table' },
        h(
          View,
          { style: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
          ...RIVAL_COLUMNS.map((column) => h(Text, { key: column.key, style: { ...cell(column.key), fontSize: 7.5, fontWeight: 500, color: COLORS.muted } }, column.label)),
        ),
        ...rivals.rows.map((row, index) => {
          const ink = COLORS.black;
          const number = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
          return h(
            View,
            {
              key: index,
              wrap: false,
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 8,
                backgroundColor: row.you ? COLORS.panel : undefined,
                borderBottomWidth: 0.75,
                borderBottomColor: COLORS.line,
                color: ink,
              },
            },
            h(Text, { style: { ...NUM, ...cell('rank'), fontSize: 9, fontWeight: 600, color: ink } }, row.rank === null ? '' : String(row.rank)),
            h(
              Text,
              { style: { ...cell('name'), fontSize: 9.5, fontWeight: row.you ? 600 : 500, color: ink, ...clamp(1) } },
              row.name,
              row.you ? h(Text, { style: { fontSize: 7.5, fontWeight: 400, color: COLORS.muted } }, '   You') : null,
            ),
            h(Text, { style: { ...NUM, ...cell('overall'), fontSize: 10, fontWeight: 600, color: ink } }, number(row.overall)),
            h(Text, { style: { ...NUM, ...cell('discovered'), fontSize: 9, color: ink } }, number(row.pillars?.discovered)),
            h(Text, { style: { ...NUM, ...cell('trusted'), fontSize: 9, color: ink } }, number(row.pillars?.trusted)),
            h(Text, { style: { ...NUM, ...cell('chosen'), fontSize: 9, color: ink } }, number(row.pillars?.chosen)),
            h(ValueText, { text: row.overall === null ? 'Not scored yet' : (row.change ?? ''), style: { ...cell('change'), fontSize: 8, color: COLORS.muted } }),
          );
        }),
      ),
      ...(compact
        ? []
        : [
            h(
              View,
              { key: 'pillars', style: styles.section, wrap: false },
              h(SectionTitle, { title: 'Pillar by pillar', lead: 'Each pillar from 0 to 100, with where Needs work and Strong begin. Your place on the right.' }),
              h(RivalPillars, { rows: rivals.rows }),
            ),
          ]),
      h(
        View,
        { key: 'moves', style: styles.section },
        h(SectionTitle, {
          title: `Key moves in ${data.monthLabel.split(' ')[0]}`,
          lead: rivals.moves.length ? 'What your rivals changed on their public pages, newest first.' : null,
        }),
        ...(rivals.moves.length
          ? rivals.moves.map((move, index) =>
              h(
                Keep,
                { key: index, style: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
                h(Text, { style: { width: 76, ...styles.caption } }, move.date),
                h(
                  View,
                  { style: { flex: 1 } },
                  h(Text, { style: { fontSize: 9.5, fontWeight: 600, ...clamp(1) } }, move.rival, h(Text, { style: { fontSize: 7.5, fontWeight: 400, color: COLORS.muted } }, `   ${move.kind}`)),
                  h(Text, { style: { ...styles.small, marginTop: 2, ...clamp(2) } }, move.text),
                ),
              ),
            )
          : [h(Text, { key: 'none', style: styles.small }, `No new moves found in ${data.monthLabel.split(' ')[0]}. Drishti checks their public pages every week.`)]),
        ...(rivals.moreMoves ? [h(Text, { key: 'more', style: { ...styles.caption, marginTop: 6 } }, `And ${rivals.moreMoves} more in Drishti.`)] : []),
      ),
    ],
  });
}

// 6. Demand ---------------------------------------------------------------------------------------------

export function DemandPage({ data, compact = false }: PageProps): ReactElement {
  const demand = data.demand;
  if (!demand) {
    return h(ContentPage, {
      data,
      children: [
        h(PageHead, { key: 'head', eyebrow: 'Demand', title: 'What students want', lead: null }),
        h(Text, { key: 'none', style: styles.small }, 'Demand covers the programs on Drishti’s list. Add one in Settings to see what students ask about it.'),
      ],
    });
  }
  const lead = [demand.caption, demand.pulledOn ? `Pulled ${demand.pulledOn}` : null, 'Grouped only, never one student'].filter(Boolean).join('.  ');
  const fastest = Math.max(0, ...demand.rising.map((trend) => trend.changePct ?? 0));
  const mostAsked = Math.max(0, ...demand.questions.map((question) => question.asked));
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'Demand', title: `What students in ${demand.place} want`, lead: `${lead}.` }),
      h(SectionTitle, { key: 'rising-title', title: 'Rising', lead: 'The courses and careers students search for more this month.' }),
      h(
        View,
        { key: 'rising', style: { flexDirection: 'row', gap: GRID_GAP } },
        ...demand.rising.map((trend, index) =>
          h(
            View,
            { key: index, style: { width: THIRD, padding: 12, backgroundColor: COLORS.panel, borderRadius: 4 } },
            // A change is a number in Inter ("↑ 47%"); a new trend says so in words.
            arrowValue(trend.change) ? h(BigNumber, { value: arrowValue(trend.change) ?? '', size: 20 }) : h(Text, { style: { fontSize: 20, fontWeight: 600, lineHeight: 1 } }, trend.change || 'New'),
            trend.changePct !== null && fastest > 0 ? h(View, { style: { marginTop: 8 } }, h(AmountBar, { value: trend.changePct, max: fastest, width: THIRD - 24 })) : null,
            h(Text, { style: { fontSize: 9.5, fontWeight: 600, marginTop: 8, lineHeight: 1.3, ...clamp(3) } }, trend.text),
            h(Text, { style: { ...styles.caption, marginTop: 4, ...clamp(2) } }, `${trend.count}  ·  ${trend.program}`),
          ),
        ),
      ),
      h(
        View,
        { key: 'questions', style: styles.section },
        h(SectionTitle, { title: 'Top questions', lead: 'What students ask most, grouped. Hindi and Assamese questions are shown in English.' }),
        ...demand.questions.map((question, index) =>
          h(
            Keep,
            { key: index, style: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
            h(Text, { style: { ...NUM, width: 20, fontSize: 9, fontWeight: 600 } }, String(index + 1)),
            h(
              View,
              { style: { flex: 1 } },
              h(Text, { style: { fontSize: 9.5, fontWeight: 500, lineHeight: 1.35, ...clamp(compact ? 1 : 2) } }, question.text),
              h(
                View,
                { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
                h(Text, { style: { ...styles.caption, flex: 1, ...clamp(1) } }, [question.count, question.program, question.language].filter(Boolean).join('  ·  ')),
                mostAsked > 0 ? h(AmountBar, { value: question.asked, max: mostAsked, width: 96 }) : null,
              ),
            ),
          ),
        ),
      ),
      h(
        View,
        { key: 'ideas', style: styles.section },
        h(SectionTitle, { title: 'Content ideas', lead: 'Each one answers a real question students ask.' }),
        ...demand.ideas.map((idea, index) =>
          h(
            Keep,
            { key: index, style: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
            h(Text, { style: { ...NUM, width: 20, fontSize: 9, fontWeight: 600 } }, String(index + 1)),
            h(
              View,
              { style: { flex: 1 } },
              h(Text, { style: { fontSize: 9.5, lineHeight: 1.35, ...clamp(compact ? 1 : 2) } }, idea.text),
              h(Text, { style: { ...styles.caption, ...clamp(1) } }, idea.basedOn ? `Answers “${idea.basedOn}”  ·  ${idea.program}` : idea.program),
            ),
          ),
        ),
      ),
    ],
  });
}

// 7. 3 things to do, and the sources ------------------------------------------------------------------

function thingsLead(things: readonly Thing[]): string {
  const sources = things.map((thing) => thing.source).join(',');
  return sources === 'audit,rivals,demand'
    ? 'One from your Audit, one from your rivals and one from what students ask. In this order.'
    : 'The steps that could make the most difference this month. In this order.';
}

export function ClosingPage({ data, compact = false }: PageProps): ReactElement {
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'This month', title: '3 things to do this month', lead: thingsLead(data.things) }),
      h(
        View,
        { key: 'things', wrap: false, style: { backgroundColor: COLORS.black, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 4 } },
        ...data.things.map((thing, index) =>
          h(
            View,
            { key: index, style: { flexDirection: 'row', paddingVertical: 9, borderTopWidth: index === 0 ? 0 : 0.75, borderTopColor: COLORS.lineDark } },
            h(View, { style: { width: 40 } }, h(Text, { style: { ...NUM, fontWeight: 600, fontSize: 28, lineHeight: 1, letterSpacing: -1, color: COLORS.ivory } }, String(index + 1))),
            h(
              View,
              { style: { flex: 1 } },
              h(Text, { style: { fontSize: 7, fontWeight: 500, letterSpacing: 0.9, textTransform: 'uppercase', color: COLORS.slate } }, THING_SOURCE_LABELS[thing.source]),
              h(Text, { style: { fontSize: 12, fontWeight: 600, letterSpacing: -0.15, lineHeight: 1.3, color: COLORS.ivory, marginTop: 3, ...clamp(2) } }, thing.title),
              thing.detail ? h(Text, { style: { fontSize: 8.5, lineHeight: 1.45, color: COLORS.quietDark, marginTop: 3, ...clamp(compact ? 2 : 3) } }, thing.detail) : null,
            ),
          ),
        ),
        ...(data.things.length === 0 ? [h(Text, { key: 'none', style: { fontSize: 10, color: COLORS.ivory, paddingVertical: 12 } }, 'Nothing pressing this month. Keep what works going.')] : []),
      ),
      h(
        View,
        { key: 'sources', style: { marginTop: 18 } },
        h(SectionTitle, { title: 'Sources and dates checked' }),
        ...data.sources.notes.map((note) =>
          h(
            Keep,
            { key: note.label, style: { flexDirection: 'row', paddingVertical: 2.5 } },
            h(Text, { style: { width: 58, fontSize: 7.5, fontWeight: 600 } }, note.label),
            h(Text, { style: { flex: 1, fontSize: 7.5, lineHeight: 1.4, color: COLORS.muted, ...clamp(2) } }, note.text),
          ),
        ),
        h(
          View,
          { style: { flexDirection: 'row', marginTop: 8, paddingVertical: 4, borderBottomWidth: 0.75, borderBottomColor: COLORS.black } },
          h(Text, { style: { width: 96, fontSize: 7, fontWeight: 500, color: COLORS.muted } }, 'Check'),
          data.sources.checkedOn ? null : h(Text, { style: { width: 62, fontSize: 7, fontWeight: 500, color: COLORS.muted } }, 'Checked'),
          h(Text, { style: { flex: 1, fontSize: 7, fontWeight: 500, color: COLORS.muted } }, 'Where it was found'),
        ),
        ...data.sources.checks.map((check, index) =>
          h(
            Keep,
            { key: index, style: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: COLORS.line } },
            h(View, { style: { width: 96, flexDirection: 'row', gap: 4 } }, h(View, { style: { paddingTop: 1 } }, h(CheckIcon, { check: check.key, size: 7.5 })), h(Text, { style: { flex: 1, fontSize: 7, lineHeight: 1.35, fontWeight: 500 } }, check.name)),
            data.sources.checkedOn ? null : h(Text, { style: { width: 62, fontSize: 7, lineHeight: 1.35, color: COLORS.muted } }, check.checkedOn),
            h(
              View,
              { style: { flex: 1, flexDirection: 'row', gap: 4 } },
              check.links.length ? h(View, { style: { paddingTop: 1 } }, h(PlatformIcon, { platform: check.platform, size: 7.5 })) : null,
              h(Text, { style: { flex: 1, fontSize: 7, lineHeight: 1.35, color: COLORS.muted, ...clamp(compact ? 1 : 2) } }, check.links.join(';  ') || 'Not found on a public page'),
            ),
          ),
        ),
      ),
      ...(data.contact
        ? [
            h(
              Keep,
              { key: 'contact', style: { marginTop: 18 } },
              h(
                Text,
                { style: { fontSize: 8.5, color: COLORS.muted } },
                `${data.contact.text} `,
                h(Link, { src: `mailto:${data.contact.email}`, style: { color: COLORS.black, fontWeight: 500, textDecoration: 'none' } }, data.contact.email),
              ),
            ),
          ]
        : []),
    ],
  });
}

// The report's pages, in the spec's order (section 12): a black cover with Visibility, Trust and
// Chosen, then one run of ivory pages: This month in short (the monthly summary), what the internet
// says, what to fix, rivals, demand, leads (Client) and progress with the sources. Each part starts
// where the last one ends, with its head kept on the page of its first block, so a month reads in
// about 7 pages and never more than 8. Whole numbers, no dashes. As on the dashboard: each result a
// thin bar with the word, the place and check icons, impact and effort as words, bars for how often
// a question is asked. The score shows small, in This month in short and in the progress table.

import { createElement as h, type ReactElement, type ReactNode } from 'react';
import { Link, Page, Text, View } from '@react-pdf/renderer';
import { previousMonth } from '../../domain/dates.ts';
import { ADDED_BY_YOU } from '../../domain/details.ts';
import { formatMonthName } from '../../domain/format.ts';
import { IMPACT_LABELS, PILLAR_LABELS, PILLARS } from '../../domain/types.ts';
import { THING_SOURCE_LABELS } from '../things.ts';
import type { ReportData } from '../data.ts';
import type { ReportFix, ReportFixRow, ReportPlace, ReportPlaceItem, ReportProof, ReportWord } from '../places.ts';
import { AmountBar, arrowValue, BigNumber, CheckIcon, clamp, Footer, Keep, Lockup, PillarIcon, PlatformIcon, ResultBar, SectionTitle, WordBar } from './parts.ts';
import { COLORS, NUM, PAGE, styles } from './theme.ts';

const CONTENT_WIDTH = PAGE.width - PAGE.side * 2;
const GAP = 10;
const HALF = (CONTENT_WIDTH - GAP) / 2;
const THIRD = (CONTENT_WIDTH - GAP * 2) / 3;

/**
 * Compact is the second try, used only when a report would run past the page cap: 3 fixes in
 * detail instead of 5 (the rest join the ranked list), 2 of what's good and 2 to fix in each place
 * (the rest counted), fewer steps and ready fix lines, and shorter limits on long sentences.
 */
export interface PageProps {
  data: ReportData;
  compact?: boolean;
}

type Footed = { institution: { name: string }; monthLabel: string; sample?: string | null };

/** An ivory page with the footer. The run of parts flows over as many pages as it needs. */
export function ContentPage({ data, children }: { data: Footed; children: ReactNode[] }): ReactElement {
  return h(Page, { size: 'A4', style: styles.page }, ...children, h(Footer, { institution: data.institution.name, month: data.monthLabel, note: data.sample ?? null }));
}

interface HeadProps {
  eyebrow: string;
  title: string;
  lead?: string | null;
  /** The first part of the run: no rule above it. */
  first?: boolean;
}

/** A part's head: a rule, an eyebrow, a title and one line. */
function PartHead({ eyebrow, title, lead, first = false }: HeadProps): ReactElement {
  return h(
    View,
    { style: { marginTop: first ? 0 : 22, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: COLORS.black, marginBottom: 10 } },
    h(Text, { style: styles.eyebrow }, eyebrow),
    h(Text, { style: { fontSize: first ? 20 : 18, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.15 } }, title),
    lead ? h(Text, { style: { ...styles.lead, fontSize: 9.5, ...clamp(3) } }, lead) : null,
  );
}

/**
 * A part of the run: its head kept on the page of the first block under it, then the rest. With
 * no first block (the places, which may run on), the head needs room for what follows instead.
 */
export function Part({ head, first, rest = [] }: { head: HeadProps; first: ReactElement | null; rest?: Array<ReactElement | null> }): ReactElement {
  return h(View, null, first ? h(View, { wrap: false }, h(PartHead, head), first) : h(View, { minPresenceAhead: 160 }, h(PartHead, head)), ...rest);
}

/** A small label above a list: "What's good". */
function Label({ children }: { children: string }): ReactElement {
  return h(Text, { style: { fontSize: 7, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.muted, marginBottom: 4 } }, children);
}

/** A titled list: the title kept on the page of its first row, then the rest; no row is split. */
function TitledList({ title, lead, rows, after = null, marginTop = 14 }: { title: string; lead?: string | null; rows: ReactElement[]; after?: ReactElement | null; marginTop?: number }): ReactElement {
  const [first, ...rest] = rows;
  return h(View, { style: { marginTop } }, h(View, { wrap: false }, h(SectionTitle, { title, lead }), first ?? null), ...rest, after);
}

/** What was seen, then "site.example/fees · 15 Sep 2026" with the source's mark. */
function ProofLine({ proof, compact = false }: { proof: ReportProof; compact?: boolean }): ReactElement {
  const where = [proof.program, proof.source, proof.date, proof.byTeam ? 'Checked by the AdmitLabs team' : null].filter(Boolean).join('  ·  ');
  return h(
    View,
    { style: { marginTop: 2 } },
    proof.line ? h(Text, { style: { fontSize: 7.8, lineHeight: 1.35, color: COLORS.black, ...clamp(compact ? 1 : 2) } }, proof.line) : null,
    where
      ? h(
          View,
          { style: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 } },
          proof.source ? h(PlatformIcon, { platform: proof.platform, size: 6.5 }) : null,
          h(Text, { style: { flex: 1, fontSize: 6.8, color: COLORS.muted, ...clamp(1) } }, where),
        )
      : null,
  );
}

// 1. Cover --------------------------------------------------------------------------------------

/** Visibility, Trust and Chosen, side by side: each word big, with its question and how it moved. */
export function WordColumns({ words, dark }: { words: readonly ReportWord[]; dark: boolean }): ReactElement {
  const ink = dark ? COLORS.ivory : COLORS.black;
  const quiet = dark ? COLORS.slate : COLORS.muted;
  return h(
    View,
    { style: { flexDirection: 'row', gap: GAP } },
    ...words.map((word) =>
      h(
        View,
        {
          key: word.pillar,
          style: dark ? { width: THIRD, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineDark } : { width: THIRD, padding: 10, backgroundColor: COLORS.panel, borderRadius: 4 },
        },
        h(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 5 } }, h(PillarIcon, { pillar: word.pillar, size: 10, color: ink }), h(Text, { style: { fontSize: 9, fontWeight: 600, color: ink } }, word.name)),
        h(Text, { style: { fontSize: dark ? 30 : 20, fontWeight: 600, letterSpacing: dark ? -0.9 : -0.5, lineHeight: 1, color: ink, marginTop: dark ? 12 : 7 } }, word.word),
        h(Text, { style: { fontSize: 8, lineHeight: 1.35, color: quiet, marginTop: dark ? 7 : 5, ...clamp(2) } }, word.question),
        word.moved ? h(Text, { style: { fontSize: 8, fontWeight: 600, lineHeight: 1.35, color: ink, marginTop: 2, ...clamp(1) } }, word.moved) : null,
      ),
    ),
  );
}

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
      { style: { marginTop: 120 } },
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
      null,
      h(Text, { style: { fontSize: 7.5, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.slate, marginBottom: 10 } }, 'Visibility, Trust and Chosen'),
      h(WordColumns, { words: data.words, dark: true }),
      h(Text, { style: { fontSize: 15, fontWeight: 500, lineHeight: 1.35, letterSpacing: -0.2, marginTop: 26, maxWidth: 430, ...clamp(3) } }, data.answer),
    ),
    h(
      View,
      { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 34, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineDark } },
      h(Text, { style: quiet }, `${data.checkedOn}  ·  Made ${data.madeOn}`),
      h(Text, { style: quiet }, `${data.tierLabel} plan  ·  Public data only`),
    ),
  );
}

// 2. This month in short ------------------------------------------------------------------------------

function SummaryPart({ data }: PageProps): ReactElement {
  const { summary } = data;
  const block = (key: string, title: string, children: ReactNode) => h(View, { key, style: { marginTop: 14 }, wrap: false }, h(SectionTitle, { title }), children);
  return h(Part, {
    head: { first: true, eyebrow: 'This month in short', title: `${data.monthName} in short`, lead: summary.lines.words },
    first: h(
      View,
      null,
      h(WordColumns, { words: data.words, dark: false }),
      // The score, small.
      h(
        Text,
        { style: { ...styles.caption, marginTop: 8 } },
        'Overall score ',
        h(Text, { style: { ...NUM, fontWeight: 600, color: COLORS.black } }, String(data.score.overall)),
        h(Text, { style: NUM }, ' / 100'),
        data.score.change ? `.  ${data.score.change}.` : '.',
      ),
    ),
    rest: [
      block(
        'things',
        'Do these 3 things this month',
        h(
          View,
          { style: { backgroundColor: COLORS.black, borderRadius: 4, paddingHorizontal: 18, paddingVertical: 4 } },
          ...summary.lines.things.map((title, index) =>
            h(
              View,
              { key: index, style: { flexDirection: 'row', paddingVertical: 7, borderTopWidth: index === 0 ? 0 : 0.75, borderTopColor: COLORS.lineDark } },
              h(View, { style: { width: 32 } }, h(Text, { style: { ...NUM, fontWeight: 600, fontSize: 20, lineHeight: 1, letterSpacing: -1, color: COLORS.ivory } }, String(index + 1))),
              h(
                View,
                { style: { flex: 1 } },
                h(Text, { style: { fontSize: 7, fontWeight: 500, letterSpacing: 0.9, textTransform: 'uppercase', color: COLORS.slate } }, THING_SOURCE_LABELS[summary.things[index]?.source ?? 'audit']),
                h(Text, { style: { fontSize: 10.5, fontWeight: 600, letterSpacing: -0.15, lineHeight: 1.3, color: COLORS.ivory, marginTop: 2, ...clamp(2) } }, title),
                summary.things[index]?.meta ? h(Text, { style: { fontSize: 8, lineHeight: 1.4, color: COLORS.quietDark, marginTop: 2, ...clamp(1) } }, summary.things[index]?.meta) : null,
              ),
            ),
          ),
          ...(summary.lines.things.length === 0 ? [h(Text, { key: 'none', style: { fontSize: 10, color: COLORS.ivory, paddingVertical: 12 } }, 'Nothing pressing this month. Keep what works going.')] : []),
        ),
      ),
      h(
        View,
        { key: 'lines', style: { flexDirection: 'row', gap: GAP, marginTop: 14 }, wrap: false },
        h(View, { style: { flex: 1 } }, h(SectionTitle, { title: 'One rival move' }), h(Text, { style: { fontSize: 9.5, lineHeight: 1.45, ...clamp(4) } }, summary.lines.move)),
        summary.lines.enquiries ? h(View, { style: { flex: 1 } }, h(SectionTitle, { title: 'Your enquiries' }), h(Text, { style: { fontSize: 9.5, lineHeight: 1.45, ...clamp(4) } }, summary.lines.enquiries)) : null,
      ),
    ],
  });
}

// 3. What the internet says -----------------------------------------------------------------------------

function PlaceItem({ item, fix, compact }: { item: ReportPlaceItem; fix: boolean; compact: boolean }): ReactElement {
  const meta = [item.label, item.kind && !item.result ? item.kind : null, item.impact].filter(Boolean).join('  ·  ');
  return h(
    Keep,
    { style: { paddingVertical: 4, borderTopWidth: 0.75, borderTopColor: COLORS.line } },
    h(
      View,
      { style: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 } },
      item.checkKey ? h(View, { style: { paddingTop: 1 } }, h(CheckIcon, { check: item.checkKey, size: 8 })) : null,
      h(Text, { style: { flex: 1, fontSize: 8.4, fontWeight: 600, lineHeight: 1.28, ...clamp(2) } }, item.title),
      !fix && item.result ? h(ResultBar, { result: item.result, size: 'sm' }) : null,
      !fix && !item.result && item.kind ? h(Text, { style: { fontSize: 7, fontWeight: 500, color: COLORS.muted } }, item.kind) : null,
    ),
    fix && (meta || item.result)
      ? h(
          View,
          { style: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 2, marginTop: 2 } },
          item.result ? h(ResultBar, { result: item.result, size: 'sm' }) : null,
          meta ? h(Text, { style: { fontSize: 7, color: COLORS.muted } }, meta) : null,
        )
      : null,
    item.proof ? h(ProofLine, { proof: item.proof, compact: compact || !fix }) : null,
  );
}

function PlaceColumn({ title, items, fix, more, empty, compact }: { title: string; items: readonly ReportPlaceItem[]; fix: boolean; more: number; empty: string; compact: boolean }): ReactElement {
  return h(
    View,
    { style: { width: HALF } },
    h(Label, null, title),
    ...(items.length ? items.map((item, index) => h(PlaceItem, { key: index, item, fix, compact })) : [h(Text, { key: 'none', style: { ...styles.caption, paddingVertical: 5, borderTopWidth: 0.75, borderTopColor: COLORS.line } }, empty)]),
    more ? h(Text, { style: { ...styles.caption, marginTop: 3 } }, `And ${more} more in Drishti.`) : null,
  );
}

/** One place: its name and what it covers, then what's good beside what to fix, each with its proof. Its name stays with its first items. */
/** In a compact report, this many of what's good and of what to fix in each place; the rest are counted. */
const COMPACT_PLACE_ITEMS = 2;

export function PlaceBlock({ place, compact = false, first = false }: { place: ReportPlace; compact?: boolean; first?: boolean }): ReactElement {
  const empty = place.good.length === 0 && place.fixes.length === 0;
  const good = compact ? place.good.slice(0, COMPACT_PLACE_ITEMS) : place.good;
  const fixes = compact ? place.fixes.slice(0, COMPACT_PLACE_ITEMS) : place.fixes;
  return h(
    View,
    { style: { marginTop: first ? 0 : 12 } },
    h(
      View,
      { minPresenceAhead: 110, style: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
      h(Text, { style: { fontSize: 11.5, fontWeight: 600, letterSpacing: -0.1 } }, place.name),
      h(Text, { style: { flex: 1, fontSize: 7.5, color: COLORS.muted, ...clamp(1) } }, place.covers),
    ),
    place.thin && empty
      ? h(
          View,
          { style: { padding: 10, backgroundColor: COLORS.panel, borderRadius: 4 } },
          h(Text, { style: { fontSize: 9, fontWeight: 600 } }, place.thin.title),
          h(Text, { style: { ...styles.small, color: COLORS.muted, marginTop: 2, ...clamp(3) } }, place.thin.why),
        )
      : h(
          View,
          { style: { flexDirection: 'row', gap: GAP } },
          h(PlaceColumn, { title: 'What’s good', items: good, fix: false, more: place.moreGood + place.good.length - good.length, empty: place.scored ? 'Nothing Strong here yet.' : 'Nothing good found yet.', compact }),
          h(PlaceColumn, { title: 'What to fix', items: fixes, fix: true, more: place.moreFixes + place.fixes.length - fixes.length, empty: 'Nothing to fix here.', compact }),
        ),
  );
}

/** The five places, under one head: kept for the shared Audit PDF too. */
export function PlacesPart({ places, compact = false, first = false, lead }: { places: readonly ReportPlace[]; compact?: boolean; first?: boolean; lead: string }): ReactElement {
  return h(Part, {
    head: { first, eyebrow: 'What the internet says', title: 'Place by place', lead },
    first: null,
    rest: places.map((place, index) => h(PlaceBlock, { key: place.key, place, compact, first: index === 0 })),
  });
}

// 4. What to fix --------------------------------------------------------------------------------------------

function ReadyFixBox({ ready, compact, note }: { ready: NonNullable<ReportFix['readyFix']>; compact: boolean; note: string | null }): ReactElement {
  const limit = compact ? 2 : 3;
  const line = (text: string, key: number) => h(Text, { key, style: { fontSize: 7.5, lineHeight: 1.35, marginTop: 1.5, ...clamp(1) } }, text);
  const cell = { flex: 1, paddingRight: 6, fontSize: 7.2, lineHeight: 1.3, ...clamp(1) };
  const shown = ready.table ? Math.min(ready.table.rows.length, limit - 1) : ready.outline.length ? Math.min(ready.outline.length, limit) : Math.min(ready.lines.length, limit);
  const total = ready.table ? ready.table.rows.length : ready.outline.length || ready.lines.length;
  const more = ready.more + (total - shown);
  return h(
    View,
    { style: { marginTop: 6, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: COLORS.panel, borderRadius: 3 } },
    h(Text, { style: { fontSize: 7.5, fontWeight: 600, ...clamp(1) } }, `Ready fix: ${ready.title}`),
    ...(ready.table
      ? [
          h(View, { key: 'head', style: { flexDirection: 'row', marginTop: 3, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: COLORS.lineMedium } }, ...ready.table.head.map((text, index) => h(Text, { key: index, style: { ...cell, fontWeight: 600, color: COLORS.muted } }, text))),
          ...ready.table.rows.slice(0, shown).map((row, rowIndex) => h(View, { key: rowIndex, style: { flexDirection: 'row', marginTop: 2 } }, ...row.map((text, index) => h(Text, { key: index, style: cell }, text)))),
        ]
      : ready.outline.length
        ? ready.outline.slice(0, shown).map((item, index) => h(Text, { key: index, style: { fontSize: 7.5, lineHeight: 1.35, marginTop: 1.5, ...clamp(1) } }, h(Text, { style: { fontWeight: 600 } }, `${item.heading}: `), item.line))
        : ready.lines.slice(0, shown).map(line)),
    more || note ? h(Text, { style: { fontSize: 6.8, color: COLORS.muted, marginTop: 2 } }, [more ? `And ${more} more ${ready.table ? (more === 1 ? 'row' : 'rows') : more === 1 ? 'line' : 'lines'}.` : null, note].filter(Boolean).join(' ')) : null,
  );
}

/** A fix in detail: the fix, where it is, impact and effort, what was found (when asked), the steps and the ready fix. */
export function FixDetail({ fix, first, compact = false, showFound = false, readyNote = null }: { fix: ReportFix; first: boolean; compact?: boolean; showFound?: boolean; readyNote?: string | null }): ReactElement {
  const steps = compact ? fix.steps.slice(0, 2) : fix.steps;
  const moreSteps = fix.moreSteps + (fix.steps.length - steps.length);
  const meta = [fix.where, `Impact ${IMPACT_LABELS[fix.impact]}`, fix.effort, fix.programs].filter(Boolean).join('  ·  ');
  return h(
    Keep,
    { style: { flexDirection: 'row', paddingTop: first ? 2 : 9, paddingBottom: 9, borderTopWidth: first ? 0 : 0.75, borderTopColor: COLORS.line } },
    h(View, { style: { width: 30 } }, h(BigNumber, { value: fix.rank, size: 20 })),
    h(
      View,
      { style: { flex: 1 } },
      h(Text, { style: { fontSize: 11, fontWeight: 600, letterSpacing: -0.1, lineHeight: 1.25, ...clamp(2) } }, fix.title),
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 } },
        fix.checkKey ? h(CheckIcon, { check: fix.checkKey, size: 8 }) : null,
        h(Text, { style: { flex: 1, fontSize: 7.5, color: COLORS.muted, ...clamp(1) } }, meta),
      ),
      showFound && fix.found[0] ? h(View, { style: { marginTop: 3 } }, h(ProofLine, { proof: fix.found[0], compact })) : null,
      showFound && fix.why ? h(Text, { style: { ...styles.small, fontSize: 8, color: COLORS.muted, marginTop: 3, ...clamp(compact ? 1 : 2) } }, h(Text, { style: { fontWeight: 600, color: COLORS.black } }, 'Why it matters  '), fix.why) : null,
      ...(steps.length
        ? [
            h(
              View,
              { key: 'steps', style: { marginTop: 5 } },
              ...steps.map((step, index) =>
                h(
                  View,
                  { key: index, style: { flexDirection: 'row', marginTop: index === 0 ? 0 : 2 } },
                  h(Text, { style: { ...NUM, width: 12, fontSize: 8, fontWeight: 600 } }, `${index + 1}.`),
                  h(Text, { style: { flex: 1, fontSize: 8.2, lineHeight: 1.38, ...clamp(compact ? 1 : 2) } }, step),
                ),
              ),
              moreSteps ? h(Text, { style: { ...styles.caption, marginTop: 2 } }, `And ${moreSteps} more ${moreSteps === 1 ? 'step' : 'steps'}${readyNote ? ' in Drishti' : ''}.`) : null,
            ),
          ]
        : []),
      fix.readyFix ? h(ReadyFixBox, { ready: fix.readyFix, compact, note: readyNote }) : null,
      // What the institution said about itself: labelled, and never part of the score.
      fix.added
        ? h(
            Text,
            { style: { ...styles.small, fontSize: 8, marginTop: 5, color: COLORS.muted, ...clamp(compact ? 1 : 2) } },
            h(Text, { style: { fontWeight: 600, color: COLORS.black } }, `${ADDED_BY_YOU}  `),
            `${fix.added.lines.join('. ')}.${fix.added.advice ? ` ${fix.added.advice}` : ''}`,
          )
        : null,
    ),
  );
}

/** The rest of the list, in two columns: one short row each. */
export function FixRows({ rows }: { rows: readonly ReportFixRow[] }): ReactElement {
  const half = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, half), rows.slice(half)];
  return h(
    View,
    { style: { flexDirection: 'row', gap: GAP }, wrap: false },
    ...columns.map((column, index) =>
      h(
        View,
        { key: index, style: { width: HALF } },
        ...column.map((row) =>
          h(
            View,
            { key: row.rank, style: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingVertical: 3.5, borderTopWidth: 0.75, borderTopColor: COLORS.line } },
            h(Text, { style: { ...NUM, fontSize: 8, fontWeight: 500, width: 14 } }, `${row.rank}.`),
            h(
              View,
              { style: { flex: 1 } },
              h(Text, { style: { fontSize: 8, fontWeight: 500, lineHeight: 1.3, ...clamp(2) } }, row.title),
              h(
                View,
                { style: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 } },
                row.checkKey ? h(CheckIcon, { check: row.checkKey, size: 7 }) : null,
                h(Text, { style: { flex: 1, fontSize: 6.8, color: COLORS.muted, ...clamp(1) } }, [row.where, `Impact ${IMPACT_LABELS[row.impact]}`, row.effort].filter(Boolean).join('  ·  ')),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/** In a compact report, 3 fixes in detail; the rest join the ranked list. */
const COMPACT_FIXES = 3;

function FixesPart({ data, compact }: PageProps): ReactElement {
  const detailed = compact ? data.fixes.slice(0, COMPACT_FIXES) : data.fixes;
  const rows: ReportFixRow[] = [
    ...data.fixes.slice(detailed.length).map((fix) => ({ rank: fix.rank, title: fix.title, where: fix.where, checkKey: fix.checkKey, impact: fix.impact, effort: fix.effort })),
    ...data.moreFixes,
  ];
  const [head, ...rest] = detailed;
  const note = 'The whole of it is in Drishti, with Copy.';
  return h(Part, {
    head: { eyebrow: 'What to fix', title: 'What to fix, by impact', lead: `The top ${detailed.length} in detail, with the steps and a ready fix to copy. Then the rest, in order.` },
    first: head ? h(FixDetail, { fix: head, first: true, compact, readyNote: note }) : h(Text, { style: styles.small }, 'Every check is Strong. Keep it that way.'),
    rest: [
      ...rest.map((fix) => h(FixDetail, { key: fix.rank, fix, first: false, compact, readyNote: note })),
      rows.length
        ? h(
            View,
            { key: 'more', style: { marginTop: 8 }, wrap: false },
            h(SectionTitle, { title: 'Also worth fixing' }),
            h(FixRows, { rows }),
            data.moreFixesCount ? h(Text, { style: { ...styles.caption, marginTop: 4 } }, `And ${data.moreFixesCount} more in Drishti.`) : null,
          )
        : null,
    ],
  });
}

// 5. Rivals ----------------------------------------------------------------------------------------------

const RANK_COLUMNS = { place: 30, score: 38, word: 60 } as const;

function RivalsPart({ data, compact }: PageProps): ReactElement {
  const rivals = data.rivals;
  const head = { eyebrow: 'Rivals', title: 'You and your rivals' };
  if (!rivals) {
    return h(Part, { head, first: h(Text, { style: styles.small }, 'Pick 3 to 5 rivals in Drishti, and next month this shows where you stand against each of them, place by place.') });
  }
  const label = (text: string, style: object) => h(Text, { style: { fontSize: 7, fontWeight: 500, color: COLORS.muted, ...style } }, text);
  const sides = rivals.ranking;
  const nameWidth = 96;
  const sideWidth = (CONTENT_WIDTH - nameWidth) / Math.max(1, sides.length);
  return h(Part, {
    head,
    first: h(
      View,
      { style: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.panel, borderRadius: 4 } },
      h(Label, null, 'This month’s one line'),
      h(Text, { style: { fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, letterSpacing: -0.1, ...clamp(3) } }, rivals.line ?? 'Your rivals are being checked. Where you stand shows here next month.'),
    ),
    rest: [
      // The ranking, with the small score and the three words.
      h(
        View,
        { key: 'ranking', style: { marginTop: 14 }, wrap: false },
        h(SectionTitle, { title: 'The ranking', lead: 'You and each rival, from the latest Audit of each. Highest first.' }),
        h(
          View,
          { style: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
          label('Place', { width: RANK_COLUMNS.place }),
          label('Institution', { flex: 1 }),
          label('Score', { width: RANK_COLUMNS.score, textAlign: 'right' }),
          ...PILLARS.map((pillar) => label(PILLAR_LABELS[pillar], { width: RANK_COLUMNS.word, paddingLeft: 12 })),
        ),
        ...sides.map((row, index) =>
          h(
            View,
            { key: index, style: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5.5, paddingHorizontal: 6, backgroundColor: row.you ? COLORS.panel : undefined, borderBottomWidth: 0.75, borderBottomColor: COLORS.line } },
            h(Text, { style: { ...NUM, width: RANK_COLUMNS.place, fontSize: 9, fontWeight: 600 } }, row.place === null ? '' : String(row.place)),
            h(
              Text,
              { style: { flex: 1, fontSize: 9, fontWeight: row.you ? 600 : 500, ...clamp(1) } },
              row.name,
              row.you ? h(Text, { style: { fontSize: 7, fontWeight: 400, color: COLORS.muted } }, '   You') : null,
              row.nearby ? h(Text, { style: { fontSize: 7, fontWeight: 400, color: COLORS.muted } }, '   Nearby city') : null,
            ),
            h(Text, { style: { ...NUM, width: RANK_COLUMNS.score, textAlign: 'right', fontSize: 8, color: COLORS.muted } }, row.overall === null ? '' : String(row.overall)),
            ...(row.words.length
              ? row.words.map((word, wordIndex) => h(Text, { key: wordIndex, style: { width: RANK_COLUMNS.word, paddingLeft: 12, fontSize: 8.5, fontWeight: word === 'Strong' ? 600 : 400 } }, word))
              : [h(Text, { key: 'none', style: { width: RANK_COLUMNS.word * 3, paddingLeft: 12, fontSize: 7.5, color: COLORS.muted } }, 'Not checked yet')]),
          ),
        ),
      ),
      // Place by place: each side's result where a place is scored, what was found where it is not.
      h(
        View,
        { key: 'places', style: { marginTop: 16 }, wrap: false },
        h(SectionTitle, { title: 'Place by place', lead: 'Who leads where. Each side’s result is its share of the place’s points, from its own Audit.' }),
        h(
          View,
          { style: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
          label('Place', { width: nameWidth }),
          ...sides.map((side, index) => h(Text, { key: index, style: { width: sideWidth, paddingRight: 6, fontSize: 7, fontWeight: side.you ? 600 : 500, color: side.you ? COLORS.black : COLORS.muted, ...clamp(2) } }, side.you ? 'You' : side.name)),
        ),
        ...rivals.places.map((place) =>
          h(
            View,
            { key: place.key, style: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5.5, borderBottomWidth: 0.75, borderBottomColor: COLORS.line } },
            h(View, { style: { width: nameWidth, paddingRight: 6 } }, h(Text, { style: { fontSize: 8.5, fontWeight: 600 } }, place.name), h(Text, { style: { fontSize: 7, color: COLORS.muted, marginTop: 1, ...clamp(2) } }, place.lead)),
            ...place.cells.map((cell, index) =>
              h(
                View,
                { key: index, style: { width: sideWidth, paddingRight: 6 } },
                place.scored
                  ? cell.word
                    ? h(WordBar, { word: cell.word, share: cell.share ?? 0, strong: cell.leads })
                    : h(Text, { style: { fontSize: 7, color: COLORS.muted } }, 'Not checked yet')
                  : h(Text, { style: { fontSize: 7, lineHeight: 1.3, ...clamp(compact ? 2 : 3) } }, cell.note ?? 'Not checked yet'),
              ),
            ),
          ),
        ),
      ),
      // Alerts: what they changed this month.
      h(TitledList, {
        key: 'moves',
        marginTop: 16,
        title: `Alerts in ${data.monthName}`,
        lead: rivals.moves.length ? 'What your rivals changed on their public pages, newest first. Learn from them, never copy.' : null,
        rows: rivals.moves.length
          ? rivals.moves.map((move, index) =>
              h(
                Keep,
                { key: index, style: { flexDirection: 'row', paddingVertical: 5.5, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
                h(Text, { style: { width: 70, ...styles.caption } }, move.date),
                h(
                  View,
                  { style: { flex: 1 } },
                  h(Text, { style: { fontSize: 9, fontWeight: 600, ...clamp(1) } }, move.rival, h(Text, { style: { fontSize: 7.5, fontWeight: 400, color: COLORS.muted } }, `   ${move.kind}`)),
                  h(Text, { style: { ...styles.small, marginTop: 1, ...clamp(compact ? 1 : 2) } }, move.text),
                ),
              ),
            )
          : [h(Text, { key: 'none', style: styles.small }, `No new moves found in ${data.monthName}. Drishti checks their public pages every week.`)],
        after: rivals.moreMoves ? h(Text, { style: { ...styles.caption, marginTop: 4 } }, `And ${rivals.moreMoves} more in Drishti.`) : null,
      }),
    ],
  });
}

// 6. Demand ----------------------------------------------------------------------------------------------

function DemandPart({ data, compact }: PageProps): ReactElement {
  const demand = data.demand;
  if (!demand) {
    return h(Part, { head: { eyebrow: 'Demand', title: 'What students want' }, first: h(Text, { style: styles.small }, 'Demand covers the programs on Drishti’s list. Add one in Settings to see what students ask about it.') });
  }
  const lead = [demand.caption, demand.pulledOn ? `Updated ${demand.pulledOn}` : null, 'Grouped only, never one student'].filter(Boolean).join('.  ');
  const fastest = Math.max(0, ...demand.trends.map((trend) => (trend.kind === 'rising' ? (trend.changePct ?? 0) : 0)));
  const mostAsked = Math.max(0, ...demand.questions.map((question) => question.asked));
  const row = (index: number) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 4.5, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line });
  const picks = demand.picks.length
    ? h(
        View,
        null,
        h(SectionTitle, { title: 'Make these 3 this month', lead: 'Each answers what students here ask most, that your website does not answer yet.' }),
        h(
          View,
          { style: { flexDirection: 'row', gap: GAP } },
          ...demand.picks.map((pick, index) =>
            h(
              View,
              { key: index, style: { width: THIRD, padding: 10, backgroundColor: COLORS.panel, borderRadius: 4 } },
              h(BigNumber, { value: index + 1, size: 16 }),
              h(Text, { style: { fontSize: 9, fontWeight: 600, lineHeight: 1.3, marginTop: 6, ...clamp(3) } }, pick.title),
              h(Text, { style: { fontSize: 7, color: COLORS.muted, marginTop: 4, ...clamp(1) } }, [pick.meta, pick.effort].filter(Boolean).join('  ·  ')),
              pick.weight ? h(Text, { style: { fontSize: 7.5, lineHeight: 1.35, marginTop: 3, ...clamp(compact ? 2 : 3) } }, pick.weight) : null,
            ),
          ),
        ),
      )
    : h(Text, { style: styles.small }, 'Make these 3 arrives with the next monthly update.');
  return h(Part, {
    head: { eyebrow: 'Demand', title: `What students in ${demand.place} want`, lead: `${lead}.${demand.note ? ` ${demand.note}` : ''}` },
    first: picks,
    rest: [
      demand.trends.length
        ? h(TitledList, {
            key: 'trends',
            title: 'Programs rising and falling',
            lead: 'What students search for more, and less, this month.',
            rows: demand.trends.map((trend, index) =>
              h(
                Keep,
                { key: index, style: row(index) },
                h(
                  View,
                  { style: { flex: 1, paddingRight: 10 } },
                  h(Text, { style: { fontSize: 8.8, fontWeight: 600, ...clamp(1) } }, trend.text),
                  h(Text, { style: { fontSize: 7, color: COLORS.muted, ...clamp(1) } }, [trend.program, trend.searches].filter(Boolean).join('  ·  ')),
                ),
                h(
                  Text,
                  { style: { width: 92, fontSize: 8, fontWeight: 500 } },
                  trend.word ?? '',
                  trend.change && arrowValue(trend.change) ? h(Text, { style: { ...NUM, color: COLORS.muted } }, `  ${arrowValue(trend.change)}`) : null,
                ),
                h(View, { style: { width: 64 } }, trend.kind === 'rising' && trend.changePct !== null && fastest > 0 ? h(AmountBar, { value: trend.changePct, max: fastest, width: 64 }) : null),
              ),
            ),
          })
        : null,
      demand.questions.length
        ? h(TitledList, {
            key: 'questions',
            title: 'What students ask',
            lead: 'Asked most first, across your programs. Questions asked in Hindi or Assamese are shown in English.',
            rows: demand.questions.map((question, index) =>
              h(
                Keep,
                { key: index, style: row(index) },
                h(Text, { style: { ...NUM, width: 16, fontSize: 8.5, fontWeight: 600 } }, String(index + 1)),
                h(
                  View,
                  { style: { flex: 1, paddingRight: 10 } },
                  h(Text, { style: { fontSize: 8.8, fontWeight: 500, lineHeight: 1.3, ...clamp(compact ? 1 : 2) } }, question.text),
                  h(Text, { style: { fontSize: 7, color: COLORS.muted, ...clamp(1) } }, [question.program, question.count, question.language].filter(Boolean).join('  ·  ')),
                ),
                mostAsked > 0 ? h(AmountBar, { value: question.asked, max: mostAsked, width: 80 }) : null,
              ),
            ),
          })
        : null,
      demand.bestMonths.length
        ? h(TitledList, {
            key: 'months',
            title: 'The best months to post',
            lead: 'When students here look most, for each program.',
            rows: demand.bestMonths.map((entry, index) =>
              h(
                Keep,
                { key: index, style: { ...row(index), paddingVertical: 3.5 } },
                h(Text, { style: { width: 170, fontSize: 8.5, fontWeight: 600, ...clamp(1) } }, entry.program),
                h(Text, { style: { flex: 1, fontSize: 8.5, ...clamp(1) } }, entry.text),
              ),
            ),
          })
        : null,
    ],
  });
}

// 7. Leads (Client) ------------------------------------------------------------------------------------------

function LeadsPart({ data }: PageProps): ReactElement | null {
  const leads = data.leads;
  if (!leads) return null;
  const beforeName = formatMonthName(previousMonth(data.month));
  const label = (text: string, style: object) => h(Text, { style: { fontSize: 7, fontWeight: 500, color: COLORS.muted, ...style } }, text);
  return h(Part, {
    head: { eyebrow: 'Leads', title: 'What your content brought in', lead: leads.line },
    first: h(
      View,
      null,
      h(
        View,
        { style: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
        label('Link', { flex: 1 }),
        label(data.monthName, { width: 80, textAlign: 'right' }),
        label(beforeName, { width: 80, textAlign: 'right' }),
      ),
      ...leads.links.map((link, index) =>
        h(
          View,
          { key: index, style: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4.5, borderBottomWidth: 0.75, borderBottomColor: COLORS.line } },
          h(Text, { style: { flex: 1, fontSize: 8.8, fontWeight: 500, ...clamp(1) } }, link.name),
          h(Text, { style: { ...NUM, width: 80, textAlign: 'right', fontSize: 9, fontWeight: 600 } }, String(link.count)),
          h(Text, { style: { ...NUM, width: 80, textAlign: 'right', fontSize: 8.5, color: COLORS.muted } }, String(link.before)),
        ),
      ),
      leads.moreLinks ? h(Text, { style: { ...styles.caption, marginTop: 4 } }, `And ${leads.moreLinks} more links in Drishti.`) : null,
      h(Text, { style: { ...styles.caption, marginTop: 6 } }, 'Counts only. A student’s details stay in Drishti, for your own people.'),
    ),
  });
}

// 8. Progress and sources ---------------------------------------------------------------------------------------

const PROGRESS_COLUMNS = [
  { key: 'month', label: 'Month', width: 58 },
  { key: 'score', label: 'Score', width: 40 },
  { key: 'discovered', label: 'Visibility', width: 66 },
  { key: 'trusted', label: 'Trust', width: 66 },
  { key: 'chosen', label: 'Chosen', width: 66 },
  { key: 'change', label: 'Change', width: 0 },
  { key: 'place', label: 'Among rivals', width: 80 },
] as const;

function ProgressPart({ data }: PageProps): ReactElement {
  const cell = (key: (typeof PROGRESS_COLUMNS)[number]['key']) => {
    const column = PROGRESS_COLUMNS.find((entry) => entry.key === key);
    return column?.width ? { width: column.width } : { flex: 1 };
  };
  return h(Part, {
    head: { eyebrow: 'Progress and sources', title: 'Month by month', lead: 'Your score, small, and the three words each month, with your place among your rivals.' },
    first: h(
      View,
      null,
      h(
        View,
        { style: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: COLORS.black } },
        ...PROGRESS_COLUMNS.map((column) => h(Text, { key: column.key, style: { ...cell(column.key), fontSize: 7, fontWeight: 500, color: COLORS.muted } }, column.label)),
      ),
      ...data.progress.map((row, index) =>
        h(
          View,
          { key: row.month, style: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: index === data.progress.length - 1 ? COLORS.panel : undefined, borderBottomWidth: 0.75, borderBottomColor: COLORS.line } },
          h(Text, { style: { ...cell('month'), fontSize: 8.5, fontWeight: 600 } }, row.label),
          h(Text, { style: { ...NUM, ...cell('score'), fontSize: 8, color: COLORS.muted } }, String(row.score)),
          ...PILLARS.map((pillar, wordIndex) => h(Text, { key: pillar, style: { ...cell(pillar), fontSize: 8.5, fontWeight: row.words[wordIndex] === 'Strong' ? 600 : 400 } }, row.words[wordIndex] ?? '')),
          h(Text, { style: { ...cell('change'), fontSize: 8, color: COLORS.muted } }, row.change ? (arrowValue(row.change) ?? row.change) : 'First Audit'),
          h(Text, { style: { ...cell('place'), fontSize: 8, color: COLORS.muted } }, row.place ?? ''),
        ),
      ),
    ),
    rest: [
      h(
        View,
        { key: 'sources', style: { marginTop: 16 }, wrap: false },
        h(SectionTitle, { title: 'Sources and dates checked' }),
        ...data.sources.map((note) =>
          h(
            Keep,
            { key: note.label, style: { flexDirection: 'row', paddingVertical: 2.5 } },
            h(Text, { style: { width: 58, fontSize: 7.5, fontWeight: 600 } }, note.label),
            h(Text, { style: { flex: 1, fontSize: 7.5, lineHeight: 1.4, color: COLORS.muted, ...clamp(3) } }, note.text),
          ),
        ),
      ),
      data.contact
        ? h(
            Keep,
            { key: 'contact', style: { marginTop: 18 } },
            h(
              Text,
              { style: { fontSize: 8.5, color: COLORS.muted } },
              `${data.contact.text} `,
              h(Link, { src: `mailto:${data.contact.email}`, style: { color: COLORS.black, fontWeight: 500, textDecoration: 'none' } }, data.contact.email),
            ),
          )
        : null,
    ],
  });
}

/** Everything after the cover, in one run of ivory pages. */
export function ReportPages({ data, compact = false }: PageProps): ReactElement {
  return h(ContentPage, {
    data,
    children: [
      h(SummaryPart, { key: 'summary', data, compact }),
      h(PlacesPart, { key: 'places', places: data.places, compact, lead: 'What students find about you in 5 places: what’s good and what to fix, each with where it was found and when.' }),
      h(FixesPart, { key: 'fixes', data, compact }),
      h(RivalsPart, { key: 'rivals', data, compact }),
      h(DemandPart, { key: 'demand', data, compact }),
      h(LeadsPart, { key: 'leads', data, compact }),
      h(ProgressPart, { key: 'progress', data, compact }),
    ],
  });
}

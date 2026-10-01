// The shared Audit as a PDF, in the report's design: a black cover, then ivory pages with the
// score and what's working, what to fix (the top 3 in full, then the rest under one line saying
// AdmitLabs can fix them), program by program, and every check with what was found, the source and
// the date.

import { createElement as h, type ReactElement } from 'react';
import { Document, Link, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { ADMITLABS_CAN_FIX } from '../../team/share.ts';
import type { AuditPdfData } from '../audit.ts';
import type { ReportFix } from '../data.ts';
import { BigNumber, clamp, Keep, LabelChip, Lockup, Meter, PageHead, ScoreBar, SectionTitle, ValueText } from './parts.ts';
import { ContentPage, FixBlock, ProgramsPage } from './pages.ts';
import { COLORS, NUM, PAGE, registerFonts, styles } from './theme.ts';

const CONTENT_WIDTH = PAGE.width - PAGE.side * 2;
const THIRD = (CONTENT_WIDTH - 20) / 3;

function AuditCover({ data }: { data: AuditPdfData }): ReactElement {
  const quiet = { fontSize: 8, color: COLORS.slate };
  return h(
    Page,
    { size: 'A4', style: styles.cover },
    h(
      View,
      { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
      h(Lockup, { size: 17 }),
      h(Text, { style: { fontSize: 7.5, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.slate } }, 'Audit'),
    ),
    h(
      View,
      { style: { marginTop: 132 } },
      h(Text, { style: { fontSize: 11, fontWeight: 500, color: COLORS.slate, marginBottom: 12 } }, `Checked ${data.checkedOn}`),
      h(Text, { style: { fontSize: 36, fontWeight: 600, letterSpacing: -1, lineHeight: 1.08, ...clamp(3) } }, data.institution.name),
      h(Text, { style: { fontSize: 10, color: COLORS.slate, marginTop: 10 } }, `${data.institution.place}  ·  ${data.institution.website}`),
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
      h(View, { style: { flexDirection: 'row', alignItems: 'center', marginTop: 16 } }, h(LabelChip, { label: data.cover.label, dark: true })),
      h(Text, { style: { fontSize: 15, fontWeight: 500, lineHeight: 1.35, letterSpacing: -0.2, marginTop: 18, maxWidth: 400, ...clamp(3) } }, data.cover.verdict),
    ),
    h(
      View,
      { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineDark } },
      h(Text, { style: quiet }, `Shared by AdmitLabs on ${data.sharedOn}`),
      h(Text, { style: quiet }, 'Public data only'),
    ),
  );
}

function AuditSummaryPage({ data }: { data: AuditPdfData }): ReactElement {
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'Audit', title: 'Where you stand', lead: 'Overall, and the three pillars: how easily students find you, trust you and choose you.' }),
      h(
        View,
        { key: 'overall', style: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 } },
        h(View, { style: { flexDirection: 'row', alignItems: 'flex-end' } }, h(BigNumber, { value: data.cover.score, size: 72 }), h(Text, { style: { ...NUM, fontSize: 11, color: COLORS.muted, marginLeft: 6, marginBottom: 8 } }, '/ 100')),
        h(View, { style: { marginBottom: 10 } }, h(LabelChip, { label: data.cover.label })),
      ),
      h(
        View,
        { key: 'pillars', style: { flexDirection: 'row', gap: 10, marginTop: 20 } },
        ...data.pillars.map((pillar) =>
          h(
            View,
            { key: pillar.pillar, style: { width: THIRD, padding: 12, backgroundColor: COLORS.panel, borderRadius: 4 } },
            h(Text, { style: { fontSize: 9, fontWeight: 600 } }, pillar.name),
            h(View, { style: { marginTop: 8, marginBottom: 8 } }, h(BigNumber, { value: pillar.score, size: 26 })),
            h(ScoreBar, { score: pillar.score }),
            h(Text, { style: { ...styles.caption, marginTop: 8 } }, pillar.label),
          ),
        ),
      ),
      h(
        View,
        { key: 'working', style: styles.section },
        h(SectionTitle, { title: 'What’s working', lead: 'The three things doing the most for your score.' }),
        ...data.working.map((item, index) =>
          h(
            Keep,
            { key: item.rank, style: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
            h(Text, { style: { ...NUM, width: 22, fontSize: 10, fontWeight: 600 } }, String(index + 1)),
            h(
              View,
              { style: { flex: 1, paddingRight: 12 } },
              h(Text, { style: { fontSize: 10.5, fontWeight: 600 } }, item.name),
              item.programs ? h(Text, { style: { ...styles.caption, ...clamp(1) } }, item.programs) : null,
              item.finding ? h(Text, { style: { ...styles.small, color: COLORS.muted, marginTop: 3, ...clamp(2) } }, item.finding) : null,
            ),
            h(View, { style: { width: 128, alignItems: 'flex-end', gap: 5 } }, h(Meter, { result: item.result }), h(ValueText, { text: item.worth, style: { ...styles.caption, textAlign: 'right' } })),
          ),
        ),
      ),
    ],
  });
}

/** A fix beyond the top 3: the problem, and what it could add. */
function MoreFix({ fix, first }: { fix: ReportFix; first: boolean }): ReactElement {
  const single = fix.results.length === 1 && fix.results[0]?.program === null ? fix.results[0] : null;
  return h(
    Keep,
    { style: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 0.75, borderTopColor: first ? COLORS.black : COLORS.line } },
    h(Text, { style: { ...NUM, width: 34, fontSize: 10, fontWeight: 600 } }, String(fix.rank)),
    h(
      View,
      { style: { flex: 1 } },
      h(
        View,
        { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
        h(
          View,
          { style: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 12 } },
          h(Text, { style: { fontSize: 10, fontWeight: 600 } }, fix.name),
          single ? h(Meter, { result: single.result, size: 'sm' }) : fix.resultsNote ? h(Text, { style: styles.caption }, fix.resultsNote) : null,
        ),
        h(ValueText, { text: fix.gain, style: { ...styles.caption, color: COLORS.black } }),
      ),
      !single && fix.results.length
        ? h(
            View,
            { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 } },
            ...fix.results.map((part, index) =>
              h(
                View,
                { key: index, style: { flexDirection: 'row', alignItems: 'center', gap: 5 } },
                part.program ? h(Text, { style: { fontSize: 7.5, color: COLORS.muted } }, part.program) : null,
                h(Meter, { result: part.result, size: 'sm' }),
              ),
            ),
          )
        : null,
      fix.finding ? h(Text, { style: { ...styles.small, color: COLORS.muted, marginTop: 4, ...clamp(2) } }, h(Text, { style: { fontWeight: 600, color: COLORS.black } }, 'Found  '), fix.finding) : null,
    ),
  );
}

function AuditFixesPage({ data }: { data: AuditPdfData }): ReactElement {
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'What to fix', title: 'What to fix, ranked', lead: 'Ranked by how much each could add to your score. The top 3 are explained in full.' }),
      ...(data.topFixes.length
        ? data.topFixes.map((fix, index) => h(FixBlock, { key: fix.rank, fix, first: index === 0, compact: false }))
        : [h(Text, { key: 'none', style: styles.small }, 'Every check is Strong. Keep it that way.')]),
      ...(data.moreFixes.length
        ? [
            h(
              View,
              { key: 'more', style: { marginTop: 14 } },
              h(SectionTitle, { title: 'More to fix', lead: `What was found for each. ${ADMITLABS_CAN_FIX}` }),
              ...data.moreFixes.map((fix, index) => h(MoreFix, { key: fix.rank, fix, first: index === 0 })),
            ),
          ]
        : []),
    ],
  });
}

function AuditChecksPage({ data }: { data: AuditPdfData }): ReactElement {
  return h(ContentPage, {
    data,
    children: [
      h(PageHead, { key: 'head', eyebrow: 'Everything we checked', title: 'Every check, with its source', lead: 'What was found for each check, where and when. Public pages only.' }),
      ...data.checks.map((group) =>
        h(
          View,
          { key: group.pillar, style: { marginBottom: 14 } },
          h(Keep, { style: { marginBottom: 2 } }, h(Text, { style: styles.sectionTitle }, group.name)),
          ...group.checks.map((check, index) =>
            h(
              Keep,
              { key: check.name, style: { paddingVertical: 6, borderTopWidth: 0.75, borderTopColor: index === 0 ? COLORS.black : COLORS.line } },
              h(
                View,
                { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
                h(Text, { style: { fontSize: 9.5, fontWeight: 600 } }, check.name),
                check.note ? h(Text, { style: { fontSize: 7.5, fontWeight: 600, color: COLORS.black } }, check.note) : null,
              ),
              ...check.parts.map((part, partIndex) =>
                h(
                  View,
                  { key: partIndex, style: { flexDirection: 'row', marginTop: 4 } },
                  h(
                    View,
                    { style: { width: 132, gap: 3 } },
                    part.program ? h(Text, { style: { fontSize: 7.5, color: COLORS.muted, ...clamp(1) } }, part.program) : null,
                    h(Meter, { result: part.result, size: 'sm' }),
                  ),
                  h(
                    View,
                    { style: { flex: 1 } },
                    part.finding ? h(Text, { style: { fontSize: 8, lineHeight: 1.35, ...clamp(2) } }, part.finding) : null,
                    h(Text, { style: { fontSize: 7, lineHeight: 1.35, color: COLORS.muted, ...clamp(1) } }, [part.source, `Checked ${part.checkedOn}`].filter(Boolean).join('  ·  ')),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      h(
        Keep,
        { key: 'closing', style: { marginTop: 10, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineMedium } },
        h(
          Text,
          { style: { fontSize: 9, color: COLORS.muted } },
          `${data.closing.text} `,
          h(Link, { src: `mailto:${data.closing.email}`, style: { color: COLORS.black, fontWeight: 500, textDecoration: 'none' } }, data.closing.email),
        ),
        h(Text, { style: { fontSize: 8, color: COLORS.muted, marginTop: 4 } }, data.closing.freeAudit),
      ),
    ],
  });
}

export async function renderAuditPdf(data: AuditPdfData): Promise<Buffer> {
  registerFonts();
  const madeAt = new Date(data.madeAt);
  return renderToBuffer(
    h(
      Document,
      {
        title: `Drishti Audit, ${data.institution.name}`,
        author: 'AdmitLabs',
        subject: data.monthLabel,
        creator: 'Drishti by AdmitLabs',
        producer: 'Drishti by AdmitLabs',
        language: 'en-IN',
        creationDate: madeAt,
        modificationDate: madeAt,
      },
      h(AuditCover, { data }),
      h(AuditSummaryPage, { data }),
      h(AuditFixesPage, { data }),
      h(ProgramsPage, { data }),
      h(AuditChecksPage, { data }),
    ),
  );
}

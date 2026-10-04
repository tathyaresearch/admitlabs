// The shared Audit as a PDF, in the report's design and in the shared page's order: a black cover
// with Visibility, Trust and Chosen, then one run of ivory pages: what to fix first (the top 3 in
// full), the rest by name under one line saying AdmitLabs can fix them, each place with what's good
// and what to fix and their proof, and the closing line. Checks carry their icons, sources their
// platform's mark.

import { createElement as h, type ReactElement } from 'react';
import { Document, Link, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { ADMITLABS_CAN_FIX } from '../../team/share.ts';
import type { AuditPdfData } from '../audit.ts';
import { clamp, Keep, Lockup, SectionTitle } from './parts.ts';
import { ContentPage, FixDetail, FixRows, Part, PlacesPart, WordColumns } from './pages.ts';
import { COLORS, registerFonts, styles } from './theme.ts';

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
      { style: { marginTop: 120 } },
      h(Text, { style: { fontSize: 11, fontWeight: 500, color: COLORS.slate, marginBottom: 12 } }, `Checked ${data.checkedOn}`),
      h(Text, { style: { fontSize: 36, fontWeight: 600, letterSpacing: -1, lineHeight: 1.08, ...clamp(3) } }, data.institution.name),
      h(Text, { style: { fontSize: 10, color: COLORS.slate, marginTop: 10 } }, `${data.institution.place}  ·  ${data.institution.website}`),
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
      h(Text, { style: quiet }, `Shared by AdmitLabs on ${data.sharedOn}`),
      h(Text, { style: quiet }, 'Public data only'),
    ),
  );
}

function AuditPages({ data }: { data: AuditPdfData }): ReactElement {
  const [head, ...rest] = data.topFixes;
  return h(ContentPage, {
    data,
    children: [
      h(Part, {
        key: 'fixes',
        head: { first: true, eyebrow: 'What to fix first', title: 'The three changes with the most impact', lead: 'From every place, each with what was found, why it matters, the steps and a ready fix.' },
        first: head ? h(FixDetail, { fix: head, first: true, showFound: true }) : h(Text, { style: styles.small }, 'Every check is Strong. Keep it that way.'),
        rest: [
          ...rest.map((fix) => h(FixDetail, { key: fix.rank, fix, first: false, showFound: true })),
          data.moreFixes.length
            ? h(View, { key: 'more', style: { marginTop: 10 }, wrap: false }, h(SectionTitle, { title: 'More to fix', lead: ADMITLABS_CAN_FIX }), h(FixRows, { rows: data.moreFixes }))
            : null,
        ],
      }),
      h(PlacesPart, { key: 'places', places: data.places, lead: 'What students find about you in 5 places: what’s good and what to fix, each with where it was found and when. Public pages only.' }),
      h(
        Keep,
        { key: 'closing', style: { marginTop: 18, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: COLORS.lineMedium } },
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
      h(AuditPages, { data }),
    ),
  );
}

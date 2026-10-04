// Renders a report snapshot to a PDF file in memory. Runs on the server only (the report job,
// the script and the seed); the web app never loads the PDF library.
//
// Most months come to about 7 pages: the cover, then one run of pages from This month in short to
// the sources. A month with long lists and long sentences can run over, so a report that would pass the
// cap is made again in its compact form (3 fixes in detail instead of 5, fewer steps, shorter
// limits on long sentences). Nothing is dropped from the ranked lists.

import { createElement as h } from 'react';
import { Document, renderToBuffer } from '@react-pdf/renderer';
import type { ReportData } from '../data.ts';
import { CoverPage, ReportPages } from './pages.ts';
import { registerFonts } from './theme.ts';

/** Never more than this many pages: short enough to read in 5 minutes. */
export const MAX_PAGES = 8;

/** Pages in a PDF made by renderReport. */
export function pageCount(pdf: Uint8Array): number {
  return (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
}

export async function renderLayout(data: ReportData, compact: boolean): Promise<Buffer> {
  registerFonts();
  const madeAt = new Date(data.madeAt);
  const pages = [CoverPage, ReportPages];
  const document = h(
    Document,
    {
      title: `Drishti report, ${data.institution.name}, ${data.monthLabel}`,
      author: 'AdmitLabs',
      subject: `Monthly report for ${data.monthLabel}`,
      creator: 'Drishti by AdmitLabs',
      producer: 'Drishti by AdmitLabs',
      language: 'en-IN',
      creationDate: madeAt,
      modificationDate: madeAt,
    },
    ...pages.map((page, index) => h(page, { key: index, data, compact })),
  );
  return renderToBuffer(document);
}

export async function renderReport(data: ReportData): Promise<Buffer> {
  const pdf = await renderLayout(data, false);
  return pageCount(pdf) <= MAX_PAGES ? pdf : renderLayout(data, true);
}

// The full sample report, as a PDF download from the product page: Larkmoor University's August
// 2026 report, the same one the page's previews show (src/product/showcase.ts), from fictional
// sample data, marked "Sample report. Fictional data." on every page. Made once at build, never
// from the database.

import { loadShowcase } from '@/product/showcase';
import { renderReport } from '@/report/pdf/render';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const pdf = await renderReport((await loadShowcase()).report);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="drishti-sample-report.pdf"',
      // Fictional data: keep it out of search results.
      'x-robots-tag': 'noindex',
    },
  });
}

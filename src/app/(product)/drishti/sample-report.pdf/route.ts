// The full sample report, as a PDF download from the product page: Eastgate University's August
// 2026 report, from fictional sample data, marked "Sample report. Fictional data." on every page.
// Made once at build, never from the database.

import { renderReport } from '@/report/pdf/render';
import { sampleReportData } from '@/sample/report';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const pdf = await renderReport(await sampleReportData());
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="drishti-sample-report.pdf"',
      // Fictional data: keep it out of search results.
      'x-robots-tag': 'noindex',
    },
  });
}

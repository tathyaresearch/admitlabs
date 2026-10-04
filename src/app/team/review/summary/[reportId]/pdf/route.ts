// A waiting month's PDF as it would go out, made now with the summary's lines as the team left
// them, for the team's review. Team only: the report is looked up as the team first; the PDF needs
// the server's key to read the month.

import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';
import { renderMonth } from '@/report/jobs';
import { parseSummary } from '@/report/summary';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  await requireTeamViewer();
  const { reportId } = await params;
  if (!UUID.test(reportId)) notFound();
  const { data: report, error } = await (await createClient()).from('reports').select('institution_id, month, created_at, summary').eq('id', reportId).maybeSingle();
  if (error) throw new Error(`Could not load the report: ${error.message}`);
  if (!report) notFound();

  const made = await renderMonth(createAdminClient(), report.institution_id, report.month.slice(0, 7), new Date(report.created_at), parseSummary(report.summary));
  return new NextResponse(new Uint8Array(made.pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="drishti-report-${report.month.slice(0, 7)}-review.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}

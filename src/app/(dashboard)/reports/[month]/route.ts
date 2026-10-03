// Downloads one monthly report. The file sits in a private bucket: this looks the report up as
// the signed-in person and asks for a link that works for one minute, so the database checks
// membership every time (past reports stay downloadable after a Paid plan ends). Anyone else
// gets "not found".

import { NextResponse } from 'next/server';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

const LINK_SECONDS = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ month: string }> }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  const { month } = await params;
  const viewer = await requireInstitutionViewer();
  const notFound = () => new NextResponse('Report not found.', { status: 404 });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return notFound();

  const institution = viewer.membership.institution;
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from('reports')
    .select('storage_path')
    .eq('institution_id', institution.id)
    .eq('month', `${month}-01`)
    .maybeSingle();
  if (error) throw new Error(`Could not load the report: ${error.message}`);
  if (!report) return notFound();

  const link = await supabase.storage.from('reports').createSignedUrl(report.storage_path, LINK_SECONDS, { download: `drishti-report-${institution.slug}-${month}.pdf` });
  if (link.error || !link.data) return notFound();
  return NextResponse.redirect(link.data.signedUrl, 303);
}

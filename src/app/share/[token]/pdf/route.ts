// The shared Audit as a PDF, for anyone with the link: the same content as the page. An expired or
// stopped link goes back to the page, which says so.

import { NextResponse } from 'next/server';
import { buildAuditPdf } from '@/report/audit';
import { renderAuditPdf } from '@/report/pdf/audit';
import { loadSharedLink } from '@/lib/share/load';
import { APP_OPEN, APP_URL } from '@/lib/urls';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  const { token } = await params;
  const link = await loadSharedLink(token);
  if (!link) return new NextResponse('Not found.', { status: 404 });
  if (link.status === 'expired') return NextResponse.redirect(new URL(`/share/${token}`, request.url), 303);

  const pdf = await renderAuditPdf(buildAuditPdf(link, { madeAt: new Date(link.sharedAt), freeAuditUrl: `${APP_URL}/signup` }));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="drishti-audit.pdf"',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

// The latest team Audit of a prospect (or rival record) as a PDF, for the team to send on. The
// same content a share link shows: how to fix for the top 3 fixes only. Team only.

import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { latestStoredAudit } from '@/audit/read';
import { TEAM_RULES } from '@/config/team';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/urls';
import { buildAuditPdf } from '@/report/audit';
import { renderAuditPdf } from '@/report/pdf/audit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireTeamViewer();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [institution, programs, audit] = await Promise.all([
    supabase.from('institutions').select('slug, name, type, city, state, website').eq('id', id).maybeSingle(),
    supabase.from('programs').select('id, name').eq('institution_id', id),
    latestStoredAudit(supabase, id, undefined, ['team']),
  ]);
  if (institution.error || programs.error) throw new Error('Could not load the institution.');
  if (!institution.data || !audit) notFound();

  const now = new Date();
  const pdf = await renderAuditPdf(
    buildAuditPdf(
      {
        sharedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + TEAM_RULES.shareLinkDays * 86_400_000).toISOString(),
        institution: institution.data,
        audit,
        programNames: new Map((programs.data ?? []).map((program) => [program.id, program.name])),
      },
      { madeAt: now, freeAuditUrl: `${APP_URL}/login` },
    ),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="drishti-audit-${institution.data.slug}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}

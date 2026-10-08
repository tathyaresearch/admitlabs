// Enquiries as a CSV file (spec section 27): the leads the list shows with the same filters, each
// with its notes, phones as "91 98765 43210" so a spreadsheet keeps them as text. Row level
// security decides which leads: every one for Admins and Team members, a Client manager's own.

import { NextResponse } from 'next/server';
import { indiaToday, parseLeadFilters, teamLeadsCsv } from '@/enquiries/view';
import { getViewer } from '@/lib/auth/viewer';
import { loadLeadList, loadLeadNotes } from '@/lib/team/enquiries';
import { APP_OPEN } from '@/lib/urls';

export async function GET(request: Request): Promise<Response> {
  if (!APP_OPEN) return new NextResponse('Not found', { status: 404 });
  const viewer = await getViewer();
  if (!viewer?.teamRole || viewer.viewingAs) return new NextResponse('Not found', { status: 404 });
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  const today = indiaToday(new Date());
  const { rows } = await loadLeadList(parseLeadFilters(query), viewer.userId, today);
  const notes = await loadLeadNotes(rows.map((row) => row.id));
  const csv = teamLeadsCsv(
    rows.map((row) => ({
      createdAt: row.createdAt,
      lastInAt: row.lastInAt,
      name: row.name,
      institution: row.institution,
      city: row.city,
      phone: row.phone,
      email: row.email,
      wants: row.wants,
      source: row.source,
      sourceDetail: row.sourceDetail,
      status: row.status,
      lostReason: row.lostReason,
      owner: row.owner,
      nextFollowUp: row.nextFollowUp,
      notes: notes.get(row.id) ?? [],
    })),
  );
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="admitlabs-enquiries-${today}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}

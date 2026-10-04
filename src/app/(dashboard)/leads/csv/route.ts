// Download CSV: every enquiry kept, newest first, for the college's own people (spec section 23).
// The AdmitLabs team never gets a student's details, in "view as" too: not found.

import type { InstitutionViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { leadsCsv } from '@/leads/csv';
import { istParts } from '@/domain/dates';
import { loadLeads } from '@/lib/leads/load';
import { APP_OPEN } from '@/lib/urls';

const pad = (value: number) => String(value).padStart(2, '0');

export async function GET(): Promise<Response> {
  if (!APP_OPEN) return new Response('Not found', { status: 404 });
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.viewingAs) return new Response('Not found', { status: 404 });
  const { leads } = await loadLeads(viewer as InstitutionViewer, null);
  const csv = leadsCsv(
    leads.map((lead) => ({ sentAt: lead.sentAt, name: lead.name, phone: lead.phone, email: lead.email, city: lead.city, course: lead.course, link: lead.linkName, usedOn: lead.usedOn })),
  );
  const { year, month, day } = istParts(new Date());
  const file = `${viewer.membership.institution.slug}-enquiries-${year}-${pad(month)}-${pad(day)}.csv`;
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${file}"`,
      'cache-control': 'private, no-store',
    },
  });
}

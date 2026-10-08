// Opens one version of a Client's Blueprint (spec section 26), to view (?download=1 to save it).
// The PDF sits in a private bucket: this looks the version up as the signed-in person and asks
// for a link that works for one minute, so the database decides every time. The college's people
// reach only Shared and Approved versions of their own college; the team and the Client's
// managers, every version. Anyone else gets "not found".

import { NextResponse } from 'next/server';
import { BRAIN_RULES } from '@/config/brain';
import { requireViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

const LINK_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  await requireViewer();
  const { id } = await params;
  const notFound = () => new NextResponse('File not found.', { status: 404 });
  if (!UUID.test(id)) return notFound();
  const supabase = await createClient();
  const { data: version } = await supabase.from('brain_blueprints').select('file_path, file_name').eq('id', id).maybeSingle();
  if (!version) return notFound();
  const download = new URL(request.url).searchParams.get('download') === '1';
  const link = await supabase.storage.from(BRAIN_RULES.blueprint.bucket).createSignedUrl(version.file_path, LINK_SECONDS, download ? { download: version.file_name } : undefined);
  if (link.error || !link.data) return notFound();
  return NextResponse.redirect(link.data.signedUrl, 303);
}

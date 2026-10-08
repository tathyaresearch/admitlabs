// Opens a file kept in a Client's Brain (a logo, brand guidelines). The file sits in a private
// bucket: this looks the fact up as the signed-in person and asks for a link that works for one
// minute, so the database checks who may read the Brain every time. Anyone else gets "not found".

import { NextResponse } from 'next/server';
import { BRAIN_RULES } from '@/config/brain';
import { requireViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { APP_OPEN } from '@/lib/urls';

const LINK_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  await requireViewer();
  const { id } = await params;
  const notFound = () => new NextResponse('File not found.', { status: 404 });
  if (!UUID.test(id)) return notFound();
  const supabase = await createClient();
  const { data: item } = await supabase.from('brain_items').select('kind, fields').eq('id', id).in('kind', ['logo', 'guidelines']).maybeSingle();
  const file = (item?.fields as { file?: { path?: string; name?: string } } | undefined)?.file;
  if (!file?.path) return notFound();
  const link = await supabase.storage.from(BRAIN_RULES.files.bucket).createSignedUrl(file.path, LINK_SECONDS, item?.kind === 'guidelines' ? { download: file.name ?? 'brand-guidelines.pdf' } : undefined);
  if (link.error || !link.data) return notFound();
  return NextResponse.redirect(link.data.signedUrl, 303);
}

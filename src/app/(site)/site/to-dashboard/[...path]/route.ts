import { NextResponse, type NextRequest } from 'next/server';
import { APP_OPEN, APP_URL, safeNextPath } from '@/lib/urls';

// A dashboard path asked for on the website's address (admitlabs.localhost:3000/login), sent on to
// the dashboard's address with its query. src/proxy.ts hands it here as /site/to-dashboard/login
// only when its own redirect would not work: Next makes a proxy's redirect relative when it points
// at the server's own address, which the dashboard has locally (localhost:3000). Only ever to the
// dashboard, with a path inside it.
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) return new NextResponse('Not found.', { status: 404 });
  const { path } = await params;
  const target = safeNextPath(`/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`) ?? '/';
  return NextResponse.redirect(`${APP_URL}${target}`, 307);
}

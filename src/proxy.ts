// Next.js 16 proxy (formerly middleware). First, which surface answers by the address the request
// came to (src/lib/hosts.ts): the website and the product page need no sign-in and no session
// work. Then, for the dashboard: refreshes the session and sends signed-out visitors to sign in.
// Pages still check the user on the server; this is not the only guard.

import { NextResponse, type NextRequest } from 'next/server';
import { routeFor } from '@/lib/hosts';
import { updateSession } from '@/lib/supabase/proxy';
import { APP_URL, SITE_URL } from '@/lib/urls';

const PUBLIC_PREFIXES = ['/login', '/drishti', '/share', '/site'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  // The design system page is open while developing. In production it is for the team only.
  return process.env.NODE_ENV !== 'production' && (pathname === '/design-system' || pathname.startsWith('/design-system/'));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const route = routeFor({ host: request.headers.get('host') ?? request.nextUrl.host, pathname, search }, { site: SITE_URL, app: APP_URL });
  if (route.kind === 'redirect') return NextResponse.redirect(route.url, route.permanent ? 308 : 307);
  if (route.kind === 'pass') return NextResponse.next();
  if (route.kind === 'site') {
    const url = request.nextUrl.clone();
    url.pathname = route.path;
    return NextResponse.rewrite(url);
  }

  const { response, userId } = await updateSession(request);
  if (userId || isPublic(pathname)) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  const redirect = NextResponse.redirect(loginUrl);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/).*)'],
};

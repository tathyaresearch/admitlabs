// Next.js 16 proxy (formerly middleware). First, which surface answers by the address the request
// came to (src/lib/hosts.ts): the website and the product page need no sign-in and no session
// work. Then, for the dashboard: refreshes the session and sends signed-out visitors to sign in.
// While the dashboard is closed (production, until Drishti opens) every request is the website’s,
// so nothing here reaches a database.
// Pages still check the user on the server; this is not the only guard.

import { NextResponse, type NextRequest } from 'next/server';
import { redirectBecomesRelative, routeFor } from '@/lib/hosts';
import { updateSession } from '@/lib/supabase/proxy';
import { APP_OPEN, APP_URL, SITE_URL } from '@/lib/urls';

const PUBLIC_PREFIXES = ['/login', '/signup', '/drishti', '/share', '/site'];

/** The route handler that sends a dashboard path on to the dashboard's address, when this cannot. */
const TO_DASHBOARD = '/site/to-dashboard';

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  // The design system page and the version 2 mock page are open while developing. In production
  // the design system is for the team only and the mock page is not found.
  return process.env.NODE_ENV !== 'production' && ['/design-system', '/mock'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') ?? request.nextUrl.host;
  const route = routeFor({ host, pathname, search }, { site: SITE_URL, app: APP_URL }, APP_OPEN);
  if (route.kind === 'redirect') {
    // Locally the dashboard has the server's own address, and Next would make this redirect
    // relative, keeping the visitor on the website's address. A route handler sends it instead.
    const target = new URL(route.url);
    if (target.origin === new URL(APP_URL).origin && redirectBecomesRelative(route.url, request.nextUrl.origin, host)) {
      // The path rides in the route's own segments; the query stays the visitor's.
      const hop = request.nextUrl.clone();
      hop.pathname = `${TO_DASHBOARD}${target.pathname}`;
      return NextResponse.rewrite(hop);
    }
    return NextResponse.redirect(route.url, route.permanent ? 308 : 307);
  }
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
  // robots.txt and sitemap.xml answer by address themselves, with no sign-in on any address.
  // Pictures in public/brand and public/work (the website's Our work) are served as they are:
  // Next's image optimizer asks for them with no address, which would read as the dashboard's.
  // So is the grain in public/textures, which /signup and /login use on the dashboard's address.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/|work/|textures/|robots.txt|sitemap.xml).*)'],
};

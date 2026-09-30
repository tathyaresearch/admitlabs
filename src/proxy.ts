// Next.js 16 proxy (formerly middleware): refreshes the session and sends signed-out
// visitors to sign in. Pages still check the user on the server; this is not the only guard.

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

const PUBLIC_PREFIXES = ['/login', '/drishti', '/share'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  // The design system page is open while developing. In production it is for the team only.
  return process.env.NODE_ENV !== 'production' && (pathname === '/design-system' || pathname.startsWith('/design-system/'));
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
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

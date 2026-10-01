// Which surface answers a request, by the address it came to. Pure, so it is tested on its own;
// src/proxy.ts applies the answer.
//
//   Website address (admitlabs.in):  the website, its pages served from /site inside the app;
//                                    /drishti as it is; dashboard paths move to the dashboard.
//   Dashboard address (app.admitlabs.in): the dashboard as it is; /drishti and /site move to the
//                                    website.
//   www on the website address:      the same page without www.
//   Any other address (a preview):   everything as it is, so /site and /drishti can be looked at.

export const SITE_PREFIX = '/site';

/** The dashboard's first path segments. On the website's address they move to the dashboard's. */
export const APP_SECTIONS: readonly string[] = ['login', 'onboarding', 'audit', 'rivals', 'demand', 'reports', 'plan', 'settings', 'notifications', 'team', 'share', 'design-system'];

export type HostRoute =
  /** Carry on: the dashboard's own rules apply (sign in and so on). */
  | { kind: 'app' }
  /** Serve as it is, no sign-in needed: Next's own files, files with an extension, /drishti. */
  | { kind: 'pass' }
  /** Serve this website page from inside the app. */
  | { kind: 'site'; path: string }
  | { kind: 'redirect'; url: string; permanent: boolean };

interface Request {
  /** The Host header, with the port when there is one: 'admitlabs.in', 'admitlabs.localhost:3000'. */
  host: string;
  pathname: string;
  /** '' or '?a=b'. */
  search: string;
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

function isFramework(pathname: string): boolean {
  // Next's own routes (scripts, hot reload, the dev overlay), and files like /robots.txt or /brand/x.svg.
  return pathname.startsWith('/_next/') || pathname.startsWith('/__next') || /\/[^/]*\.[a-z0-9]+$/i.test(pathname);
}

export function routeFor(request: Request, origins: { site: string; app: string }): HostRoute {
  const site = new URL(origins.site);
  const app = new URL(origins.app);
  const host = request.host.toLowerCase();
  const { pathname, search } = request;

  // One address for both: no routing by address. The website stays at /site.
  if (site.host === app.host) return { kind: 'app' };

  if (host === `www.${site.host}`) return { kind: 'redirect', url: `${site.origin}${pathname}${search}`, permanent: true };

  if (host === site.host) {
    if (isFramework(pathname) || under(pathname, '/drishti')) return { kind: 'pass' };
    const section = pathname.split('/')[1] ?? '';
    if (APP_SECTIONS.includes(section)) return { kind: 'redirect', url: `${app.origin}${pathname}${search}`, permanent: false };
    if (under(pathname, SITE_PREFIX)) return { kind: 'pass' };
    return { kind: 'site', path: pathname === '/' ? SITE_PREFIX : `${SITE_PREFIX}${pathname}` };
  }

  if (host === app.host) {
    if (under(pathname, '/drishti')) return { kind: 'redirect', url: `${site.origin}${pathname}${search}`, permanent: false };
    if (under(pathname, SITE_PREFIX)) return { kind: 'redirect', url: `${site.origin}${pathname.slice(SITE_PREFIX.length) || '/'}${search}`, permanent: false };
  }

  return { kind: 'app' };
}

// Which surface answers a request, by the address it came to. Pure, so it is tested on its own;
// src/proxy.ts applies the answer.
//
//   Website address (admitlabs.in):  the website, its pages served from /site inside the app
//                                    (the Leads enquiry forms at /enquire too); /drishti as it is;
//                                    dashboard paths move to the dashboard.
//   Dashboard address (app.admitlabs.in): the dashboard as it is; /drishti, /enquire and /site
//                                    move to the website.
//   www on the website address:      the same page without www.
//   Any other address (a preview):   everything as it is, so /site and /drishti can be looked at.
//
// While the dashboard is closed (production, until Drishti opens) every address shows the website:
// the dashboard’s address and www move to it, /signup and /login stay and say Drishti opens soon,
// and every other dashboard page is not found.

export const SITE_PREFIX = '/site';

/** The dashboard's first path segments. On the website's address they move to the dashboard's. */
export const APP_SECTIONS: readonly string[] = ['login', 'signup', 'onboarding', 'audit', 'rivals', 'demand', 'leads', 'brain', 'reports', 'plan', 'settings', 'notifications', 'work', 'team', 'share', 'design-system'];

/** Sign up and log in. While the dashboard is closed they stay, on the website, and say Drishti opens soon. */
export const DOORS: readonly string[] = ['signup', 'login'];

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

/**
 * Whether Next would turn this redirect from src/proxy.ts into a relative one. It does when the
 * redirect points at the server's own address (`serverOrigin`, localhost:3000 when run locally),
 * whatever address the request came to. From another address the visitor would then stay there:
 * locally, a dashboard path on the website's address would come straight back to the website.
 */
export function redirectBecomesRelative(url: string, serverOrigin: string, host: string): boolean {
  const target = new URL(url);
  return target.origin === new URL(serverOrigin).origin && target.host !== host.toLowerCase();
}

/**
 * Whether a request came to the website's own address (or its www), when the website has one.
 * Only there may search engines crawl (robots.txt); the dashboard and previews stay out.
 */
export function isWebsiteAddress(host: string, origins: { site: string; app: string }): boolean {
  const site = new URL(origins.site);
  if (site.host === new URL(origins.app).host) return false;
  const asked = host.toLowerCase();
  return asked === site.host || asked === `www.${site.host}`;
}

/** `open`: whether the dashboard is open (src/lib/urls.ts APP_OPEN). */
export function routeFor(request: Request, origins: { site: string; app: string }, open = true): HostRoute {
  const site = new URL(origins.site);
  const app = new URL(origins.app);
  const host = request.host.toLowerCase();
  const { pathname, search } = request;

  if (!open) return closedRoute(host, pathname, search, site, app);

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
    if (under(pathname, '/drishti') || under(pathname, '/enquire')) return { kind: 'redirect', url: `${site.origin}${pathname}${search}`, permanent: false };
    if (under(pathname, SITE_PREFIX)) return { kind: 'redirect', url: `${site.origin}${pathname.slice(SITE_PREFIX.length) || '/'}${search}`, permanent: false };
  }

  return { kind: 'app' };
}

/**
 * While the dashboard is closed: the website on every address (previews too). The dashboard’s
 * address and www move to the website’s; /signup, /login, /drishti and files are served as they
 * are; any other dashboard path asks for a website page that is not there, so it is not found.
 */
function closedRoute(host: string, pathname: string, search: string, site: URL, app: URL): HostRoute {
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__next')) return { kind: 'pass' };
  if (host === app.host && app.host !== site.host) return { kind: 'redirect', url: `${site.origin}${pathname}${search}`, permanent: false };
  if (host === `www.${site.host}`) return { kind: 'redirect', url: `${site.origin}${pathname}${search}`, permanent: true };
  const section = pathname.split('/')[1] ?? '';
  if (DOORS.includes(section) || under(pathname, '/drishti')) return { kind: 'pass' };
  if (APP_SECTIONS.includes(section) || under(pathname, `${SITE_PREFIX}/to-dashboard`)) return { kind: 'site', path: `${SITE_PREFIX}${pathname}` };
  if (isFramework(pathname) || under(pathname, SITE_PREFIX)) return { kind: 'pass' };
  return { kind: 'site', path: pathname === '/' ? SITE_PREFIX : `${SITE_PREFIX}${pathname}` };
}

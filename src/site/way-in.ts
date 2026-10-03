// The website's and the product page's ways into Drishti: "Get your free Audit", each plan's button
// and Sign in. While the dashboard is open they lead into it. While it is closed (production, until
// Drishti opens: src/lib/urls.ts) each one says "Talk to us" and opens /signup on the website's own
// address, which says Drishti opens soon, with a way to write to us. Pure.

import { APP_OPEN, appLink } from '../lib/urls.ts';
import { CTA } from './content.ts';

export function wayIn(label: string, path: '/signup' | '/login' = '/signup', open: boolean = APP_OPEN): { href: string; label: string } {
  return open ? { href: appLink(path), label } : { href: '/signup', label: CTA.talk };
}

/** Sign in: the dashboard’s log in while it is open; /login on the website’s own address while it is closed. */
export function signIn(open: boolean = APP_OPEN): { href: string; label: string } {
  return { href: open ? appLink('/login') : '/login', label: CTA.signIn };
}

// The website's and the product page's ways into Drishti: "Get your free Audit", each plan's button
// and Sign in. While the dashboard is open they lead into it. While it is closed (production, until
// Drishti opens: src/lib/urls.ts) each one says "Talk to us" and opens /signup on the website's own
// address, which says Drishti opens soon, with a way to write to us. Pure.

import { SITE_SETTINGS } from '../config/site.ts';
import { APP_OPEN, appLink } from '../lib/urls.ts';
import { CTA } from './content.ts';

export function wayIn(label: string, path: '/signup' | '/login' = '/signup', open: boolean = APP_OPEN): { href: string; label: string } {
  return open ? { href: appLink(path), label } : { href: '/signup', label: CTA.talk };
}

/** Sign in: the dashboard’s log in while it is open; /login on the website’s own address while it is closed. */
export function signIn(open: boolean = APP_OPEN): { href: string; label: string } {
  return { href: open ? appLink('/login') : '/login', label: CTA.signIn };
}

/**
 * The header’s two buttons, and the phone menu’s. While Drishti is open: Sign in to the dashboard
 * and "Get your free Audit". While it is closed: Sign in opens /signup (it says Drishti opens soon),
 * and "Talk to us" writes to the team, since the Work with us form needs the database.
 */
export function headerButtons(open: boolean = APP_OPEN): { signIn: { href: string; label: string }; talk: { href: string; label: string } } {
  return open
    ? { signIn: { href: appLink('/login'), label: CTA.signIn }, talk: { href: appLink('/signup'), label: CTA.primary } }
    : { signIn: { href: '/signup', label: CTA.signIn }, talk: { href: `mailto:${SITE_SETTINGS.email}`, label: CTA.talk } };
}

// Where each surface lives, from three settings (spec section 4). One app serves both addresses:
// the website (admitlabs.in, with the product page at /drishti) and the dashboard
// (app.admitlabs.in). Locally the website is admitlabs.localhost:3000 and the dashboard
// localhost:3000. Going live changes these settings only. src/lib/hosts.ts routes by address.

const clean = (url: string) => url.replace(/\/$/, '');

export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://admitlabs.localhost:3000');
export const APP_URL = clean(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
export const PRODUCT_URL = clean(process.env.NEXT_PUBLIC_PRODUCT_URL ?? `${SITE_URL}/drishti`);

/** A link into the dashboard, for the website and the product page. Relative when they share the dashboard's address. */
export function appLink(path: string): string {
  const sameApp = PRODUCT_URL.startsWith(APP_URL);
  return sameApp ? path : `${APP_URL}${path}`;
}

/** Only allow redirects back into this app after sign-in. */
export function safeNextPath(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

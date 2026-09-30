// Where each surface lives. Today both are this local app. At deployment the product page
// moves to admitlabs.in/drishti and the dashboard to app.admitlabs.in by changing these two
// settings only (spec section 4).

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const PRODUCT_URL = (process.env.NEXT_PUBLIC_PRODUCT_URL ?? 'http://localhost:3000/drishti').replace(/\/$/, '');

/** A link into the dashboard, for the product page. Relative when both live in the same app. */
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

// When the enquiry form was opened, signed by the server, so it knows how long a person took to
// fill it in (spec 23: a minimum time to fill the form). It only turns away bots that send at
// once; the database's own limits do the rest. Server only: the secret never reaches a browser.

import { createHmac, timingSafeEqual } from 'node:crypto';

const mac = (at: number, secret: string) => createHmac('sha256', secret).update(`lead-form:${at}`).digest('base64url');

/** The token the form carries: when it was opened, and the server's signature. */
export function signStart(at: number, secret: string): string {
  return `${at}.${mac(at, secret)}`;
}

/** When the form was opened, if the token is the server's own; null otherwise. */
export function readStart(token: string, secret: string): number | null {
  const [at, signature] = token.split('.');
  if (!at || !signature || !/^\d{10,16}$/.test(at)) return null;
  const given = Buffer.from(signature);
  const expected = Buffer.from(mac(Number(at), secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? Number(at) : null;
}

/** Sent too soon after the form opened, or with a token that is not the server's. */
export function tooQuick(start: number | null, now: number, minSeconds: number): boolean {
  return start === null || start > now + 60_000 || now - start < minSeconds * 1000;
}

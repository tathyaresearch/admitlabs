// Checks and tidies what an institution types in at signup and in Settings (spec section 6).
// Pure, so the server action, the database functions and the tests all agree. Messages are
// plain sentences that say what to do.

import { INDIA_CITIES } from '../config/cities.ts';
import { listedProgram } from '../config/programs.ts';
import { BANNED_DASHES } from './copy.ts';
import { findPlace } from './places.ts';
import { INSTITUTION_TYPES, type InstitutionType } from './types.ts';

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Check<T> => ({ ok: true, value });
const fail = <T>(error: string): Check<T> => ({ ok: false, error });

/** Sample and test links use .example hosts; they are always accepted. */
const isExampleHost = (host: string) => host.endsWith('.example');

function parseUrl(input: string): URL | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Replaces en and em dashes (and similar) with a plain hyphen, and tidies spaces. */
export function tidyText(input: string): string {
  let text = input;
  for (const dash of BANNED_DASHES) text = text.split(dash).join('-');
  return text.replace(/\s+/g, ' ').trim();
}

export function checkName(input: string): Check<string> {
  const name = tidyText(input);
  if (name.length < 2) return fail("Enter your institution's name.");
  if (name.length > 120) return fail('Keep the name under 120 characters.');
  return ok(name);
}

export function checkType(input: string): Check<InstitutionType> {
  return (INSTITUTION_TYPES as readonly string[]).includes(input) ? ok(input as InstitutionType) : fail('Choose College, University or Skilling institute.');
}

export function checkCity(city: string, state: string): Check<{ city: string; state: string }> {
  const place = findPlace(INDIA_CITIES, city.trim(), state.trim());
  return place ? ok({ city: place.name, state: place.state }) : fail('Choose your city from the list.');
}

/** A website as "https://host/path": no query, no trailing slash, host in lower case. */
export function checkWebsite(input: string): Check<string> {
  const url = parseUrl(input);
  const host = url?.hostname.toLowerCase() ?? '';
  const looksLikeDomain = /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) && !/^\d+(\.\d+){3}$/.test(host);
  if (!url || !looksLikeDomain) return fail('Enter your website, like yourcollege.edu.in.');
  const path = url.pathname.replace(/\/+$/, '');
  return ok(`${url.protocol}//${host}${path}`);
}

/** The host a website is matched on: no scheme, no "www.", no path. Mirrors private.website_host(). */
export function websiteHost(website: string): string {
  return website
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^www\.|[/?#:].*$/gi, '')
    .toLowerCase();
}

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com', 'm.instagram.com'];
const INSTAGRAM_NOT_PROFILES = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts'];

/** An Instagram handle, from "@handle", "handle" or a profile link. Stored without the @. */
export function checkInstagram(input: string): Check<string> {
  const text = input.trim();
  const message = 'Enter your Instagram handle, like @yourcollege, or its link.';
  if (!text) return fail(message);
  let handle = text.replace(/^@/, '');
  if (/[/.]/.test(handle) && /instagram/i.test(handle)) {
    const url = parseUrl(text);
    const host = url?.hostname.toLowerCase() ?? '';
    if (!url || !(INSTAGRAM_HOSTS.includes(host) || (isExampleHost(host) && host.startsWith('instagram')))) return fail(message);
    const first = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (INSTAGRAM_NOT_PROFILES.includes(first.toLowerCase())) return fail('Enter the profile link, not a link to a post.');
    handle = first;
  }
  handle = handle.toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle) || handle.startsWith('.') || handle.endsWith('.') || handle.includes('..')) return fail(message);
  return ok(handle);
}

function optionalLink(input: string, hosts: readonly string[], examplePrefix: string, message: string, pathOk: (path: string) => boolean): Check<string | null> {
  const text = input.trim();
  if (!text) return ok(null);
  const url = parseUrl(text);
  const host = url?.hostname.toLowerCase() ?? '';
  const example = isExampleHost(host) && host.startsWith(examplePrefix);
  if (!url || !(hosts.includes(host) || example)) return fail(message);
  const path = url.pathname.replace(/\/+$/, '');
  if (!path || !pathOk(path)) return fail(message);
  return ok(`https://${example ? host : (hosts[0] as string)}${path}`);
}

/** Optional. A channel link or an @handle. */
export function checkYoutube(input: string): Check<string | null> {
  const text = input.trim();
  if (/^@[a-z0-9._-]{3,30}$/i.test(text)) return ok(`https://www.youtube.com/${text}`);
  return optionalLink(
    text,
    ['www.youtube.com', 'youtube.com', 'm.youtube.com'],
    'youtube',
    'Enter a YouTube channel link, like youtube.com/@yourcollege, or leave it empty.',
    (path) => /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/i.test(path),
  );
}

/** Optional. A Facebook page link. */
export function checkFacebook(input: string): Check<string | null> {
  return optionalLink(
    input,
    ['www.facebook.com', 'facebook.com', 'm.facebook.com', 'fb.com'],
    'facebook',
    'Enter your Facebook page link, or leave it empty.',
    (path) => path.split('/').filter(Boolean).length >= 1,
  );
}

/** Optional. A LinkedIn school or company page link. */
export function checkLinkedin(input: string): Check<string | null> {
  return optionalLink(
    input,
    ['www.linkedin.com', 'linkedin.com'],
    'linkedin',
    'Enter your LinkedIn school or company page link, or leave it empty.',
    (path) => /^\/(school|company)\/[^/]+$/i.test(path),
  );
}

/** Google Maps links: the share button's short links, and the full listing pages. */
const MAPS_SHORT_HOSTS = ['maps.app.goo.gl', 'g.page'];
const GOOGLE_HOSTS = ['google.com', 'www.google.com', 'google.co.in', 'www.google.co.in'];

/**
 * Optional. The link to the institution's own listing on Google Maps, as its Share button gives
 * it (maps.app.goo.gl/...) or as the address bar shows it (google.com/maps/place/...). Kept as
 * given, query and all, since some listings are only a ?cid= number.
 */
export function checkGoogleMaps(input: string): Check<string | null> {
  const text = input.trim();
  if (!text) return ok(null);
  const message = 'Paste the link to your listing on Google Maps, or leave it empty.';
  const url = parseUrl(text);
  if (!url || text.length > 500) return fail(message);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, '');
  const listing =
    (isExampleHost(host) && host.startsWith('maps')) ||
    (MAPS_SHORT_HOSTS.includes(host) && path.length > 1) ||
    (host === 'goo.gl' && path.startsWith('/maps/')) ||
    (host === 'maps.google.com' && (path.length > 1 || url.search.length > 1)) ||
    (GOOGLE_HOSTS.includes(host) && path.startsWith('/maps'));
  if (!listing) return fail(message);
  return ok(`https://${host}${path || (url.search ? '/' : '')}${url.search}`);
}

export interface ProgramChoice {
  name: string;
  /** The Demand key for listed programs; null for "Other". */
  programKey: string | null;
}

/**
 * Programs from the fixed list (by name) plus any "Other" names. An "Other" name that matches
 * a listed program becomes that program. At least one, each once.
 */
export function checkPrograms(listedNames: readonly string[], otherNames: readonly string[]): Check<ProgramChoice[]> {
  const chosen = new Map<string, ProgramChoice>();
  for (const raw of [...listedNames, ...otherNames]) {
    const name = tidyText(raw);
    if (!name) continue;
    const listed = listedProgram(name);
    if (!listed && listedNames.includes(raw)) return fail(`${name} is not on the program list. Add it under Other.`);
    if (!listed && (name.length < 2 || name.length > 80)) return fail('Program names should be 2 to 80 characters.');
    const choice = listed ? { name: listed.name, programKey: listed.key } : { name, programKey: null };
    chosen.set(choice.name.toLowerCase(), choice);
  }
  if (chosen.size === 0) return fail('Add at least one program.');
  if (chosen.size > 40) return fail('Add up to 40 programs. You can change them later in Settings.');
  return ok([...chosen.values()]);
}

export interface InstitutionFields {
  name: string;
  type: string;
  city: string;
  state: string;
  website: string;
  instagram: string;
  youtube: string;
  facebook: string;
  linkedin: string;
  /** Settings only: the listing on Google Maps. */
  googleMaps?: string;
}

export interface InstitutionDetails {
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string;
  youtube: string | null;
  otherLinks: { facebook?: string; linkedin?: string; google_maps?: string };
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Every institution field at once: the tidy values, or a message for each field that needs one. */
export function checkInstitution(fields: InstitutionFields): { details: InstitutionDetails | null; errors: FieldErrors<keyof InstitutionFields> } {
  const name = checkName(fields.name);
  const type = checkType(fields.type);
  const place = checkCity(fields.city, fields.state);
  const website = checkWebsite(fields.website);
  const instagram = checkInstagram(fields.instagram);
  const youtube = checkYoutube(fields.youtube);
  const facebook = checkFacebook(fields.facebook);
  const linkedin = checkLinkedin(fields.linkedin);
  const googleMaps = checkGoogleMaps(fields.googleMaps ?? '');

  const errors: FieldErrors<keyof InstitutionFields> = {};
  if (!name.ok) errors.name = name.error;
  if (!type.ok) errors.type = type.error;
  if (!place.ok) errors.city = place.error;
  if (!website.ok) errors.website = website.error;
  if (!instagram.ok) errors.instagram = instagram.error;
  if (!youtube.ok) errors.youtube = youtube.error;
  if (!facebook.ok) errors.facebook = facebook.error;
  if (!linkedin.ok) errors.linkedin = linkedin.error;
  if (!googleMaps.ok) errors.googleMaps = googleMaps.error;

  if (!name.ok || !type.ok || !place.ok || !website.ok || !instagram.ok || !youtube.ok || !facebook.ok || !linkedin.ok || !googleMaps.ok) return { details: null, errors };
  const otherLinks: InstitutionDetails['otherLinks'] = {};
  if (facebook.value) otherLinks.facebook = facebook.value;
  if (linkedin.value) otherLinks.linkedin = linkedin.value;
  if (googleMaps.value) otherLinks.google_maps = googleMaps.value;
  return {
    details: {
      name: name.value,
      type: type.value,
      city: place.value.city,
      state: place.value.state,
      website: website.value,
      instagram: instagram.value,
      youtube: youtube.value,
      otherLinks,
    },
    errors,
  };
}

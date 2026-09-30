// A rival ad entered by the AdmitLabs team (spec 8.3: manual entry for now). Pure, so the form
// and the server action agree.

import { checkWebsite, tidyText } from '../domain/onboarding.ts';

export interface AdFields {
  rival: string;
  promise: string;
  source: string;
  seenOn: string;
}

export interface AdEntry {
  rival: string;
  promise: string;
  sourceUrl: string;
  /** India date the ad was seen, 'YYYY-MM-DD'. */
  seenOn: string;
}

export type AdErrors = Partial<Record<keyof AdFields, string>>;

/** `today` is the India date, 'YYYY-MM-DD'; an ad cannot be seen in the future. */
export function checkAdEntry(fields: AdFields, trackedRivals: readonly string[], today: string): { entry: AdEntry | null; errors: AdErrors } {
  const errors: AdErrors = {};
  if (!trackedRivals.includes(fields.rival)) errors.rival = 'Choose the rival the ad is from.';

  // Promises are shown as quotes, so strip quote marks the team may have typed around them.
  const promise = tidyText(fields.promise).replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  if (promise.length < 5) errors.promise = 'Enter what the ad promises, in its own words.';
  else if (promise.length > 200) errors.promise = 'Keep it under 200 characters: the main promise only.';

  const source = checkWebsite(fields.source);
  const sourceUrl = source.ok ? (/^https?:\/\//i.test(fields.source.trim()) ? fields.source.trim() : source.value) : null;
  if (!sourceUrl) errors.source = 'Enter the link where the ad can be seen, like an ad library page.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.seenOn)) errors.seenOn = 'Enter the date the ad was seen.';
  else if (fields.seenOn > today) errors.seenOn = 'The date cannot be in the future.';

  if (Object.keys(errors).length > 0 || !sourceUrl) return { entry: null, errors };
  return { entry: { rival: fields.rival, promise, sourceUrl, seenOn: fields.seenOn }, errors };
}

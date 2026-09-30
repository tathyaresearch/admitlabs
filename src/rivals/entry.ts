// A rival the owner adds by hand (spec 8.2): name, type, city, website, Instagram, and which of
// their own programs the rival also offers. Pure, so the picker in the browser and the server
// action agree; the database checks again when it saves.

import { checkCity, checkInstagram, checkType, checkWebsite, tidyText, websiteHost } from '../domain/onboarding.ts';
import type { InstitutionType } from '../domain/types.ts';

export interface RivalEntryFields {
  name: string;
  type: string;
  city: string;
  state: string;
  website: string;
  instagram: string;
  /** Ids of the owner's own programs that the rival also offers. */
  programs: readonly string[];
}

export interface RivalEntry {
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string | null;
  programs: string[];
}

export type RivalEntryErrors = Partial<Record<'name' | 'type' | 'city' | 'website' | 'instagram' | 'programs', string>>;

export interface RivalEntryContext {
  /** Ids of the owner's active programs. */
  ownPrograms: readonly string[];
  ownWebsite: string;
  /** Websites already in the list being picked, so the same rival is not added twice. */
  listed?: readonly string[];
}

export function checkRivalEntry(fields: RivalEntryFields, context: RivalEntryContext): { entry: RivalEntry | null; errors: RivalEntryErrors } {
  const errors: RivalEntryErrors = {};

  const name = tidyText(fields.name);
  if (name.length < 2) errors.name = 'Enter their name.';
  else if (name.length > 120) errors.name = 'Keep the name under 120 characters.';

  const type = checkType(fields.type);
  if (!type.ok) errors.type = type.error;

  const place = checkCity(fields.city, fields.state);
  if (!place.ok) errors.city = 'Choose their city from the list.';

  const website = checkWebsite(fields.website);
  if (!website.ok) errors.website = 'Enter their website, like theircollege.edu.in.';
  else if (websiteHost(website.value) === websiteHost(context.ownWebsite)) errors.website = 'That is your own website.';
  else if ((context.listed ?? []).some((listed) => websiteHost(listed) === websiteHost(website.value))) errors.website = 'This one is already in your list.';

  let instagram: string | null = null;
  if (fields.instagram.trim()) {
    const handle = checkInstagram(fields.instagram);
    if (handle.ok) instagram = handle.value;
    else errors.instagram = 'Enter their Instagram handle, like @theircollege, or leave it empty.';
  }

  const programs = [...new Set(fields.programs)].filter((id) => context.ownPrograms.includes(id));
  if (programs.length === 0) errors.programs = 'Tick at least one program they also offer.';

  if (Object.keys(errors).length > 0 || !type.ok || !place.ok || !website.ok) return { entry: null, errors };
  return {
    entry: { name, type: type.value, city: place.value.city, state: place.value.state, website: website.value, instagram, programs },
    errors,
  };
}

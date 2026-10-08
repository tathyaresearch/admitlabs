// Reading a Brain fact from a submitted form, kind by kind: what each form may save. The same
// forms serve the college (the Brain and Help us know you) and the AdmitLabs team (the Brain and
// the kickoff call), so both edit the same data. Every text runs past the guards (guard.ts).
// The database checks the size and the guards again. Pure.

import { BRAIN_RULES } from '../config/brain.ts';
import type { FormRead } from '../domain/details.ts';
import { checkWorkLink } from '../team/work.ts';
import { CONTACT_MESSAGE, LOGIN_MESSAGE, hasContactDetails, looksLikeLogin, textsOf } from './guard.ts';
import {
  AWARD_TYPES,
  CONTACT_ROLES,
  DATE_TYPES,
  LINK_TYPES,
  NOTE_TYPES,
  SCRIPT_FORMATS,
  TONES,
  type BrainFields,
  type BrainKind,
} from './model.ts';

export type FieldErrors = Record<string, string>;

export interface ReadFact<K extends BrainKind> {
  fields: BrainFields[K] | null;
  errors: FieldErrors;
}

const tidy = (value: string) => value.replace(/\s+/g, ' ').trim();

class Reader {
  readonly errors: FieldErrors = {};
  private readonly form: FormRead;

  constructor(form: FormRead) {
    this.form = form;
  }

  text(name: string, label: string, options: { required?: boolean; max?: number } = {}): string | null {
    const value = tidy(this.form.get(name));
    const max = options.max ?? BRAIN_RULES.textMax;
    if (!value) {
      if (options.required) this.errors[name] = `Add ${label}.`;
      return null;
    }
    if (value.length > max) this.errors[name] = `Keep it under ${max} characters.`;
    return value;
  }

  /** Longer text keeps its line breaks. */
  long(name: string, label: string, required = false): string | null {
    const value = this.form
      .get(name)
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!value) {
      if (required) this.errors[name] = `Add ${label}.`;
      return null;
    }
    if (value.length > BRAIN_RULES.longMax) this.errors[name] = `Keep it under ${BRAIN_RULES.longMax} characters.`;
    return value;
  }

  /** One per line, or separated by commas. */
  list(name: string, max: number = BRAIN_RULES.listMax): string[] {
    const items = this.form
      .get(name)
      .split(/[\n,]/)
      .map(tidy)
      .filter(Boolean);
    if (items.length > max) this.errors[name] = `Add up to ${max}.`;
    else if (items.some((item) => item.length > BRAIN_RULES.listItemMax)) this.errors[name] = `Keep each one under ${BRAIN_RULES.listItemMax} characters.`;
    return items.slice(0, max);
  }

  link(name: string, label: string, required = false): string | null {
    const raw = this.form.get(name).trim();
    if (!raw) {
      if (required) this.errors[name] = `Add ${label}.`;
      return null;
    }
    const checked = checkWorkLink(raw);
    if (!checked.ok) {
      this.errors[name] = checked.error;
      return null;
    }
    return checked.value;
  }

  pick<T extends string>(name: string, allowed: readonly T[], fallback: T | null = null): T | null {
    const value = this.form.get(name);
    return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  }

  whole(name: string, min: number, max: number, message: string, required = false): number | null {
    const raw = this.form.get(name).replace(/[,\s]/g, '');
    if (!raw) {
      if (required) this.errors[name] = message;
      return null;
    }
    const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!(value >= min && value <= max)) {
      this.errors[name] = message;
      return null;
    }
    return value;
  }

  day(name: string, label: string, required = false): string | null {
    const value = this.form.get(name).trim();
    if (!value) {
      if (required) this.errors[name] = `Pick ${label}.`;
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
    if (!match || !date || date.getUTCDate() !== Number(match[3])) {
      this.errors[name] = 'Pick a date.';
      return null;
    }
    return value;
  }

  month(name: string, required = false): string | null {
    const value = this.form.get(name).trim();
    if (!value) {
      if (required) this.errors[name] = 'Pick the month.';
      return null;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.errors[name] = 'Pick the month.';
      return null;
    }
    return value;
  }

  checked(name: string): boolean {
    return ['on', 'yes', 'true', '1'].includes(this.form.get(name));
  }
}

const HEX = /^#?([0-9a-f]{6})$/i;
const yearMax = () => new Date().getUTCFullYear() + 1;

function read<K extends BrainKind>(kind: K, form: FormRead): ReadFact<K> {
  const r = new Reader(form);
  const done = (fields: BrainFields[K]): ReadFact<K> => ({ fields: Object.keys(r.errors).length ? null : fields, errors: r.errors });
  // Each case builds the fields of its own kind; the cast says so to the compiler.
  const as = (fields: unknown) => done(fields as BrainFields[K]);
  switch (kind) {
    case 'contact': {
      const phone = r.text('phone', 'a phone number', { max: 20 });
      if (phone && !/^\+?[0-9 ]{8,16}$/.test(phone)) r.errors.phone = 'Enter a phone number, like +91 98765 43210.';
      const email = r.text('email', 'an email', { max: 120 })?.toLowerCase() ?? null;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) r.errors.email = 'Enter an email address, like admissions@college.edu.';
      return as({
        role: r.pick('role', CONTACT_ROLES, 'other'),
        name: r.text('name', 'a name', { required: true, max: 80 }),
        title: r.text('title', 'their role', { max: 80 }),
        phone,
        email,
        best: r.text('best', 'the best way to reach them'),
        approves: r.text('approves', 'what they approve'),
      });
    }
    case 'talk':
      return as({ how: r.text('how', 'how they like to talk', { required: true }) });
    case 'goals': {
      const goals = [1, 2, 3].flatMap((index) => r.text(`goal_${index}`, 'a goal', { max: 160 }) ?? []);
      if (!goals.length) r.errors.goal_1 = 'Add at least one goal.';
      return as({ goals });
    }
    case 'target':
      return as({ count: r.whole('count', 1, 1_000_000, 'Enter how many students, like 450.', true), note: r.text('note', 'a note') });
    case 'rivals': {
      const names = r.list('names', BRAIN_RULES.rivalsMax);
      if (!names.length && !r.errors.names) r.errors.names = 'Add at least one name.';
      return as({ names });
    }
    case 'regions': {
      const places = r.list('places');
      if (!places.length && !r.errors.places) r.errors.places = 'Add at least one city or state.';
      return as({ places });
    }
    case 'logo':
    case 'guidelines':
      // The file comes with the form too; the server saves it and fills `file` (actions).
      return as({ link: r.link('link', 'a link'), file: null });
    case 'colours': {
      const colours: Array<{ name: string; hex: string }> = [];
      for (let index = 1; index <= BRAIN_RULES.coloursMax; index += 1) {
        const name = r.text(`colour_name_${index}`, 'a name', { max: 40 });
        const raw = form.get(`colour_hex_${index}`).trim();
        if (!name && !raw) continue;
        const hex = HEX.exec(raw);
        if (!hex) r.errors[`colour_hex_${index}`] = 'Enter a hex code, like #0F6E6A.';
        else colours.push({ name: name ?? `Colour ${index}`, hex: `#${(hex[1] ?? '').toUpperCase()}` });
      }
      if (!colours.length && !Object.keys(r.errors).length) r.errors.colour_hex_1 = 'Add at least one colour.';
      return as({ colours });
    }
    case 'fonts':
      return as({ text: r.text('text', 'the fonts', { required: true, max: 160 }) });
    case 'tagline':
      return as({ text: r.text('text', 'the tagline', { required: true, max: 160 }) });
    case 'tone': {
      const tone = r.pick('tone', TONES);
      if (!tone) r.errors.tone = 'Pick friendly or formal.';
      return as({ tone, line: r.text('line', 'a line about the voice') });
    }
    case 'avoid':
    case 'dos': {
      const items = r.list('items');
      if (!items.length && !r.errors.items) r.errors.items = 'Add at least one.';
      return as({ items });
    }
    case 'award':
      return as({
        type: r.pick('type', AWARD_TYPES, 'award'),
        title: r.text('title', 'what it is', { required: true, max: 160 }),
        year: r.whole('year', 1950, yearMax(), 'Enter a year, like 2025.'),
        link: r.link('link', 'a link'),
      });
    case 'placement_list':
      return as({
        programId: tidy(form.get('program')) || null,
        year: r.whole('year', 2000, yearMax(), 'Enter the batch year, like 2026.'),
        link: r.link('link', 'the link to the list', true),
      });
    case 'alumnus':
      return as({
        name: r.text('name', 'their name', { required: true, max: 80 }),
        line: r.text('line', 'what they do now', { required: true, max: 160 }),
        program: r.text('program', 'the program and year', { max: 80 }),
        link: r.link('link', 'a link'),
      });
    case 'review': {
      if (!r.checked('consent')) r.errors.consent = 'Tick this only when the student agreed. Otherwise leave the review out.';
      return as({
        quote: r.text('quote', 'what they said', { required: true, max: 400 }),
        by: r.text('by', 'who said it', { required: true, max: 80 }),
        link: r.link('link', 'a link'),
        consent: true,
      });
    }
    case 'link': {
      const type = r.pick('type', LINK_TYPES, 'other') ?? 'other';
      return as({
        type,
        label: r.text('label', 'what it is', { required: type === 'other', max: 80 }),
        url: r.link('url', 'the link', true),
        shared: type === 'drive' ? r.checked('shared') : false,
      });
    }
    case 'date': {
      const from = r.day('from', 'the day', true);
      const to = r.day('to', 'the last day');
      if (from && to && to < from) r.errors.to = 'The last day comes after the first.';
      const type = r.pick('type', DATE_TYPES);
      if (!type) r.errors.type = 'Pick what it is.';
      return as({ type, title: r.text('title', 'what it is', { required: type !== 'season' && type !== 'no_post', max: 120 }) ?? '', from, to: to === from ? null : to });
    }
    case 'plan':
      return as({
        month: r.month('month', true),
        link: r.link('link', 'a link'),
        status: r.pick('status', ['draft', 'agreed'] as const, 'draft'),
        agreedBy: r.text('agreed_by', 'who agreed it', { max: 80 }),
        note: r.text('note', 'a note'),
      });
    case 'script':
      return as({
        format: r.pick('format', SCRIPT_FORMATS, 'reel'),
        title: r.text('title', 'what it is', { required: true, max: 160 }),
        link: r.link('link', 'a link'),
        status: r.pick('status', ['waiting', 'approved'] as const, 'waiting'),
        approver: r.text('approver', 'who approves it', { max: 80 }),
      });
    case 'worked':
      return as({ month: r.month('month', true), line: r.text('line', 'what worked', { required: true }), link: r.link('link', 'a link') });
    case 'note':
      return as({
        type: r.pick('type', NOTE_TYPES, 'note'),
        title: r.text('title', 'a title', { max: 120 }),
        body: r.long('body', 'the note', true),
        on: r.day('on', 'the day'),
        link: r.link('link', 'a link'),
      });
    case 'skip':
      return as({ slot: tidy(form.get('slot')), reason: r.text('reason', 'why it doesn’t apply', { required: true, max: 160 }) });
    default:
      return { fields: null, errors: { form: 'Unknown fact.' } };
  }
}

/** Reads one fact of `kind` from a form, then runs the guards over every word of it. */
export function readFact<K extends BrainKind>(kind: K, form: FormRead): ReadFact<K> {
  const result = read(kind, form);
  const texts = textsOf(result.fields ?? Object.fromEntries(Object.keys(result.errors).map((name) => [name, form.get(name)])));
  // A login can hide in any field, the ones with errors included.
  const all = [...texts, ...['name', 'title', 'line', 'body', 'how', 'note', 'label', 'quote', 'by', 'items', 'url', 'link', 'text', 'reason'].map((name) => form.get(name))];
  if (all.some(looksLikeLogin)) return { fields: null, errors: { ...result.errors, form: LOGIN_MESSAGE } };
  // Alumni and reviews: a line and a link, never a student's phone or email (the link may hold digits).
  if ((kind === 'alumnus' || kind === 'review') && ['name', 'line', 'program', 'quote', 'by'].map((name) => form.get(name)).some(hasContactDetails)) {
    return { fields: null, errors: { ...result.errors, form: CONTACT_MESSAGE } };
  }
  return result;
}

/** How long a fact is when stored, for the size check the database repeats. */
export function factSize(fields: unknown): number {
  return JSON.stringify(fields).length;
}

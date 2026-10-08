// History (spec section 26): every change to the Brain, with who made it and when. The database
// keeps each change as it happens (brain_changes, written by triggers): the fact before and after.
// This says it in words: "Data Analytics fees: ₹55,000 for the full course to ₹60,000 for the full
// course". Who is a person's name, or their email when they have not added one. Pure.

import {
  EMPTY_INSTITUTION_DETAILS,
  EMPTY_PROGRAM_DETAILS,
  institutionDetailsFromRow,
  programDetailsFromRow,
  type InstitutionDetailsRow,
  type ProgramDetailsRow,
} from '../domain/details.ts';
import { formatMonth, hostAndPath } from '../domain/format.ts';
import type { InstitutionType } from '../domain/types.ts';
import { aboutRows, describeItem, placementText, programRows, shortValue } from './facts.ts';
import {
  DATE_TYPE_LABELS,
  KIND_LABELS,
  LINK_TYPE_LABELS,
  NOTE_TYPE_LABELS,
  SECTION_INFO,
  STEP_INFO,
  sectionOf,
  type AnyBrainItem,
  type BrainKind,
  type BrainSection,
  type BrainStep,
} from './model.ts';

export type ChangeWhat = 'added' | 'found' | 'changed' | 'confirmed' | 'corrected' | 'not_right' | 'removed' | 'checked' | 'started' | 'ready' | 'step_done' | 'step_undone';

/** One row of brain_changes. */
export interface ChangeRow {
  id: string;
  at: string;
  by: string | null;
  what: ChangeWhat;
  /** 'item:<id>', 'about', 'program:<id>', 'step:<step>', 'brain', 'team-note:<id>'. */
  target: string;
  kind: string | null;
  /** For a check: which group of facts was said to be still right ('fees', 'dates', 'details'). */
  field: string | null;
  before: unknown;
  after: unknown;
  teamOnly: boolean;
}

export interface Person {
  name: string | null;
  email: string | null;
  team: boolean;
}

export interface ChangeLine {
  id: string;
  at: string;
  /** "Ritu Bora", "Kabir Sen, AdmitLabs", "Drishti". */
  who: string;
  section: BrainSection | null;
  /** What happened, as a sentence without its full stop. */
  text: string;
  /** The value before and after, for History's panel. */
  before: string | null;
  after: string | null;
  teamOnly: boolean;
}

export function personName(person: Person | undefined): string {
  if (!person) return 'Drishti';
  const name = person.name ?? person.email ?? 'Someone';
  return person.team ? `${name}, AdmitLabs` : name;
}

const VERB: Readonly<Record<ChangeWhat, string>> = {
  added: 'Added',
  found: 'Drishti found',
  changed: 'Changed',
  confirmed: 'Confirmed',
  corrected: 'Corrected',
  not_right: 'Took out',
  removed: 'Removed',
  checked: 'Checked',
  started: 'Started onboarding',
  ready: 'Marked Ready',
  step_done: 'Ticked',
  step_undone: 'Unticked',
};

function itemOf(kind: string | null, fields: unknown): AnyBrainItem | null {
  if (!kind || !fields || typeof fields !== 'object') return null;
  return { id: '', kind: kind as BrainKind, fields, toConfirm: false, source: 'team', viaHelp: false, sourceUrl: null, foundAt: null, checkedAt: '', checkedBy: null, updatedAt: '', updatedBy: null } as AnyBrainItem;
}

/** The groups of a program's details a change touched, each before and after. */
function programChanges(before: ProgramDetailsRow | null, after: ProgramDetailsRow | null, name: string): Array<{ label: string; before: string | null; after: string | null }> {
  const a = before ? programDetailsFromRow(before) : EMPTY_PROGRAM_DETAILS;
  const b = after ? programDetailsFromRow(after) : EMPTY_PROGRAM_DETAILS;
  const rowsA = programRows(a);
  const rowsB = programRows(b);
  const changes = rowsB.flatMap((row, index) => {
    const old = rowsA[index]?.value ?? null;
    return old === row.value ? [] : [{ label: `${name} ${row.label.toLowerCase()}`, before: old, after: row.value }];
  });
  const placedA = placementText(a);
  const placedB = placementText(b);
  if (placedA !== placedB) changes.push({ label: `${name} placements`, before: placedA, after: placedB });
  return changes;
}

function aboutChanges(before: InstitutionDetailsRow | null, after: InstitutionDetailsRow | null, type: InstitutionType): Array<{ label: string; before: string | null; after: string | null }> {
  const rowsA = aboutRows(before ? institutionDetailsFromRow(before) : EMPTY_INSTITUTION_DETAILS, type);
  const rowsB = aboutRows(after ? institutionDetailsFromRow(after) : EMPTY_INSTITUTION_DETAILS, type);
  return rowsB.flatMap((row, index) => (rowsA[index]?.value === row.value ? [] : [{ label: row.label, before: rowsA[index]?.value ?? null, after: row.value }]));
}

const lower = (text: string) => (text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text);

/** One change in words. A change to several facts of a program says each; one that changed nothing shown is left out. */
export function changeLines(
  row: ChangeRow,
  context: { people: ReadonlyMap<string, Person>; programs: ReadonlyArray<{ id: string; name: string }>; institutionType: InstitutionType },
): ChangeLine[] {
  const who = row.by ? personName(context.people.get(row.by)) : 'Drishti';
  const base = { id: row.id, at: row.at, who, teamOnly: row.teamOnly };
  if (row.target === 'brain') {
    return [{ ...base, section: null, text: row.what === 'ready' ? 'Marked the Brain Ready' : 'Started onboarding', before: null, after: null }];
  }
  if (row.target.startsWith('step:')) {
    const step = row.target.slice(5) as BrainStep;
    return [{ ...base, section: null, text: `${VERB[row.what]}: ${STEP_INFO[step]?.name ?? step}`, before: null, after: null }];
  }
  if (row.target.startsWith('team-note:')) {
    const body = String((row.after ?? row.before) as string);
    return [{ ...base, section: 'notes', text: `${row.what === 'removed' ? 'Removed a team note' : 'Added a team note'}: ${body}`, before: null, after: null }];
  }
  if (row.target === 'about' || row.target.startsWith('program:')) {
    if (row.what === 'checked') {
      const program = context.programs.find((entry) => row.target === `program:${entry.id}`);
      const group = row.field === 'fees' ? 'fees' : row.field === 'dates' ? 'admission dates' : 'details';
      return [{ ...base, section: program ? 'programs' : 'basics', text: `Still right: ${program ? `${program.name} ${group}` : 'about the college'}`, before: null, after: null }];
    }
    const program = context.programs.find((entry) => row.target === `program:${entry.id}`);
    if (program && row.before === null) {
      return [{ ...base, section: 'programs', text: `Added the details for ${program.name}`, before: null, after: null }];
    }
    const changes = program
      ? programChanges(row.before as ProgramDetailsRow | null, row.after as ProgramDetailsRow | null, program.name)
      : aboutChanges(row.before as InstitutionDetailsRow | null, row.after as InstitutionDetailsRow | null, context.institutionType);
    return changes.map((change, index) => ({
      ...base,
      id: `${row.id}:${index}`,
      section: program ? 'programs' : 'basics',
      text: change.before && change.after ? `${change.label}: ${change.before} to ${change.after}` : change.after ? `Added ${program ? change.label : lower(change.label)}: ${change.after}` : `Removed ${program ? change.label : lower(change.label)}`,
      before: change.before,
      after: change.after,
    }));
  }
  // A Brain fact.
  const beforeItem = itemOf(row.kind, row.before);
  const afterItem = itemOf(row.kind, row.after);
  const item = afterItem ?? beforeItem;
  if (!item) return [];
  const beforeValue = beforeItem ? factSummary(beforeItem, context.programs) : null;
  const afterValue = afterItem ? factSummary(afterItem, context.programs) : null;
  const noun = factNoun(item);
  let text: string;
  if (item.kind === 'found') {
    // What Drishti found for the details: the outcome, and what Drishti had said.
    const found = item.fields as { label: string; value: string };
    const said = `${found.label}, ${found.value}`;
    text = row.what === 'found' ? `Drishti found ${said}` : row.what === 'confirmed' ? `Confirmed what Drishti found: ${said}` : row.what === 'corrected' ? `Corrected what Drishti found: ${found.label} (it said ${found.value})` : `Took out what Drishti found: ${said}`;
    return [{ ...base, section: sectionOf(item), text, before: null, after: null }];
  }
  if (row.what === 'changed' && beforeValue && afterValue && beforeValue !== afterValue) text = `Changed ${noun}: ${beforeValue} to ${afterValue}`;
  else if (item.kind === 'skip') text = `Doesn’t apply: ${(item.fields as { reason: string }).reason}`;
  else if (row.what === 'not_right') text = `Took out ${noun} as not right: ${beforeValue ?? ''}`;
  else if (row.what === 'checked') text = `Still right: ${noun}, ${afterValue ?? ''}`;
  else text = `${VERB[row.what]} ${noun}: ${afterValue ?? beforeValue ?? ''}`;
  return [{ ...base, section: sectionOf(item), text, before: beforeValue, after: afterValue }];
}

/** What a fact is, in History's words: "meeting notes", "the tagline", "a script". */
function factNoun(item: AnyBrainItem): string {
  switch (item.kind) {
    case 'contact':
      return CONTACT_NOUNS[item.fields.role];
    case 'note':
      return NOTE_TYPE_LABELS[item.fields.type].toLowerCase();
    case 'date':
      return item.fields.type === 'season' ? 'the admission season' : `a date (${DATE_TYPE_LABELS[item.fields.type].toLowerCase()})`;
    case 'link':
      return item.fields.type === 'other' ? 'a link' : LINK_TYPE_LABELS[item.fields.type];
    case 'found':
      return item.fields.label;
    default:
      return NOUNS[item.kind] ?? lower(KIND_LABELS[item.kind]);
  }
}

/** A fact's value in a few words, for History. */
function factSummary(item: AnyBrainItem, programs: ReadonlyArray<{ id: string; name: string }>): string {
  switch (item.kind) {
    case 'contact':
      return item.fields.title ? `${item.fields.name}, ${item.fields.title}` : item.fields.name;
    case 'note':
      return item.fields.title ?? item.fields.body.split('\n')[0] ?? '';
    case 'plan':
      return `${formatMonth(item.fields.month)}, ${item.fields.status === 'agreed' ? 'agreed' : 'draft'}${item.fields.note ? `: ${item.fields.note}` : ''}`;
    case 'script':
      return `${item.fields.title} (${item.fields.status === 'approved' ? 'approved' : 'waiting'})`;
    case 'date':
      return item.fields.title ? item.fields.title : describeItem(item, programs).lines[0] ?? '';
    case 'link':
      return item.fields.label ?? hostAndPath(item.fields.url);
    default:
      return shortValue(describeItem(item, programs));
  }
}

const CONTACT_NOUNS: Readonly<Record<'main' | 'approver' | 'other', string>> = { main: 'the main contact', approver: 'who approves content', other: 'a contact' };

const NOUNS: Partial<Record<BrainKind, string>> = {
  talk: 'how they like to talk',
  goals: 'the top goals',
  target: 'the admission target',
  rivals: 'the main rivals',
  regions: 'where students should come from',
  logo: 'the logo',
  colours: 'the colours',
  fonts: 'the fonts',
  tagline: 'the tagline',
  tone: 'the tone',
  avoid: 'words to avoid',
  dos: 'what to do',
  guidelines: 'the brand guidelines',
  award: 'a ranking or award',
  placement_list: 'a placement list',
  alumnus: 'an alumnus',
  review: 'a student review',
  plan: 'a content plan',
  script: 'a script',
  worked: 'what worked',
};

export const sectionName = (section: BrainSection | null) => (section ? SECTION_INFO[section].name : 'Brain');

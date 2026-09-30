// Bulk Audit: reading a pasted list or a CSV file of institutions, and checking every row before
// anything is added (spec section 13). Pure, so the page, the server and the tests agree.
//
// A row is: name, website, city, type, programs (separated by semicolons), Instagram (optional).
// A header row can name the columns in any order and add a state column for a city found in
// more than one state. Commas or tabs separate cells; quotes keep commas inside a cell.

import { INDIA_CITIES } from '../config/cities.ts';
import { LISTED_PROGRAMS, listedProgram } from '../config/programs.ts';
import { TEAM_RULES } from '../config/team.ts';
import { checkInstagram, checkName, checkPrograms, checkWebsite, tidyText, websiteHost, type ProgramChoice } from '../domain/onboarding.ts';
import type { InstitutionType } from '../domain/types.ts';

export const BULK_COLUMNS = ['name', 'website', 'city', 'state', 'type', 'programs', 'instagram'] as const;
export type BulkColumn = (typeof BULK_COLUMNS)[number];

/** The column order when there is no header row. */
export const DEFAULT_COLUMNS: readonly BulkColumn[] = ['name', 'website', 'city', 'type', 'programs', 'instagram'];

const HEADER_WORDS: Readonly<Record<BulkColumn, readonly string[]>> = {
  name: ['name', 'institution', 'institution name'],
  website: ['website', 'site', 'url', 'web'],
  city: ['city', 'town'],
  state: ['state'],
  type: ['type', 'kind', 'category'],
  programs: ['programs', 'program', 'courses', 'course'],
  instagram: ['instagram', 'insta', 'ig'],
};

/** Everything add_prospect() needs for one institution. */
export interface ProspectDetails {
  name: string;
  website: string;
  city: string;
  state: string;
  type: InstitutionType;
  programs: ProgramChoice[];
  instagram: string | null;
}

export type CheckedRow =
  | { position: number; label: string; status: 'ready'; details: ProspectDetails }
  | { position: number; label: string; status: 'fix'; problems: string[] };

export interface CheckedList {
  rows: CheckedRow[];
  /** A problem with the whole list (empty, or too long). */
  error: string | null;
}

/** Rows of cells: commas or tabs, "quoted, cells", blank lines skipped, cells trimmed. */
export function readTable(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((cells) => cells.map((value) => value.trim())).filter((cells) => cells.some((value) => value !== ''));
}

const squash = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The columns named by a header row, or null when the first row is data. */
function headerColumns(cells: readonly string[]): Array<BulkColumn | null> | null {
  const columns = cells.map((cell) => {
    const word = squash(cell);
    return (BULK_COLUMNS.find((column) => HEADER_WORDS[column].includes(word)) ?? null) as BulkColumn | null;
  });
  return columns.includes('name') && columns.includes('website') ? columns : null;
}

export interface ListRow {
  position: number;
  cells: Partial<Record<BulkColumn, string>>;
}

/** Each row's cells by column, numbered from 1 (a header row is not counted). */
export function readList(input: string): ListRow[] {
  const table = readTable(input);
  const header = table[0] ? headerColumns(table[0]) : null;
  const columns = header ?? DEFAULT_COLUMNS;
  return table.slice(header ? 1 : 0).map((cells, index) => {
    const row: Partial<Record<BulkColumn, string>> = {};
    cells.forEach((value, column) => {
      const key = columns[column];
      if (key && value) row[key] = value;
    });
    return { position: index + 1, cells: row };
  });
}

/** College, University or Skilling institute, from the usual ways of writing them. */
export function readType(input: string): InstitutionType | null {
  const word = squash(input);
  if (word.startsWith('coll')) return 'college';
  if (word.startsWith('univ')) return 'university';
  if (word.includes('skill')) return 'skilling';
  return null;
}

/** A listed program by its name, however it is written (B.Com, BCom, bcom), or an "Other" name. */
export function readProgram(input: string): ProgramChoice {
  const name = tidyText(input);
  const listed = listedProgram(name) ?? LISTED_PROGRAMS.find((program) => squash(program.name).replace(/ /g, '') === squash(name).replace(/ /g, ''));
  return listed ? { name: listed.name, programKey: listed.key } : { name, programKey: null };
}

/** A city on the list, by its name or an older name, in the given state when there is one. */
export function readCity(city: string, state: string): { city: string; state: string } | { problem: string } {
  const wanted = squash(city);
  if (!wanted) return { problem: 'Add the city.' };
  let matches = INDIA_CITIES.filter((place) => squash(place.name) === wanted || place.aliases.some((alias) => squash(alias) === wanted));
  if (state.trim()) {
    const inState = matches.filter((place) => squash(place.state) === squash(state));
    if (!inState.length) return { problem: matches.length ? `${city} is not listed in ${state}.` : `${city} is not on the city list.` };
    matches = inState;
  }
  const [first] = matches;
  if (!first) return { problem: `${city} is not on the city list.` };
  if (matches.length > 1) return { problem: `${city} is in more than one state. Add a state column.` };
  return { city: first.name, state: first.state };
}

function checkRow(row: ListRow): CheckedRow {
  const { cells } = row;
  const problems: string[] = [];
  const name = checkName(cells.name ?? '');
  if (!name.ok) problems.push('Add the name.');
  const website = checkWebsite(cells.website ?? '');
  if (!website.ok) problems.push('Add the website, like college.edu.in.');
  const place = readCity(cells.city ?? '', cells.state ?? '');
  if ('problem' in place) problems.push(place.problem);
  const type = readType(cells.type ?? '');
  if (!type) problems.push('Add the type: College, University or Skilling institute.');
  const choices = (cells.programs ?? '').split(/[;|]/).map((entry) => entry.trim()).filter(Boolean).map(readProgram);
  const programs = checkPrograms(
    choices.filter((choice) => choice.programKey).map((choice) => choice.name),
    choices.filter((choice) => !choice.programKey).map((choice) => choice.name),
  );
  if (!programs.ok) problems.push(choices.length ? programs.error : 'Add at least one program, separated by semicolons.');
  const instagram = cells.instagram ? checkInstagram(cells.instagram) : null;
  if (instagram && !instagram.ok) problems.push('Instagram should be a handle, like @college, or a profile link.');

  const label = name.ok ? name.value : cells.name?.trim() || `Row ${row.position}`;
  if (problems.length || !name.ok || !website.ok || 'problem' in place || !type || !programs.ok || (instagram && !instagram.ok)) {
    return { position: row.position, label, status: 'fix', problems };
  }
  return {
    position: row.position,
    label,
    status: 'ready',
    details: {
      name: name.value,
      website: website.value,
      city: place.city,
      state: place.state,
      type,
      programs: programs.value,
      instagram: instagram?.ok ? instagram.value : null,
    },
  };
}

/** Every row checked, the same website never twice. */
export function checkList(input: string, max: number = TEAM_RULES.bulkMaxRows): CheckedList {
  const rows = readList(input);
  if (!rows.length) return { rows: [], error: 'Paste a list, or choose a CSV file.' };
  if (rows.length > max) return { rows: [], error: `Up to ${max} institutions at a time. This list has ${rows.length}.` };
  const seen = new Map<string, number>();
  return {
    rows: rows.map((row) => {
      const checked = checkRow(row);
      if (checked.status !== 'ready') return checked;
      const host = websiteHost(checked.details.website);
      const earlier = seen.get(host);
      if (earlier !== undefined) return { position: row.position, label: checked.label, status: 'fix', problems: [`Same website as row ${earlier}.`] };
      seen.set(host, row.position);
      return checked;
    }),
    error: null,
  };
}

// Each Brain fact in words: its label, its value and the lines under it, as the Brain, History
// and Ask the brain show them. Facts that live with the details added by you read the same way
// here as in Settings. Pure.

import { BRAIN_RULES } from '../config/brain.ts';
import {
  PROGRAM_LEVEL_LABELS,
  applicationsText,
  approvalNames,
  durationText,
  feesText,
  placementLines,
  type InstitutionDetails,
  type ProgramDetails,
} from '../domain/details.ts';
import { formatDate, formatMonth, hostAndPath, joinNames } from '../domain/format.ts';
import type { InstitutionType } from '../domain/types.ts';
import {
  CONTACT_ROLE_LABELS,
  DATE_TYPE_LABELS,
  KIND_LABELS,
  LINK_TYPE_LABELS,
  NOTE_TYPE_LABELS,
  SCRIPT_FORMAT_LABELS,
  TONE_LABELS,
  type AnyBrainItem,
  type BrainFields,
  type BrainProgram,
} from './model.ts';

/** A link a fact points to, with what it is. */
export interface FactLink {
  text: string;
  href: string;
}

export interface FactView {
  label: string;
  value: string | null;
  lines: string[];
  chips?: string[];
  list?: string[];
  swatches?: Array<{ name: string; hex: string }>;
  link?: FactLink;
  /** A file kept in the Brain (opened through /brain/file/<item>). */
  file?: { name: string; image: boolean };
  /** A state word: Approved, Draft, Waiting, Agreed. */
  state?: string;
}

const day = (value: string) => formatDate(`${value}T06:30:00Z`);
const range = (from: string, to: string | null) => (to ? `${day(from)} to ${day(to)}` : day(from));
const linkOf = (href: string | null, text?: string): FactLink | undefined => (href ? { href, text: text ?? hostAndPath(href) } : undefined);

/** One stored fact in words. `programs` names a placement list's program. */
export function describeItem(item: AnyBrainItem, programs: readonly Pick<BrainProgram, 'id' | 'name'>[] = []): FactView {
  switch (item.kind) {
    case 'contact': {
      const f = item.fields;
      return {
        label: CONTACT_ROLE_LABELS[f.role],
        value: f.title ? `${f.name}, ${f.title}` : f.name,
        lines: [f.approves, f.phone, f.email, f.best].filter((line): line is string => Boolean(line)),
      };
    }
    case 'talk':
      return { label: KIND_LABELS.talk, value: item.fields.how, lines: [] };
    case 'goals':
      return { label: KIND_LABELS.goals, value: null, lines: [], list: item.fields.goals };
    case 'target':
      return { label: KIND_LABELS.target, value: `${item.fields.count} students`, lines: item.fields.note ? [item.fields.note] : [] };
    case 'rivals':
      return { label: KIND_LABELS.rivals, value: joinNames(item.fields.names), lines: [] };
    case 'regions':
      return { label: KIND_LABELS.regions, value: joinNames(item.fields.places), lines: [] };
    case 'logo':
    case 'guidelines': {
      const f = item.fields;
      return {
        label: KIND_LABELS[item.kind],
        value: null,
        lines: [],
        ...(f.file ? { file: { name: f.file.name, image: f.file.type.startsWith('image/') } } : {}),
        ...(f.link ? { link: linkOf(f.link) } : {}),
      };
    }
    case 'colours':
      return { label: KIND_LABELS.colours, value: null, lines: [], swatches: item.fields.colours };
    case 'fonts':
    case 'tagline':
      return { label: KIND_LABELS[item.kind], value: item.fields.text, lines: [] };
    case 'tone':
      return { label: KIND_LABELS.tone, value: TONE_LABELS[item.fields.tone], lines: item.fields.line ? [item.fields.line] : [] };
    case 'avoid':
    case 'dos':
      return { label: KIND_LABELS[item.kind], value: null, lines: [], list: item.fields.items };
    case 'award':
      return {
        label: item.fields.type === 'ranking' ? 'Ranking' : 'Award',
        value: item.fields.year ? `${item.fields.title}, ${item.fields.year}` : item.fields.title,
        lines: [],
        link: linkOf(item.fields.link),
      };
    case 'placement_list': {
      const program = programs.find((entry) => entry.id === item.fields.programId)?.name;
      return {
        label: [program, item.fields.year ? String(item.fields.year) : null].filter(Boolean).join(', ') || KIND_LABELS.placement_list,
        value: 'Placement list',
        lines: [],
        link: linkOf(item.fields.link),
      };
    }
    case 'alumnus':
      return { label: item.fields.program ?? KIND_LABELS.alumnus, value: `${item.fields.name}: ${item.fields.line}`, lines: [], link: linkOf(item.fields.link) };
    case 'review':
      return { label: item.fields.by, value: `“${item.fields.quote}”`, lines: ['The student agreed to its use.'], link: linkOf(item.fields.link) };
    case 'link': {
      const f = item.fields;
      return {
        label: f.type === 'other' ? (f.label ?? LINK_TYPE_LABELS.other) : LINK_TYPE_LABELS[f.type],
        value: null,
        lines: f.type === 'drive' ? [f.shared ? `Shared with ${BRAIN_RULES.driveShareEmail}` : `Not shared with ${BRAIN_RULES.driveShareEmail} yet`] : f.label && f.type !== 'other' ? [f.label] : [],
        link: linkOf(f.url),
      };
    }
    case 'date':
      return { label: DATE_TYPE_LABELS[item.fields.type], value: item.fields.title || DATE_TYPE_LABELS[item.fields.type], lines: [range(item.fields.from, item.fields.to)] };
    case 'plan':
      return {
        label: formatMonth(item.fields.month),
        value: item.fields.note,
        lines: item.fields.agreedBy ? [`${item.fields.status === 'agreed' ? 'Agreed by' : 'For'} ${item.fields.agreedBy}`] : [],
        link: linkOf(item.fields.link, 'The plan'),
        state: item.fields.status === 'agreed' ? 'Agreed' : 'Draft',
      };
    case 'script':
      return {
        label: SCRIPT_FORMAT_LABELS[item.fields.format],
        value: item.fields.title,
        lines: item.fields.approver ? [`${item.fields.status === 'approved' ? 'Approved by' : 'Waiting for'} ${item.fields.approver}`] : [],
        link: linkOf(item.fields.link, 'Script'),
        state: item.fields.status === 'approved' ? 'Approved' : 'Waiting',
      };
    case 'worked':
      return { label: formatMonth(item.fields.month), value: item.fields.line, lines: [], link: linkOf(item.fields.link) };
    case 'note':
      return {
        label: [NOTE_TYPE_LABELS[item.fields.type], item.fields.on ? day(item.fields.on) : null].filter(Boolean).join(', '),
        value: item.fields.title,
        lines: item.fields.body.split('\n').filter(Boolean),
        link: linkOf(item.fields.link),
      };
    case 'skip':
      return { label: KIND_LABELS.skip, value: item.fields.reason, lines: [] };
    case 'found':
      return { label: item.fields.label, value: item.fields.value, lines: [] };
  }
}

/** The details of one program as Brain rows, in order. A row with no value is missing. */
export function programRows(details: ProgramDetails): Array<{ key: 'level' | 'duration' | 'fees' | 'seats' | 'eligibility' | 'dates' | 'highlights'; label: string; value: string | null }> {
  return [
    { key: 'level', label: 'Level', value: details.level ? PROGRAM_LEVEL_LABELS[details.level] : null },
    { key: 'duration', label: 'Duration', value: durationText(details) },
    { key: 'fees', label: 'Fees', value: feesText(details) },
    { key: 'seats', label: 'Seats', value: details.seats !== null ? String(details.seats) : null },
    { key: 'eligibility', label: 'Eligibility', value: details.eligibility },
    { key: 'dates', label: 'Admission dates', value: applicationsText(details) },
    { key: 'highlights', label: 'Highlights', value: details.highlights },
  ];
}

/** A program's placements in one line, or null. */
export function placementText(details: ProgramDetails): string | null {
  const lines = placementLines(details);
  return lines.length ? lines.join('. ') : null;
}

/** What the college said about itself in Settings that the Brain shows in Basics and Proof. */
export function aboutRows(details: InstitutionDetails, type: InstitutionType): Array<{ key: 'founded' | 'approvals' | 'address' | 'admissions'; label: string; value: string | null }> {
  const approvals = approvalNames(type === 'skilling' ? { ...details, naacGrade: null, nirfRank: null, ugcRecognised: null } : details);
  const admissions = [details.admissionsPhone, details.admissionsEmail].filter((part): part is string => Boolean(part));
  return [
    { key: 'founded', label: 'Year started', value: details.foundedYear !== null ? String(details.foundedYear) : null },
    { key: 'approvals', label: type === 'skilling' ? 'Recognition' : 'Approvals', value: approvals.length ? approvals.join(', ') : null },
    { key: 'address', label: 'Address', value: details.campusAddress },
    { key: 'admissions', label: 'Admissions phone and email', value: admissions.length ? admissions.join(', ') : null },
  ];
}

/** A fact's value in a short line: History's before and after, and Needs checking. */
export function shortValue(view: FactView): string {
  if (view.value) return view.value;
  if (view.list?.length) return view.list.join(', ');
  if (view.chips?.length) return view.chips.join(', ');
  if (view.swatches?.length) return view.swatches.map((swatch) => `${swatch.name} ${swatch.hex}`).join(', ');
  if (view.file) return view.file.name;
  if (view.link) return view.link.text;
  return view.lines[0] ?? '';
}

export type { BrainFields };

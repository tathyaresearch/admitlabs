// The fields of each Brain form, kind by kind, and what each shows to start with. One form per
// fact serves the college (the Brain and Help us know you) and the team (the Brain and the
// kickoff call), so both edit the same data. src/brain/forms.ts reads what comes back. Pure.

import { BRAIN_RULES } from '../config/brain.ts';
import {
  NAAC_GRADES,
  NAAC_LABELS,
  PROGRAM_LEVELS,
  PROGRAM_LEVEL_LABELS,
  SKILLING_LABELS,
  SKILLING_RECOGNITIONS,
  type InstitutionDetails,
  type ProgramDetails,
} from '../domain/details.ts';
import type { InstitutionType } from '../domain/types.ts';
import {
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  DATE_TYPES,
  DATE_TYPE_LABELS,
  LINK_TYPES,
  LINK_TYPE_LABELS,
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
  SCRIPT_FORMATS,
  SCRIPT_FORMAT_LABELS,
  TONES,
  TONE_LABELS,
  type BrainFields,
  type BrainKind,
} from './model.ts';

export type InputType = 'text' | 'textarea' | 'select' | 'date' | 'month' | 'number' | 'url' | 'email' | 'tel' | 'checkbox' | 'radio' | 'file' | 'hidden';

export interface InputSpec {
  name: string;
  label: string;
  type: InputType;
  value?: string;
  checked?: boolean;
  options?: ReadonlyArray<{ value: string; label: string }>;
  hint?: string;
  placeholder?: string;
  /** Laid out beside the next input on a wide screen. */
  half?: boolean;
  /** For a file: what it takes. */
  accept?: string;
}

const opts = <T extends string>(values: readonly T[], labels: Readonly<Record<T, string>>) => values.map((value) => ({ value, label: labels[value] }));
const str = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(value));
const lines = (items: readonly string[] | undefined) => (items ?? []).join('\n');

/** The inputs of a Brain fact's form, filled from the fact when it has one. `preset` fills a new one (a contact's role, a date's type). */
export function factInputs<K extends Exclude<BrainKind, 'found'>>(kind: K, fields: BrainFields[K] | null, preset: Record<string, string> = {}): InputSpec[] {
  const f = (fields ?? {}) as Record<string, unknown>;
  const v = (name: string) => str((f[name] as string | number | null | undefined) ?? preset[name]);
  switch (kind) {
    case 'contact': {
      const role = v('role') || 'other';
      return [
        { name: 'role', label: 'Who they are to us', type: role === 'other' ? 'select' : 'hidden', value: role, options: opts(CONTACT_ROLES, CONTACT_ROLE_LABELS) },
        { name: 'name', label: 'Name', type: 'text', value: v('name'), half: true },
        { name: 'title', label: 'Their role', type: 'text', value: v('title'), placeholder: 'Admissions head', half: true },
        { name: 'phone', label: 'Phone', type: 'tel', value: v('phone'), half: true },
        { name: 'email', label: 'Email', type: 'email', value: v('email'), half: true },
        ...(role === 'approver' ? [{ name: 'approves', label: 'What they approve', type: 'text' as const, value: v('approves'), placeholder: 'Reels and posts. Anything with fees goes to the principal.' }] : []),
        { name: 'best', label: 'Best way to reach them', type: 'text', value: v('best'), placeholder: 'WhatsApp, 10 am to 6 pm' },
      ];
    }
    case 'talk':
      return [{ name: 'how', label: 'How they like to talk', type: 'textarea', value: v('how'), placeholder: 'A WhatsApp group for everyday things, email for fees, a call every second Tuesday.' }];
    case 'goals': {
      const goals = (f.goals as string[] | undefined) ?? [];
      return [1, 2, 3].map((index) => ({ name: `goal_${index}`, label: `Goal ${index}`, type: 'text' as const, value: goals[index - 1] ?? '', placeholder: index === 1 ? 'Fill every BBA seat by June' : undefined }));
    }
    case 'target':
      return [
        { name: 'count', label: 'Students to admit this year', type: 'number', value: v('count'), half: true },
        { name: 'note', label: 'A note', type: 'text', value: v('note'), placeholder: 'Across all programs', half: true },
      ];
    case 'rivals':
      return [{ name: 'names', label: 'Main rivals', type: 'textarea', value: lines(f.names as string[]), hint: 'One per line, up to 5.' }];
    case 'regions':
      return [{ name: 'places', label: 'Cities and states', type: 'textarea', value: lines(f.places as string[]), hint: 'One per line: Guwahati, Shillong, Arunachal Pradesh.' }];
    case 'logo':
    case 'guidelines': {
      const logo = kind === 'logo';
      const rule = BRAIN_RULES.files[logo ? 'logo' : 'guidelines'];
      return [
        { name: 'file', label: logo ? 'Upload the logo' : 'Upload the guidelines', type: 'file', accept: rule.types.join(','), hint: logo ? `PNG, JPG or WebP, up to ${rule.maxMb} MB.` : `A PDF, up to ${rule.maxMb} MB.` },
        { name: 'link', label: 'Or a Drive link', type: 'url', value: v('link'), hint: `Share it with ${BRAIN_RULES.driveShareEmail}.` },
      ];
    }
    case 'colours': {
      const colours = (f.colours as Array<{ name: string; hex: string }> | undefined) ?? [];
      return Array.from({ length: 4 }, (_, index) => [
        { name: `colour_name_${index + 1}`, label: `Colour ${index + 1}`, type: 'text' as const, value: colours[index]?.name ?? '', placeholder: index === 0 ? 'College blue' : undefined, half: true },
        { name: `colour_hex_${index + 1}`, label: 'Hex code', type: 'text' as const, value: colours[index]?.hex ?? '', placeholder: '#1F4E8C', half: true },
      ]).flat();
    }
    case 'fonts':
      return [{ name: 'text', label: 'Fonts', type: 'text', value: v('text'), placeholder: 'Poppins for headings, Open Sans for text' }];
    case 'tagline':
      return [{ name: 'text', label: 'Tagline', type: 'text', value: v('text') }];
    case 'tone':
      return [
        { name: 'tone', label: 'Tone', type: 'radio', value: v('tone'), options: opts(TONES, TONE_LABELS) },
        { name: 'line', label: 'In a line (optional)', type: 'text', value: v('line'), placeholder: 'Like a senior who just got the job: plain words, short lines.' },
      ];
    case 'avoid':
      return [{ name: 'items', label: 'Words or topics to avoid', type: 'textarea', value: lines(f.items as string[]), hint: 'One per line: “100% placement”, comparing with other colleges.' }];
    case 'dos':
      return [{ name: 'items', label: 'What to do', type: 'textarea', value: lines(f.items as string[]), hint: 'One per line.' }];
    case 'award':
      return [
        { name: 'type', label: 'What it is', type: 'select', value: v('type') || 'award', options: [{ value: 'award', label: 'Award' }, { value: 'ranking', label: 'Ranking' }], half: true },
        { name: 'year', label: 'Year', type: 'number', value: v('year'), half: true },
        { name: 'title', label: 'Name', type: 'text', value: v('title'), placeholder: 'Best Emerging College, Assam Education Awards' },
        { name: 'link', label: 'Link', type: 'url', value: v('link') },
      ];
    case 'placement_list':
      return [
        { name: 'program', label: 'Program', type: 'hidden', value: v('programId') || preset.program || '' },
        { name: 'year', label: 'Batch year', type: 'number', value: v('year'), half: true },
        { name: 'link', label: 'Link to the list', type: 'url', value: v('link'), hint: 'A Google Drive or Sheets link works best.', half: true },
      ];
    case 'alumnus':
      return [
        { name: 'name', label: 'Name', type: 'text', value: v('name'), half: true },
        { name: 'program', label: 'Program and year', type: 'text', value: v('program'), placeholder: 'BBA, 2023', half: true },
        { name: 'line', label: 'What they do now', type: 'text', value: v('line'), placeholder: 'Analyst at a bank in Kolkata' },
        { name: 'link', label: 'Link to their story', type: 'url', value: v('link'), hint: 'No phone numbers or emails: student details stay in Leads.' },
      ];
    case 'review':
      return [
        { name: 'quote', label: 'What they said', type: 'textarea', value: v('quote') },
        { name: 'by', label: 'Who said it', type: 'text', value: v('by'), placeholder: 'BBA student, 2025 batch', half: true },
        { name: 'link', label: 'Where it was posted', type: 'url', value: v('link'), half: true },
        { name: 'consent', label: 'The student agreed we may use it', type: 'checkbox', checked: Boolean(fields) },
      ];
    case 'link': {
      const type = v('type') || 'other';
      return [
        { name: 'type', label: 'What it is', type: preset.type ? 'hidden' : 'select', value: type, options: opts(LINK_TYPES, LINK_TYPE_LABELS), half: true },
        { name: 'label', label: type === 'other' ? 'Name' : 'Note (optional)', type: 'text', value: v('label'), half: !preset.type },
        { name: 'url', label: 'Link', type: 'url', value: v('url') },
        ...(type === 'drive' ? [{ name: 'shared', label: `Shared with ${BRAIN_RULES.driveShareEmail}`, type: 'checkbox' as const, checked: Boolean(f.shared) }] : []),
      ];
    }
    case 'date': {
      const type = v('type');
      return [
        { name: 'type', label: 'What it is', type: preset.type ? 'hidden' : 'select', value: type || 'event', options: opts(DATE_TYPES, DATE_TYPE_LABELS) },
        ...(type === 'season' ? [] : [{ name: 'title', label: type === 'no_post' ? 'Why (optional)' : 'Name', type: 'text' as const, value: v('title'), placeholder: type === 'no_post' ? 'Exam week' : 'Annual fest' }]),
        { name: 'from', label: type === 'season' ? 'Admissions open' : 'From', type: 'date', value: v('from'), half: true },
        { name: 'to', label: type === 'season' ? 'Admissions close' : 'To (optional)', type: 'date', value: v('to'), half: true },
      ];
    }
    case 'plan':
      return [
        { name: 'month', label: 'Month', type: 'month', value: v('month'), half: true },
        { name: 'status', label: 'Where it stands', type: 'select', value: v('status') || 'draft', options: [{ value: 'draft', label: 'Draft' }, { value: 'agreed', label: 'Agreed' }], half: true },
        { name: 'link', label: 'Link to the plan', type: 'url', value: v('link') },
        { name: 'agreed_by', label: 'Agreed by, or for', type: 'text', value: v('agreedBy'), half: true },
        { name: 'note', label: 'In a line', type: 'text', value: v('note'), placeholder: '12 reels, 4 posts, 1 video', half: true },
      ];
    case 'script':
      return [
        { name: 'format', label: 'Format', type: 'select', value: v('format') || 'reel', options: opts(SCRIPT_FORMATS, SCRIPT_FORMAT_LABELS), half: true },
        { name: 'status', label: 'Where it stands', type: 'select', value: v('status') || 'waiting', options: [{ value: 'waiting', label: 'Waiting for approval' }, { value: 'approved', label: 'Approved' }], half: true },
        { name: 'title', label: 'What it is', type: 'text', value: v('title') },
        { name: 'link', label: 'Link to the script', type: 'url', value: v('link'), half: true },
        { name: 'approver', label: 'Who approves it', type: 'text', value: v('approver'), half: true },
      ];
    case 'worked':
      return [
        { name: 'month', label: 'Month', type: 'month', value: v('month'), half: true },
        { name: 'link', label: 'Link', type: 'url', value: v('link'), half: true },
        { name: 'line', label: 'What worked', type: 'text', value: v('line') },
      ];
    case 'note':
      return [
        { name: 'type', label: 'What it is', type: 'select', value: v('type') || preset.type || 'note', options: opts(NOTE_TYPES, NOTE_TYPE_LABELS), half: true },
        { name: 'on', label: 'Day', type: 'date', value: v('on'), half: true },
        { name: 'title', label: 'Title (optional)', type: 'text', value: v('title') },
        { name: 'body', label: 'Note', type: 'textarea', value: v('body') },
        { name: 'link', label: 'Link (optional)', type: 'url', value: v('link') },
      ];
    case 'skip':
      return [
        { name: 'slot', label: 'Slot', type: 'hidden', value: v('slot') || preset.slot || '' },
        { name: 'reason', label: 'Why it doesn’t apply', type: 'text', value: v('reason') },
      ];
    default:
      return [];
  }
}

// The details added by you, as Brain forms ----------------------------------------------------------

const yesNo = (value: boolean | null) => (value === true ? 'yes' : value === false ? 'no' : '');
const YES_NO = [
  { value: '', label: 'Not said' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** About the college: the year it started, its approvals, its address and admissions contact. */
export function aboutInputs(details: InstitutionDetails, type: InstitutionType): InputSpec[] {
  const skilling = type === 'skilling';
  return [
    { name: 'founded_year', label: 'Year started', type: 'number', value: str(details.foundedYear), half: true },
    ...(skilling
      ? SKILLING_RECOGNITIONS.map((value) => ({ name: 'skilling_recognition', label: SKILLING_LABELS[value], type: 'checkbox' as const, value, checked: details.skillingRecognition.includes(value) }))
      : [
          { name: 'naac_grade', label: 'NAAC grade', type: 'select' as const, value: details.naacGrade ?? '', options: [{ value: '', label: 'Not said' }, ...opts(NAAC_GRADES, NAAC_LABELS)], half: true },
          { name: 'ugc_recognised', label: 'UGC recognised', type: 'select' as const, value: yesNo(details.ugcRecognised), options: YES_NO, half: true },
          { name: 'aicte_approved', label: 'AICTE approved', type: 'select' as const, value: yesNo(details.aicteApproved), options: YES_NO, half: true },
        ]),
    { name: 'other_approvals', label: 'Other approvals', type: 'text', value: str(details.otherApprovals) },
    { name: 'campus_address', label: 'Address', type: 'text', value: str(details.campusAddress) },
    { name: 'admissions_phone', label: 'Admissions phone', type: 'tel', value: str(details.admissionsPhone), half: true },
    { name: 'admissions_email', label: 'Admissions email', type: 'email', value: str(details.admissionsEmail), half: true },
  ];
}

/** One program: level, duration, fees, seats, eligibility, admission dates, highlights, and whether to push it most. */
export function programInputs(details: ProgramDetails, push: boolean): InputSpec[] {
  return [
    { name: 'level', label: 'Level', type: 'select', value: details.level ?? '', options: [{ value: '', label: 'Pick one' }, ...opts(PROGRAM_LEVELS, PROGRAM_LEVEL_LABELS)], half: true },
    { name: 'seats', label: 'Seats', type: 'number', value: str(details.seats), half: true },
    { name: 'duration_value', label: 'Duration', type: 'number', value: str(details.durationValue), half: true },
    { name: 'duration_unit', label: 'In', type: 'select', value: details.durationUnit ?? 'years', options: [{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }], half: true },
    { name: 'fees_amount', label: 'Fees (₹)', type: 'number', value: str(details.feesAmount), half: true },
    { name: 'fees_period', label: 'For', type: 'select', value: details.feesPeriod ?? 'year', options: [{ value: 'year', label: 'A year' }, { value: 'total', label: 'The full course' }], half: true },
    { name: 'eligibility', label: 'Eligibility', type: 'text', value: str(details.eligibility) },
    { name: 'applications_open', label: 'Applications open', type: 'date', value: str(details.applicationsOpen), half: true },
    { name: 'applications_close', label: 'Applications close', type: 'date', value: str(details.applicationsClose), half: true },
    { name: 'highlights', label: 'Highlights (optional)', type: 'text', value: str(details.highlights), placeholder: 'What makes it worth choosing, in a line' },
    { name: 'push', label: 'One of the programs to push most', type: 'checkbox', checked: push },
  ];
}

/** A program's placements: the batch, how many were placed, the packages and top recruiters. */
export function placementInputs(details: ProgramDetails): InputSpec[] {
  return [
    { name: 'placement_year', label: 'Batch year', type: 'number', value: str(details.placementYear), half: true },
    { name: 'placed_percent', label: 'Placed (%)', type: 'number', value: str(details.placedPercent), half: true },
    { name: 'average_package', label: 'Average (₹ lakh a year)', type: 'text', value: str(details.averagePackage), half: true },
    { name: 'highest_package', label: 'Highest (₹ lakh a year)', type: 'text', value: str(details.highestPackage), half: true },
    { name: 'top_recruiters', label: 'Top recruiters', type: 'text', value: details.topRecruiters.join(', '), hint: 'Up to 5, with commas between.' },
  ];
}

/** The form's own values as a reader: what was sent, else what the details hold now (a partial form keeps the rest). */
export function withCurrent(sent: { get(name: string): string; all(name: string): string[]; has(name: string): boolean }, current: Record<string, string | string[]>) {
  return {
    get: (name: string) => (sent.has(name) ? sent.get(name) : Array.isArray(current[name]) ? ((current[name] as string[])[0] ?? '') : ((current[name] as string | undefined) ?? '')),
    all: (name: string) => (sent.has(name) ? sent.all(name) : Array.isArray(current[name]) ? (current[name] as string[]) : current[name] ? [current[name] as string] : []),
  };
}

/** The details as the Settings forms send them, so a partial form keeps every field it does not show. */
export function institutionDetailsForm(details: InstitutionDetails): Record<string, string | string[]> {
  return {
    founded_year: str(details.foundedYear),
    naac_grade: details.naacGrade ?? '',
    nirf_rank: str(details.nirfRank),
    nirf_year: str(details.nirfYear),
    aicte_approved: yesNo(details.aicteApproved),
    ugc_recognised: yesNo(details.ugcRecognised),
    skilling_recognition: [...details.skillingRecognition],
    other_approvals: str(details.otherApprovals),
    campus_address: str(details.campusAddress),
    admissions_phone: str(details.admissionsPhone),
    admissions_email: str(details.admissionsEmail),
    hostel: details.hostel ?? '',
    scholarships: str(details.scholarships),
    difference: str(details.difference),
  };
}

export function programDetailsForm(details: ProgramDetails): Record<string, string | string[]> {
  return {
    level: details.level ?? '',
    duration_value: str(details.durationValue),
    duration_unit: details.durationUnit ?? '',
    fees_amount: str(details.feesAmount),
    fees_period: details.feesPeriod ?? '',
    seats: str(details.seats),
    eligibility: str(details.eligibility),
    specialisations: details.specialisations.join(', '),
    placement_year: str(details.placementYear),
    placed_percent: str(details.placedPercent),
    average_package: str(details.averagePackage),
    highest_package: str(details.highestPackage),
    top_recruiters: details.topRecruiters.join(', '),
    applications_open: str(details.applicationsOpen),
    applications_close: str(details.applicationsClose),
    page_url: str(details.pageUrl),
    highlights: str(details.highlights),
  };
}


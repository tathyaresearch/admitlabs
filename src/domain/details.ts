// Self-reported details ("Added by you"): what an institution says about itself and each of its
// programs, from Settings. Every field is optional. Never part of the score: the Audit scores
// public data only and never reads these (a test keeps it that way). They add context on the
// checks they relate to, one line of advice where the plan shows how to fix, and lines in the
// monthly report, always labelled as added by the institution. Pure.

import { formatDate, formatInr, hostAndPath, joinNames } from './format.ts';
import type { CheckKey, InstitutionType } from './types.ts';

export const NAAC_GRADES = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'not_accredited'] as const;
export type NaacGrade = (typeof NAAC_GRADES)[number];

export const SKILLING_RECOGNITIONS = ['nsdc', 'skill_india', 'sector_skill_council', 'state_skill_mission'] as const;
export type SkillingRecognition = (typeof SKILLING_RECOGNITIONS)[number];

export const HOSTEL_OPTIONS = ['none', 'boys', 'girls', 'both'] as const;
export type HostelOption = (typeof HOSTEL_OPTIONS)[number];

export const NAAC_LABELS: Readonly<Record<NaacGrade, string>> = {
  'A++': 'A++',
  'A+': 'A+',
  A: 'A',
  'B++': 'B++',
  'B+': 'B+',
  B: 'B',
  C: 'C',
  not_accredited: 'Not accredited',
};

export const SKILLING_LABELS: Readonly<Record<SkillingRecognition, string>> = {
  nsdc: 'NSDC partner',
  skill_india: 'Skill India',
  sector_skill_council: 'Sector Skill Council',
  state_skill_mission: 'State skill mission',
};

export const HOSTEL_LABELS: Readonly<Record<HostelOption, string>> = {
  none: 'No hostel',
  boys: 'Boys hostel',
  girls: 'Girls hostel',
  both: 'Boys and girls hostels',
};

/** The words every self-reported line carries. */
export const ADDED_BY_YOU = 'Added by you';

export const DETAIL_LIMITS = {
  otherApprovals: 100,
  campusAddress: 200,
  scholarships: 200,
  difference: 280,
  eligibility: 120,
  listItems: 5,
  listItemLength: 60,
  pageUrl: 300,
} as const;

export interface InstitutionDetails {
  foundedYear: number | null;
  naacGrade: NaacGrade | null;
  nirfRank: number | null;
  nirfYear: number | null;
  aicteApproved: boolean | null;
  ugcRecognised: boolean | null;
  skillingRecognition: SkillingRecognition[];
  otherApprovals: string | null;
  campusAddress: string | null;
  admissionsPhone: string | null;
  admissionsEmail: string | null;
  hostel: HostelOption | null;
  scholarships: string | null;
  difference: string | null;
}

export interface ProgramDetails {
  durationValue: number | null;
  durationUnit: 'months' | 'years' | null;
  feesAmount: number | null;
  feesPeriod: 'year' | 'total' | null;
  seats: number | null;
  eligibility: string | null;
  specialisations: string[];
  placementYear: number | null;
  placedPercent: number | null;
  /** Lakh rupees a year. */
  averagePackage: number | null;
  /** Lakh rupees a year. */
  highestPackage: number | null;
  topRecruiters: string[];
  /** 'YYYY-MM-DD'. */
  applicationsOpen: string | null;
  applicationsClose: string | null;
  pageUrl: string | null;
}

export const EMPTY_INSTITUTION_DETAILS: InstitutionDetails = {
  foundedYear: null,
  naacGrade: null,
  nirfRank: null,
  nirfYear: null,
  aicteApproved: null,
  ugcRecognised: null,
  skillingRecognition: [],
  otherApprovals: null,
  campusAddress: null,
  admissionsPhone: null,
  admissionsEmail: null,
  hostel: null,
  scholarships: null,
  difference: null,
};

export const EMPTY_PROGRAM_DETAILS: ProgramDetails = {
  durationValue: null,
  durationUnit: null,
  feesAmount: null,
  feesPeriod: null,
  seats: null,
  eligibility: null,
  specialisations: [],
  placementYear: null,
  placedPercent: null,
  averagePackage: null,
  highestPackage: null,
  topRecruiters: [],
  applicationsOpen: null,
  applicationsClose: null,
  pageUrl: null,
};

// Reading a form ----------------------------------------------------------------------------

/** A submitted form, read by field name. */
export interface FormRead {
  get(name: string): string;
  all(name: string): string[];
}

export type DetailErrors<T> = Partial<Record<keyof T, string>>;

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

function text(form: FormRead, name: string, max: number, label: string, errors: Record<string, string>, key: string): string | null {
  const value = clean(form.get(name));
  if (!value) return null;
  if (value.length > max) errors[key] = `${label} can be up to ${max} characters.`;
  return value;
}

function whole(form: FormRead, name: string, min: number, max: number, message: string, errors: Record<string, string>, key: string): number | null {
  const raw = form.get(name).replace(/[,\s]/g, '');
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    errors[key] = message;
    return null;
  }
  const value = Number(raw);
  if (value < min || value > max) errors[key] = message;
  return value;
}

function decimal(form: FormRead, name: string, max: number, message: string, errors: Record<string, string>, key: string): number | null {
  const raw = form.get(name).replace(/[,\s]/g, '');
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    errors[key] = message;
    return null;
  }
  const value = Number(raw);
  if (value > max) errors[key] = message;
  return value;
}

function choice<T extends string>(form: FormRead, name: string, allowed: readonly T[]): T | null {
  const value = form.get(name);
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function yesNo(form: FormRead, name: string): boolean | null {
  const value = form.get(name);
  return value === 'yes' ? true : value === 'no' ? false : null;
}

/** "A, B, C" into up to 5 short names. */
function shortList(form: FormRead, name: string, label: string, errors: Record<string, string>, key: string): string[] {
  const items = form
    .get(name)
    .split(',')
    .map(clean)
    .filter(Boolean);
  if (items.length > DETAIL_LIMITS.listItems) errors[key] = `Add up to ${DETAIL_LIMITS.listItems} ${label}.`;
  else if (items.some((item) => item.length > DETAIL_LIMITS.listItemLength)) errors[key] = `Keep each one under ${DETAIL_LIMITS.listItemLength} characters.`;
  return items.slice(0, DETAIL_LIMITS.listItems);
}

function day(form: FormRead, name: string, errors: Record<string, string>, key: string): string | null {
  const value = form.get(name).trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    errors[key] = 'Pick a date.';
    return null;
  }
  return value;
}

/** The host of a website, without www. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function readInstitutionDetails(form: FormRead, now: Date): { values: InstitutionDetails; errors: DetailErrors<InstitutionDetails> } {
  const errors: Record<string, string> = {};
  const year = now.getUTCFullYear();
  const phone = clean(form.get('admissions_phone'));
  const email = clean(form.get('admissions_email')).toLowerCase();
  const values: InstitutionDetails = {
    foundedYear: whole(form, 'founded_year', 1800, year, `Enter a year between 1800 and ${year}.`, errors, 'foundedYear'),
    naacGrade: choice(form, 'naac_grade', NAAC_GRADES),
    nirfRank: whole(form, 'nirf_rank', 1, 1000, 'Enter a rank between 1 and 1000.', errors, 'nirfRank'),
    nirfYear: whole(form, 'nirf_year', 2016, year, `Enter a year between 2016 and ${year}.`, errors, 'nirfYear'),
    aicteApproved: yesNo(form, 'aicte_approved'),
    ugcRecognised: yesNo(form, 'ugc_recognised'),
    skillingRecognition: form.all('skilling_recognition').filter((value): value is SkillingRecognition => (SKILLING_RECOGNITIONS as readonly string[]).includes(value)),
    otherApprovals: text(form, 'other_approvals', DETAIL_LIMITS.otherApprovals, 'Other approvals', errors, 'otherApprovals'),
    campusAddress: text(form, 'campus_address', DETAIL_LIMITS.campusAddress, 'The address', errors, 'campusAddress'),
    admissionsPhone: phone || null,
    admissionsEmail: email || null,
    hostel: choice(form, 'hostel', HOSTEL_OPTIONS),
    scholarships: text(form, 'scholarships', DETAIL_LIMITS.scholarships, 'Scholarships', errors, 'scholarships'),
    difference: text(form, 'difference', DETAIL_LIMITS.difference, 'This', errors, 'difference'),
  };
  if (phone && !/^\+?[0-9 ]{8,16}$/.test(phone)) errors.admissionsPhone = 'Enter a phone number, like +91 98765 43210.';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.admissionsEmail = 'Enter an email address, like admissions@college.edu.';
  if (values.nirfYear !== null && values.nirfRank === null) errors.nirfRank = 'Add the rank for that year.';
  return { values, errors: errors as DetailErrors<InstitutionDetails> };
}

export function readProgramDetails(form: FormRead, website: string): { values: ProgramDetails; errors: DetailErrors<ProgramDetails> } {
  const errors: Record<string, string> = {};
  const unit = choice(form, 'duration_unit', ['months', 'years'] as const);
  const period = choice(form, 'fees_period', ['year', 'total'] as const);
  const rawPage = clean(form.get('page_url'));
  const page = rawPage && !/^https?:\/\//i.test(rawPage) ? `https://${rawPage}` : rawPage;
  const values: ProgramDetails = {
    durationValue: whole(form, 'duration_value', 1, 120, 'Enter a length between 1 and 120.', errors, 'durationValue'),
    durationUnit: unit,
    feesAmount: whole(form, 'fees_amount', 0, 100_000_000, 'Enter the fees in rupees, as a whole number.', errors, 'feesAmount'),
    feesPeriod: period,
    seats: whole(form, 'seats', 1, 100_000, 'Enter the number of seats.', errors, 'seats'),
    eligibility: text(form, 'eligibility', DETAIL_LIMITS.eligibility, 'Eligibility', errors, 'eligibility'),
    specialisations: shortList(form, 'specialisations', 'specialisations', errors, 'specialisations'),
    placementYear: whole(form, 'placement_year', 2000, 2100, 'Enter the batch year, like 2026.', errors, 'placementYear'),
    placedPercent: whole(form, 'placed_percent', 0, 100, 'Enter a percent from 0 to 100.', errors, 'placedPercent'),
    averagePackage: decimal(form, 'average_package', 9999, 'Enter lakh rupees a year, like 4.2.', errors, 'averagePackage'),
    highestPackage: decimal(form, 'highest_package', 9999, 'Enter lakh rupees a year, like 12.', errors, 'highestPackage'),
    topRecruiters: shortList(form, 'top_recruiters', 'recruiters', errors, 'topRecruiters'),
    applicationsOpen: day(form, 'applications_open', errors, 'applicationsOpen'),
    applicationsClose: day(form, 'applications_close', errors, 'applicationsClose'),
    pageUrl: page || null,
  };
  if (values.durationValue !== null && !unit) errors.durationValue = 'Pick months or years.';
  if (values.durationValue === null && unit) values.durationUnit = null;
  if (values.feesAmount !== null && !period) errors.feesAmount = 'Pick a year or in total.';
  if (values.feesAmount === null && period) values.feesPeriod = null;
  if (values.averagePackage !== null && values.highestPackage !== null && values.highestPackage < values.averagePackage) {
    errors.highestPackage = 'The highest package is below the average.';
  }
  if (values.applicationsOpen && values.applicationsClose && values.applicationsClose < values.applicationsOpen) {
    errors.applicationsClose = 'Applications close after they open.';
  }
  if (values.pageUrl) {
    const host = hostOf(values.pageUrl);
    const own = hostOf(website);
    if (!host || values.pageUrl.length > DETAIL_LIMITS.pageUrl) errors.pageUrl = 'Enter the page link, like yourcollege.edu.in/programs/bba.';
    else if (own && host !== own && !host.endsWith(`.${own}`)) errors.pageUrl = 'Use a page on your own website.';
  }
  return { values, errors: errors as DetailErrors<ProgramDetails> };
}

// Database rows -------------------------------------------------------------------------------

export interface InstitutionDetailsRow {
  founded_year: number | null;
  naac_grade: string | null;
  nirf_rank: number | null;
  nirf_year: number | null;
  aicte_approved: boolean | null;
  ugc_recognised: boolean | null;
  skilling_recognition: string[] | null;
  other_approvals: string | null;
  campus_address: string | null;
  admissions_phone: string | null;
  admissions_email: string | null;
  hostel: string | null;
  scholarships: string | null;
  difference: string | null;
}

export interface ProgramDetailsRow {
  duration_value: number | null;
  duration_unit: string | null;
  fees_amount: number | null;
  fees_period: string | null;
  seats: number | null;
  eligibility: string | null;
  specialisations: string[] | null;
  placement_year: number | null;
  placed_percent: number | null;
  average_package: number | null;
  highest_package: number | null;
  top_recruiters: string[] | null;
  applications_open: string | null;
  applications_close: string | null;
  page_url: string | null;
}

const pickOf = <T extends string>(value: string | null, allowed: readonly T[]): T | null => ((allowed as readonly string[]).includes(value ?? '') ? (value as T) : null);
/** Numbers as stored; a numeric column can also arrive as text. */
const numberOf = (value: number | string | null): number | null => (value === null || value === '' ? null : Number(value));

export function institutionDetailsFromRow(row: InstitutionDetailsRow | null): InstitutionDetails {
  if (!row) return EMPTY_INSTITUTION_DETAILS;
  return {
    foundedYear: row.founded_year,
    naacGrade: pickOf(row.naac_grade, NAAC_GRADES),
    nirfRank: row.nirf_rank,
    nirfYear: row.nirf_year,
    aicteApproved: row.aicte_approved,
    ugcRecognised: row.ugc_recognised,
    skillingRecognition: (row.skilling_recognition ?? []).filter((value): value is SkillingRecognition => (SKILLING_RECOGNITIONS as readonly string[]).includes(value)),
    otherApprovals: row.other_approvals,
    campusAddress: row.campus_address,
    admissionsPhone: row.admissions_phone,
    admissionsEmail: row.admissions_email,
    hostel: pickOf(row.hostel, HOSTEL_OPTIONS),
    scholarships: row.scholarships,
    difference: row.difference,
  };
}

export function institutionDetailsToRow(values: InstitutionDetails): InstitutionDetailsRow {
  return {
    founded_year: values.foundedYear,
    naac_grade: values.naacGrade,
    nirf_rank: values.nirfRank,
    nirf_year: values.nirfYear,
    aicte_approved: values.aicteApproved,
    ugc_recognised: values.ugcRecognised,
    skilling_recognition: values.skillingRecognition.length ? values.skillingRecognition : null,
    other_approvals: values.otherApprovals,
    campus_address: values.campusAddress,
    admissions_phone: values.admissionsPhone,
    admissions_email: values.admissionsEmail,
    hostel: values.hostel,
    scholarships: values.scholarships,
    difference: values.difference,
  };
}

export function programDetailsFromRow(row: ProgramDetailsRow | null): ProgramDetails {
  if (!row) return EMPTY_PROGRAM_DETAILS;
  return {
    durationValue: row.duration_value,
    durationUnit: pickOf(row.duration_unit, ['months', 'years'] as const),
    feesAmount: row.fees_amount,
    feesPeriod: pickOf(row.fees_period, ['year', 'total'] as const),
    seats: row.seats,
    eligibility: row.eligibility,
    specialisations: row.specialisations ?? [],
    placementYear: row.placement_year,
    placedPercent: row.placed_percent,
    averagePackage: numberOf(row.average_package),
    highestPackage: numberOf(row.highest_package),
    topRecruiters: row.top_recruiters ?? [],
    applicationsOpen: row.applications_open,
    applicationsClose: row.applications_close,
    pageUrl: row.page_url,
  };
}

export function programDetailsToRow(values: ProgramDetails): ProgramDetailsRow {
  return {
    duration_value: values.durationValue,
    duration_unit: values.durationUnit,
    fees_amount: values.feesAmount,
    fees_period: values.feesPeriod,
    seats: values.seats,
    eligibility: values.eligibility,
    specialisations: values.specialisations.length ? values.specialisations : null,
    placement_year: values.placementYear,
    placed_percent: values.placedPercent,
    average_package: values.averagePackage,
    highest_package: values.highestPackage,
    top_recruiters: values.topRecruiters.length ? values.topRecruiters : null,
    applications_open: values.applicationsOpen,
    applications_close: values.applicationsClose,
    page_url: values.pageUrl,
  };
}

// In words ------------------------------------------------------------------------------------

const dateOf = (value: string) => formatDate(`${value}T06:30:00Z`);

/** "₹1,20,000 a year", "₹3,60,000 in total". */
export function feesText(details: ProgramDetails): string | null {
  if (details.feesAmount === null || !details.feesPeriod) return null;
  return `${formatInr(details.feesAmount)} ${details.feesPeriod === 'year' ? 'a year' : 'in total'}`;
}

/** "₹4.2 lakh a year". */
export function packageText(lakh: number): string {
  return `₹${Number(lakh.toFixed(2))} lakh a year`;
}

/** "3 years", "6 months". */
export function durationText(details: ProgramDetails): string | null {
  if (details.durationValue === null || !details.durationUnit) return null;
  const unit = details.durationUnit === 'years' ? (details.durationValue === 1 ? 'year' : 'years') : details.durationValue === 1 ? 'month' : 'months';
  return `${details.durationValue} ${unit}`;
}

function approvalNames(details: InstitutionDetails): string[] {
  const names: string[] = [];
  if (details.naacGrade) names.push(details.naacGrade === 'not_accredited' ? 'Not NAAC accredited' : `NAAC ${NAAC_LABELS[details.naacGrade]}`);
  if (details.nirfRank !== null) names.push(`NIRF rank ${details.nirfRank}${details.nirfYear ? ` in ${details.nirfYear}` : ''}`);
  if (details.aicteApproved) names.push('AICTE approved');
  if (details.ugcRecognised) names.push('UGC recognised');
  for (const recognition of details.skillingRecognition) names.push(SKILLING_LABELS[recognition]);
  if (details.otherApprovals) names.push(details.otherApprovals);
  return names;
}

function placementLines(details: ProgramDetails): string[] {
  const lines: string[] = [];
  if (details.placedPercent !== null) lines.push(`${details.placementYear ? `${details.placementYear} batch: ` : ''}${details.placedPercent}% placed`);
  const packages = [
    details.averagePackage !== null ? `average ${packageText(details.averagePackage)}` : null,
    details.highestPackage !== null ? `highest ${packageText(details.highestPackage)}` : null,
  ].filter((part): part is string => Boolean(part));
  const joined = packages.join(', ');
  if (joined) lines.push(`${joined.charAt(0).toUpperCase()}${joined.slice(1)}`);
  if (details.topRecruiters.length) lines.push(`Top recruiters: ${joinNames(details.topRecruiters)}`);
  return lines;
}

/** Everything the institution added about itself, as label and value pairs. */
export function institutionDetailLines(details: InstitutionDetails, type: InstitutionType): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  if (details.foundedYear !== null) lines.push({ label: 'Founded', value: String(details.foundedYear) });
  const approvals = approvalNames(type === 'skilling' ? { ...details, naacGrade: null, nirfRank: null, ugcRecognised: null } : details);
  if (approvals.length) lines.push({ label: type === 'skilling' ? 'Recognition' : 'Approvals', value: approvals.join(', ') });
  if (details.campusAddress) lines.push({ label: 'Campus', value: details.campusAddress });
  const contact = [details.admissionsPhone, details.admissionsEmail].filter((part): part is string => Boolean(part));
  if (contact.length) lines.push({ label: 'Admissions', value: contact.join(', ') });
  if (details.hostel) lines.push({ label: 'Hostel', value: HOSTEL_LABELS[details.hostel] });
  if (details.scholarships) lines.push({ label: 'Scholarships', value: details.scholarships });
  if (details.difference) lines.push({ label: 'What makes us different', value: details.difference });
  return lines;
}

/** Everything the institution added about one program, as label and value pairs. */
export function programDetailLines(details: ProgramDetails): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  const duration = durationText(details);
  if (duration) lines.push({ label: 'Duration', value: duration });
  const fees = feesText(details);
  if (fees) lines.push({ label: 'Fees', value: fees });
  if (details.seats !== null) lines.push({ label: 'Seats', value: String(details.seats) });
  if (details.eligibility) lines.push({ label: 'Eligibility', value: details.eligibility });
  if (details.specialisations.length) lines.push({ label: 'Specialisations', value: joinNames(details.specialisations) });
  const placements = placementLines(details);
  if (placements.length) lines.push({ label: 'Placements', value: placements.join('. ') });
  if (details.applicationsOpen || details.applicationsClose) lines.push({ label: 'Applications', value: applicationsText(details) as string });
  if (details.pageUrl) lines.push({ label: 'Page', value: hostAndPath(details.pageUrl) });
  return lines;
}

function applicationsText(details: ProgramDetails): string | null {
  if (details.applicationsOpen && details.applicationsClose) return `Open ${dateOf(details.applicationsOpen)}, close ${dateOf(details.applicationsClose)}`;
  if (details.applicationsOpen) return `Open ${dateOf(details.applicationsOpen)}`;
  if (details.applicationsClose) return `Close ${dateOf(details.applicationsClose)}`;
  return null;
}

/** True when nothing has been added for the program. */
export function isEmptyProgram(details: ProgramDetails): boolean {
  return programDetailLines(details).length === 0;
}

// On a check ----------------------------------------------------------------------------------

/** What the institution added that relates to a check, and one line of advice built on it. */
export interface AddedByYou {
  lines: string[];
  /** Shown only where the plan shows how to fix. */
  advice: string | null;
}

export function addedByYou(
  key: CheckKey,
  input: { institution: InstitutionDetails | null; program: ProgramDetails | null; programName: string | null; institutionType: InstitutionType },
): AddedByYou | null {
  const { institution, program, programName, institutionType } = input;
  const name = programName ?? 'the program';
  switch (key) {
    case 'approvals': {
      if (!institution) return null;
      const names = approvalNames(institution).filter((entry) => entry !== 'Not NAAC accredited');
      if (!names.length) return null;
      return {
        lines: names,
        advice:
          institutionType === 'skilling'
            ? 'Show this recognition on your website, with the certificate or a link to the official list.'
            : 'Show these on your website, each with the certificate or a link to the official list.',
      };
    }
    case 'easy_enquiry': {
      if (!institution) return null;
      const contact = [institution.admissionsPhone, institution.admissionsEmail].filter((part): part is string => Boolean(part));
      if (!contact.length) return null;
      return { lines: [`Admissions: ${contact.join(', ')}`], advice: 'Put this admissions contact on every page, next to the enquiry form, with a WhatsApp button.' };
    }
    case 'google_profile': {
      if (!institution?.campusAddress) return null;
      return { lines: [`Campus: ${institution.campusAddress}`], advice: 'Check that your Google profile shows this address, your admissions number and your opening hours.' };
    }
    case 'fees_shown': {
      const fees = program ? feesText(program) : null;
      if (!fees) return null;
      return { lines: [`Fees: ${fees}`], advice: `Put the fees you added, ${fees}, on the ${name} page, with any other charges.` };
    }
    case 'placement_proof': {
      const lines = program ? placementLines(program) : [];
      if (!lines.length) return null;
      const batch = program?.placementYear ? `${program.placementYear} ` : '';
      return { lines, advice: `Show the ${batch}placements you added on the ${name} page, with the company names.` };
    }
    case 'program_page': {
      if (!program?.pageUrl) return null;
      return { lines: [`Page: ${hostAndPath(program.pageUrl)}`], advice: `Make sure this page has the ${name} fees, eligibility and how to apply, and link it from your home page.` };
    }
    case 'admission_steps': {
      const dates = program ? applicationsText(program) : null;
      const lines = [dates ? `Applications: ${dates.charAt(0).toLowerCase()}${dates.slice(1)}` : null, program?.eligibility ? `Eligibility: ${program.eligibility}` : null].filter(
        (line): line is string => Boolean(line),
      );
      if (!lines.length) return null;
      return { lines, advice: `Show these as numbered steps on the ${name} page: who can apply, the documents needed and the dates.` };
    }
    default:
      return null;
  }
}

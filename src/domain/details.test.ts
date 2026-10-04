import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { hasDashes } from './copy.ts';
import {
  addedByYou,
  durationText,
  EMPTY_INSTITUTION_DETAILS,
  EMPTY_PROGRAM_DETAILS,
  feesText,
  institutionDetailLines,
  institutionDetailsFromRow,
  institutionDetailsToRow,
  packageText,
  programDetailLines,
  programDetailsFromRow,
  programDetailsToRow,
  readInstitutionDetails,
  readProgramDetails,
  type FormRead,
  type InstitutionDetails,
  type ProgramDetails,
  type ProgramDetailsRow,
} from './details.ts';
import { CHECK_KEYS } from './types.ts';

// Self-reported details: optional, checked in plain words, never part of the score.

const NOW = new Date('2026-10-01T06:30:00Z');

function form(values: Record<string, string | string[]>): FormRead {
  return {
    get: (name) => {
      const value = values[name];
      return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
    },
    all: (name) => {
      const value = values[name];
      return Array.isArray(value) ? value : value ? [value] : [];
    },
  };
}

const INSTITUTION: InstitutionDetails = {
  foundedYear: 1998,
  naacGrade: 'A+',
  nirfRank: 87,
  nirfYear: 2026,
  aicteApproved: true,
  ugcRecognised: true,
  skillingRecognition: [],
  otherApprovals: null,
  campusAddress: 'GS Road, Guwahati 781005',
  admissionsPhone: '+91 98640 12345',
  admissionsEmail: 'admissions@eastgate.example',
  hostel: 'both',
  scholarships: 'Merit scholarships up to 50% of fees',
  difference: 'Live industry projects in every semester',
};

const PROGRAM: ProgramDetails = {
  durationValue: 2,
  durationUnit: 'years',
  feesAmount: 240000,
  feesPeriod: 'year',
  seats: 120,
  eligibility: 'Graduation with 50% marks',
  specialisations: ['Finance', 'Marketing'],
  placementYear: 2026,
  placedPercent: 88,
  averagePackage: 6.2,
  highestPackage: 18,
  topRecruiters: ['Tata Steel', 'HDFC Bank', 'Deloitte'],
  applicationsOpen: '2026-11-01',
  applicationsClose: '2027-03-15',
  pageUrl: 'https://eastgate-university.example/programs/mba',
};

describe('reading the institution form', () => {
  test('every field is optional', () => {
    const { values, errors } = readInstitutionDetails(form({}), NOW);
    assert.deepEqual(values, EMPTY_INSTITUTION_DETAILS);
    assert.deepEqual(errors, {});
  });

  test('reads every field, trimmed', () => {
    const { values, errors } = readInstitutionDetails(
      form({
        founded_year: '1998',
        naac_grade: 'A+',
        nirf_rank: '87',
        nirf_year: '2026',
        aicte_approved: 'yes',
        ugc_recognised: 'yes',
        campus_address: '  GS Road,   Guwahati 781005 ',
        admissions_phone: '+91 98640 12345',
        admissions_email: 'Admissions@Eastgate.example',
        hostel: 'both',
        scholarships: 'Merit scholarships up to 50% of fees',
        difference: 'Live industry projects in every semester',
      }),
      NOW,
    );
    assert.deepEqual(errors, {});
    assert.deepEqual(values, INSTITUTION);
  });

  test('says what is wrong, in plain words', () => {
    const { errors } = readInstitutionDetails(
      form({ founded_year: '3000', nirf_year: '2025', admissions_phone: 'call us', admissions_email: 'admissions', naac_grade: 'Z' }),
      NOW,
    );
    assert.equal(errors.foundedYear, 'Enter a year between 1800 and 2026.');
    assert.equal(errors.nirfRank, 'Add the rank for that year.');
    assert.equal(errors.admissionsPhone, 'Enter a phone number, like +91 98765 43210.');
    assert.equal(errors.admissionsEmail, 'Enter an email address, like admissions@college.edu.');
  });

  test('a skilling institute picks its recognitions; unknown ones are ignored', () => {
    const { values } = readInstitutionDetails(form({ skilling_recognition: ['nsdc', 'skill_india', 'made_up'] }), NOW);
    assert.deepEqual(values.skillingRecognition, ['nsdc', 'skill_india']);
  });
});

describe('reading a program form', () => {
  const website = 'https://www.eastgate-university.example';

  test('reads every field; lists split on commas; the page link gets https', () => {
    const { values, errors } = readProgramDetails(
      form({
        duration_value: '2',
        duration_unit: 'years',
        fees_amount: '2,40,000',
        fees_period: 'year',
        seats: '120',
        eligibility: 'Graduation with 50% marks',
        specialisations: 'Finance, Marketing',
        placement_year: '2026',
        placed_percent: '88',
        average_package: '6.2',
        highest_package: '18',
        top_recruiters: 'Tata Steel, HDFC Bank, Deloitte',
        applications_open: '2026-11-01',
        applications_close: '2027-03-15',
        page_url: 'eastgate-university.example/programs/mba',
      }),
      website,
    );
    assert.deepEqual(errors, {});
    assert.deepEqual(values, PROGRAM);
  });

  test('says what is wrong, in plain words', () => {
    const { errors } = readProgramDetails(
      form({
        duration_value: '2',
        fees_amount: '1000',
        specialisations: 'A, B, C, D, E, F',
        average_package: '8',
        highest_package: '6',
        applications_open: '2026-11-01',
        applications_close: '2026-10-01',
        page_url: 'https://another-site.example/mba',
      }),
      website,
    );
    assert.equal(errors.durationValue, 'Pick months or years.');
    assert.equal(errors.feesAmount, 'Pick a year or in total.');
    assert.equal(errors.specialisations, 'Add up to 5 specialisations.');
    assert.equal(errors.highestPackage, 'The highest package is below the average.');
    assert.equal(errors.applicationsClose, 'Applications close after they open.');
    assert.equal(errors.pageUrl, 'Use a page on your own website.');
  });

  test('a page on a subdomain of the website is its own', () => {
    const { errors } = readProgramDetails(form({ page_url: 'https://admissions.eastgate-university.example/mba' }), website);
    assert.equal(errors.pageUrl, undefined);
  });
});

describe('stored and shown', () => {
  test('rows round trip', () => {
    assert.deepEqual(institutionDetailsFromRow(institutionDetailsToRow(INSTITUTION)), INSTITUTION);
    assert.deepEqual(programDetailsFromRow(programDetailsToRow(PROGRAM)), PROGRAM);
    assert.deepEqual(programDetailsFromRow({ ...programDetailsToRow(PROGRAM), average_package: '6.20', highest_package: '18.00' } as unknown as ProgramDetailsRow), PROGRAM);
    assert.deepEqual(institutionDetailsFromRow(null), EMPTY_INSTITUTION_DETAILS);
    assert.deepEqual(programDetailsFromRow(null), EMPTY_PROGRAM_DETAILS);
  });

  test('in words', () => {
    assert.equal(feesText(PROGRAM), '₹2,40,000 a year');
    assert.equal(feesText({ ...PROGRAM, feesAmount: 360000, feesPeriod: 'total' }), '₹3,60,000 in total');
    assert.equal(packageText(6.2), '₹6.2 lakh a year');
    assert.equal(packageText(18), '₹18 lakh a year');
    assert.equal(durationText(PROGRAM), '2 years');
    assert.equal(durationText({ ...PROGRAM, durationValue: 1, durationUnit: 'months' }), '1 month');
    assert.deepEqual(programDetailLines(PROGRAM).map((line) => line.label), ['Duration', 'Fees', 'Seats', 'Eligibility', 'Specialisations', 'Placements', 'Applications', 'Page']);
    assert.equal(
      programDetailLines(PROGRAM).find((line) => line.label === 'Placements')?.value,
      '2026 batch: 88% placed. Average ₹6.2 lakh a year, highest ₹18 lakh a year. Top recruiters: Tata Steel, HDFC Bank and Deloitte',
    );
    assert.deepEqual(
      institutionDetailLines(INSTITUTION, 'university').map((line) => line.label),
      ['Founded', 'Approvals', 'Campus', 'Admissions', 'Hostel', 'Scholarships', 'What makes us different'],
    );
  });
});

describe('Added by you, on a check', () => {
  const input = { institution: INSTITUTION, program: PROGRAM, programName: 'MBA', institutionType: 'university' as const };

  test('the checks it relates to get its lines and one line of advice', () => {
    assert.deepEqual(addedByYou('fees_shown', input), {
      lines: ['Fees: ₹2,40,000 a year'],
      advice: 'Put the fees you added, ₹2,40,000 a year, on the MBA page, with any other charges.',
    });
    assert.deepEqual(addedByYou('placement_proof', input)?.lines, [
      '2026 batch: 88% placed',
      'Average ₹6.2 lakh a year, highest ₹18 lakh a year',
      'Top recruiters: Tata Steel, HDFC Bank and Deloitte',
    ]);
    assert.deepEqual(addedByYou('approvals', input)?.lines, ['NAAC A+', 'NIRF rank 87 in 2026', 'AICTE approved', 'UGC recognised']);
    assert.deepEqual(addedByYou('admission_steps', input)?.lines, ['Applications: open 1 Nov 2026, close 15 Mar 2027', 'Eligibility: Graduation with 50% marks']);
    assert.ok(addedByYou('easy_enquiry', input)?.lines[0]?.startsWith('Admissions: +91 98640 12345'));
    assert.ok(addedByYou('program_page', input)?.lines[0]?.startsWith('Page: eastgate-university.example/programs/mba'));
    assert.ok(addedByYou('google_profile', input)?.lines[0]?.startsWith('Campus: GS Road'));
  });

  test('nothing for other checks, or when nothing was added', () => {
    for (const key of ['google_search', 'instagram_activity', 'review_rating', 'page_speed'] as const) assert.equal(addedByYou(key, input), null, key);
    for (const key of CHECK_KEYS) {
      assert.equal(addedByYou(key, { ...input, institution: EMPTY_INSTITUTION_DETAILS, program: EMPTY_PROGRAM_DETAILS }), null, key);
      assert.equal(addedByYou(key, { ...input, institution: null, program: null }), null, key);
    }
  });

  test('plain words, no dashes', () => {
    for (const key of CHECK_KEYS) {
      const added = addedByYou(key, input);
      for (const text of [...(added?.lines ?? []), added?.advice ?? '']) assert.equal(hasDashes(text), false, text);
    }
    for (const line of [...institutionDetailLines(INSTITUTION, 'university'), ...programDetailLines(PROGRAM)]) assert.equal(hasDashes(line.value), false, line.value);
  });
});

describe('never in the score', () => {
  // The Audit scores public data only. Nothing that scores or runs an Audit may read what an
  // institution says about itself.
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.ts$/.test(name) ? [path] : [];
    });
  }

  test('scoring and the providers that collect signals never touch self-reported details; only the writer reads them, for ready fixes', () => {
    const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    // The Audit run loads them for the writer, and the writer fills a ready fix's blanks with them.
    // So does a review, when the team moves a result below Strong and the writer gives its fix.
    const writer = new Set([join(root, 'audit', 'run.ts'), join(root, 'audit', 'review-jobs.ts'), join(root, 'providers', 'analysis.ts'), join(root, 'providers', 'mock', 'ready-fix.ts')]);
    const scanned = [join(root, 'domain', 'scoring'), join(root, 'audit'), join(root, 'providers')].flatMap(files).filter((file) => !writer.has(file) && !file.endsWith('.test.ts'));
    assert.ok(scanned.length > 20);
    for (const file of scanned) {
      const source = readFileSync(file, 'utf8');
      assert.equal(/domain\/details|\.\/details\.ts|institution_details|program_details/.test(source), false, file);
    }
    // The scoring engine's input never carries them: what evaluateAudit is given names no context.
    const record = readFileSync(join(root, 'audit', 'record.ts'), 'utf8');
    const call = record.slice(record.indexOf('evaluateAudit({'), record.indexOf('});', record.indexOf('evaluateAudit({')));
    assert.ok(call.length > 0);
    assert.doesNotMatch(call, /context|details/);
  });
});

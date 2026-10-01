// Self-reported details in the sample world ("Added by you", from Settings). Eastgate (Paid) has
// added most of them, Brightpath (a skilling institute, Client) a few, and Northbank (Free) its
// basics and BBA fees. The rest have added nothing, so the empty states show too. Never part of
// the score. Phone numbers start with 0, so they can never be a real Indian mobile number.

import { EMPTY_INSTITUTION_DETAILS, EMPTY_PROGRAM_DETAILS, type InstitutionDetails, type ProgramDetails } from '../domain/details.ts';

export const SAMPLE_INSTITUTION_DETAILS: Readonly<Record<string, InstitutionDetails>> = {
  'eastgate-university': {
    ...EMPTY_INSTITUTION_DETAILS,
    foundedYear: 1998,
    naacGrade: 'A+',
    nirfRank: 87,
    nirfYear: 2026,
    aicteApproved: true,
    ugcRecognised: true,
    campusAddress: 'Six Mile, GS Road, Guwahati 781022',
    admissionsPhone: '+91 00000 12345',
    admissionsEmail: 'admissions@eastgate-university.example',
    hostel: 'both',
    scholarships: 'Merit scholarships up to 50% of tuition, and a fee waiver for siblings.',
    difference: 'Industry projects in every semester, with mentors from Guwahati companies.',
  },
  'brightpath-skills': {
    ...EMPTY_INSTITUTION_DETAILS,
    foundedYear: 2019,
    skillingRecognition: ['nsdc', 'skill_india'],
    campusAddress: 'Zoo Road, Guwahati 781024',
    admissionsEmail: 'hello@brightpath-skills.example',
    hostel: 'none',
  },
  'northbank-college': {
    ...EMPTY_INSTITUTION_DETAILS,
    foundedYear: 2004,
    naacGrade: 'B+',
    ugcRecognised: true,
  },
};

export const SAMPLE_PROGRAM_DETAILS: ReadonlyArray<{ slug: string; programKey: string; details: ProgramDetails }> = [
  {
    slug: 'eastgate-university',
    programKey: 'mba',
    details: {
      ...EMPTY_PROGRAM_DETAILS,
      durationValue: 2,
      durationUnit: 'years',
      feesAmount: 240000,
      feesPeriod: 'year',
      seats: 120,
      eligibility: 'A degree with 50% marks, and a CAT, MAT or CMAT score',
      specialisations: ['Finance', 'Marketing', 'Human Resources', 'Business Analytics'],
      placementYear: 2026,
      placedPercent: 88,
      averagePackage: 6.2,
      highestPackage: 18,
      topRecruiters: ['Tata Steel', 'HDFC Bank', 'Deloitte', 'Amazon'],
      applicationsOpen: '2026-11-01',
      applicationsClose: '2027-03-15',
      pageUrl: 'https://eastgate-university.example/programs/mba',
    },
  },
  {
    slug: 'eastgate-university',
    programKey: 'bba',
    details: {
      ...EMPTY_PROGRAM_DETAILS,
      durationValue: 3,
      durationUnit: 'years',
      feesAmount: 110000,
      feesPeriod: 'year',
      seats: 180,
      eligibility: '12th pass in any stream with 50% marks',
      placementYear: 2026,
      placedPercent: 72,
      averagePackage: 3.6,
      highestPackage: 8.5,
      topRecruiters: ['Axis Bank', 'Reliance Retail', 'Teleperformance'],
      applicationsOpen: '2026-12-01',
      applicationsClose: '2027-05-31',
      pageUrl: 'https://eastgate-university.example/programs/bba',
    },
  },
  {
    slug: 'eastgate-university',
    programKey: 'data-analytics',
    details: {
      ...EMPTY_PROGRAM_DETAILS,
      durationValue: 3,
      durationUnit: 'years',
      feesAmount: 135000,
      feesPeriod: 'year',
      seats: 60,
      eligibility: '12th pass with Mathematics',
      pageUrl: 'https://eastgate-university.example/programs/data-analytics',
    },
  },
  {
    slug: 'brightpath-skills',
    programKey: 'digital-marketing',
    details: {
      ...EMPTY_PROGRAM_DETAILS,
      durationValue: 4,
      durationUnit: 'months',
      feesAmount: 45000,
      feesPeriod: 'total',
      seats: 40,
      placementYear: 2026,
      placedPercent: 76,
      averagePackage: 2.8,
      highestPackage: 5.4,
    },
  },
  {
    slug: 'northbank-college',
    programKey: 'bba',
    details: { ...EMPTY_PROGRAM_DETAILS, feesAmount: 65000, feesPeriod: 'year', seats: 120 },
  },
];

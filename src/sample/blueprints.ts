// The sample Blueprints (spec sections 20 and 26). Brightpath Skills Academy has two versions:
// version 1 from March, after its Brain was Ready, approved by Ritu; version 2, the October
// refresh, shared by its Client manager and waiting for the college. Silverline College has none
// yet. Each is a small PDF the seed writes with samplePdf, plain ASCII and no dashes.

import type { SamplePage } from './blueprint-pdf.ts';
import { MANAGER_EMAIL, TEAM_EMAIL } from './institutions.ts';

export interface SampleBlueprint {
  slug: string;
  version: number;
  fileName: string;
  pages: readonly SamplePage[];
  /** 'YYYY-MM-DD', India time, with who did it. */
  uploaded: { on: string; by: string };
  shared: { on: string; by: string } | null;
  approved: { on: string; by: string } | null;
}

const RITU = 'owner@brightpath-skills.example';

export const SAMPLE_BLUEPRINTS: readonly SampleBlueprint[] = [
  {
    slug: 'brightpath-skills',
    version: 1,
    fileName: 'Brightpath growth blueprint, March 2026.pdf',
    uploaded: { on: '2026-03-18', by: TEAM_EMAIL },
    shared: { on: '2026-03-19', by: TEAM_EMAIL },
    approved: { on: '2026-03-21', by: RITU },
    pages: [
      {
        title: 'Brightpath growth blueprint, version 1',
        lines: [
          'Prepared by AdmitLabs for Brightpath Skills Academy, Guwahati, in March 2026.',
          'Goal for this academic year: 120 admissions across the three programs.',
          'Fill the January Digital Marketing batch by December.',
          'Grow Hotel Management to a full batch of 35.',
          'Reach 300 Google reviews.',
        ],
      },
      {
        title: 'The plan, season by season',
        lines: [
          'April to June: fix the Google profile and answer every review within two days.',
          'July to September: two placement stories a month as Reels, approved by Anjali.',
          'October to December: the January batch push, with a weekly open day.',
          'Every month: one fee and dates check, so the website and Google say the same.',
        ],
      },
      {
        title: 'What we will not do',
        lines: ['No 100 percent placement claims.', 'No stock photos: real students and real classrooms only.', 'We never name other institutes.'],
      },
    ],
  },
  {
    slug: 'brightpath-skills',
    version: 2,
    fileName: 'Brightpath growth blueprint, October 2026.pdf',
    uploaded: { on: '2026-10-05', by: MANAGER_EMAIL },
    shared: { on: '2026-10-06', by: MANAGER_EMAIL },
    approved: null,
    pages: [
      {
        title: 'Brightpath growth blueprint, version 2',
        lines: [
          'Updated by AdmitLabs in October 2026, after six months of work together.',
          'Data Analytics placed 68 percent of its 2026 batch: lead with this result.',
          'Hotel Management is still short of a full batch of 35.',
          'The goal stays at 120 admissions and 300 Google reviews this academic year.',
        ],
      },
      {
        title: 'October to March',
        lines: [
          'January Digital Marketing batch: weekly open days from 1 November, and one Reel each week.',
          'Hotel Management: a kitchen tour video and two alumni stories before December.',
          'Data Analytics: a placement week in November, with the 68 percent result on Google and the website.',
          'Answer every review within two days, and every enquiry on the same day.',
        ],
      },
      {
        title: 'What stays the same',
        lines: [
          'Anjali approves posts. Anything that names a fee goes to Ritu.',
          'No 100 percent placement claims, no stock photos, and never naming other institutes.',
          'Fees and dates are checked every month, so the website and Google say the same.',
        ],
      },
    ],
  },
];

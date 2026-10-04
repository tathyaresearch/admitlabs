// What people say and Other places for the sample world (spec 20): the findings the search tool
// and Reddit "find" about each sample institution, and the fixes the writer wrote for them. Never
// a person: one short line in Drishti's words, where it was found and a .example link. Some
// colleges have plenty said about them, some very little, as real ones do.

import type { ListingProblem } from '../domain/finding-rules.ts';
import type { Difficulty, FindingKind, FindingPlace, Impact } from '../domain/types.ts';

/** A fix the writer wrote for one finding (the mock AI hands it back as it is). */
export interface WrittenFindingFix {
  title: string;
  why: string;
  steps: readonly string[];
  ready: { title: string; text: string };
  /** Overrides the rules' impact or effort, when the writer knows better. */
  impact?: Impact;
  effort?: Difficulty;
}

export interface FindingFixture {
  slug: string;
  /** The same finding month after month: a thread, a listing. */
  key: string;
  place: FindingPlace;
  kind: FindingKind;
  line: string;
  /** Where it was found: "Reddit", "Quora", or a listing site's address. */
  source: string;
  url: string;
  /** The day it was first found. */
  from: string;
  /** The last day it was there, when it has been dealt with. */
  until?: string;
  repeats?: number;
  listing?: ListingProblem | null;
  fix?: WrittenFindingFix;
}

const answer = (title: string, text: string): WrittenFindingFix['ready'] => ({ title, text });

export const SAMPLE_FINDINGS: readonly FindingFixture[] = [
  // Eastgate University: plenty said, good and bad, and a few listings.
  {
    slug: 'eastgate-university',
    key: 'eastgate-reddit-hostel-fees',
    place: 'people',
    kind: 'bad',
    line: 'Three students in one thread say hostel fees went up with no notice.',
    source: 'Reddit',
    url: 'https://reddit.example/r/guwahati/comments/hostel-fees-eastgate',
    from: '2026-09-12',
    repeats: 3,
    fix: {
      title: 'Reply to the hostel fee thread on Reddit',
      why: 'Parents read threads like this before they visit. A clear, calm reply from the university settles the worry for everyone who finds it later.',
      steps: ['Say who you are and that you work at Eastgate.', 'Give the new hostel fee and what it now includes.', 'Say when students were told, and where to ask.'],
      ready: answer(
        'A reply from the university',
        'Hi, I work in admissions at Eastgate University. The 2026 hostel fee is ₹[amount] a year, up from ₹[amount], because it now includes [what]. We wrote to every student on [date]. Questions are welcome at [email].',
      ),
    },
  },
  {
    slug: 'eastgate-university',
    key: 'eastgate-quora-data-analytics',
    place: 'people',
    kind: 'unanswered',
    line: '“Is the B.Sc Data Analytics at Eastgate worth it?” has no answer from the university.',
    source: 'Quora',
    url: 'https://quora.example/Is-the-BSc-Data-Analytics-at-Eastgate-worth-it',
    from: '2026-09-20',
    fix: {
      title: 'Answer the Data Analytics question on Quora',
      why: 'Students who search the course name find this question first. An answer from the university is the one they trust most.',
      steps: ['Answer from a named account, and say you work at Eastgate.', 'Give the first batch’s projects and where they interned.', 'Link to the program page.'],
      ready: answer(
        'An answer to post',
        'I work at Eastgate University. The B.Sc Data Analytics started in 2025. The first batch built [number] projects with local companies, and [number] interned at [companies]. Fees are ₹[amount] a year. More on the course page: [link].',
      ),
    },
  },
  {
    slug: 'eastgate-university',
    key: 'eastgate-forum-bba-scholarship',
    place: 'people',
    kind: 'unanswered',
    line: '“Does Eastgate give scholarships for BBA?” is still open on a student forum.',
    source: 'studentforum.example',
    url: 'https://studentforum.example/t/eastgate-bba-scholarship',
    from: '2026-09-14',
    fix: {
      title: 'Answer the BBA scholarship question',
      why: 'Scholarships decide where many students apply. An open question reads as no.',
      steps: ['Reply with the scholarships BBA students can get.', 'Give the marks needed and the last date.', 'Link to the scholarship page.'],
      ready: answer('An answer to post', 'I work at Eastgate University. BBA students can get [scholarship] for [marks] and above in Class 12, worth up to ₹[amount] a year. Apply by [date]: [link].'),
    },
  },
  // Dealt with: marked done in August, answered, and gone by the September Audit.
  {
    slug: 'eastgate-university',
    key: 'eastgate-quora-mba-hostel',
    place: 'people',
    kind: 'unanswered',
    line: '“Is there a hostel for MBA students at Eastgate?” has no answer from the university.',
    source: 'Quora',
    url: 'https://quora.example/Is-there-a-hostel-for-MBA-students-at-Eastgate',
    from: '2026-06-20',
    until: '2026-08-20',
    fix: {
      title: 'Answer the MBA hostel question on Quora',
      why: 'Students from outside Guwahati ask about hostels before anything else.',
      steps: ['Answer from a named account, and say you work at Eastgate.', 'Say who the hostel is for, its fee and what it includes.', 'Link to the hostel page.'],
      ready: answer('An answer to post', 'I work at Eastgate University. MBA students can stay in the [name] hostel on campus, ₹[amount] a year with meals. More here: [link].'),
    },
  },
  { slug: 'eastgate-university', key: 'eastgate-reddit-nursing-labs', place: 'people', kind: 'good', line: 'A thread praises the Nursing labs and the hospital tie ups.', source: 'Reddit', url: 'https://reddit.example/r/assam/comments/nursing-colleges-guwahati', from: '2026-09-09' },
  { slug: 'eastgate-university', key: 'eastgate-quora-mba-placements', place: 'people', kind: 'good', line: 'An MBA alumnus recommends Eastgate for its placement cell.', source: 'Quora', url: 'https://quora.example/Which-is-the-best-MBA-college-in-Guwahati', from: '2026-07-02' },
  {
    slug: 'eastgate-university',
    key: 'eastgate-collegeguide-mba-fees',
    place: 'other',
    kind: 'listing',
    line: 'Shows MBA fees from 2024: ₹1.6 lakh a year. Your site says ₹1.85 lakh.',
    source: 'collegeguide.example',
    url: 'https://collegeguide.example/eastgate-university/fees',
    from: '2026-05-15',
    listing: 'old_details',
    fix: {
      title: 'Update your MBA fees on collegeguide.example',
      why: 'Students compare fees on listing sites. Old fees there make your own page look wrong.',
      steps: ['Claim the listing with your official email.', 'Paste the details below.', 'Check it again in a week.'],
      ready: answer('Details to send the listing site', 'Eastgate University, Six Mile, GS Road, Guwahati 781022\nMBA, 2026 to 2028: ₹1.85 lakh a year\nAdmissions: admissions@eastgate-university.example, [phone]'),
    },
  },
  {
    slug: 'eastgate-university',
    key: 'eastgate-admissionsportal-missing',
    place: 'other',
    kind: 'listing',
    line: 'Not listed. Students compare Guwahati MBA colleges here.',
    source: 'admissionsportal.example',
    url: 'https://admissionsportal.example/guwahati/mba',
    from: '2026-04-15',
    listing: 'missing',
    fix: {
      title: 'Add Eastgate to admissionsportal.example',
      why: 'One more place students meet you while they compare.',
      steps: ['Add the university with your official email.', 'Fill in the programs, fees and contact.', 'Add the link to your admissions page.'],
      ready: answer('Details to add', 'Eastgate University, Guwahati. Programs: MBA, BBA, BCA, B.Sc Nursing, B.Sc Data Analytics. Fees and dates: [link]. Admissions: [email], [phone].'),
    },
  },
  { slug: 'eastgate-university', key: 'eastgate-news-health-camp', place: 'other', kind: 'news', line: 'Nursing students ran a free health camp in Six Mile.', source: 'newsassam.example', url: 'https://newsassam.example/2026/09/03/health-camp-six-mile', from: '2026-09-03' },
  { slug: 'eastgate-university', key: 'eastgate-citydirectory', place: 'other', kind: 'directory', line: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/guwahati/eastgate-university', from: '2026-04-15', listing: null },

  // Silverline College: plenty said, almost all good.
  ...(
    [
      ['silverline-reddit-hotel-internships', 'Students praise the hotel management internships in big hotels.', 'Reddit', 'https://reddit.example/r/guwahati/comments/silverline-hotel-internships', '2026-08-04'],
      ['silverline-quora-bba-faculty', 'A BBA student says the faculty answer questions after class.', 'Quora', 'https://quora.example/How-is-BBA-at-Silverline-College', '2026-07-19'],
      ['silverline-reddit-campus', 'A thread calls the campus small but friendly.', 'Reddit', 'https://reddit.example/r/assam/comments/silverline-campus', '2026-09-02'],
      ['silverline-quora-placements', 'An alumna shares her first job offer from the placement drive.', 'Quora', 'https://quora.example/Silverline-College-placements', '2026-09-11'],
      ['silverline-forum-fees-clear', 'A parent says the fee page answered every question.', 'studentforum.example', 'https://studentforum.example/t/silverline-fees', '2026-08-22'],
      ['silverline-reddit-events', 'Students like the yearly hospitality festival.', 'Reddit', 'https://reddit.example/r/guwahati/comments/silverline-festival', '2026-09-18'],
    ] as const
  ).map(([key, line, source, url, from]): FindingFixture => ({ slug: 'silverline-college', key, place: 'people', kind: 'good', line, source, url, from })),
  { slug: 'silverline-college', key: 'silverline-quora-bcom-ca', place: 'people', kind: 'unanswered', line: '“Does Silverline help B.Com students with CA classes?” has no answer yet.', source: 'Quora', url: 'https://quora.example/Silverline-BCom-CA', from: '2026-09-21' },
  { slug: 'silverline-college', key: 'silverline-collegeguide', place: 'other', kind: 'listing', line: 'Listed with this year’s fees.', source: 'collegeguide.example', url: 'https://collegeguide.example/silverline-college', from: '2026-04-01', listing: null },
  { slug: 'silverline-college', key: 'silverline-admissionsportal', place: 'other', kind: 'listing', line: 'Listed with every program.', source: 'admissionsportal.example', url: 'https://admissionsportal.example/guwahati/silverline-college', from: '2026-04-01', listing: null },
  { slug: 'silverline-college', key: 'silverline-citydirectory', place: 'other', kind: 'directory', line: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/guwahati/silverline-college', from: '2026-04-01', listing: null },
  { slug: 'silverline-college', key: 'silverline-news-hotel', place: 'other', kind: 'news', line: 'Hotel management students cooked for a city food festival.', source: 'newsassam.example', url: 'https://newsassam.example/2026/08/27/food-festival', from: '2026-08-27' },
  { slug: 'silverline-college', key: 'silverline-news-placements', place: 'other', kind: 'news', line: 'A story on the 2026 BBA placement drive.', source: 'guwahatitimes.example', url: 'https://guwahatitimes.example/2026/09/16/silverline-placements', from: '2026-09-16' },

  // Highfield University, Guwahati: good and bad.
  { slug: 'highfield-university', key: 'highfield-reddit-nursing', place: 'people', kind: 'good', line: 'A thread praises the nursing labs.', source: 'Reddit', url: 'https://reddit.example/r/assam/comments/highfield-nursing', from: '2026-07-12' },
  { slug: 'highfield-university', key: 'highfield-quora-mba', place: 'people', kind: 'good', line: 'An MBA student likes the case study classes.', source: 'Quora', url: 'https://quora.example/How-is-MBA-at-Highfield', from: '2026-08-08' },
  { slug: 'highfield-university', key: 'highfield-reddit-library', place: 'people', kind: 'good', line: 'Students say the library is open late.', source: 'Reddit', url: 'https://reddit.example/r/guwahati/comments/highfield-library', from: '2026-09-05' },
  { slug: 'highfield-university', key: 'highfield-reddit-fees-hidden', place: 'people', kind: 'bad', line: 'Two parents say MBA fees are not on the website.', source: 'Reddit', url: 'https://reddit.example/r/guwahati/comments/highfield-mba-fees', from: '2026-08-24', repeats: 2 },
  { slug: 'highfield-university', key: 'highfield-forum-bus', place: 'people', kind: 'bad', line: 'A student says the college bus is often late.', source: 'studentforum.example', url: 'https://studentforum.example/t/highfield-bus', from: '2026-09-09', repeats: 1 },
  { slug: 'highfield-university', key: 'highfield-collegeguide', place: 'other', kind: 'listing', line: 'Listed with every program.', source: 'collegeguide.example', url: 'https://collegeguide.example/highfield-university', from: '2026-04-15', listing: null },
  { slug: 'highfield-university', key: 'highfield-citydirectory', place: 'other', kind: 'directory', line: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/guwahati/highfield-university', from: '2026-04-15', listing: null },

  // Northbank College: not much said yet.
  {
    slug: 'northbank-college',
    key: 'northbank-quora-bba',
    place: 'people',
    kind: 'unanswered',
    line: '“Is Northbank College good for BBA?” has one short answer, not from the college.',
    source: 'Quora',
    url: 'https://quora.example/Is-Northbank-College-good-for-BBA',
    from: '2026-08-30',
    fix: {
      title: 'Answer the BBA question on Quora',
      why: 'It is the first thing students see when they search your name with BBA.',
      steps: ['Answer from a named account, and say you work at Northbank.', 'Give fees, placements and the admission dates.', 'Link to the BBA page.'],
      ready: answer('An answer to post', 'I work at Northbank College. Our BBA is 3 years, ₹[amount] a year. In 2026, [number] students were placed. Admissions open on [date]: [link].'),
    },
  },
  { slug: 'northbank-college', key: 'northbank-citydirectory', place: 'other', kind: 'directory', line: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/guwahati/northbank-college', from: '2026-06-10', listing: null },

  // Brightpath Skills Academy: very little said; a listing missing two courses.
  { slug: 'brightpath-skills', key: 'brightpath-reddit-trainers', place: 'people', kind: 'good', line: 'One learner says the Digital Marketing trainers are patient.', source: 'Reddit', url: 'https://reddit.example/r/guwahati/comments/digital-marketing-course', from: '2026-08-21' },
  {
    slug: 'brightpath-skills',
    key: 'brightpath-skillcourses-missing',
    place: 'other',
    kind: 'listing',
    line: 'Lists only Hotel Management. Your Digital Marketing and Data Analytics courses are missing.',
    source: 'skillcourses.example',
    url: 'https://skillcourses.example/guwahati/brightpath-skills-academy',
    from: '2026-07-02',
    listing: 'missing_courses',
    fix: {
      title: 'Add your two missing courses on skillcourses.example',
      why: 'Students search course by course. Missing courses mean missed students.',
      steps: ['Sign in to the listing with your official email.', 'Add Digital Marketing and Data Analytics with fees and length.', 'Link each to its page.'],
      ready: answer('Details to add', 'Digital Marketing, 4 months, ₹[amount]\nData Analytics with Power BI, 3 months (weekend batch too), ₹[amount]\nContact: [email], [phone]'),
    },
  },

  // Pinegrove Skills Hub, Guwahati (a rival record).
  { slug: 'pinegrove-skills', key: 'pinegrove-reddit-projects', place: 'people', kind: 'good', line: 'Learners like the live client projects.', source: 'Reddit', url: 'https://reddit.example/r/guwahati/comments/pinegrove-projects', from: '2026-08-12' },
  { slug: 'pinegrove-skills', key: 'pinegrove-quora-weekend', place: 'people', kind: 'good', line: 'A working learner recommends the weekend batch.', source: 'Quora', url: 'https://quora.example/Pinegrove-Skills-Hub-weekend-batch', from: '2026-09-06' },
  { slug: 'pinegrove-skills', key: 'pinegrove-quora-certificate', place: 'people', kind: 'unanswered', line: '“Is the Pinegrove certificate accepted by companies?” has no answer yet.', source: 'Quora', url: 'https://quora.example/Pinegrove-certificate', from: '2026-09-15' },
  { slug: 'pinegrove-skills', key: 'pinegrove-skillcourses', place: 'other', kind: 'listing', line: 'Listed with both courses.', source: 'skillcourses.example', url: 'https://skillcourses.example/guwahati/pinegrove-skills-hub', from: '2026-04-01', listing: null },

  // Kestrel Skills Centre, Tezpur (a rival record): one directory entry, nothing said.
  { slug: 'kestrel-skills', key: 'kestrel-citydirectory', place: 'other', kind: 'directory', line: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/tezpur/kestrel-skills-centre', from: '2026-08-01', listing: null },

  // Loomcraft Skills Institute, Tezpur: nothing found yet, in either place.
];

/** The sample findings for an institution that were there on a day. */
export function sampleFindings(slug: string, day: string): FindingFixture[] {
  return SAMPLE_FINDINGS.filter((finding) => finding.slug === slug && finding.from <= day && (!finding.until || finding.until >= day));
}

/** Whether Drishti has hand-written findings for this institution (even none, like Loomcraft). */
export const SAMPLE_FINDING_SLUGS: ReadonlySet<string> = new Set([
  'eastgate-university',
  'silverline-college',
  'highfield-university',
  'northbank-college',
  'brightpath-skills',
  'pinegrove-skills',
  'kestrel-skills',
  'loomcraft-skills',
]);

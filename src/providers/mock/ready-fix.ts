// The written bank behind the mock writer's ready fixes (spec 7.7): for each check, a text or a
// layout the institution can copy. Blanks it fills in are in [brackets]; the details it added in
// Settings fill some of them in, and so does a Client's Brain (a tagline, when admissions open, the
// admission portal, an email, an alumnus). Later the Claude API writes these from the same inputs. Rules:
// plain words, short lines, no dashes, and nothing that claims a fact Drishti does not have.

import type { BrainWriting } from '../../brain/writing.ts';
import type { InstitutionDetails, ProgramDetails } from '../../domain/details.ts';
import { formatDateLong, formatInr, joinNames } from '../../domain/format.ts';
import type { ReadyFix } from '../../domain/ready-fix.ts';
import type { CheckKey, InstitutionType } from '../../domain/types.ts';

export interface ReadyFixContext {
  institutionName: string;
  city: string;
  institutionType: InstitutionType;
  /** Every program the institution offers, by name. */
  programNames: readonly string[];
  /** The program the fix is for, for program checks. */
  programName: string | null;
  institutionDetails: InstitutionDetails | null;
  /** The program's details, for program checks. */
  programDetails: ProgramDetails | null;
  /** A Client's Brain, when there is one. */
  brain?: BrainWriting | null;
}

const lakh = (value: number) => `₹${value} lakh a year`;

/** Fills each blank from the details when they have it. Remembers whether any detail was used. */
class Filler {
  used = false;

  value<T>(known: T | null | undefined, write: (value: T) => string, blank: string): string {
    if (known === null || known === undefined || (Array.isArray(known) && known.length === 0)) return blank;
    this.used = true;
    return write(known);
  }
}

function withDetails(fix: ReadyFix, filler: Filler): ReadyFix {
  return filler.used ? { ...fix, fromDetails: true } : fix;
}

export function writeReadyFix(key: CheckKey, ctx: ReadyFixContext): ReadyFix {
  const program = ctx.programName ?? ctx.programNames[0] ?? 'the program';
  const kind = ctx.institutionType === 'skilling' ? 'institute' : ctx.institutionType;
  const school = ctx.institutionDetails;
  const course = ctx.programDetails;
  const brain = ctx.brain ?? null;
  const fill = new Filler();
  const programs = ctx.programNames.length ? joinNames([...ctx.programNames]) : '[programs]';

  switch (key) {
    case 'program_page':
      return withDetails(
        {
          kind: 'outline',
          title: `A page of its own for ${program}`,
          items: [
            { heading: `${program} in ${ctx.city}`, line: 'Who it is for and what they will do, in two lines.' },
            { heading: 'Fees', line: fill.value(course?.feesAmount, (amount) => `${formatInr(amount)} ${course?.feesPeriod === 'total' ? 'for the whole course' : 'a year'}, with what it covers.`, 'The full fee table, year by year.') },
            { heading: 'Eligibility', line: fill.value(course?.eligibility, (text) => `${text}.`, 'Marks needed, and the subjects.') },
            { heading: 'Placements', line: 'Last year: students placed, average package, five recruiters.' },
            { heading: 'How to apply', line: 'Four steps with dates.' },
            { heading: 'Ask us', line: 'The form and a WhatsApp button.' },
          ],
        },
        fill,
      );

    case 'fees_shown': {
      const years = course?.durationUnit === 'years' && course.durationValue ? Math.min(5, course.durationValue) : 3;
      if (course?.feesAmount && course.feesPeriod === 'total') {
        fill.used = true;
        return withDetails(
          {
            kind: 'table',
            title: `${program} fees, 2026 to 2027`,
            head: ['', 'Amount'],
            rows: [
              ['Course fee', formatInr(course.feesAmount)],
              ['Exam and certificate', '₹[amount]'],
              ['Total', '₹[amount]'],
            ],
            note: 'Say what the fee covers, and when each part is paid.',
          },
          fill,
        );
      }
      const tuition = fill.value(course?.feesAmount, formatInr, '₹[amount]');
      return withDetails(
        {
          kind: 'table',
          title: `${program} fees, 2026 to 2027`,
          head: ['Year', 'Tuition', 'Other fees', 'Total'],
          rows: Array.from({ length: years }, (_, index) => [`Year ${index + 1}`, tuition, '₹[amount]', '₹[amount]']),
          note: 'Add hostel as its own line if you offer it, and say what each fee covers.',
        },
        fill,
      );
    }

    case 'placement_proof': {
      const year = fill.value(course?.placementYear, String, '2026');
      return withDetails(
        {
          kind: 'table',
          title: `${program} placements, ${year} batch`,
          head: ['', `${year} batch`],
          rows: [
            ['Students placed', fill.value(course?.placedPercent, (share) => `${share}% of the batch`, '[number] of [number]')],
            ['Average package', fill.value(course?.averagePackage, lakh, '₹[amount] lakh a year')],
            ['Highest package', fill.value(course?.highestPackage, lakh, '₹[amount] lakh a year')],
            ['Recruiters', fill.value(course?.topRecruiters, (names) => joinNames([...names]), '[five company names]')],
          ],
          note: 'Name the year, and update it every year.',
        },
        fill,
      );
    }

    case 'admission_steps': {
      const opens = fill.value(course?.applicationsOpen, formatDateLong, '[date]');
      const closes = fill.value(course?.applicationsClose, formatDateLong, '[date]');
      return withDetails(
        {
          kind: 'table',
          title: `How to apply for ${program}`,
          head: ['Step', 'What to do', 'When'],
          rows: [
            ['1', 'Fill the form online', `${opens} to ${closes}`],
            ['2', 'Upload your marks', `By ${closes}`],
            ['3', 'Counselling or interview', '[date]'],
            ['4', 'Pay the first fee to confirm your seat', 'By [date]'],
          ],
        },
        fill,
      );
    }

    case 'easy_enquiry':
      return withDetails(
        {
          kind: 'text',
          title: 'A WhatsApp button on every page',
          text: `Button: “Ask on WhatsApp”, to ${fill.value(school?.admissionsPhone, String, '[number]')}\nFirst message: “Hi ${ctx.institutionName}, I want to know about ${program} admission.”\nForm: name, phone, course and city. Nothing more.`,
        },
        fill,
      );

    case 'mobile_friendly':
      return {
        kind: 'text',
        title: 'A note for your web developer',
        text: 'Hi [name], our website is hard to use on a phone. Please fix:\n1. Text on the program pages is too small.\n2. Buttons sit too close together.\n3. The menu covers the page when it opens.\nPlease test it on an ordinary Android phone over 4G.',
      };

    case 'page_speed':
      return {
        kind: 'text',
        title: 'A note for your web developer',
        text: 'Hi [name], our home page is slow on a phone. Please:\n1. Shrink the home page photos to under 200 KB each.\n2. Load the chat widget after the page.\n3. Remove plugins we no longer use.\nThe aim is a Google speed score of 90.',
      };

    case 'approvals': {
      if (ctx.institutionType === 'skilling') {
        const recognised = new Set(school?.skillingRecognition ?? []);
        if (recognised.size) fill.used = true;
        return withDetails(
          {
            kind: 'table',
            title: 'Recognition, with proof',
            head: ['Recognition', 'Status', 'Proof'],
            rows: [
              ['NSDC', recognised.has('nsdc') ? 'Training partner' : '[status]', 'Link to the NSDC listing'],
              ['Skill India', recognised.has('skill_india') ? 'Listed' : '[status]', 'Link to the listing'],
            ],
          },
          fill,
        );
      }
      return withDetails(
        {
          kind: 'table',
          title: 'Approvals, with proof',
          head: ['Approval', 'Status', 'Proof'],
          rows: [
            ['UGC', fill.value(school?.ugcRecognised || null, () => 'Recognised', '[status]'), 'Link to the UGC list'],
            ['NAAC', fill.value(school?.naacGrade, (grade) => `Grade ${grade}`, 'Grade [grade], [year]'), 'Link to the certificate'],
            ['AICTE', fill.value(school?.aicteApproved || null, () => `Approved for ${programs}`, `[status] for ${programs}`), 'Link to the approval letter'],
          ],
        },
        fill,
      );
    }

    case 'faculty_leaders':
      return {
        kind: 'outline',
        title: 'A card for each teacher',
        items: [
          { heading: 'Photo', line: 'A real one, taken on campus.' },
          { heading: 'Name and role', line: '“[Name], Associate Professor, Finance”.' },
          { heading: 'Qualifications', line: 'Degrees, and where from.' },
          { heading: 'Teaching', line: 'Years teaching, and the subjects.' },
        ],
      };

    case 'google_search': {
      const fees = fill.value(course?.feesAmount, formatInr, '₹[amount]');
      const placed = fill.value(course?.placedPercent, (share) => `${share}%`, '[number]');
      return withDetails(
        {
          kind: 'text',
          title: `The ${program} page, as Google reads it`,
          text: `Page title: ${program} in ${ctx.city} | Fees, Placements, Admission 2027 | ${ctx.institutionName}\nFirst line: ${ctx.institutionName} offers ${program} in ${ctx.city} for students who [who it is for]. Fees are ${fees} ${course?.feesPeriod === 'total' ? 'for the course' : 'a year'}, and ${placed} of last year's batch were placed.`,
        },
        fill,
      );
    }

    case 'google_profile':
      return withDetails(
        {
          kind: 'text',
          title: 'Your Google profile description',
          text: `${fill.value(brain?.tagline, (line) => `${line.replace(/[.!]$/, '')}. `, '')}${ctx.institutionName} is a ${kind} in ${ctx.city} offering ${programs}. Admissions for 2027 open on ${fill.value(brain?.admissionsOpen, (day) => formatDateLong(`${day}T06:30:00Z`), '[date]')}. Visit us at ${fill.value(school?.campusAddress, String, '[address]')}, or ask us on WhatsApp at ${fill.value(school?.admissionsPhone, String, '[number]')}.`,
        },
        fill,
      );

    case 'review_rating':
      return withDetails(
        {
          kind: 'text',
          title: 'Two replies to start from',
          text: `To a good review: “Thank you, [name]. We are glad the [program] faculty helped. See you at the alumni meet in [month].”\nTo a hard one: “Sorry to hear about [issue], [name]. Please write to ${fill.value(school?.admissionsEmail ?? brain?.contactEmail, String, '[email]')} and our admissions head will call you this week.”`,
        },
        fill,
      );

    case 'ai_answers': {
      const approvals = school?.naacGrade ? `NAAC grade ${school.naacGrade}` : null;
      return withDetails(
        {
          kind: 'text',
          title: 'An answer AI assistants can read',
          text: `Is ${ctx.institutionName} good for ${program} in ${ctx.city}? ${ctx.institutionName} offers ${program} with ${fill.value(approvals, String, '[approvals]')}. In ${fill.value(course?.placementYear, String, '2026')}, ${fill.value(course?.placedPercent, (share) => `${share}% of`, '[number] of [number]')} students were placed, at an average of ${fill.value(course?.averagePackage, (value) => `₹${value} lakh`, '₹[amount] lakh')} a year. Fees are ${fill.value(course?.feesAmount, formatInr, '₹[amount]')} ${course?.feesPeriod === 'total' ? 'for the course' : 'a year'}.\nPut it on the ${program} page: AI assistants read public pages.`,
        },
        fill,
      );
    }

    case 'instagram_activity':
      return {
        kind: 'text',
        title: 'One week on Instagram',
        text: 'Monday: a 20 second reel of a real class.\nWednesday: a carousel that answers one fee question.\nFriday: a student’s story, in their own words.',
      };

    case 'youtube':
      return {
        kind: 'text',
        title: 'Your next video',
        text: `Title: What ${program} at ${ctx.institutionName} is really like: campus, fees and placements\nChapters: 0:00 Campus, 1:10 Fees, 2:30 Placements, 3:40 How to apply`,
      };

    case 'other_socials':
      return {
        kind: 'text',
        title: 'A Facebook post for this week',
        text: `Admissions for ${program} 2027 are open. Fees, placements and dates in one place: ${fill.value(brain?.portal ?? course?.pageUrl, String, '[link]')}. Ask us anything in the comments.`,
      };

    case 'students_in_content':
      return {
        kind: 'text',
        title: 'A caption, and the ask first',
        text: brain?.alumnus
          ? `Caption: “${brain.alumnus.name}${brain.alumnus.program ? `, ${brain.alumnus.program}` : ''}: ${brain.alumnus.line}. In their words: ‘[one line]’.”\nAsk them first, in writing.`
          : `Caption: “[Name], ${program} 2026, now at [company]. In their words: ‘[one line]’.”\nAsk the student first, in writing.`,
      };
  }
}

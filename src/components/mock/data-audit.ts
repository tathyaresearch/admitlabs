// Version 2 mock (Step 2, development only): an Audit by place. The checks, results, findings,
// steps and effort come from the sample world through the real engine (src/sample/world.ts); the
// new parts (places, findings from What people say and Other places, ready fixes, impact) are
// written here as fixtures. Server only: import it from the mock page, never from a client file.

import { auditVerdict } from '@/audit/verdict';
import { overviewView, type AreaRow, type AuditView, type ItemPart, type ListItem } from '@/audit/view';
import { checkAction } from '@/domain/checks';
import { RESULTS, type CheckKey, type CheckResult, type Difficulty, type InstitutionType } from '@/domain/types';
import { sampleInstitution } from '@/sample/institutions';
import { sampleAuditChain, storedAudit, type SampleAudit } from '@/sample/world';
import {
  CHECK_ORDER,
  CHECK_PLACE,
  IMPACT_ORDER,
  PLACES,
  WORDS,
  checkNameV2,
  impactFor,
  wordFor,
  type FindingKind,
  type Fix,
  type FoundRow,
  type Good,
  type Impact,
  type MockAudit,
  type Place,
  type PlaceKey,
  type Proof,
  type ReadyFix,
  type Thin,
  type WordState,
} from './model';

const RESULT_RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));
const EFFORT_RANK: Readonly<Record<Difficulty, number>> = { easy: 0, medium: 1, hard: 2 };

export const SAMPLE_DAY = '2026-09-30';

export interface AuditSource {
  latest: SampleAudit;
  previous: SampleAudit | null;
  view: AuditView;
  free: boolean;
}

/** `full`: every detail, as the team sees it in a review, even on Free. */
export async function auditSource(slug: string, until = SAMPLE_DAY, full = false): Promise<AuditSource> {
  const chain = await sampleAuditChain(slug, 'own', until);
  const latest = chain.at(-1);
  if (!latest) throw new Error(`No sample Audit for ${slug}`);
  const previous = chain.at(-2) ?? null;
  const free = sampleInstitution(slug).plan?.tier === 'free';
  const stored = storedAudit(latest.record, { id: latest.id, previousAuditId: previous?.id ?? null, freeDetails: free && !full });
  return { latest, previous, view: overviewView(stored, { institutionType: latest.type, programNames: latest.names }), free };
}

/** The weakest part of a check: the worst result, then the fewest points. */
function weakestPart(parts: readonly ItemPart[]): ItemPart | undefined {
  return [...parts].sort((a, b) => (RESULT_RANK.get(b.result) ?? 0) - (RESULT_RANK.get(a.result) ?? 0) || a.points / a.maxPoints - b.points / b.maxPoints)[0];
}

function proofOf(part: ItemPart, withProgram: boolean): Proof {
  const line = part.detail?.finding ?? '';
  return {
    url: part.detail?.sourceUrl ?? '',
    date: part.checkedAt,
    line,
    // The program, unless the line already names it.
    program: withProgram && part.programName && !line.includes(part.programName) ? part.programName : null,
  };
}

function foundRow(row: AreaRow, city: string, skilling: boolean): FoundRow {
  const weakest = weakestPart(row.parts);
  const differs = row.parts.some((part) => part.result !== row.parts[0]?.result);
  // The bar shows the weakest program, as its word does.
  const share = weakest ? weakest.points / weakest.maxPoints : 0;
  return {
    id: `check-${row.key}`,
    name: checkNameV2(row.key, city, skilling),
    key: row.key,
    result: weakest?.result ?? 'missing',
    share,
    weakestProgram: differs ? (weakest?.programName ?? null) : null,
    proof: weakest ? proofOf(weakest, differs) : { url: '', date: '', line: '' },
  };
}

// Ready fixes: what the AI writer would hand over, as text or a layout to copy. Blanks in [brackets].

interface ReadyContext {
  institution: string;
  city: string;
  programs: readonly string[];
  type: InstitutionType;
}

function readyFix(key: CheckKey, ctx: ReadyContext): ReadyFix {
  const program = ctx.programs[0] ?? 'the program';
  const kind = ctx.type === 'skilling' ? 'institute' : ctx.type;
  switch (key) {
    case 'program_page':
      return {
        kind: 'outline',
        title: `A page of its own for ${program}`,
        items: [
          { heading: `${program} in ${ctx.city}`, line: 'Who it is for and what they will do, in two lines.' },
          { heading: 'Fees', line: 'The full fee table, year by year.' },
          { heading: 'Eligibility', line: 'Marks needed, and the subjects.' },
          { heading: 'Placements', line: 'Last year: students placed, average package, five recruiters.' },
          { heading: 'How to apply', line: 'Four steps with dates.' },
          { heading: 'Ask us', line: 'The form and a WhatsApp button.' },
        ],
      };
    case 'fees_shown':
      return {
        kind: 'table',
        title: `${program} fees, 2026 to 2027`,
        head: ['Year', 'Tuition', 'Other fees', 'Total'],
        rows: [
          ['Year 1', '₹[amount]', '₹[amount]', '₹[amount]'],
          ['Year 2', '₹[amount]', '₹[amount]', '₹[amount]'],
          ['Year 3', '₹[amount]', '₹[amount]', '₹[amount]'],
        ],
        note: 'Add hostel as its own line if you offer it, and say what each fee covers.',
      };
    case 'placement_proof':
      return {
        kind: 'table',
        title: `${program} placements, 2026 batch`,
        head: ['', '2026 batch'],
        rows: [
          ['Students placed', '[number] of [number]'],
          ['Average package', '₹[amount] lakh a year'],
          ['Highest package', '₹[amount] lakh a year'],
          ['Recruiters', '[five company names]'],
        ],
        note: 'Name the year, and update it every year.',
      };
    case 'admission_steps':
      return {
        kind: 'table',
        title: `How to apply for ${program}`,
        head: ['Step', 'What to do', 'When'],
        rows: [
          ['1', 'Fill the form online', '[date] to [date]'],
          ['2', 'Upload your marks', 'By [date]'],
          ['3', 'Counselling or interview', '[date]'],
          ['4', 'Pay the first fee to confirm your seat', 'By [date]'],
        ],
      };
    case 'easy_enquiry':
      return {
        kind: 'text',
        title: 'A WhatsApp button on every page',
        text: `Button: “Ask on WhatsApp”\nFirst message: “Hi ${ctx.institution}, I want to know about ${program} admission.”\nForm: name, phone, course and city. Nothing more.`,
      };
    case 'mobile_friendly':
      return {
        kind: 'text',
        title: 'A note for your web developer',
        text: `Hi [name], our website is hard to use on a phone. Please fix:\n1. Text on the program pages is too small.\n2. Buttons sit too close together.\n3. The menu covers the page when it opens.\nPlease test it on an ordinary Android phone over 4G.`,
      };
    case 'page_speed':
      return {
        kind: 'text',
        title: 'A note for your web developer',
        text: `Hi [name], our home page is slow on a phone (Google speed score [score]). Please:\n1. Shrink the home page photos to under 200 KB each.\n2. Load the chat widget after the page.\n3. Remove plugins we no longer use.\nThe aim is a score of 90.`,
      };
    case 'approvals':
      return ctx.type === 'skilling'
        ? { kind: 'table', title: 'Recognition, with proof', head: ['Recognition', 'Status', 'Proof'], rows: [['NSDC', 'Training partner', 'Link to the NSDC listing'], ['Skill India', 'Listed', 'Link to the listing']] }
        : {
            kind: 'table',
            title: 'Approvals, with proof',
            head: ['Approval', 'Status', 'Proof'],
            rows: [
              ['UGC', 'Recognised', 'Link to the UGC list'],
              ['NAAC', 'Grade [grade], [year]', 'Link to the certificate'],
              ['AICTE', `Approved for ${ctx.programs.slice(0, 3).join(', ') || '[programs]'}`, 'Link to the approval letter'],
            ],
          };
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
    case 'google_search':
      return {
        kind: 'text',
        title: `The ${program} page, as Google reads it`,
        text: `Page title: ${program} in ${ctx.city} | Fees, Placements, Admission 2027 | ${ctx.institution}\nFirst line: ${ctx.institution} offers ${program} in ${ctx.city} for students who [who it is for]. Fees are ₹[amount] a year, and [number] of last year's batch were placed.`,
      };
    case 'google_profile':
      return {
        kind: 'text',
        title: 'Your Google profile description',
        text: `${ctx.institution} is a ${kind} in ${ctx.city} offering ${ctx.programs.join(', ') || '[programs]'}. Admissions for 2027 open on [date]. Visit us at [address], or ask us on WhatsApp at [number].`,
      };
    case 'review_rating':
      return {
        kind: 'text',
        title: 'Two replies to start from',
        text: `To a good review: “Thank you, [name]. We are glad the [program] faculty helped. See you at the alumni meet in [month].”\nTo a hard one: “Sorry to hear about [issue], [name]. Please write to [email] and our admissions head will call you this week.”`,
      };
    case 'ai_answers':
      return {
        kind: 'text',
        title: 'An answer AI assistants can read',
        text: `Is ${ctx.institution} good for ${program} in ${ctx.city}? ${ctx.institution} offers ${program} with [approvals]. In 2026, [number] of [number] students were placed, at an average of ₹[amount] lakh a year. Fees are ₹[amount] a year.\nPut it on the ${program} page: AI assistants read public pages.`,
      };
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
        text: `Title: What ${program} at ${ctx.institution} is really like: campus, fees and placements\nChapters: 0:00 Campus, 1:10 Fees, 2:30 Placements, 3:40 How to apply`,
      };
    case 'other_socials':
      return {
        kind: 'text',
        title: 'A Facebook post for this week',
        text: `Admissions for ${program} 2027 are open. Fees, placements and dates in one place: [link]. Ask us anything in the comments.`,
      };
    case 'students_in_content':
      return {
        kind: 'text',
        title: 'A caption, and the ask first',
        text: `Caption: “[Name], ${program} 2026, now at [company]. In her words: ‘[one line]’.”\nAsk the student first, in writing.`,
      };
  }
}

// What people say and Other places: findings as the search tool and Reddit would bring them back.

interface FindingFixture {
  kind: FindingKind;
  place: 'people' | 'other';
  title: string;
  source: string;
  url: string;
  day: string;
  fix?: { title: string; impact: Impact; effort: Difficulty; why: string; steps: readonly string[]; ready: ReadyFix };
}

const FINDINGS: Readonly<Record<string, readonly FindingFixture[]>> = {
  'eastgate-university': [
    {
      kind: 'bad',
      place: 'people',
      title: 'Three students in one thread say hostel fees went up with no notice.',
      source: 'Reddit',
      url: 'https://reddit.example/r/guwahati/comments/hostel-fees-eastgate',
      day: '2026-09-12',
      fix: {
        title: 'Reply to the hostel fee thread on Reddit',
        impact: 'High',
        effort: 'easy',
        why: 'Parents read threads like this before they visit. A clear, calm reply from the university settles the worry for everyone who finds it later.',
        steps: ['Say who you are and that you work at Eastgate.', 'Give the new hostel fee and what it now includes.', 'Say when students were told, and where to ask.'],
        ready: {
          kind: 'text',
          title: 'A reply from the university',
          text: 'Hi, I work in admissions at Eastgate University. The 2026 hostel fee is ₹[amount] a year, up from ₹[amount], because it now includes [what]. We wrote to every student on [date]. Questions are welcome at [email].',
        },
      },
    },
    {
      kind: 'unanswered',
      place: 'people',
      title: '“Is the B.Sc Data Analytics at Eastgate worth it?” has no answer from the university.',
      source: 'Quora',
      url: 'https://quora.example/Is-the-BSc-Data-Analytics-at-Eastgate-worth-it',
      day: '2026-09-20',
      fix: {
        title: 'Answer the Data Analytics question on Quora',
        impact: 'Medium',
        effort: 'easy',
        why: 'Students who search the course name find this question first. An answer from the university is the one they trust most.',
        steps: ['Answer from a named account, and say you work at Eastgate.', 'Give the first batch’s projects and where they interned.', 'Link to the program page.'],
        ready: {
          kind: 'text',
          title: 'An answer to post',
          text: 'I work at Eastgate University. The B.Sc Data Analytics started in 2025. The first batch built [number] projects with local companies, and [number] interned at [companies]. Fees are ₹[amount] a year. More on the course page: [link].',
        },
      },
    },
    {
      kind: 'unanswered',
      place: 'people',
      title: '“Does Eastgate give scholarships for BBA?” is still open on a student forum.',
      source: 'studentforum.example',
      url: 'https://studentforum.example/t/eastgate-bba-scholarship',
      day: '2026-09-14',
      fix: {
        title: 'Answer the BBA scholarship question',
        impact: 'Medium',
        effort: 'easy',
        why: 'Scholarships decide where many students apply. An open question reads as no.',
        steps: ['Reply with the scholarships BBA students can get.', 'Give the marks needed and the last date.', 'Link to the scholarship page.'],
        ready: {
          kind: 'text',
          title: 'An answer to post',
          text: 'I work at Eastgate University. BBA students can get [scholarship] for [marks] and above in Class 12, worth up to ₹[amount] a year. Apply by [date]: [link].',
        },
      },
    },
    { kind: 'good', place: 'people', title: 'A thread praises the Nursing labs and the hospital tie ups.', source: 'Reddit', url: 'https://reddit.example/r/assam/comments/nursing-colleges-guwahati', day: '2026-09-09' },
    { kind: 'good', place: 'people', title: 'An MBA alumnus recommends Eastgate for its placement cell.', source: 'Quora', url: 'https://quora.example/Which-is-the-best-MBA-college-in-Guwahati', day: '2026-09-02' },
    {
      kind: 'listing',
      place: 'other',
      title: 'Shows MBA fees from 2024: ₹1.6 lakh a year. Your site says ₹1.85 lakh.',
      source: 'collegeguide.example',
      url: 'https://collegeguide.example/eastgate-university/fees',
      day: '2026-09-15',
      fix: {
        title: 'Update your MBA fees on collegeguide.example',
        impact: 'Medium',
        effort: 'easy',
        why: 'Students compare fees on listing sites. Old fees there make your own page look wrong.',
        steps: ['Claim the listing with your official email.', 'Paste the details below.', 'Check it again in a week.'],
        ready: {
          kind: 'text',
          title: 'Details to send the listing site',
          text: 'Eastgate University, Six Mile, GS Road, Guwahati 781022\nMBA, 2026 to 2028: ₹1.85 lakh a year\nAdmissions: admissions@eastgate-university.example, [phone]',
        },
      },
    },
    {
      kind: 'listing',
      place: 'other',
      title: 'Not listed. Students compare Guwahati MBA colleges here.',
      source: 'admissionsportal.example',
      url: 'https://admissionsportal.example/guwahati/mba',
      day: '2026-09-15',
      fix: {
        title: 'Add Eastgate to admissionsportal.example',
        impact: 'Low',
        effort: 'easy',
        why: 'One more place students meet you while they compare.',
        steps: ['Add the university with your official email.', 'Fill in the programs, fees and contact.', 'Add the link to your admissions page.'],
        ready: { kind: 'text', title: 'Details to add', text: 'Eastgate University, Guwahati. Programs: MBA, BBA, BCA, B.Sc Nursing, B.Sc Data Analytics. Fees and dates: [link]. Admissions: [email], [phone].' },
      },
    },
    { kind: 'news', place: 'other', title: 'Nursing students ran a free health camp in Six Mile.', source: 'newsassam.example', url: 'https://newsassam.example/2026/09/03/health-camp-six-mile', day: '2026-09-03' },
    { kind: 'directory', place: 'other', title: 'Listed with the right address and phone.', source: 'citydirectory.example', url: 'https://citydirectory.example/guwahati/eastgate-university', day: '2026-09-15' },
  ],
  'brightpath-skills': [
    { kind: 'good', place: 'people', title: 'One learner says the Digital Marketing trainers are patient.', source: 'Reddit', url: 'https://reddit.example/r/guwahati/comments/digital-marketing-course', day: '2026-08-21' },
    {
      kind: 'listing',
      place: 'other',
      title: 'Lists only Hotel Management. Your Digital Marketing and Data Analytics courses are missing.',
      source: 'skillcourses.example',
      url: 'https://skillcourses.example/guwahati/brightpath-skills-academy',
      day: '2026-09-02',
      fix: {
        title: 'Add your two missing courses on skillcourses.example',
        impact: 'Medium',
        effort: 'easy',
        why: 'Students search course by course. Missing courses mean missed students.',
        steps: ['Sign in to the listing with your official email.', 'Add Digital Marketing and Data Analytics with fees and length.', 'Link each to its page.'],
        ready: { kind: 'text', title: 'Details to add', text: 'Digital Marketing, 4 months, ₹[amount]\nData Analytics with Power BI, 3 months (weekend batch too), ₹[amount]\nContact: [email], [phone]' },
      },
    },
  ],
  'northbank-college': [
    {
      kind: 'unanswered',
      place: 'people',
      title: '“Is Northbank College good for BBA?” has one short answer, not from the college.',
      source: 'Quora',
      url: 'https://quora.example/Is-Northbank-College-good-for-BBA',
      day: '2026-08-30',
      fix: {
        title: 'Answer the BBA question on Quora',
        impact: 'Medium',
        effort: 'easy',
        why: 'It is the first thing students see when they search your name with BBA.',
        steps: ['Answer from a named account, and say you work at Northbank.', 'Give fees, placements and the admission dates.', 'Link to the BBA page.'],
        ready: { kind: 'text', title: 'An answer to post', text: 'I work at Northbank College. Our BBA is 3 years, ₹[amount] a year. In 2026, [number] students were placed. Admissions open on [date]: [link].' },
      },
    },
  ],
};

const THIN: Thin = {
  title: 'Not much said about you yet.',
  why: 'That is common for smaller colleges and newer courses. Drishti looked on Reddit, Quora and student forums and found one thread.',
  helps: ['Answer the questions students ask about your courses on Quora, from a named account.', 'Ask this year’s students to share their experience in their own words.'],
  next: 'Drishti looks again with your next Audit, on 2 October.',
};

function findingRows(slug: string, place: 'people' | 'other'): FindingFixture[] {
  return (FINDINGS[slug] ?? []).filter((finding) => finding.place === place);
}

function findingProof(finding: FindingFixture): Proof {
  return { url: finding.url, date: `${finding.day}T04:30:00.000Z`, line: finding.title };
}

function findingFix(finding: FindingFixture, index: number): Fix | null {
  if (!finding.fix) return null;
  return {
    id: `finding-${finding.place}-${index}`,
    title: finding.fix.title,
    place: finding.place,
    label: finding.source,
    impact: finding.fix.impact,
    effort: finding.fix.effort,
    programs: [],
    found: [findingProof(finding)],
    why: finding.fix.why,
    steps: finding.fix.steps,
    ready: finding.fix.ready,
  };
}

function checkFix(item: ListItem, ctx: ReadyContext & { skilling: boolean }): Fix {
  const open = item.parts.filter((part) => part.result !== 'strong');
  const programs = [...new Set(open.flatMap((part) => (part.programName ? [part.programName] : [])))];
  const weakest = weakestPart(item.parts);
  const withSteps = open.find((part) => part.detail?.fixSteps.length) ?? open[0];
  return {
    id: `fix-${item.key}`,
    title: checkAction(item.key, programs.length > 3 ? [] : programs, ctx.type, weakest?.result),
    place: CHECK_PLACE[item.key],
    label: checkNameV2(item.key, ctx.city, ctx.skilling),
    checkKey: item.key,
    impact: impactFor(item.points * 3),
    effort: item.difficulty ?? 'medium',
    programs,
    found: open.map((part) => proofOf(part, part.programName !== null)),
    why: withSteps?.detail?.whyItMatters ?? '',
    steps: withSteps?.detail?.fixSteps.length ? withSteps.detail.fixSteps : withSteps?.detail?.howToFix ? [withSteps.detail.howToFix] : [],
    ready: readyFix(item.key, { ...ctx, programs: programs.length ? programs : ctx.programs }),
  };
}

export function byImpact(a: Fix, b: Fix): number {
  return IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort];
}

export function wordStates(source: AuditSource, city: string, skilling: boolean): WordState[] {
  const { view, previous } = source;
  const rows = view.areas.flatMap((area) => area.rows);
  return WORDS.map((word) => {
    const score = view.scores[word.pillar];
    const before = previous ? previous.record[word.pillar] : null;
    const wordNow = wordFor(score);
    const wordBefore = before === null ? null : wordFor(before);
    const weakest = rows
      .filter((row) => row.pillar === word.pillar && row.parts.length)
      .map((row) => ({ row, part: weakestPart(row.parts) as ItemPart }))
      .filter(({ part }) => part.result !== 'strong')
      .sort((a, b) => (RESULT_RANK.get(b.part.result) ?? 0) - (RESULT_RANK.get(a.part.result) ?? 0) || b.part.maxPoints - b.part.points - (a.part.maxPoints - a.part.points))[0];
    const month = previous ? new Date(previous.record.run_at).toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }) : null;
    return {
      ...word,
      word: wordNow,
      score,
      fixFirst: weakest ? { name: checkNameV2(weakest.row.key, city, skilling), result: weakest.part.result } : null,
      moved: wordBefore && wordBefore !== wordNow && month ? `${score > (before ?? 0) ? 'Up' : 'Down'} from ${wordBefore} in ${month}` : null,
    };
  });
}

export async function mockAudit(slug: string, options: { full?: boolean } = {}): Promise<MockAudit> {
  const source = await auditSource(slug, SAMPLE_DAY, options.full ?? false);
  const sample = sampleInstitution(slug);
  const { view, latest, previous } = source;
  const skilling = sample.type === 'skilling';
  const programs = [...latest.names.values()];
  const ctx = { institution: sample.name, city: sample.city, programs, type: sample.type, skilling };
  const rows = view.areas.flatMap((area) => area.rows).filter((row) => row.parts.length);
  const byOrder = (a: { key?: CheckKey }, b: { key?: CheckKey }) => CHECK_ORDER.indexOf(a.key as CheckKey) - CHECK_ORDER.indexOf(b.key as CheckKey);

  const places: Place[] = PLACES.map((info) => {
    if (info.scored) {
      const placeRows = rows.filter((row) => CHECK_PLACE[row.key] === info.key);
      const found = placeRows.map((row) => foundRow(row, sample.city, skilling)).sort(byOrder);
      const good: Good[] = view.working
        .filter((item) => CHECK_PLACE[item.key] === info.key)
        .map((item) => ({ id: `good-${item.key}`, title: checkNameV2(item.key, sample.city, skilling), line: item.parts[0]?.detail?.finding ?? 'Strong everywhere it applies.' }));
      const fixes = view.fixes.filter((item) => CHECK_PLACE[item.key] === info.key).map((item) => checkFix(item, ctx)).sort(byImpact);
      return { info, found, good, fixes, thin: null };
    }
    const findings = findingRows(slug, info.key as 'people' | 'other');
    const found: FoundRow[] = findings.map((finding, index) => ({ id: `finding-${info.key}-${index}`, name: finding.title, kind: finding.kind, source: finding.source, proof: findingProof(finding) }));
    const good: Good[] = findings
      .filter((finding) => finding.kind === 'good' || finding.kind === 'news' || (finding.kind === 'directory' && !finding.fix))
      .map((finding, index) => ({ id: `good-${info.key}-${index}`, title: finding.source, line: finding.title }));
    const fixes = findings.flatMap((finding, index) => findingFix(finding, index) ?? []).sort(byImpact);
    const thin = info.key === 'people' && findings.length < 3 ? THIN : null;
    return { info, found, good, fixes, thin };
  });

  const moved = rows.flatMap((row) => {
    const part = weakestPart(row.parts);
    return part && part.previousResult && part.previousResult !== part.result
      ? [{ name: checkNameV2(row.key, sample.city, skilling), before: part.previousResult, after: part.result, place: CHECK_PLACE[row.key] as PlaceKey }]
      : [];
  });

  return {
    slug,
    name: sample.name,
    city: sample.city,
    type: sample.type,
    tier: sample.plan?.tier ?? 'free',
    checkedAt: latest.record.run_at,
    previousAt: previous?.record.run_at ?? null,
    programs,
    words: wordStates(source, sample.city, skilling),
    verdict: auditVerdict({ discovered: view.scores.discovered, trusted: view.scores.trusted, chosen: view.scores.chosen }),
    score: view.scores.overall,
    topFixes: places.flatMap((place) => place.fixes).sort(byImpact).slice(0, 3),
    places,
    moved,
  };
}

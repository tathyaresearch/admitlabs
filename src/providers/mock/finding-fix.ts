// The written bank behind the mock writer's fixes for findings (spec 7.7): an unanswered question
// to answer, a complaint to reply to, a listing to correct. Sample findings carry the fix the
// writer wrote for them (src/sample/findings.ts); any other gets one from these templates. The
// rules (src/domain/finding-rules.ts) decide whether there is something to do, its impact and
// its effort; this only words it. Plain words, no dashes, an opportunity and never a failure.

import type { FindingFacts } from '../../domain/finding-rules.ts';
import { formatInr, joinNames } from '../../domain/format.ts';
import type { ReadyFix } from '../../domain/ready-fix.ts';
import { SAMPLE_FINDINGS } from '../../sample/findings.ts';
import type { FindingFixInput, FindingFixText } from '../analysis.ts';

/** The question in a line like “Is X worth it?” has no answer, or the line itself. */
function quoted(line: string): string | null {
  return /“([^”]+)”/.exec(line)?.[1] ?? null;
}

function answerFix(input: FindingFixInput): FindingFixText {
  const { finding, institutionName } = input;
  const question = quoted(finding.line);
  return {
    title: `Answer the question on ${finding.source}`,
    why: 'Students who search for you find questions like this first. An answer from you is the one they trust most.',
    steps: [`Answer from a named account, and say you work at ${institutionName}.`, 'Answer the question in the first line, with facts and numbers.', 'Link to the page with the details.'],
    readyFix: {
      kind: 'text',
      title: 'An answer to post',
      text: `${question ? `“${question}”\n` : ''}I work in admissions at ${institutionName}. [The answer, in two or three lines, with numbers.] More on our website: [link]. Questions are welcome at [email].`,
    },
  };
}

function replyFix(input: FindingFixInput): FindingFixText {
  const { finding, institutionName } = input;
  return {
    title: `Reply to what students say on ${finding.source}`,
    why:
      finding.repeats > 1
        ? 'When several students make the same point, everyone who finds the thread later reads it too. A calm reply with what you are doing about it turns it into proof that you listen.'
        : 'A point left without a reply is what the next student reads. A calm reply with what you are doing about it shows that you listen.',
    steps: ['Reply once, from an official account, within a day.', 'Say what you are doing about it, with a date.', 'When it is fixed, post an update in the same thread.'],
    readyFix: {
      kind: 'text',
      title: 'A reply to post',
      text: `Hi, I work at ${institutionName}. Thank you for raising this. [What happened, in one line.] From [date] we [what you are changing]. If you have questions, write to [email] and we will reply within a day.`,
    },
  };
}

function listingFix(input: FindingFixInput): FindingFixText {
  const { finding, institutionName, city, programNames, details } = input;
  const programs = programNames.length ? joinNames([...programNames]) : '[programs]';
  const fees = details?.program?.feesAmount ? `${formatInr(details.program.feesAmount)} ${details.program.feesPeriod === 'total' ? 'for the course' : 'a year'}` : '₹[amount] a year';
  const readyFix: ReadyFix = {
    kind: 'table',
    title: `Your details for ${finding.source}`,
    head: ['Field', 'What to enter'],
    rows: [
      ['Name', institutionName],
      ['City', city],
      ['Programs', programs],
      ['Fees', fees],
      ['Admissions contact', details?.institution?.admissionsEmail ?? '[email]'],
      ['Website', '[link]'],
    ],
    note: 'Use the same name, address and phone as on your website and Google profile.',
    ...(details?.program?.feesAmount || details?.institution?.admissionsEmail ? { fromDetails: true } : {}),
  };
  switch (finding.listing) {
    case 'missing':
      return {
        title: `Get listed on ${finding.source}`,
        why: `Students compare ${city} institutions on sites like this. A listing puts you in the comparison.`,
        steps: ['Ask the site to add you, through its form for institutions.', 'Give your programs, fees and admissions contact.', 'Check the listing once it is live.'],
        readyFix,
      };
    case 'missing_courses':
      return {
        title: `Add your courses to ${finding.source}`,
        why: 'Students filter by course on sites like this. A course that is not listed is never found.',
        steps: ['Sign in to your listing, or ask the site to update it.', 'Add every course you offer, with fees and duration.', 'Check the listing after a week.'],
        readyFix,
      };
    default:
      return {
        title: `Update your listing on ${finding.source}`,
        why: 'Students and parents trust what they read here. Old details lead to wrong expectations and lost enquiries.',
        steps: ['Sign in to your listing, or ask the site to correct it.', 'Update the fees, programs and contact details.', 'Check the listing after a week.'],
        readyFix,
      };
  }
}

/** The written fix for a sample finding, or one from the templates. Null when there is nothing to do. */
export function writeFindingFix(input: FindingFixInput): FindingFixText | null {
  const written = SAMPLE_FINDINGS.find((row) => row.key === input.finding.key)?.fix;
  if (written) {
    return {
      title: written.title,
      why: written.why,
      steps: [...written.steps],
      readyFix: { kind: 'text', title: written.ready.title, text: written.ready.text },
      ...(written.impact ? { impact: written.impact } : {}),
      ...(written.effort ? { effort: written.effort } : {}),
    };
  }
  const facts: FindingFacts = input.finding;
  switch (facts.kind) {
    case 'unanswered':
      return answerFix(input);
    case 'bad':
      return replyFix(input);
    case 'listing':
    case 'directory':
      return facts.listing ? listingFix(input) : null;
    default:
      return null;
  }
}

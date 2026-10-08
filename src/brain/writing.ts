// What the rest of Drishti reads from a Client's Brain (spec section 26): the facts and the
// voice the writer uses. Ready fixes fill more of their [blanks] from it (a tagline, when
// admissions open, the admission portal, an email to write to, an alumnus to feature). Make these
// 3 fits each idea to the brand: the hook in its tone, one Brain fact in the key points, and
// nothing it says to avoid. The mock does this by simple rules (fitIdea); the Claude API, later,
// reads the same. Pure.

import { feesText } from '../domain/details.ts';
import { placementText } from './facts.ts';
import type { BrainFields, BrainKind, Tone } from './model.ts';

export interface BrainWriting {
  tagline: string | null;
  tone: Tone | null;
  toneLine: string | null;
  avoid: string[];
  /** 'YYYY-MM-DD': when admissions open next. */
  admissionsOpen: string | null;
  portal: string | null;
  /** Where a reply can send people: the main contact's email. */
  contactEmail: string | null;
  alumnus: { name: string; line: string; program: string | null } | null;
  /** By program name: the fee and placements in words. */
  programs: ReadonlyMap<string, { fees: string | null; placements: string | null }>;
}

export interface WritingRow {
  kind: BrainKind;
  fields: unknown;
  toConfirm: boolean;
}

/** The Brain, as the writer reads it. `today` is 'YYYY-MM-DD' in India. */
export function brainWriting(
  rows: readonly WritingRow[],
  programs: ReadonlyArray<{ name: string; details: Parameters<typeof feesText>[0] }>,
  today: string,
): BrainWriting {
  const confirmed = rows.filter((row) => !row.toConfirm);
  const one = <K extends BrainKind>(kind: K) => confirmed.find((row) => row.kind === kind)?.fields as BrainFields[K] | undefined;
  const all = <K extends BrainKind>(kind: K) => confirmed.filter((row) => row.kind === kind).map((row) => row.fields as BrainFields[K]);
  const tone = one('tone');
  const main = all('contact').find((contact) => contact.role === 'main');
  const seasons = [
    ...all('date')
      .filter((date) => date.type === 'season')
      .map((date) => date.from),
    ...programs.flatMap((program) => (program.details.applicationsOpen ? [program.details.applicationsOpen] : [])),
  ]
    .filter((day) => day >= today)
    .sort();
  const alumnus = all('alumnus')[0];
  return {
    tagline: one('tagline')?.text ?? null,
    tone: tone?.tone ?? null,
    toneLine: tone?.line ?? null,
    avoid: one('avoid')?.items ?? [],
    admissionsOpen: seasons[0] ?? null,
    portal: all('link').find((link) => link.type === 'portal')?.url ?? null,
    contactEmail: main?.email ?? null,
    alumnus: alumnus ? { name: alumnus.name, line: alumnus.line, program: alumnus.program } : null,
    programs: new Map(programs.map((program) => [program.name, { fees: feesText(program.details), placements: placementText(program.details) }])),
  };
}

export interface IdeaToFit {
  hook: string;
  points: readonly string[];
  programName: string;
  /** What students asked about: fees, placements, scholarships, hostel, careers. */
  topic: string | null;
}

export interface FittedIdea {
  hook: string;
  points: string[];
  /** The Brain fact the idea now carries, if any. */
  fact: string | null;
}

const MAX_POINTS = 4;

function mentions(text: string, words: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => word.trim() && lower.includes(word.trim().toLowerCase()));
}

/** The mock writer's way of fitting an idea to a brand. */
export function fitIdea(idea: IdeaToFit, brain: BrainWriting): FittedIdea {
  let hook = mentions(idea.hook, brain.avoid) ? `A straight answer about ${idea.programName}, from the people who teach it.` : idea.hook;
  if (brain.tone === 'formal') hook = hook.replace(/!+/g, '.').replace(/\s+\.$/, '.');
  const points = idea.points.filter((point) => !mentions(point, brain.avoid));
  const program = brain.programs.get(idea.programName);
  let fact: string | null = null;
  if (idea.topic === 'fees' && program?.fees) fact = `Say the fee as it is: ${program.fees}.`;
  else if ((idea.topic === 'placements' || idea.topic === 'careers') && program?.placements) fact = `Use the real numbers: ${program.placements}.`;
  else if (brain.tagline) fact = `Close with your tagline: “${brain.tagline}”`;
  if (fact) {
    if (points.length >= MAX_POINTS) points.splice(MAX_POINTS - 1);
    points.push(fact);
  }
  return { hook, points, fact };
}

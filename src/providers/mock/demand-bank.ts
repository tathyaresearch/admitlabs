// What the mock Demand sources "find": the hand-written sample fixtures for the 8 sample
// programs, and a written template for every other listed program, so any institution that
// signs up sees a full Demand page. Also the grouped mention topics for institutions outside
// the sample. Topics and counts only, never a person.

import { INDIA_CITIES } from '../../config/cities.ts';
import { LISTED_PROGRAMS, PROGRAM_GROUPS } from '../../config/programs.ts';
import type { InstitutionType, Sentiment } from '../../domain/types.ts';
import { DEMAND_FIXTURES, MENTION_FIXTURES, SKILLS_PROGRAM_KEYS, type ProgramDemandFixture, type WorryFixture } from '../../sample/demand.ts';
import { rngFor } from './random.ts';

const SKILLS_GROUP = new Set(PROGRAM_GROUPS.find((group) => group.group === 'Skills')?.programs.map((program) => program.key) ?? []);

/** Skilling courses run in rolling batches, so their admission year looks different. */
export function isSkillsProgram(programKey: string): boolean {
  return SKILLS_PROGRAM_KEYS.has(programKey) || SKILLS_GROUP.has(programKey);
}

function genericWorries(name: string, counts: readonly number[]): WorryFixture[] {
  const [fees = 60, placements = 70, hostel = 30, safety = 25, recognition = 30, fresh = 25] = counts;
  return [
    { text: 'Fees and hidden charges', theme: 'fees', base: fees, source: 'reddit' },
    { text: 'Placements that are real', theme: 'placements', base: placements, source: 'quora' },
    { text: 'Hostel quality and cost', theme: 'hostel', base: hostel, source: 'reddit' },
    { text: 'Safety on campus and in hostels', theme: 'safety', base: safety, source: 'x' },
    { text: 'Recognition of the course', theme: 'recognition', base: recognition, source: 'quora' },
    { text: `Too few good ${name} seats nearby`, theme: 'new', base: fresh, source: 'reddit', isNew: true },
  ];
}

/** A written template for a listed program without a hand-written fixture. */
function genericFixture(programKey: string, name: string): ProgramDemandFixture {
  const rng = rngFor('demand-template', programKey);
  const base = (min: number, max: number) => rng.int(min, max);
  return {
    rising: [
      { text: `${name} with internships`, changePct: base(18, 34), base: base(150, 320) },
      { text: `${name} with an industry certificate`, changePct: base(10, 24), base: base(90, 220) },
      { text: `Weekend and online ${name} options`, changePct: base(8, 18), base: base(80, 200) },
    ],
    falling: [
      { text: `${name} with no specialisation`, changePct: -base(6, 14), base: base(200, 420) },
      { text: `Distance ${name}`, changePct: -base(5, 12), base: base(90, 240) },
    ],
    questions: [
      { text: `Which ${name} colleges in Guwahati have real placements?`, language: 'en', base: base(60, 96), source: 'quora' },
      { text: `What is the total fee for ${name} in Guwahati?`, language: 'hi', base: base(50, 90), source: 'youtube' },
      { text: `Which college is good for ${name} in Guwahati?`, language: 'as', base: base(40, 80), source: 'instagram' },
      { text: `Is ${name} worth it for a good first job?`, language: 'en', base: base(35, 70), source: 'reddit' },
      { text: `What does a ${name} graduate earn in the first year?`, language: 'en', base: base(30, 64), source: 'quora' },
    ],
    worries: genericWorries(name, [base(60, 130), base(70, 130), base(20, 70), base(15, 60), base(20, 60), base(20, 40)]),
    ideas: [
      { text: `Show last year's ${name} placements: company, role and salary, one student per reel.`, question: 0, format: 'reel', effort: 'medium' },
      { text: `Post one clear ${name} fee breakdown: tuition, exams and hostel, in a single image.`, question: 1, format: 'post', effort: 'easy' },
      { text: `Answer "which college is good for ${name}" in Assamese, with a real day in class.`, question: 2, format: 'reel', effort: 'medium' },
      { text: `A recent ${name} graduate explains how an internship led to their first job.`, question: 3, trend: 0, format: 'video', effort: 'medium' },
      { text: `Share real first year salaries of your ${name} graduates, with the year.`, question: 4, format: 'post', effort: 'easy' },
    ],
  };
}

/** The fixture for a program: hand-written for the sample programs, a template for the rest. */
export function demandFixture(programKey: string): ProgramDemandFixture | undefined {
  const fixture = DEMAND_FIXTURES[programKey];
  if (fixture) return fixture;
  const listed = LISTED_PROGRAMS.find((program) => program.key === programKey);
  return listed ? genericFixture(programKey, listed.name) : undefined;
}

export interface MentionTopic {
  sentiment: Sentiment;
  text: string;
  base: number;
  source: 'reddit' | 'x' | 'quora' | 'instagram' | 'youtube' | 'trends';
}

const GENERIC_MENTIONS: Readonly<Record<'degree' | 'skilling', Readonly<Record<Sentiment, readonly string[]>>>> = {
  degree: {
    positive: ['Friendly and quick admission help', 'Teachers who make time for students', 'A clean and green campus'],
    negative: ['Hard to find fee details', 'Few companies at placement drives', 'Long waits for documents'],
  },
  skilling: {
    positive: ['Practical classes with real tools', 'Trainers who answer every question', 'Small batches'],
    negative: ['Batch timings change often', 'Certificates take long to arrive', 'Crowded classrooms'],
  },
};

/** Grouped public mentions of an institution: the sample's own, or one of each kind for anyone else. */
export function mentionTopics(slug: string, type: InstitutionType): MentionTopic[] {
  const sample = MENTION_FIXTURES.filter((mention) => mention.slug === slug);
  if (sample.length) return sample.map(({ sentiment, text, base, source }) => ({ sentiment, text, base, source }));
  const bank = GENERIC_MENTIONS[type === 'skilling' ? 'skilling' : 'degree'];
  const rng = rngFor('mentions', slug);
  return [
    { sentiment: 'positive', text: rng.pick(bank.positive), base: rng.int(4, 16), source: rng.pick(['reddit', 'instagram'] as const) },
    { sentiment: 'negative', text: rng.pick(bank.negative), base: rng.int(2, 9), source: rng.pick(['x', 'reddit'] as const) },
  ];
}

export interface PlaceWords {
  /** The city (city pulls), the state (state pulls) or India. */
  place: string;
  /** The state, or India for All India. */
  state: string;
  /** Whether the region is in Assam (or All India), where Assamese sources apply. */
  assamese: boolean;
}

/**
 * The sample fixtures are written for Guwahati and Assam. Other regions get their own names. A
 * city pull without its state takes it from the city list.
 */
export function placeWords(scope: 'city' | 'state' | 'india', region: string, state: string | null | undefined): PlaceWords {
  if (scope === 'india') return { place: 'India', state: 'India', assamese: true };
  const inState = state ?? (scope === 'state' ? region : (INDIA_CITIES.find((city) => city.name === region)?.state ?? region));
  return { place: region, state: inState, assamese: inState === 'Assam' };
}

export function localize(text: string, words: PlaceWords): string {
  // Outside Assam, an idea never asks for Assamese.
  const trimmed = words.assamese ? text : text.replace(/,? in Assamese(?=[,.])/g, '');
  return trimmed.replace(/\bGuwahati\b/g, words.place).replace(/\bAssam\b/g, words.state);
}

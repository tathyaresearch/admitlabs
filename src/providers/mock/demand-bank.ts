// What the mock Demand sources "find": the hand-written sample fixtures for the 8 sample
// programs, and a written template for every other listed program, so any institution that
// signs up sees a full Demand page. Topics and counts only, never a person.

import { INDIA_CITIES } from '../../config/cities.ts';
import { LISTED_PROGRAMS, PROGRAM_GROUPS } from '../../config/programs.ts';
import { DEGREE_CONTENT, DEMAND_FIXTURES, SKILLS_CONTENT, SKILLS_PROGRAM_KEYS, type ProgramDemandFixture } from '../../sample/demand.ts';
import { rngFor } from './random.ts';

const SKILLS_GROUP = new Set(PROGRAM_GROUPS.find((group) => group.group === 'Skills')?.programs.map((program) => program.key) ?? []);

/** Skilling courses run in rolling batches, so what gets attention looks different. */
export function isSkillsProgram(programKey: string): boolean {
  return SKILLS_PROGRAM_KEYS.has(programKey) || SKILLS_GROUP.has(programKey);
}

/** A written template for a listed program without a hand-written fixture. */
function genericFixture(programKey: string, name: string): ProgramDemandFixture {
  const rng = rngFor('demand-template', programKey);
  const base = (min: number, max: number) => rng.int(min, max);
  const skills = isSkillsProgram(programKey);
  const start = skills ? rng.pick([4, 10] as const) : rng.pick([3, 4, 5] as const);
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
      { text: `Which ${name} colleges in Guwahati have real placements?`, language: 'en', base: base(60, 96), source: 'quora', topic: 'placements' },
      { text: `What is the total fee for ${name} in Guwahati?`, language: 'hi', base: base(50, 90), source: 'youtube', topic: 'fees' },
      { text: `Which college is good for ${name} in Guwahati?`, language: 'as', base: base(40, 80), source: 'instagram', topic: 'other' },
      { text: `Is ${name} worth it for a good first job?`, language: 'en', base: base(35, 70), source: 'reddit', topic: 'careers' },
      { text: `What does a ${name} graduate earn in the first year?`, language: 'en', base: base(30, 64), source: 'quora', topic: 'careers' },
    ],
    topics: [
      { topic: 'fees', base: base(70, 140), question: { text: `What is the total fee for ${name} in Guwahati with hostel?`, language: 'en', source: 'quora' } },
      { topic: 'placements', base: base(70, 130), question: { text: `Which ${name} colleges in Guwahati have real placements?`, language: 'en', source: 'quora' } },
      { topic: 'careers', base: base(40, 90), question: { text: `Is ${name} worth it for a good first job?`, language: 'en', source: 'reddit' } },
      { topic: 'hostel', base: base(20, 70), question: { text: `Do ${name} colleges in Guwahati give a hostel in the first year?`, language: 'en', source: 'reddit' } },
      { topic: 'scholarships', base: base(15, 50), question: { text: `Are there ${name} scholarships in Assam?`, language: 'en', source: 'quora' } },
    ],
    content: skills ? SKILLS_CONTENT : DEGREE_CONTENT,
    bestMonths: [start, start + 1, start + 2],
    ideas: [
      {
        title: `Last year’s ${name} placements, one student per reel`,
        text: `Show last year's ${name} placements: company, role and salary, one student per reel.`,
        question: 0,
        format: 'reel',
        effort: 'medium',
        hook: '“I got my offer in the final semester. Here is the company, and the salary.”',
        points: ['The company, the role and the salary', 'How the placement drive worked', 'What the student did to get ready'],
      },
      {
        title: `Your full ${name} fee in one image`,
        text: `Post one clear ${name} fee breakdown: tuition, exams and hostel, in a single image.`,
        topic: 'fees',
        format: 'post',
        effort: 'easy',
        hook: `“Every rupee of ${name} at {institution}, on one page.”`,
        points: ['Tuition, exams and hostel, year by year', 'What each fee covers', 'Scholarships that bring it down'],
      },
      {
        title: `Which college is good for ${name}? Answered in Assamese`,
        text: `Answer "which college is good for ${name}" in Assamese, with a real day in class.`,
        question: 2,
        format: 'reel',
        effort: 'medium',
        hook: `“Choosing a ${name} college? Spend one real day with us.”`,
        points: ['A real day in class', 'What students like here, in their words', 'How to apply'],
      },
      {
        title: `How an internship led to a first ${name} job`,
        text: `A recent ${name} graduate explains how an internship led to their first job.`,
        question: 3,
        trend: 0,
        format: 'video',
        effort: 'medium',
        hook: '“My internship became my first job. Here is how.”',
        points: ['Where they interned', 'What they did there', 'How it turned into an offer'],
      },
      {
        title: `Real first year salaries of your ${name} graduates`,
        text: `Share real first year salaries of your ${name} graduates, with the year.`,
        question: 4,
        format: 'post',
        effort: 'easy',
        hook: `“What our ${name} graduates earn in year one.”`,
        points: ['Salary ranges by role', 'The companies, by name', 'The year'],
      },
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
  const trimmed = words.assamese ? text : text.replace(/\? Answered in Assamese$/, '?').replace(/,? in Assamese(?=[,.]|$)/g, '');
  return trimmed.replace(/\bGuwahati\b/g, words.place).replace(/\bAssam\b/g, words.state);
}

// Mock rival activity: moves found on a rival's website and its posts, for the weekly check.
// Sample institutions follow the hand-written sample up to the sample's "today". After that,
// and for any institution added later, a stable pseudo-random stream stands in, so every rival
// has moves and posts to show and the weekly check can find something new.

import { LISTED_PROGRAMS } from '../../config/programs.ts';
import { RIVAL_RULES } from '../../config/rivals.ts';
import { istDate, istParts } from '../../domain/dates.ts';
import type { ContentPlatform, RivalMoveKind } from '../../domain/types.ts';
import { SAMPLE_INSTITUTIONS, SAMPLE_TODAY } from '../../sample/institutions.ts';
import { SAMPLE_CONTENT, SAMPLE_MOVES } from '../../sample/rivals.ts';
import type { InstitutionRef } from '../types.ts';
import { rngFor, type Rng } from './random.ts';
import { slugify } from './shared.ts';

const DAY_MS = 86_400_000;
const SAMPLE_SLUGS: ReadonlySet<string> = new Set(SAMPLE_INSTITUTIONS.map((sample) => sample.slug));
const MOVE_CHANCE_PER_DAY = 0.04;
const POST_CHANCE_PER_DAY: Readonly<Record<ContentPlatform, number>> = { instagram: 0.25, youtube: 0.05 };

export interface MockMove {
  kind: RivalMoveKind;
  description: string;
  /** ISO time the change appeared on the site. */
  detectedAt: string;
  path: string;
}

export interface MockPost {
  title: string;
  postedAt: string;
  metrics: { views: number; likes: number; comments: number; shares: number };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** India dates (YYYY-MM-DD) in the `days` up to and including the day of `asOf`. */
function daysUpTo(asOf: Date, days: number): string[] {
  const out: string[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const { year, month, day } = istParts(new Date(asOf.getTime() - back * DAY_MS));
    out.push(`${year}-${pad(month)}-${pad(day)}`);
  }
  return out;
}

/** Days made up by the mock: all of them for institutions outside the sample, else after the sample's today. */
function generated(institution: InstitutionRef, day: string): boolean {
  return !SAMPLE_SLUGS.has(institution.slug) || day > SAMPLE_TODAY;
}

function programName(institution: InstitutionRef, rng: Rng): string {
  const key = institution.programKeys.length ? rng.pick(institution.programKeys) : null;
  return (key && LISTED_PROGRAMS.find((program) => program.key === key)?.name) ?? 'your programs';
}

const NEW_PROGRAMS = ['Business Analytics', 'Digital Marketing', 'Data Science', 'Aviation Management', 'Fintech', 'Healthcare Management', 'Graphic Design', 'Tally and GST'];

function makeMove(institution: InstitutionRef, day: string, rng: Rng): MockMove {
  const year = Number(day.slice(0, 4));
  const program = programName(institution, rng);
  const key = slugify(program);
  const kind = rng.pick(['new_page', 'fee_change', 'admission_dates', 'new_program'] as const);
  const options: Record<RivalMoveKind, ReadonlyArray<[string, string]>> = {
    new_page: [
      [`Added a page answering common questions about ${program}.`, `/programs/${key}/faq`],
      ['Published a hostel and campus life page.', '/campus-life'],
      ['Added a scholarships page with who can apply and by when.', '/scholarships'],
      [`Published a placements page for the ${year} batch.`, `/placements/${year}`],
    ],
    fee_change: [
      [`Now shows ${program} fees on the program page.`, `/programs/${key}#fees`],
      [`Updated ${program} fees for the ${year + 1} intake.`, `/programs/${key}#fees`],
      [`Added a plan to pay ${program} fees in parts.`, '/fees'],
    ],
    admission_dates: [
      [`Announced ${year + 1} admission dates for ${program}.`, '/admissions'],
      [`Opened applications for the ${year + 1} intake.`, '/admissions/apply'],
    ],
    new_program: [
      [`Started a short course in ${rng.pick(NEW_PROGRAMS)}.`, '/courses/new'],
      [`Launched a new specialisation in ${rng.pick(NEW_PROGRAMS)}.`, '/programs/new'],
    ],
  };
  const [description, path] = rng.pick(options[kind]);
  return { kind, description, path, detectedAt: istDate(day, rng.int(9, 18)).toISOString() };
}

/** Moves that appeared on the rival's site in the weeks before a check. */
export function mockMoves(institution: InstitutionRef, asOf: Date): MockMove[] {
  const days = daysUpTo(asOf, RIVAL_RULES.movesLookbackDays);
  const first = days[0] ?? '';
  const moves: MockMove[] = SAMPLE_MOVES.filter((move) => move.slug === institution.slug && move.detectedAt >= first && move.detectedAt <= SAMPLE_TODAY).map(
    (move) => ({ kind: move.kind, description: move.description, path: move.path, detectedAt: istDate(move.detectedAt, 9).toISOString() }),
  );
  for (const day of days) {
    if (!generated(institution, day)) continue;
    const rng = rngFor('move', institution.slug, day);
    if (rng.chance(MOVE_CHANCE_PER_DAY)) moves.push(makeMove(institution, day, rng));
  }
  return moves.filter((move) => new Date(move.detectedAt).getTime() <= asOf.getTime());
}

const INSTAGRAM_TITLES = [
  '{program} students on their first day of classes',
  'A day in the {program} classroom',
  'What our {program} graduates do now',
  'Fees, hostel and scholarships: your questions answered',
  'Campus tour in 60 seconds',
  'A {program} student talks about her internship',
  'Meet the teachers behind {program}',
  'Admissions are open for {program}',
  'Three things to check before you choose where to study',
  'Results day for our {program} batch',
];

const YOUTUBE_TITLES = [
  '{program} explained in 5 minutes',
  'A walk around our campus',
  'Alumni talk: from the classroom to a first job',
  'Hostel and campus life, filmed by students',
];

function makePost(institution: InstitutionRef, platform: ContentPlatform, day: string, rng: Rng): MockPost {
  const title = rng.pick(platform === 'instagram' ? INSTAGRAM_TITLES : YOUTUBE_TITLES).replace('{program}', programName(institution, rng));
  const views = platform === 'instagram' ? rng.int(1_500, 26_000) : rng.int(800, 12_000);
  const likes = Math.round(views * rng.between(0.04, 0.08, 3));
  return {
    title,
    postedAt: istDate(day, rng.int(8, 20)).toISOString(),
    metrics: { views, likes, comments: Math.round(likes * rng.between(0.04, 0.12, 3)), shares: Math.round(likes * rng.between(0.05, 0.2, 3)) },
  };
}

/** A rival's posts on one platform in the weeks before a check, each with a link to the post. */
export function mockPosts(institution: InstitutionRef, platform: ContentPlatform, asOf: Date): Array<MockPost & { url: string }> {
  if (platform === 'instagram' ? !institution.instagram : !institution.youtube) return [];
  const days = daysUpTo(asOf, RIVAL_RULES.contentLookbackDays);
  const first = days[0] ?? '';
  const posts: MockPost[] = SAMPLE_CONTENT.filter(
    (item) => item.slug === institution.slug && item.platform === platform && item.postedAt >= first && item.postedAt <= SAMPLE_TODAY,
  ).map((item) => ({ title: item.title, postedAt: istDate(item.postedAt, 18).toISOString(), metrics: item.metrics }));
  for (const day of days) {
    if (!generated(institution, day)) continue;
    const rng = rngFor('post', institution.slug, platform, day);
    if (rng.chance(POST_CHANCE_PER_DAY[platform])) posts.push(makePost(institution, platform, day, rng));
  }
  return posts
    .filter((post) => new Date(post.postedAt).getTime() <= asOf.getTime())
    .map((post) => ({
      ...post,
      url:
        platform === 'instagram'
          ? `https://instagram.example/p/${slugify(`${post.postedAt.slice(0, 10)} ${post.title}`).slice(0, 48)}`
          : `https://youtube.example/watch?v=${slugify(`${institution.slug} ${post.title}`).slice(0, 32)}`,
    }));
}

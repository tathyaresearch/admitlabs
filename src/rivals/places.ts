// Rivals place by place (spec 8.4): the ranking (you and each rival with the small score and the
// three words), the five places with each side's result, who leads where it is scored and what
// was found where it is not, and what to learn from the one ahead in a place. Pure: the page
// loads each side's latest Audit (row level security applies), this shapes it.
//
// A place's result is the share of its points the side earned, from that side's own Audit, so a
// college and a skilling institute compare fairly. Check by check inside a place comes from each
// rival's comparison with you (compare.ts and across.ts), so it agrees with the rival's own page.

import type { StoredFinding } from '../audit/places.ts';
import { getCheck } from '../domain/checks.ts';
import { joinNames, plural } from '../domain/format.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import { PILLAR_LABELS, PILLARS, PLACE_LABELS, PLACES, type CheckKey, type Pillar, type Place } from '../domain/types.ts';
import type { AcrossRow } from './across.ts';
import type { CheckScore, ScoreSet } from './compare.ts';
import { checkPhrase } from './text.ts';

const EPSILON = 0.005;
const SCORED_PLACES: readonly Place[] = ['website', 'google', 'social'];

export interface PlaceSide {
  id: string;
  name: string;
  you: boolean;
  /** A rival from another city than yours: "Nearby city" wherever it shows. */
  nearby: boolean;
  /** Its latest Audit: yours (approved), or Drishti's rival Audit of it. Null until it is checked. */
  scores: ScoreSet | null;
  /** Every check of that Audit. */
  checks: readonly CheckScore[];
  /** What people say and Other places, from the same Audit. */
  findings: readonly StoredFinding[];
}

export interface RankingRow {
  id: string;
  name: string;
  you: boolean;
  nearby: boolean;
  /** 1 is the highest score. Equal scores share a place. Null until checked. */
  place: number | null;
  overall: number | null;
  /** Visibility, Trust and Chosen, each with its word. Empty until checked. */
  words: Array<{ pillar: Pillar; name: string; word: ScoreLabel }>;
}

export interface PlaceCell {
  /** Website, Google and Social media: the share of the place's points this side earned, 0 to 1. */
  share: number | null;
  word: ScoreLabel | null;
  /** Leads the place on its own. */
  leads: boolean;
  /** What people say and Other places: what was found, in words. */
  note: string | null;
}

export interface PlaceRow {
  key: Place;
  name: string;
  /** Website, Google and Social media say who leads; What people say and Other places do not. */
  scored: boolean;
  /** Each side's result, by side id. */
  cells: Record<string, PlaceCell>;
  /** The sides that lead the place: the best, or several level at the top. None when everyone is level. */
  leaders: string[];
}

export interface RivalPlacesView {
  /** You and each rival, highest score first: also the order of the columns. */
  ranking: RankingRow[];
  places: PlaceRow[];
}

function shareOf(checks: readonly CheckScore[]): number | null {
  const max = checks.reduce((sum, check) => sum + check.maxPoints, 0);
  return max > 0 ? checks.reduce((sum, check) => sum + check.points, 0) / max : null;
}

/** "6 good, no complaints, 1 unanswered", or "Not much said yet". */
export function peopleNote(findings: readonly StoredFinding[]): string {
  const people = findings.filter((finding) => finding.place === 'people' && !finding.removed);
  if (people.length === 0) return 'Not much said yet';
  const count = (kind: StoredFinding['kind']) => people.filter((finding) => finding.kind === kind).length;
  const good = count('good');
  const bad = count('bad');
  const unanswered = count('unanswered');
  return [good ? `${good} good` : null, bad ? plural(bad, 'complaint', 'complaints') : 'no complaints', unanswered ? `${unanswered} unanswered` : null].filter(Boolean).join(', ');
}

/** "Listed on 3 sites, 2 news stories", "1 old listing, missing from 1 site", or "No listings found yet". */
export function otherNote(findings: readonly StoredFinding[]): string {
  const other = findings.filter((finding) => finding.place === 'other' && !finding.removed);
  if (other.length === 0) return 'No listings found yet';
  const listed = other.filter((finding) => (finding.kind === 'listing' || finding.kind === 'directory') && finding.listing === null).length;
  const old = other.filter((finding) => finding.listing === 'old_details').length;
  const courses = other.filter((finding) => finding.listing === 'missing_courses').length;
  const missing = other.filter((finding) => finding.listing === 'missing').length;
  const news = other.filter((finding) => finding.kind === 'news').length;
  const text = [
    listed ? `listed on ${plural(listed, 'site', 'sites')}` : null,
    old ? plural(old, 'old listing', 'old listings') : null,
    courses ? `${plural(courses, 'listing', 'listings')} missing courses` : null,
    missing ? `missing from ${plural(missing, 'site', 'sites')}` : null,
    news ? plural(news, 'news story', 'news stories') : null,
  ]
    .filter(Boolean)
    .join(', ');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Nothing to show yet';
}

/** The ranking and the five places, you and each rival. */
export function rivalPlaces(sides: readonly PlaceSide[]): RivalPlacesView {
  const scored = sides
    .filter((side) => side.scores !== null)
    .sort((a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0) || Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
  const unscored = sides.filter((side) => side.scores === null).sort((a, b) => a.name.localeCompare(b.name));
  const ordered = [...scored, ...unscored];
  const ranking = ordered.map(
    (side): RankingRow => ({
      id: side.id,
      name: side.name,
      you: side.you,
      nearby: side.nearby,
      place: side.scores ? 1 + scored.filter((other) => (other.scores?.overall ?? 0) > (side.scores?.overall ?? 0)).length : null,
      overall: side.scores?.overall ?? null,
      words: side.scores ? PILLARS.map((pillar) => ({ pillar, name: PILLAR_LABELS[pillar], word: scoreLabel(side.scores?.[pillar] ?? 0) })) : [],
    }),
  );

  const places = PLACES.map((key): PlaceRow => {
    if (!SCORED_PLACES.includes(key)) {
      return {
        key,
        name: PLACE_LABELS[key],
        scored: false,
        cells: Object.fromEntries(
          ordered.map((side) => [
            side.id,
            { share: null, word: null, leads: false, note: side.scores === null ? null : key === 'people' ? peopleNote(side.findings) : otherNote(side.findings) },
          ]),
        ),
        leaders: [],
      };
    }
    const shares = new Map(ordered.map((side) => [side.id, shareOf(side.checks.filter((check) => getCheck(check.key).place === key))]));
    const known = [...shares.entries()].filter((entry): entry is [string, number] => entry[1] !== null);
    const best = known.length ? Math.max(...known.map(([, share]) => share)) : null;
    const top = best === null ? [] : known.filter(([, share]) => share > best - EPSILON).map(([id]) => id);
    // Several level at the top all lead; when every side is level, nobody does.
    const leaders = top.length < known.length ? top : [];
    return {
      key,
      name: PLACE_LABELS[key],
      scored: true,
      cells: Object.fromEntries(
        ordered.map((side) => {
          const share = shares.get(side.id) ?? null;
          return [side.id, { share, word: share === null ? null : scoreLabel(share * 100), leads: leaders.includes(side.id), note: null }];
        }),
      ),
      leaders,
    };
  });

  return { ranking, places };
}

/** The place to open first: where a rival leads you by the most, otherwise the website. */
export function openingPlace(view: RivalPlacesView, youId: string): Place {
  let best: { key: Place; margin: number } | null = null;
  for (const place of view.places) {
    const leader = place.leaders[0];
    if (!place.scored || !leader || place.leaders.includes(youId)) continue;
    const margin = (place.cells[leader]?.share ?? 0) - (place.cells[youId]?.share ?? 0);
    if (!best || margin > best.margin) best = { key: place.key, margin };
  }
  return best?.key ?? 'website';
}

/** The checks of a place, in their order, as compared across you and your rivals. */
export function placeChecks(rows: readonly AcrossRow[], place: Place): AcrossRow[] {
  return rows.filter((row) => getCheck(row.key).place === place);
}

export interface PlaceLessonInput {
  place: PlaceRow;
  /** The place's checks across you and your rivals (placeChecks). */
  rows: readonly AcrossRow[];
  sides: ReadonlyArray<Pick<PlaceSide, 'id' | 'name' | 'you'>>;
  /** The rivals' best posts this month, for Social media. */
  posts?: ReadonlyArray<{ rivalId: string; title: string; whyItWorked: string | null }>;
  institutionType: Parameters<typeof checkPhrase>[1];
}

export interface PlaceLesson {
  /** "What to learn from Silverline College", or "You lead here". */
  title: string;
  text: string;
}

function share(row: AcrossRow, id: string): number {
  const summary = row.cells[id]?.summary;
  return !summary || summary.kind === 'none' ? -1 : summary.share;
}

/**
 * What to learn from the one ahead in a place: the idea behind its best post on Social media, or
 * what was found on the check where it leads you by the most. Never to copy. Null for What people
 * say and Other places, which have no leader.
 */
export function placeLesson({ place, rows, sides, posts = [], institutionType }: PlaceLessonInput): PlaceLesson | null {
  if (!place.scored) return null;
  const you = sides.find((side) => side.you);
  const leaders = place.leaders.flatMap((id) => sides.filter((side) => side.id === id));
  if (!you || leaders.length === 0) return { title: 'Nobody leads here', text: `You and your rivals are level on ${PLACE_LABELS[place.key]}. One step up puts you ahead.` };
  if (leaders.some((side) => side.you)) {
    return leaders.length === 1
      ? { title: 'You lead here', text: `No rival is ahead of you on ${PLACE_LABELS[place.key]}. Keep it going.` }
      : { title: 'You share the lead here', text: `${joinNames(leaders.filter((side) => !side.you).map((side) => side.name))} ${leaders.length > 2 ? 'are' : 'is'} level with you on ${PLACE_LABELS[place.key]}. One step up puts you ahead.` };
  }
  const title = `What to learn from ${joinNames(leaders.map((side) => side.name))}`;
  const post = place.key === 'social' ? posts.find((item) => leaders.some((side) => side.id === item.rivalId) && item.whyItWorked) : undefined;
  if (post?.whyItWorked) {
    const by = leaders.length > 1 ? ` from ${leaders.find((side) => side.id === post.rivalId)?.name ?? 'them'}` : '';
    return { title, text: `The best post this month${by}, “${post.title}”: ${post.whyItWorked} Take the idea with your own students; never copy the post.` };
  }
  // The check here where one of the leaders is furthest ahead of you, with what was found for it.
  let best: { row: AcrossRow; side: (typeof leaders)[number]; margin: number } | null = null;
  for (const row of rows) {
    if (row.lead !== 'rival') continue;
    for (const side of leaders) {
      if (!row.leaders.includes(side.id)) continue;
      const margin = share(row, side.id) - share(row, you.id);
      if (!best || margin > best.margin) best = { row, side, margin };
    }
  }
  if (!best) return { title, text: `${leaders.length > 1 ? 'They lead' : `${leaders[0]?.name} leads`} on ${PLACE_LABELS[place.key]} overall. Open a check to see what was found for each of you.` };
  const found = best.row.cells[best.side.id]?.parts.find((part) => part.finding)?.finding ?? null;
  const where = checkPhrase(best.row.key, institutionType);
  const whom = leaders.length > 1 ? ` for ${best.side.name}` : '';
  return {
    title,
    text: found
      ? `On ${where}, Drishti found${whom}: “${found}” Do the same your own way, with your own students and numbers. Never copy their words or photos.`
      : `${best.side.name} leads you on ${where}. Do the same your own way, with your own students and numbers. Never copy their words or photos.`,
  };
}

/** Who leads a scored place, in a few words: "Silverline College leads", "You lead", "You and Silverline College lead", "All level". */
export function placeLeadText(place: PlaceRow, sides: ReadonlyArray<Pick<PlaceSide, 'id' | 'name' | 'you'>>): string {
  if (!place.scored) return 'What was found';
  const leaders = place.leaders.flatMap((id) => sides.filter((side) => side.id === id));
  if (leaders.length === 0) return Object.values(place.cells).some((cell) => cell.share !== null) ? 'All level' : 'Not checked yet';
  const names = leaders.map((side) => (side.you ? 'You' : side.name));
  if (leaders.length === 1) return leaders[0]?.you ? 'You lead' : `${names[0]} leads`;
  return `${joinNames(names)} lead`;
}

/** One rival against you, in a sentence: "They lead you on 4 checks, most on Instagram and placement proof. You lead them on 6." */
export function rivalSummary(input: { theyLead: readonly CheckKey[]; youLead: number; institutionType: Parameters<typeof checkPhrase>[1] }): string {
  const { theyLead, youLead, institutionType } = input;
  const yours = youLead ? `You lead them on ${plural(youLead, 'check', 'checks')}.` : 'You do not lead them on any check yet.';
  if (theyLead.length === 0) return youLead ? `They do not lead you on any check. You lead them on ${plural(youLead, 'check', 'checks')}.` : 'You are level on every check.';
  const most = joinNames(theyLead.slice(0, 2).map((key) => checkPhrase(key, institutionType)));
  return `They lead you on ${plural(theyLead.length, 'check', 'checks')}, most on ${most}. ${yours}`;
}

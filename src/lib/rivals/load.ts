// Loads what the Rivals screens need, as the signed-in user: row level security decides what
// comes back. Free gets the rival list, one word per rival (ahead or behind), the month's one
// line and counts for what Paid adds; Paid and Client get the ranking, place by place, check by
// check, lessons and alerts. Nothing here widens what the database returns.

import { cache } from 'react';
import { findingsByAudit } from '@/audit/read';
import { historyByMonth } from '@/audit/view';
import { RIVAL_RULES } from '@/config/rivals';
import { monthKey } from '@/domain/dates';
import type { CheckKey, ContentPlatform, Difficulty, InstitutionType, RivalMoveKind } from '@/domain/types';
import { loadHistory } from '@/lib/audit/load';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { checksAcross, type AcrossRow, type AcrossSide } from '@/rivals/across';
import { compareChecks, ladder, type CheckComparison, type LadderRow, type Standing } from '@/rivals/compare';
import { rivalPlaces, type PlaceSide, type RivalPlacesView } from '@/rivals/places';
import { checkScores, latestOwnAudit, latestRivalAudits, programInfo, rivalAuditHistory, type AuditScores } from '@/rivals/read';
import { rivalChangeState, type RivalChangeState } from '@/rivals/rules';
import { reviewTrend, type ReviewTrend } from '@/rivals/timing';
import { scoreTrend, type ScoreTrend } from '@/rivals/trend';
import { freeRivalsVerdict, rivalsVerdict } from '@/rivals/verdict';

const DAY_MS = 86_400_000;

export interface RivalInfo {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  suggested: boolean;
  addedAt: string;
}

export interface MoveRow {
  id: string;
  rivalId: string;
  kind: RivalMoveKind;
  description: string;
  sourceUrl: string;
  detectedAt: string;
}

export interface PostRow {
  id: string;
  rivalId: string;
  platform: ContentPlatform;
  url: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  whyItWorked: string | null;
  postedAt: string | null;
  month: string;
}

export interface AdRow {
  id: string;
  rivalId: string;
  promise: string;
  sourceUrl: string;
  enteredAt: string;
}

export interface ActionRow {
  rank: number;
  text: string;
  detail: string | null;
  rivalId: string | null;
  checkKey: CheckKey | null;
  /** How big a job it is (null for a lesson about a check: the Audit's fix says). */
  effort: Difficulty | null;
  /** 'YYYY-MM-01'. */
  month: string;
}

export interface Activity {
  moves: MoveRow[];
  /** The latest month with posts, and the best posts from it. */
  postsMonth: string | null;
  posts: PostRow[];
  ads: AdRow[];
  /** When Drishti last ran the weekly check on any of these rivals. */
  lastChecked: string | null;
}

/** You and your rivals side by side: each side's latest Audit, compared check by check. */
export interface Comparison {
  /** You first, then each rival, for the places. */
  sides: PlaceSide[];
  view: RivalPlacesView;
  /** Every check across you and the rivals compared with you. */
  across: AcrossRow[];
  acrossSides: AcrossSide[];
  /** Each rival's comparison with you, by rival id. */
  comparisons: Map<string, CheckComparison[]>;
  you: AuditScores | null;
  /** Each rival's latest rival Audit, by rival id. */
  audits: Map<string, AuditScores>;
}

export interface FullRivals extends Comparison {
  /** When rival scores were last checked (the newest rival Audit). */
  lastScored: string | null;
  lessons: ActionRow[];
  /** The last 30 days, newest first. */
  alerts: MoveRow[];
  /** The latest month's best posts, for what to learn on Social media. */
  posts: PostRow[];
  /** When Drishti last ran the weekly check on any of these rivals. */
  lastChecked: string | null;
}

export interface FreeRivals {
  standings: Array<RivalInfo & { standing: Standing }>;
  teaser: { moves: number; posts: number; ads: number };
  /** Your own first Audit is ready: until then nobody is ahead or behind yet. */
  hasAudit: boolean;
}

export interface RivalsPage {
  rivals: RivalInfo[];
  change: RivalChangeState;
  /** The month's one line, or null until it is written for the rivals you have now. */
  line: string | null;
  full: FullRivals | null;
  free: FreeRivals | null;
}

export const loadRivalList = cache(async (institutionId: string): Promise<RivalInfo[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rivals')
    .select('rival_institution_id, suggested, added_at, institutions!rivals_rival_institution_id_fkey(id, name, type, city, state, website)')
    .eq('institution_id', institutionId);
  if (error) throw new Error(`Could not load rivals: ${error.message}`);
  return (data ?? [])
    .flatMap((row) => {
      const institution = row.institutions;
      if (!institution) return [];
      return [
        {
          id: institution.id,
          name: institution.name,
          type: institution.type,
          city: institution.city,
          state: institution.state,
          website: institution.website,
          suggested: row.suggested,
          addedAt: row.added_at,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Whether the rivals can be changed now, from the plan and the change log. */
export const loadChangeState = cache(async (institutionId: string, tier: InstitutionViewer['tier'], hasRivals: boolean): Promise<RivalChangeState> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rival_changes')
    .select('changed_at')
    .eq('institution_id', institutionId)
    .eq('first_setup', false)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load rival changes: ${error.message}`);
  return rivalChangeState(tier, hasRivals, data ? new Date(data.changed_at) : null, new Date());
});

/** Moves from the last 30 days, the latest month's best posts, ads, and the last check. Paid and Client. */
export async function loadActivity(rivalIds: readonly string[], options: { postsPerRival?: number } = {}): Promise<Activity> {
  if (rivalIds.length === 0) return { moves: [], postsMonth: null, posts: [], ads: [], lastChecked: null };
  const supabase = await createClient();
  const since = new Date(Date.now() - RIVAL_RULES.movesWindowDays * DAY_MS).toISOString();
  const ids = [...rivalIds];
  const [moves, posts, ads, checks] = await Promise.all([
    supabase.from('rival_moves').select('id, rival_institution_id, kind, description, source_url, detected_at').in('rival_institution_id', ids).gt('detected_at', since).order('detected_at', { ascending: false }),
    supabase.from('rival_content').select('id, rival_institution_id, platform, url, title, metrics, why_it_worked, posted_at, month').in('rival_institution_id', ids).order('month', { ascending: false }),
    supabase.from('rival_ads').select('id, rival_institution_id, promise, source_url, entered_at').in('rival_institution_id', ids).order('entered_at', { ascending: false }),
    supabase.from('rival_checks').select('checked_at').in('rival_institution_id', ids).order('checked_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [moves, posts, ads, checks]) if (result.error) throw new Error(`Could not load rival activity: ${result.error.message}`);

  const postsMonth = posts.data?.[0]?.month ?? null;
  const perRival = new Map<string, number>();
  const best = (posts.data ?? [])
    .filter((row) => row.month === postsMonth)
    .map((row): PostRow => {
      const metrics = row.metrics as { views?: number; likes?: number; comments?: number };
      return {
        id: row.id,
        rivalId: row.rival_institution_id,
        platform: row.platform,
        url: row.url,
        title: row.title,
        views: metrics.views ?? 0,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        whyItWorked: row.why_it_worked,
        postedAt: row.posted_at,
        month: row.month,
      };
    })
    .sort((a, b) => b.views - a.views)
    .filter((post) => {
      const count = (perRival.get(post.rivalId) ?? 0) + 1;
      perRival.set(post.rivalId, count);
      return count <= (options.postsPerRival ?? RIVAL_RULES.postsPerMonth);
    });

  return {
    moves: (moves.data ?? []).map((row) => ({
      id: row.id,
      rivalId: row.rival_institution_id,
      kind: row.kind,
      description: row.description,
      sourceUrl: row.source_url,
      detectedAt: row.detected_at,
    })),
    postsMonth,
    posts: best,
    ads: (ads.data ?? []).map((row) => ({ id: row.id, rivalId: row.rival_institution_id, promise: row.promise, sourceUrl: row.source_url, enteredAt: row.entered_at })),
    lastChecked: checks.data?.checked_at ?? null,
  };
}

/** This month's Rivals 3 things to do, or the latest month's. Paid and Client (row level security). */
export async function loadActions(institutionId: string): Promise<ActionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('actions')
    .select('rank, text, detail, rival_institution_id, check_key, month, effort')
    .eq('institution_id', institutionId)
    .eq('feature', 'rivals')
    .order('month', { ascending: false })
    .order('rank');
  if (error) throw new Error(`Could not load the 3 things to do: ${error.message}`);
  const latest = data?.[0]?.month;
  return (data ?? [])
    .filter((row) => row.month === latest)
    .map((row) => ({ rank: row.rank, text: row.text, detail: row.detail, rivalId: row.rival_institution_id, checkKey: row.check_key, effort: row.effort, month: row.month }));
}

/**
 * You and these rivals side by side: your latest approved Audit and each rival's latest rival
 * Audit, with every check and what was found, compared check by check and place by place.
 */
async function loadComparison(institution: { id: string; name: string; city: string }, rivals: readonly RivalInfo[]): Promise<Comparison> {
  const supabase = await createClient();
  const rivalIds = rivals.map((rival) => rival.id);
  const [you, audits, programs] = await Promise.all([latestOwnAudit(supabase, institution.id), latestRivalAudits(supabase, rivalIds), programInfo(supabase, [institution.id, ...rivalIds])]);
  const auditIds = [...(you ? [you.id] : []), ...[...audits.values()].map((audit) => audit.id)];
  const [checks, findings] = await Promise.all([checkScores(supabase, auditIds, programs), findingsByAudit(supabase, auditIds)]);
  const yours = you ? (checks.get(you.id) ?? []) : [];
  const comparisons = new Map(
    rivals.flatMap((rival) => {
      const audit = audits.get(rival.id);
      return audit && you ? [[rival.id, compareChecks(yours, checks.get(audit.id) ?? [])] as const] : [];
    }),
  );
  const sides: PlaceSide[] = [
    { id: institution.id, name: institution.name, you: true, nearby: false, scores: you?.scores ?? null, checks: yours, findings: you ? (findings.get(you.id) ?? []) : [] },
    ...rivals.map((rival): PlaceSide => {
      const audit = audits.get(rival.id);
      return {
        id: rival.id,
        name: rival.name,
        you: false,
        nearby: rival.city !== institution.city,
        scores: audit?.scores ?? null,
        checks: audit ? (checks.get(audit.id) ?? []) : [],
        findings: audit ? (findings.get(audit.id) ?? []) : [],
      };
    }),
  ];
  const view = rivalPlaces(sides);
  // Check by check: you, then each compared rival in the ranking's order.
  const youSide: AcrossSide = { id: institution.id, name: institution.name, you: true };
  const compared = view.ranking.flatMap((row) => {
    const items = comparisons.get(row.id);
    return !row.you && items ? [{ side: { id: row.id, name: row.name, you: false }, comparisons: items }] : [];
  });
  return {
    sides,
    view,
    across: you && compared.length ? checksAcross(youSide, compared) : [],
    acrossSides: [youSide, ...compared.map((entry) => entry.side)],
    comparisons,
    you,
    audits,
  };
}

/**
 * The month's one line (written by the AI writer with the rival job, for every plan), the newest
 * one. Null when there is none yet, or when it names a rival you no longer track.
 */
export async function loadRivalLine(institutionId: string, rivalIds: readonly string[]): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('rival_lines').select('line, rival_institution_id, month').eq('institution_id', institutionId).order('month', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`Could not load the month's line: ${error.message}`);
  if (!data) return null;
  if (data.rival_institution_id && !rivalIds.includes(data.rival_institution_id)) return null;
  return data.line;
}

/** Each rival's overall score at each of its rival Audits, oldest first: your place month by month. Paid and Client. */
export async function loadRivalScores(institutionId: string): Promise<Array<Array<{ runAt: string; overall: number }>>> {
  const rivals = await loadRivalList(institutionId);
  if (rivals.length === 0) return [];
  const history = await rivalAuditHistory(await createClient(), rivals.map((rival) => rival.id));
  return rivals.map((rival) => (history.get(rival.id) ?? []).map((audit) => ({ runAt: audit.runAt, overall: audit.scores.overall })));
}

/** Your overall score and each rival's, month by month. Rival scores come from rival Audits only. */
async function loadTrend(institutionId: string, institutionName: string, rivals: readonly RivalInfo[]): Promise<ScoreTrend> {
  const supabase = await createClient();
  const [own, theirs] = await Promise.all([loadHistory(institutionId), rivalAuditHistory(supabase, rivals.map((rival) => rival.id))]);
  const byMonth = (rows: Parameters<typeof historyByMonth>[0]) => historyByMonth(rows, (runAt) => monthKey(new Date(runAt)));
  return scoreTrend(
    [
      { id: institutionId, name: institutionName, you: true, points: byMonth(own) },
      ...rivals.map((rival) => ({ id: rival.id, name: rival.name, you: false, points: byMonth(theirs.get(rival.id) ?? []) })),
    ],
    RIVAL_RULES.trendMonths,
  );
}

export async function loadRivalsPage(viewer: InstitutionViewer): Promise<RivalsPage> {
  const institution = viewer.membership.institution;
  const rivals = await loadRivalList(institution.id);
  const change = await loadChangeState(institution.id, viewer.tier, rivals.length > 0);
  if (rivals.length === 0) return { rivals, change, line: null, full: null, free: null };
  const rivalIds = rivals.map((rival) => rival.id);

  if (viewer.tier === 'free') {
    const supabase = await createClient();
    const [standings, teaser, line, own] = await Promise.all([
      supabase.rpc('rival_standings', { p_institution: institution.id }),
      supabase.rpc('rival_teaser', { p_institution: institution.id }),
      loadRivalLine(institution.id, rivalIds),
      latestOwnAudit(supabase, institution.id),
    ]);
    if (standings.error) throw new Error(`Could not load where you stand: ${standings.error.message}`);
    if (teaser.error) throw new Error(`Could not load rival counts: ${teaser.error.message}`);
    const words = new Map((standings.data ?? []).map((row) => [row.rival_institution_id, row.standing as Standing]));
    const counts = (teaser.data ?? {}) as { moves?: number; posts?: number; ads?: number };
    return {
      rivals,
      change,
      line,
      full: null,
      free: {
        standings: rivals.map((rival) => ({ ...rival, standing: words.get(rival.id) ?? 'unscored' })),
        teaser: { moves: counts.moves ?? 0, posts: counts.posts ?? 0, ads: counts.ads ?? 0 },
        hasAudit: own !== null,
      },
    };
  }

  const [comparison, lessons, activity, line] = await Promise.all([
    loadComparison(institution, rivals),
    loadActions(institution.id),
    loadActivity(rivalIds, { postsPerRival: RIVAL_RULES.postsPerMonth }),
    loadRivalLine(institution.id, rivalIds),
  ]);
  const lastScored = [...comparison.audits.values()].reduce<string | null>((latest, audit) => (!latest || audit.runAt > latest ? audit.runAt : latest), null);
  return {
    rivals,
    change,
    line,
    free: null,
    full: { ...comparison, lastScored, lessons, alerts: activity.moves, posts: activity.posts, lastChecked: activity.lastChecked },
  };
}

export interface RivalSnapshot {
  rivals: RivalInfo[];
  /** Paid and Client: you and your rivals by overall score. */
  ladder: LadderRow[] | null;
  /** Free: ahead or behind for each rival. */
  standings: Array<RivalInfo & { standing: Standing }> | null;
  verdict: string;
  /** Paid and Client: the newest move from any rival. */
  latestMove: (MoveRow & { rivalName: string }) | null;
}

/** The small version for Home: where you stand, and the latest move on Paid and Client. */
export async function loadRivalSnapshot(viewer: InstitutionViewer): Promise<RivalSnapshot> {
  const institution = viewer.membership.institution;
  const rivals = await loadRivalList(institution.id);
  if (rivals.length === 0) return { rivals, ladder: null, standings: null, verdict: '', latestMove: null };
  const supabase = await createClient();

  if (viewer.tier === 'free') {
    const { data, error } = await supabase.rpc('rival_standings', { p_institution: institution.id });
    if (error) throw new Error(`Could not load where you stand: ${error.message}`);
    const words = new Map((data ?? []).map((row) => [row.rival_institution_id, row.standing as Standing]));
    const standings = rivals.map((rival) => ({ ...rival, standing: words.get(rival.id) ?? ('unscored' as Standing) }));
    return { rivals, ladder: null, standings, verdict: freeRivalsVerdict(standings), latestMove: null };
  }

  const ids = rivals.map((rival) => rival.id);
  const [you, theirs, move] = await Promise.all([
    latestOwnAudit(supabase, institution.id),
    latestRivalAudits(supabase, ids),
    supabase.from('rival_moves').select('id, rival_institution_id, kind, description, source_url, detected_at').in('rival_institution_id', ids).order('detected_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (move.error) throw new Error(`Could not load the latest move: ${move.error.message}`);
  const scored = rivals.flatMap((rival) => {
    const audit = theirs.get(rival.id);
    return audit ? [{ name: rival.name, scores: audit.scores }] : [];
  });
  return {
    rivals,
    ladder: ladder(
      { id: institution.id, name: institution.name, overall: you?.scores.overall ?? null, change: you?.changes.overall ?? null },
      rivals.map((rival) => ({ id: rival.id, name: rival.name, overall: theirs.get(rival.id)?.scores.overall ?? null, change: theirs.get(rival.id)?.changes.overall ?? null })),
    ),
    standings: null,
    verdict: you ? rivalsVerdict(you.scores, scored) : '',
    latestMove: move.data
      ? {
          id: move.data.id,
          rivalId: move.data.rival_institution_id,
          rivalName: rivals.find((rival) => rival.id === move.data?.rival_institution_id)?.name ?? 'A rival',
          kind: move.data.kind,
          description: move.data.description,
          sourceUrl: move.data.source_url,
          detectedAt: move.data.detected_at,
        }
      : null,
  };
}

export interface Suggestion {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  sameCity: boolean;
  sharedPrograms: string[];
}

/** Suggested rivals (spec 8.2), from the database so nobody reads other records directly. */
export async function loadSuggestions(institutionId: string): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rival_suggestions', { p_institution: institutionId });
  if (error) throw new Error(`Could not load suggestions: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.institution_id,
    name: row.name,
    type: row.type,
    city: row.city,
    state: row.state,
    sameCity: row.same_city,
    sharedPrograms: row.shared_programs,
  }));
}

export interface RivalDetail extends Comparison {
  rival: RivalInfo;
  nearby: boolean;
  /** Their best posts of the latest month. */
  posts: PostRow[];
  /** Every move on record for this rival, newest first (the admission push can be older than 30 days). */
  alerts: MoveRow[];
  reviews: ReviewTrend;
  /** Your overall score and theirs, month by month. */
  trend: ScoreTrend;
}

/** One rival's full view. Null when the viewer does not track it. Paid and Client only. */
export async function loadRivalDetail(viewer: InstitutionViewer, rivalId: string): Promise<RivalDetail | null> {
  const rivals = await loadRivalList(viewer.membership.institution.id);
  const rival = rivals.find((candidate) => candidate.id === rivalId);
  if (!rival) return null;
  const supabase = await createClient();
  const institution = viewer.membership.institution;
  const [comparison, activity, moves, reviews, trend] = await Promise.all([
    loadComparison(institution, [rival]),
    loadActivity([rival.id]),
    supabase.from('rival_moves').select('id, rival_institution_id, kind, description, source_url, detected_at').eq('rival_institution_id', rival.id).order('detected_at', { ascending: false }),
    supabase.rpc('rival_review_trend', { p_rival: rival.id }),
    loadTrend(institution.id, institution.name, [rival]),
  ]);
  if (moves.error) throw new Error(`Could not load moves: ${moves.error.message}`);
  if (reviews.error) throw new Error(`Could not load the review trend: ${reviews.error.message}`);
  return {
    ...comparison,
    rival,
    nearby: rival.city !== institution.city,
    posts: activity.posts,
    alerts: (moves.data ?? []).map((move) => ({
      id: move.id,
      rivalId: move.rival_institution_id,
      kind: move.kind,
      description: move.description,
      sourceUrl: move.source_url,
      detectedAt: move.detected_at,
    })),
    reviews: reviewTrend(
      (reviews.data ?? []).map((point) => {
        // A profile with no reviews has no rating (null), whatever the generated type says.
        const rating = point.rating as number | null;
        return { checkedAt: point.checked_at, rating: rating === null ? null : Number(rating), reviewCount: point.review_count ?? 0 };
      }),
    ),
    trend,
  };
}

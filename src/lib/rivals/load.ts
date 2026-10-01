// Loads what the Rivals screens need, as the signed-in user: row level security decides what
// comes back. Free gets the rival list, one word per rival (ahead or behind) and counts for the
// unlock card; Paid and Client get the full comparison. Nothing here widens what the database
// returns.

import { cache } from 'react';
import { historyByMonth } from '@/audit/view';
import { RIVAL_RULES } from '@/config/rivals';
import { monthKey } from '@/domain/dates';
import type { ContentPlatform, InstitutionType, RivalMoveKind, CheckKey } from '@/domain/types';
import { loadHistory } from '@/lib/audit/load';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { compareChecks, ladder, type CheckComparison, type LadderRow, type Standing } from '@/rivals/compare';
import { checkScores, latestOwnAudit, latestRivalAudits, programInfo, rivalAuditHistory, type AuditScores } from '@/rivals/read';
import { rivalChangeState, type RivalChangeState } from '@/rivals/rules';
import { reviewTrend, type ReviewTrend } from '@/rivals/timing';
import { pillarSpread, scoreTrend, type PillarSpread, type ScoreTrend } from '@/rivals/trend';
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

export interface RivalScores {
  rival: RivalInfo;
  audit: AuditScores | null;
  comparisons: CheckComparison[];
}

export interface FullRivals {
  you: AuditScores | null;
  rows: RivalScores[];
  ladder: LadderRow[];
  /** Each pillar with you and every scored rival on it. */
  spread: PillarSpread[];
  /** The overall score by month, you and each rival. */
  trend: ScoreTrend;
  actions: ActionRow[];
  activity: Activity;
}

export interface FreeRivals {
  standings: Array<RivalInfo & { standing: Standing }>;
  teaser: { moves: number; posts: number; ads: number };
}

export interface RivalsPage {
  rivals: RivalInfo[];
  change: RivalChangeState;
  /** When rival scores were last checked (the newest rival Audit). */
  lastScored: string | null;
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
    .select('rank, text, detail, rival_institution_id, check_key, month')
    .eq('institution_id', institutionId)
    .eq('feature', 'rivals')
    .order('month', { ascending: false })
    .order('rank');
  if (error) throw new Error(`Could not load the 3 things to do: ${error.message}`);
  const latest = data?.[0]?.month;
  return (data ?? [])
    .filter((row) => row.month === latest)
    .map((row) => ({ rank: row.rank, text: row.text, detail: row.detail, rivalId: row.rival_institution_id, checkKey: row.check_key, month: row.month }));
}

/** Your latest Audit and each rival's latest rival Audit, compared check by check. */
async function loadScores(institutionId: string, rivals: readonly RivalInfo[]): Promise<{ you: AuditScores | null; rows: RivalScores[] }> {
  const supabase = await createClient();
  const rivalIds = rivals.map((rival) => rival.id);
  const [you, theirs, programs] = await Promise.all([
    latestOwnAudit(supabase, institutionId),
    latestRivalAudits(supabase, rivalIds),
    programInfo(supabase, [institutionId, ...rivalIds]),
  ]);
  const checks = await checkScores(supabase, [...(you ? [you.id] : []), ...[...theirs.values()].map((audit) => audit.id)], programs);
  const yours = you ? (checks.get(you.id) ?? []) : [];
  return {
    you,
    rows: rivals.map((rival) => {
      const audit = theirs.get(rival.id) ?? null;
      return { rival, audit, comparisons: audit && you ? compareChecks(yours, checks.get(audit.id) ?? []) : [] };
    }),
  };
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
  if (rivals.length === 0) return { rivals, change, lastScored: null, full: null, free: null };

  if (viewer.tier === 'free') {
    const supabase = await createClient();
    const [standings, teaser] = await Promise.all([
      supabase.rpc('rival_standings', { p_institution: institution.id }),
      supabase.rpc('rival_teaser', { p_institution: institution.id }),
    ]);
    if (standings.error) throw new Error(`Could not load where you stand: ${standings.error.message}`);
    if (teaser.error) throw new Error(`Could not load rival counts: ${teaser.error.message}`);
    const words = new Map((standings.data ?? []).map((row) => [row.rival_institution_id, row.standing as Standing]));
    const counts = (teaser.data ?? {}) as { moves?: number; posts?: number; ads?: number };
    return {
      rivals,
      change,
      lastScored: null,
      full: null,
      free: {
        standings: rivals.map((rival) => ({ ...rival, standing: words.get(rival.id) ?? 'unscored' })),
        teaser: { moves: counts.moves ?? 0, posts: counts.posts ?? 0, ads: counts.ads ?? 0 },
      },
    };
  }

  const [scores, actions, activity, trend] = await Promise.all([
    loadScores(institution.id, rivals),
    loadActions(institution.id),
    loadActivity(
      rivals.map((rival) => rival.id),
      { postsPerRival: RIVAL_RULES.postsPerMonth },
    ),
    loadTrend(institution.id, institution.name, rivals),
  ]);
  const lastScored = scores.rows.reduce<string | null>((latest, row) => (row.audit && (!latest || row.audit.runAt > latest) ? row.audit.runAt : latest), null);
  return {
    rivals,
    change,
    lastScored,
    free: null,
    full: {
      you: scores.you,
      rows: scores.rows,
      ladder: ladder(
        { id: institution.id, name: institution.name, overall: scores.you?.scores.overall ?? null, change: scores.you?.changes.overall ?? null },
        scores.rows.map((row) => ({ id: row.rival.id, name: row.rival.name, overall: row.audit?.scores.overall ?? null, change: row.audit?.changes.overall ?? null })),
      ),
      spread: pillarSpread(
        { id: institution.id, name: institution.name, scores: scores.you?.scores ?? null },
        scores.rows.map((row) => ({ id: row.rival.id, name: row.rival.name, scores: row.audit?.scores ?? null })),
      ),
      trend,
      actions,
      activity,
    },
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

export interface RivalDetail {
  rival: RivalInfo;
  you: AuditScores | null;
  audit: AuditScores | null;
  comparisons: CheckComparison[];
  activity: Activity;
  /** Every move on record for this rival, newest first (the admission push can be older than 30 days). */
  allMoves: MoveRow[];
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
  const [scores, activity, moves, reviews, trend] = await Promise.all([
    loadScores(institution.id, [rival]),
    loadActivity([rival.id]),
    supabase.from('rival_moves').select('id, rival_institution_id, kind, description, source_url, detected_at').eq('rival_institution_id', rival.id).order('detected_at', { ascending: false }),
    supabase.rpc('rival_review_trend', { p_rival: rival.id }),
    loadTrend(institution.id, institution.name, [rival]),
  ]);
  if (moves.error) throw new Error(`Could not load moves: ${moves.error.message}`);
  if (reviews.error) throw new Error(`Could not load the review trend: ${reviews.error.message}`);
  const row = scores.rows[0];
  return {
    rival,
    you: scores.you,
    audit: row?.audit ?? null,
    comparisons: row?.comparisons ?? [],
    activity,
    allMoves: (moves.data ?? []).map((move) => ({
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

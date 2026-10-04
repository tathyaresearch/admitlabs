// Loads what the Demand screens need, as the signed-in user: row level security decides what
// comes back. Paid and Client: each program's city pull, or its state's filling in, the month's
// Make these 3 and how last month's went, and what was marked as made. Free: its one rising
// program and the first of Make these 3 (the database returns no more), and counts for what Paid
// adds. Nothing here widens what the database returns.

import { cache } from 'react';
import { DEMAND_RULES } from '@/config/demand';
import { lastMonthSummary, parsePickedIdea, type PickedIdea } from '@/demand/picks';
import { latestDemandRows, topicHistory, type TopicMonth } from '@/demand/read';
import { regionsFor, type DemandRegion } from '@/demand/regions';
import { demandSignals, programSources, thisMonth, type DemandProgram, type DemandSignals } from '@/demand/signals';
import { demandView, type DemandRow, type IdeaRow } from '@/demand/view';
import { previousMonth } from '@/domain/dates';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadPrograms } from '@/lib/audit/load';
import { createClient } from '@/lib/supabase/server';

export interface Highlight {
  text: string;
  changePct: number | null;
  /** Searches a month, only when the keyword tool counted them, and where. */
  count: number | null;
  countSource: string | null;
  sourceUrl: string;
  foundAt: string;
  programName: string;
  region: string;
  month: string;
}

/** One of Make these 3, as picked, and whether it was marked as made. */
export interface DemandPick {
  rank: number;
  /** 'YYYY-MM': the month it was picked for, what Mark as made keeps it with. */
  month: string;
  idea: PickedIdea;
  made: boolean;
}

export interface FreeTeaser {
  trends: number;
  topics: number;
  questions: number;
  content: number;
  ideas: number;
  bestMonths: number;
}

export interface DemandPageData {
  /** Programs Demand covers (those with a key), and the names of any it cannot cover yet. */
  programs: DemandProgram[];
  uncovered: string[];
  /** Paid and Client: everything the page shows. */
  signals: DemandSignals | null;
  /** This month's 3 (Free: the first), newest picks first. */
  picks: { month: string; items: DemandPick[] } | null;
  /** Paid and Client, once there is a last month: how its 3 went. */
  last: { month: string; made: number; total: number; stillRising: string[] } | null;
  /** The ideas marked as made, by 'YYYY-MM:<brief>'. */
  made: ReadonlySet<string>;
  free: { highlight: Highlight | null; teaser: FreeTeaser } | null;
}

/** What a mark of an idea is about, the same way Home names it: '2026-09:<brief>'. */
export const ideaMarkKey = (month: string, text: string) => `${month}:${text}`;

/** One rising trend, for every plan: Free's Free program, or the top across Paid and Client programs; from the state when the city has too little. */
export const loadHighlight = cache(async (institutionId: string): Promise<Highlight | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('demand_highlight', { p_institution: institutionId });
  if (error) throw new Error(`Could not load the rising trend: ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  return {
    text: row.text,
    changePct: row.change_pct === null ? null : Number(row.change_pct),
    count: row.count ?? null,
    countSource: row.count === null ? null : (row.count_source ?? null),
    sourceUrl: row.source_url,
    foundAt: row.found_at,
    programName: row.program_name,
    region: row.region,
    month: row.month.slice(0, 7),
  };
});

/** The programs Demand covers: every active program with a key. */
async function coveredPrograms(institutionId: string): Promise<{ covered: DemandProgram[]; uncovered: string[]; names: string[] }> {
  const all = (await loadPrograms(institutionId)).filter((program) => !program.archived);
  return {
    covered: all.flatMap((program) => (program.programKey ? [{ id: program.id, name: program.name, programKey: program.programKey }] : [])),
    uncovered: all.filter((program) => !program.programKey).map((program) => program.name),
    names: all.map((program) => program.name),
  };
}

/** Paid and Client: each program's pull (the city's, or the state's filling in) and what the page shows. Null on Free, which reads no pulls. */
export const loadDemandSignals = cache(async (viewer: InstitutionViewer): Promise<DemandSignals | null> => {
  if (viewer.tier === 'free') return null;
  const institution = viewer.membership.institution;
  const { covered, names } = await coveredPrograms(institution.id);
  if (covered.length === 0) return demandSignals([], names);
  const supabase = await createClient();
  const regions = regionsFor(institution);
  const [city, state] = await Promise.all([latestDemandRows(supabase, regions.city, covered), latestDemandRows(supabase, regions.state, covered)]);
  return demandSignals(programSources(covered, { region: regions.city.region, ...city }, { region: regions.state.region, ...state }), names);
});

/** The content ideas for the institution's city, across its programs, ranked as version 1 ranked them (Home's things until it shows Make these 3). */
export async function loadCityIdeas(viewer: InstitutionViewer): Promise<IdeaRow[]> {
  const institution = viewer.membership.institution;
  const { covered } = await coveredPrograms(institution.id);
  const { rows } = await latestDemandRows(await createClient(), regionsFor(institution).city, covered);
  return demandView(rows, { singleProgram: covered.length === 1, skills: institution.type === 'skilling' }).ideas;
}

/** How Home's rising trend got here, month by month, in the institution's city. Paid and Client (row level security). */
export async function loadHighlightHistory(viewer: InstitutionViewer, highlight: Highlight | null): Promise<TopicMonth[]> {
  if (!highlight || viewer.tier === 'free') return [];
  const institution = viewer.membership.institution;
  const program = (await loadPrograms(institution.id)).find((entry) => !entry.archived && entry.programKey && entry.name === highlight.programName);
  if (!program?.programKey) return [];
  const regions = regionsFor(institution);
  const region = highlight.region === regions.state.region && highlight.region !== institution.city ? regions.state : regions.city;
  return loadTopicHistory(region, { programKey: program.programKey, kind: 'rising', text: highlight.text });
}

/** How a trend got here: its count in each of the last months' pulls. Paid and Client (row level security). */
export async function loadTopicHistory(region: DemandRegion, topic: Pick<DemandRow, 'programKey' | 'kind' | 'text'>): Promise<TopicMonth[]> {
  return topicHistory(await createClient(), region, topic, DEMAND_RULES.historyMonths);
}

/** The latest two months of Make these 3 the viewer may read (Free: the first of each), and the ideas marked as made. */
async function loadPicks(institutionId: string): Promise<{ months: Map<string, Array<{ rank: number; idea: PickedIdea }>>; made: Set<string> }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('content_picks').select('month, rank, idea').eq('institution_id', institutionId).order('month', { ascending: false }).order('rank').limit(DEMAND_RULES.picks * 2);
  if (error) throw new Error(`Could not load Make these 3: ${error.message}`);
  const months = new Map<string, Array<{ rank: number; idea: PickedIdea }>>();
  for (const row of data ?? []) {
    const idea = parsePickedIdea(row.idea);
    if (!idea) continue;
    const month = row.month.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), { rank: row.rank, idea }]);
  }
  const marks = await supabase.from('done_marks').select('thing, month').eq('institution_id', institutionId).not('thing', 'is', null);
  if (marks.error) throw new Error(`Could not load what was marked as made: ${marks.error.message}`);
  const made = new Set((marks.data ?? []).flatMap((mark) => (mark.thing && mark.month ? [ideaMarkKey(mark.month.slice(0, 7), mark.thing)] : [])));
  return { months, made };
}

export async function loadDemandPage(viewer: InstitutionViewer): Promise<DemandPageData> {
  const institution = viewer.membership.institution;
  const [{ covered, uncovered }, { months, made }] = await Promise.all([coveredPrograms(institution.id), loadPicks(institution.id)]);
  const [latest] = [...months.keys()].sort().reverse();
  const picks = latest
    ? { month: latest, items: (months.get(latest) ?? []).map((pick) => ({ ...pick, month: latest, made: made.has(ideaMarkKey(latest, pick.idea.text)) })) }
    : null;

  if (viewer.tier === 'free') {
    const supabase = await createClient();
    const [highlight, teaser] = await Promise.all([loadHighlight(institution.id), supabase.rpc('demand_teaser', { p_institution: institution.id })]);
    if (teaser.error) throw new Error(`Could not load Demand counts: ${teaser.error.message}`);
    const counts = (teaser.data ?? {}) as Partial<Record<'trends' | 'topics' | 'questions' | 'content' | 'ideas' | 'best_months', number>>;
    return {
      programs: covered.filter((program) => program.id === viewer.plan?.freeProgramId),
      uncovered,
      signals: null,
      picks,
      last: null,
      made,
      free: {
        highlight,
        teaser: {
          trends: counts.trends ?? 0,
          topics: counts.topics ?? 0,
          questions: counts.questions ?? 0,
          content: counts.content ?? 0,
          ideas: counts.ideas ?? 0,
          bestMonths: counts.best_months ?? 0,
        },
      },
    };
  }

  const signals = await loadDemandSignals(viewer);
  const before = latest ? previousMonth(latest) : null;
  const lastPicks = before ? months.get(before) : undefined;
  const last =
    before && lastPicks?.length && signals
      ? { month: before, ...lastMonthSummary(lastPicks.map((pick) => pick.idea), (idea) => made.has(ideaMarkKey(before, idea.text)), thisMonth(signals.sources)) }
      : null;
  return { programs: covered, uncovered, signals, picks, last, made, free: null };
}

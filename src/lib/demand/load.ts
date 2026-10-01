// Loads what the Demand screens need, as the signed-in user: row level security decides what
// comes back. Free gets its one rising trend and the counts for the unlock card; Paid and
// Client get their own city, state and All India, for their own programs, and the grouped
// mentions of themselves and their rivals. Nothing here widens what the database returns.

import { cache } from 'react';
import { DEMAND_RULES } from '@/config/demand';
import { latestDemandRows, topicHistory, type TopicMonth } from '@/demand/read';
import { demandView, type DemandRow, type IdeaRow } from '@/demand/view';
import { regionsFor, type DemandRegion } from '@/demand/regions';
import type { DemandScope, Sentiment } from '@/domain/types';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadPrograms } from '@/lib/audit/load';
import { createClient } from '@/lib/supabase/server';

export interface DemandProgram {
  id: string;
  name: string;
  programKey: string;
}

export interface Highlight {
  text: string;
  changePct: number | null;
  count: number;
  sourceUrl: string;
  foundAt: string;
  programName: string;
  region: string;
  month: string;
}

export interface MentionRow {
  institutionId: string;
  sentiment: Sentiment;
  text: string;
  count: number;
  sourceUrl: string;
  foundAt: string;
}

export interface FreeDemand {
  highlight: Highlight | null;
  teaser: { questions: number; worries: number; newWorries: number; ideas: number; trends: number };
}

export interface DemandPageData {
  /** Programs Demand covers (those with a key), and the names of any it cannot cover yet. */
  programs: DemandProgram[];
  uncovered: string[];
  region: DemandRegion;
  /** Paid and Client: the grouped items for the chosen region and every covered program. */
  rows: DemandRow[];
  pulledAt: string | null;
  mentions: MentionRow[];
  free: FreeDemand | null;
}

/** One rising trend, for every plan: Free's Free program, or the top across Paid and Client programs. */
export const loadHighlight = cache(async (institutionId: string): Promise<Highlight | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('demand_highlight', { p_institution: institutionId });
  if (error) throw new Error(`Could not load the rising trend: ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  return {
    text: row.text,
    changePct: row.change_pct === null ? null : Number(row.change_pct),
    count: row.count,
    sourceUrl: row.source_url,
    foundAt: row.found_at,
    programName: row.program_name,
    region: row.region,
    month: row.month.slice(0, 7),
  };
});

async function loadRows(region: DemandRegion, programs: readonly DemandProgram[]): Promise<{ rows: DemandRow[]; pulledAt: string | null }> {
  return latestDemandRows(await createClient(), region, programs);
}

/** The content ideas for the institution's city, across its programs, ranked as the Demand page ranks them. */
export async function loadCityIdeas(viewer: InstitutionViewer): Promise<IdeaRow[]> {
  const institution = viewer.membership.institution;
  const programs = (await loadPrograms(institution.id)).flatMap((program) =>
    !program.archived && program.programKey ? [{ id: program.id, name: program.name, programKey: program.programKey }] : [],
  );
  const { rows } = await loadRows(regionsFor(institution).city, programs);
  return demandView(rows, { singleProgram: programs.length === 1, skills: institution.type === 'skilling' }).ideas;
}

/** How Home's rising trend got here, month by month, in the institution's city. Paid and Client (row level security). */
export async function loadHighlightHistory(viewer: InstitutionViewer, highlight: Highlight | null): Promise<TopicMonth[]> {
  if (!highlight || viewer.tier === 'free') return [];
  const institution = viewer.membership.institution;
  const program = (await loadPrograms(institution.id)).find((entry) => !entry.archived && entry.programKey && entry.name === highlight.programName);
  if (!program?.programKey) return [];
  return loadTopicHistory(regionsFor(institution).city, { programKey: program.programKey, kind: 'rising', text: highlight.text });
}

/** How the fastest rise got here: its count in each of the last months' pulls. Paid and Client (row level security). */
export async function loadTopicHistory(region: DemandRegion, topic: Pick<DemandRow, 'programKey' | 'kind' | 'text'>): Promise<TopicMonth[]> {
  return topicHistory(await createClient(), region, topic, DEMAND_RULES.historyMonths);
}

async function loadMentions(institutionId: string): Promise<MentionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('demand_mentions', { p_institution: institutionId });
  if (error) throw new Error(`Could not load mentions: ${error.message}`);
  return (data ?? []).map((row) => ({
    institutionId: row.institution_id,
    sentiment: row.sentiment,
    text: row.text,
    count: row.count,
    sourceUrl: row.source_url,
    foundAt: row.found_at,
  }));
}

export async function loadDemandPage(viewer: InstitutionViewer, scope: DemandScope): Promise<DemandPageData> {
  const institution = viewer.membership.institution;
  const all = (await loadPrograms(institution.id)).filter((program) => !program.archived);
  const covered = all.flatMap((program) => (program.programKey ? [{ id: program.id, name: program.name, programKey: program.programKey }] : []));
  const uncovered = all.filter((program) => !program.programKey).map((program) => program.name);
  const regions = regionsFor(institution);

  if (viewer.tier === 'free') {
    const supabase = await createClient();
    const [highlight, teaser] = await Promise.all([loadHighlight(institution.id), supabase.rpc('demand_teaser', { p_institution: institution.id })]);
    if (teaser.error) throw new Error(`Could not load Demand counts: ${teaser.error.message}`);
    const counts = (teaser.data ?? {}) as { questions?: number; worries?: number; new_worries?: number; ideas?: number; trends?: number };
    const freeProgram = covered.filter((program) => program.id === viewer.plan?.freeProgramId);
    return {
      programs: freeProgram,
      uncovered,
      region: regions.city,
      rows: [],
      pulledAt: null,
      mentions: [],
      free: {
        highlight,
        teaser: {
          questions: counts.questions ?? 0,
          worries: counts.worries ?? 0,
          newWorries: counts.new_worries ?? 0,
          ideas: counts.ideas ?? 0,
          trends: counts.trends ?? 0,
        },
      },
    };
  }

  const region = regions[scope];
  const [{ rows, pulledAt }, mentions] = await Promise.all([loadRows(region, covered), loadMentions(institution.id)]);
  return { programs: covered, uncovered, region, rows, pulledAt, mentions, free: null };
}

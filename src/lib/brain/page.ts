// Loads one Client's Brain for its page, as the signed-in person (row level security decides what
// shows: the team sees what Drishti pre-filled and its own notes; the college sees neither):
// the facts, how complete it is, what needs checking, recent changes in words, the work log for
// Content, and, for the team, its Team only notes.

import { cache } from 'react';
import { askFacts, type AskFact, type BrainAnswer } from '@/brain/ask';
import { blueprintStale, latestBlueprint, readableBlueprint, type BlueprintVersion } from '@/brain/blueprint';
import { describeItem } from '@/brain/facts';
import { changeLines, type ChangeLine, type Person } from '@/brain/history';
import { loadBrain, loadBrainPeople, loadBrainStatus, loadChanges } from '@/brain/load';
import type { Brain } from '@/brain/model';
import { brainProgress, readiness, type Progress } from '@/brain/progress';
import { needsChecking, seasonAhead, type StaleFact } from '@/brain/stale';
import { BRAIN_RULES } from '@/config/brain';
import { getAnalysisProvider } from '@/providers/registry';
import { createClient } from '@/lib/supabase/server';
import type { WorkEntry } from '@/team/work';

export interface TeamNote {
  id: string;
  body: string;
  at: string;
  who: string;
}

export interface BrainPage {
  brain: Brain;
  progress: Progress;
  ready: { ready: boolean; facts: number; steps: number };
  stale: StaleFact[];
  season: string | null;
  recent: ChangeLine[];
  people: ReadonlyMap<string, Person>;
  work: WorkEntry[];
  teamNotes: TeamNote[];
  /** The Blueprint's versions this person sees, newest first (the college: Shared and Approved only). */
  blueprints: BlueprintVersion[];
}

export const loadBrainStatusFor = cache(async (institutionId: string) => loadBrainStatus(await createClient(), institutionId));

export const loadBrainPage = cache(async (institutionId: string, team: boolean): Promise<BrainPage | null> => {
  const supabase = await createClient();
  const brain = await loadBrain(supabase, institutionId);
  if (!brain) return null;
  const now = new Date();
  const [people, changes, work, notes, blueprints] = await Promise.all([
    loadBrainPeople(supabase, institutionId),
    loadChanges(supabase, institutionId, { limit: 40 }),
    supabase.from('team_work').select('id, kind, body, work_on, link').eq('institution_id', institutionId).order('work_on', { ascending: false }).limit(20),
    team ? supabase.from('notes').select('id, body, created_at, author_id').eq('institution_id', institutionId).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    supabase
      .from('brain_blueprints')
      .select('id, version, file_name, size_bytes, status, uploaded_at, uploaded_by, shared_at, shared_by, approved_at, approved_by, changes_note, changes_at, changes_by, text')
      .eq('institution_id', institutionId)
      .order('version', { ascending: false }),
  ]);
  const versions: BlueprintVersion[] = (blueprints.data ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    status: row.status,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    sharedAt: row.shared_at,
    sharedBy: row.shared_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    changesNote: row.changes_note,
    changesAt: row.changes_at,
    changesBy: row.changes_by,
    text: row.text,
  }));
  // The Blueprint needs a fresh version once its latest is older than its check time (90 days).
  const latest = latestBlueprint(versions);
  const stale = needsChecking(brain, now);
  if (latest && blueprintStale(latest, now)) {
    stale.push({ key: 'blueprint', section: 'blueprint', label: `Blueprint, version ${latest.version}`, value: latest.fileName, checkedAt: latest.uploadedAt, kind: 'other' });
  }
  const context = { people, programs: brain.programs, institutionType: brain.institution.type };
  const recent = changes
    .filter((row) => team || !row.teamOnly)
    .flatMap((row) => changeLines(row, context))
    .slice(0, BRAIN_RULES.recentShown);
  const authors = team ? await supabase.rpc('team_people') : { data: [] };
  const names = new Map((authors.data ?? []).flatMap((person) => (person.user_id ? [[person.user_id, person.name ?? person.email] as const] : [])));
  return {
    brain,
    progress: brainProgress(brain),
    ready: readiness(brain),
    stale,
    season: seasonAhead(brain, now),
    recent,
    people,
    work: (work.data ?? []).map((row) => ({ id: row.id, kind: row.kind, text: row.body, on: row.work_on, link: row.link })),
    teamNotes: (notes.data ?? []).map((note) => ({ id: note.id, body: note.body, at: note.created_at, who: (note.author_id ? names.get(note.author_id) : null) ?? 'AdmitLabs team' })),
    blueprints: versions,
  };
});

/** One fact's history, in words, newest first. */
export async function loadFactHistory(page: BrainPage, target: string, team: boolean): Promise<ChangeLine[]> {
  const supabase = await createClient();
  const rows = await loadChanges(supabase, page.brain.institution.id, { target, limit: BRAIN_RULES.historyShown });
  const context = { people: page.people, programs: page.brain.programs, institutionType: page.brain.institution.type };
  return rows.filter((row) => team || !row.teamOnly).flatMap((row) => changeLines(row, context));
}

/** Ask the brain: the facts that answer, through the AI provider (the mock in this build). */
export async function askBrain(page: BrainPage, question: string, team: boolean): Promise<{ question: string; answer: BrainAnswer; facts: readonly AskFact[] }> {
  // The Blueprint's words: the latest Shared or Approved version, the one the college sees too.
  const facts = askFacts(page.brain, team ? page.teamNotes.map((note) => ({ id: note.id, body: note.body })) : [], readableBlueprint(page.blueprints));
  const answer = await getAnalysisProvider().answerBrain({ question, facts: facts.filter((fact) => team || !fact.teamOnly) });
  return { question, answer, facts };
}

/** What a fact's History panel is called. */
export function historyTitle(page: BrainPage, target: string): string {
  if (target === 'about') return 'About the college';
  if (target.startsWith('program:')) return page.brain.programs.find((program) => target === `program:${program.id}`)?.name ?? 'Program';
  const item = page.brain.items.find((entry) => target === `item:${entry.id}`);
  return item ? describeItem(item, page.brain.programs).label : 'History';
}

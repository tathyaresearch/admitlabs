// What the Demand page shows, built from the grouped items the viewer may read (row level
// security applies when they are loaded). Pure. "All programs" merges every program's pull:
// trends and questions ranked together, the usual five worries added up across programs, and
// the content ideas built on the most asked questions.

import type { DemandKind, Language } from '../domain/types.ts';
import type { WorryTheme } from '../sample/demand.ts';
import type { SeasonStage, SeasonStageKey } from './season.ts';

export interface DemandRow {
  id: string;
  programKey: string;
  programName: string;
  /** The pull's month, 'YYYY-MM'. */
  month: string;
  kind: DemandKind;
  text: string;
  language: Language;
  count: number;
  changePct: number | null;
  rank: number | null;
  sourceUrl: string;
  foundAt: string;
  meta: Readonly<Record<string, unknown>>;
}

export interface WorryRow {
  key: string;
  text: string;
  theme: WorryTheme;
  count: number;
  isNew: boolean;
  /** The programs it was raised for. */
  programs: string[];
  sourceUrl: string;
}

export interface IdeaRow {
  key: string;
  text: string;
  programName: string;
  /** The real student question the idea is built on. */
  question: DemandRow | null;
  sourceUrl: string;
}

export interface DemandView {
  /** The newest month shown, 'YYYY-MM'. */
  month: string | null;
  topTrend: DemandRow | null;
  rising: DemandRow[];
  falling: DemandRow[];
  questions: DemandRow[];
  worries: WorryRow[];
  ideas: IdeaRow[];
  season: SeasonStage[];
  /** The two usual worries raised most, for the band's sentence. */
  asksMost: WorryTheme[];
  platforms: string[];
  languages: Language[];
}

const byText = (a: { text: string }, b: { text: string }) => a.text.localeCompare(b.text);

function worries(rows: readonly DemandRow[]): WorryRow[] {
  const known = new Map<WorryTheme, WorryRow>();
  const biggest = new Map<WorryTheme, number>();
  const fresh: WorryRow[] = [];
  for (const row of rows) {
    const theme = (typeof row.meta.theme === 'string' ? row.meta.theme : 'new') as WorryTheme;
    if (theme === 'new' || row.meta.isNew === true) {
      fresh.push({ key: row.id, text: row.text, theme: 'new', count: row.count, isNew: true, programs: [row.programName], sourceUrl: row.sourceUrl });
      continue;
    }
    const entry = known.get(theme) ?? { key: theme, text: row.text, theme, count: 0, isNew: false, programs: [], sourceUrl: row.sourceUrl };
    entry.count += row.count;
    if (!entry.programs.includes(row.programName)) entry.programs.push(row.programName);
    // The source shown is the one from the program where the worry was raised most.
    if (row.count > (biggest.get(theme) ?? -1)) {
      entry.sourceUrl = row.sourceUrl;
      biggest.set(theme, row.count);
    }
    known.set(theme, entry);
  }
  return [...known.values(), ...fresh].sort((a, b) => b.count - a.count || byText(a, b));
}

function ideas(rows: readonly DemandRow[], questions: readonly DemandRow[], singleProgram: boolean): IdeaRow[] {
  const all = rows
    .filter((row) => row.kind === 'idea')
    .map((row): IdeaRow => {
      const basedOn = typeof row.meta.basedOn === 'string' ? row.meta.basedOn : null;
      const question = questions.find((candidate) => candidate.programKey === row.programKey && candidate.text === basedOn) ?? null;
      return { key: row.id, text: row.text, programName: row.programName, question, sourceUrl: row.sourceUrl };
    });
  if (singleProgram) {
    const rank = new Map(rows.filter((row) => row.kind === 'idea').map((row) => [row.id, row.rank ?? 99]));
    return all.sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
  }
  // Across programs: the ideas built on the most asked questions first.
  return all.sort((a, b) => (b.question?.count ?? -1) - (a.question?.count ?? -1) || byText(a, b));
}

function season(rows: readonly DemandRow[], skills: boolean): SeasonStage[] {
  const byPull = new Map<string, SeasonStage[]>();
  for (const row of rows) {
    if (row.kind !== 'season') continue;
    const stage = row.meta.stage;
    const from = row.meta.from;
    const to = row.meta.to;
    if (typeof stage !== 'string' || typeof from !== 'string' || typeof to !== 'string') continue;
    const list = byPull.get(row.programKey) ?? [];
    list.push({ stage: stage as SeasonStageKey, text: row.text, from, to });
    byPull.set(row.programKey, list);
  }
  const calendars = [...byPull.values()];
  const matching = calendars.find((stages) => stages.some((stage) => stage.stage === 'batches') === skills);
  return matching ?? calendars[0] ?? [];
}

/**
 * The page for one program, or for all of them together. `skills` picks the calendar for the
 * season clock when programs differ: rolling batches for a skilling institute, the board exam
 * year otherwise.
 */
export function demandView(rows: readonly DemandRow[], options: { singleProgram: boolean; skills: boolean }): DemandView {
  const of = (kind: DemandKind) => rows.filter((row) => row.kind === kind);
  const rising = of('rising').sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0) || b.count - a.count || byText(a, b));
  const falling = of('falling').sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0) || b.count - a.count || byText(a, b));
  const questions = of('question').sort((a, b) => b.count - a.count || byText(a, b));
  const worryRows = worries(of('worry'));
  const months = rows.map((row) => row.month).sort();
  const listed = rows.filter((row) => row.kind !== 'season' && row.kind !== 'idea');
  return {
    month: months[months.length - 1] ?? null,
    topTrend: rising[0] ?? null,
    rising,
    falling,
    questions,
    worries: worryRows,
    ideas: ideas(rows, questions, options.singleProgram),
    season: season(rows, options.skills),
    asksMost: worryRows.filter((row) => row.theme !== 'new').slice(0, 2).map((row) => row.theme),
    platforms: [...new Set(listed.flatMap((row) => (typeof row.meta.platform === 'string' ? [row.meta.platform] : [])))].sort(),
    languages: [...new Set(of('question').map((row) => row.language))].sort(),
  };
}

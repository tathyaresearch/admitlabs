// Needs checking (spec section 26): a fact the college may have changed since anyone looked at
// it. Fees and dates after 6 months, everything else after 12 [ADJUSTABLE]; "Still right"
// starts the clock again. Notes, decisions, scripts and what worked are a record, never stale.
// In the weeks before admissions open, the facts to check move to the top. Pure.

import { BRAIN_RULES } from '../config/brain.ts';
import { aboutRows, describeItem, programRows, shortValue } from './facts.ts';
import { sectionOf, type AnyBrainItem, type Brain, type BrainKind, type BrainSection } from './model.ts';

export type CheckKind = keyof typeof BRAIN_RULES.checkMonths;

export interface StaleFact {
  /** 'item:<id>' for a Brain fact, or a detail fact ('about', 'program:<id>:fees'). */
  key: string;
  section: BrainSection;
  label: string;
  value: string;
  checkedAt: string;
  kind: CheckKind;
}

/** Kinds that go out of date, and how fast. */
const ITEM_CHECK: Partial<Record<BrainKind, CheckKind>> = {
  contact: 'other',
  talk: 'other',
  goals: 'other',
  target: 'other',
  rivals: 'other',
  regions: 'other',
  logo: 'other',
  colours: 'other',
  fonts: 'other',
  tagline: 'other',
  tone: 'other',
  avoid: 'other',
  dos: 'other',
  guidelines: 'other',
  award: 'other',
  placement_list: 'other',
  link: 'other',
};

function itemCheckKind(item: AnyBrainItem): CheckKind | null {
  if (item.kind === 'date') return item.fields.type === 'season' ? 'dates' : null;
  return ITEM_CHECK[item.kind] ?? null;
}

/** `checkedAt` plus the months its kind allows, has passed. */
export function isStale(checkedAt: string, kind: CheckKind, now: Date): boolean {
  const due = new Date(checkedAt);
  due.setUTCMonth(due.getUTCMonth() + BRAIN_RULES.checkMonths[kind]);
  return due.getTime() <= now.getTime();
}

export function needsChecking(brain: Pick<Brain, 'items' | 'details' | 'programs' | 'checks' | 'institution'>, now: Date): StaleFact[] {
  const stale: StaleFact[] = [];
  for (const item of brain.items) {
    if (item.toConfirm || item.kind === 'skip') continue;
    const kind = itemCheckKind(item);
    if (!kind || !isStale(item.checkedAt, kind, now)) continue;
    const view = describeItem(item, brain.programs);
    stale.push({ key: `item:${item.id}`, section: sectionOf(item), label: view.label, value: shortValue(view), checkedAt: item.checkedAt, kind });
  }
  const about = aboutRows(brain.details, brain.institution.type).filter((row) => row.value);
  const aboutChecked = brain.checks.get('about');
  if (about.length && aboutChecked && isStale(aboutChecked.at, 'other', now)) {
    stale.push({ key: 'about', section: 'basics', label: 'About the college', value: about.map((row) => row.value).join('. '), checkedAt: aboutChecked.at, kind: 'other' });
  }
  for (const program of brain.programs) {
    const rows = programRows(program.details);
    const groups: Array<{ group: 'fees' | 'dates' | 'details'; kind: CheckKind; label: string; value: string | null }> = [
      { group: 'fees', kind: 'fees', label: `${program.name} fees`, value: rows.find((row) => row.key === 'fees')?.value ?? null },
      { group: 'dates', kind: 'dates', label: `${program.name} admission dates`, value: rows.find((row) => row.key === 'dates')?.value ?? null },
      {
        group: 'details',
        kind: 'other',
        label: `${program.name} details`,
        value: rows
          .filter((row) => row.key !== 'fees' && row.key !== 'dates' && row.value)
          .map((row) => row.value)
          .join(', ') || null,
      },
    ];
    for (const entry of groups) {
      const key = `program:${program.id}:${entry.group}`;
      const checked = brain.checks.get(key);
      if (!entry.value || !checked || !isStale(checked.at, entry.kind, now)) continue;
      stale.push({ key, section: 'programs', label: entry.label, value: entry.value, checkedAt: checked.at, kind: entry.kind });
    }
  }
  // Fees and dates first, then the oldest.
  const order: Record<CheckKind, number> = { fees: 0, dates: 1, other: 2 };
  return stale.sort((a, b) => order[a.kind] - order[b.kind] || a.checkedAt.localeCompare(b.checkedAt));
}

/** India's calendar day of `now`, as 'YYYY-MM-DD'. */
function today(now: Date): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** When admissions open next: the soonest start of an admission season or of a program's applications, from today on. */
export function nextAdmissions(brain: Pick<Brain, 'items' | 'programs'>, now: Date): string | null {
  const from = today(now);
  const days = [
    ...brain.items.flatMap((item) => (item.kind === 'date' && !item.toConfirm && item.fields.type === 'season' ? [item.fields.from] : [])),
    ...brain.programs.flatMap((program) => (program.details.applicationsOpen ? [program.details.applicationsOpen] : [])),
  ].filter((day) => day >= from);
  return days.sort()[0] ?? null;
}

/** The day admissions open when it is within the weeks before them [ADJUSTABLE], or null. */
export function seasonAhead(brain: Pick<Brain, 'items' | 'programs'>, now: Date): string | null {
  const opens = nextAdmissions(brain, now);
  if (!opens) return null;
  const weeks = (Date.parse(`${opens}T00:00:00+05:30`) - now.getTime()) / (7 * 86_400_000);
  return weeks <= BRAIN_RULES.seasonWeeks ? opens : null;
}

/** The fact key a "Still right" on a program's fact group stands for. */
export const programFact = (programId: string, group: 'fees' | 'dates' | 'details') => `program:${programId}:${group}`;

// The season clock (spec 9.4): where we are in the admission year. Degree programs follow the
// board exam year; skilling courses run in rolling batches. Pure.

import { istParts } from '../domain/dates.ts';
import { formatMonthShort } from '../domain/format.ts';

export type SeasonStageKey = 'classes' | 'exams' | 'results' | 'counselling' | 'batches';

export interface SeasonStage {
  stage: SeasonStageKey;
  text: string;
  /** India dates, 'YYYY-MM-DD'. */
  from: string;
  to: string;
}

export const STAGE_LABELS: Readonly<Record<SeasonStageKey, string>> = {
  classes: 'Classes',
  exams: 'Board exams',
  results: 'Results',
  counselling: 'Counselling',
  batches: 'New batches',
};

export interface SeasonMonth {
  /** 'YYYY-MM'. */
  key: string;
  label: string;
  stages: SeasonStageKey[];
  current: boolean;
  /** Part of the stage running now, part of a later one, or neither. */
  phase: 'now' | 'later' | 'none';
}

export interface SeasonClock {
  /** The stage the admission year is in today, or null in a quiet stretch. */
  now: SeasonStage | null;
  /** The next stage to start. */
  next: SeasonStage | null;
  /** The months ahead, from this one, with the stages each overlaps. */
  months: SeasonMonth[];
}

const pad = (value: number) => String(value).padStart(2, '0');

function today(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addMonths(key: string, count: number): string {
  const [year, month] = key.split('-').map(Number) as [number, number];
  const index = year * 12 + (month - 1) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export function seasonClock(stages: readonly SeasonStage[], on: Date, span = 12): SeasonClock {
  const day = today(on);
  const sorted = [...stages].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  const now = [...sorted].reverse().find((stage) => stage.from <= day && day <= stage.to) ?? null;
  const next = sorted.find((stage) => stage.from > day && stage !== now) ?? null;
  const first = day.slice(0, 7);
  const months = Array.from({ length: span }, (_, index): SeasonMonth => {
    const key = addMonths(first, index);
    const start = `${key}-01`;
    const end = `${key}-31`;
    const overlapping = sorted.filter((stage) => stage.from <= end && stage.to >= start);
    const inNow = now !== null && overlapping.includes(now);
    return {
      key,
      label: formatMonthShort(key),
      stages: overlapping.map((stage) => stage.stage),
      current: index === 0,
      phase: inNow ? 'now' : overlapping.length ? 'later' : 'none',
    };
  });
  return { now, next, months };
}

/** "Feb to Mar 2027", "May 2027", "Aug 2026 to Jan 2027". */
export function stageWhen(stage: Pick<SeasonStage, 'from' | 'to'>): string {
  const [fromYear, fromMonth] = [stage.from.slice(0, 4), stage.from.slice(0, 7)];
  const [toYear, toMonth] = [stage.to.slice(0, 4), stage.to.slice(0, 7)];
  if (fromMonth === toMonth) return `${formatMonthShort(fromMonth)} ${fromYear}`;
  if (fromYear === toYear) return `${formatMonthShort(fromMonth)} to ${formatMonthShort(toMonth)} ${toYear}`;
  return `${formatMonthShort(fromMonth)} ${fromYear} to ${formatMonthShort(toMonth)} ${toYear}`;
}

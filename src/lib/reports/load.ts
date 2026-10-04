// Loads the monthly reports with their summaries, as the signed-in user: row level security returns
// only this institution's approved reports, to its members. Past reports stay after a Paid plan ends.

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { parseSummary, type MonthlySummary } from '@/report/summary';

export interface ReportRow {
  /** 'YYYY-MM'. */
  month: string;
  madeAt: string;
  pages: number | null;
  sizeBytes: number | null;
  /** The month's summary, as the team approved it. Null on a report made before summaries. */
  summary: MonthlySummary | null;
}

export const loadReports = cache(async (institutionId: string): Promise<ReportRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reports')
    .select('month, created_at, pages, size_bytes, summary')
    .eq('institution_id', institutionId)
    .order('month', { ascending: false });
  if (error) throw new Error(`Could not load reports: ${error.message}`);
  return (data ?? []).map((row) => ({ month: row.month.slice(0, 7), madeAt: row.created_at, pages: row.pages, sizeBytes: row.size_bytes, summary: parseSummary(row.summary) }));
});

/** "7 pages", "68 KB". */
export function reportFacts(report: ReportRow): string[] {
  const facts: string[] = [];
  if (report.pages) facts.push(`${report.pages} ${report.pages === 1 ? 'page' : 'pages'}`);
  if (report.sizeBytes) facts.push(report.sizeBytes >= 1_000_000 ? `${(report.sizeBytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(report.sizeBytes / 1000))} KB`);
  return facts;
}

// Makes the monthly report, on the server with the service key: read what was known at the end
// of the month, build the snapshot, render the PDF, keep it in the private reports bucket and
// record it (with "Your September report is ready."). The one path for the schedule, the
// script and the seed. Only Paid and Client get new reports; the plan is checked here, on the
// server, on the day the report is made.

import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKey } from '../domain/dates.ts';
import { formatMonth } from '../domain/format.ts';
import { effectiveTier, type PlanRecord } from '../domain/tiers.ts';
import type { Database } from '../lib/supabase/database.types.ts';
import { buildReport, type ReportData } from './data.ts';
import { loadReportInput } from './load.ts';
import { MAX_PAGES, pageCount, renderReport } from './pdf/render.ts';
import { isReportDue, monthEnd, reportMonth, reportPath } from './schedule.ts';

type Db = SupabaseClient<Database>;

export const REPORTS_BUCKET = 'reports';

export class ReportJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportJobError';
  }
}

function planRecord(row: { tier: PlanRecord['tier']; starts_at: string; ends_at: string | null } | null): PlanRecord | null {
  return row ? { tier: row.tier, startsAt: new Date(row.starts_at), endsAt: row.ends_at ? new Date(row.ends_at) : null } : null;
}

/** "Your September report is ready." */
export function reportNotice(month: string): string {
  return `Your ${formatMonth(month).split(' ')[0]} report is ready.`;
}

export interface MadeReport {
  path: string;
  pages: number;
  size: number;
  data: ReportData;
  pdf: Buffer;
}

/** Builds and renders a report without saving it (for a preview). */
export async function renderMonth(db: Db, institutionId: string, month: string, madeAt: Date): Promise<Omit<MadeReport, 'path'>> {
  const plan = await db.from('plans').select('tier, starts_at, ends_at').eq('institution_id', institutionId).maybeSingle();
  if (plan.error) throw new ReportJobError(`Could not read the plan: ${plan.error.message}`);
  const tier = effectiveTier(planRecord(plan.data), madeAt);
  if (tier === 'free') throw new ReportJobError('Monthly reports are for Paid and Client. This institution is on Free.');

  const input = await loadReportInput(db, institutionId, month, madeAt, tier);
  if (!input) throw new ReportJobError(`There is no Audit on or before the end of ${formatMonth(month)} to report on.`);
  const data = buildReport(input);
  const pdf = await renderReport(data);
  const pages = pageCount(pdf);
  if (pages > MAX_PAGES) throw new ReportJobError(`The report came to ${pages} pages; it must stay at ${MAX_PAGES} or fewer.`);
  return { pages, size: pdf.byteLength, data, pdf };
}

/**
 * Makes the report for `month` and saves it. Making a month again replaces its file and row
 * (no second notice). `notify` adds "Your September report is ready." to Notifications.
 */
export async function makeReport(db: Db, institutionId: string, month: string, madeAt: Date, options: { notify: boolean }): Promise<MadeReport> {
  const made = await renderMonth(db, institutionId, month, madeAt);
  const path = reportPath(institutionId, month);
  const upload = await db.storage.from(REPORTS_BUCKET).upload(path, made.pdf, { contentType: 'application/pdf', upsert: true });
  if (upload.error) throw new ReportJobError(`Could not store the report: ${upload.error.message}`);

  const existing = await db.from('reports').select('id').eq('institution_id', institutionId).eq('month', `${month}-01`).maybeSingle();
  if (existing.error) throw new ReportJobError(`Could not read reports: ${existing.error.message}`);
  const saved = await db.rpc('record_report', {
    p_institution: institutionId,
    p_month: `${month}-01`,
    p_storage_path: path,
    p_pages: made.pages,
    p_size: made.size,
    p_made_at: madeAt.toISOString(),
    p_notice: options.notify && !existing.data ? reportNotice(month) : '',
  });
  if (saved.error) throw new ReportJobError(`Could not record the report: ${saved.error.message}`);
  return { ...made, path };
}

/** Claimed Paid and Client institutions (on `now`) with an Audit for last month and no report for it yet. */
export async function reportsDue(db: Db, now: Date): Promise<{ month: string; due: Array<{ id: string; name: string }> }> {
  const month = reportMonth(now);
  const [plans, status, reports, institutions, audits] = await Promise.all([
    db.from('plans').select('institution_id, tier, starts_at, ends_at'),
    db.from('institution_status').select('institution_id, claimed'),
    db.from('reports').select('institution_id').eq('month', `${month}-01`),
    db.from('institutions').select('id, name'),
    db.from('audits').select('institution_id, run_at').in('kind', ['free', 'paid', 'client']).lt('run_at', monthEnd(month).toISOString()),
  ]);
  for (const result of [plans, status, reports, institutions, audits]) if (result.error) throw new ReportJobError(`Could not read what is due: ${result.error.message}`);

  const claimed = new Set((status.data ?? []).filter((row) => row.claimed).map((row) => row.institution_id));
  const made = new Set((reports.data ?? []).map((row) => row.institution_id));
  const names = new Map((institutions.data ?? []).map((row) => [row.id, row.name]));
  const lastAudit = new Map<string, Date>();
  for (const row of audits.data ?? []) {
    const at = new Date(row.run_at);
    if ((lastAudit.get(row.institution_id)?.getTime() ?? 0) < at.getTime()) lastAudit.set(row.institution_id, at);
  }
  const due = (plans.data ?? [])
    .filter((row) =>
      isReportDue(
        { tier: effectiveTier(planRecord(row), now), claimed: claimed.has(row.institution_id), lastAuditAt: lastAudit.get(row.institution_id) ?? null, hasReport: made.has(row.institution_id) },
        month,
      ),
    )
    .map((row) => ({ id: row.institution_id, name: names.get(row.institution_id) ?? row.institution_id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { month, due };
}

/** Whether a report for `month` may be made by hand on `now`: the month has started. */
export function canMakeYet(month: string, now: Date): boolean {
  return monthKey(now) >= month;
}

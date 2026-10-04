// Makes the monthly report and its summary, on the server with the service key (spec sections 12,
// 24 and 25): read what was known at the end of the month, build the snapshot, render the PDF, keep
// it in the private reports bucket and record it with the summary. With Review first on, the two
// wait in the team's To review list and nothing reaches the college; sent automatically, they are
// approved as they are made, "Your September report is ready." arrives and the summary goes by
// email. Approve and send makes the PDF again with any line the team fixed, then does the same.
// The one path for the schedule, the script, the seed and the team. Only Paid and Client get new
// reports; the plan is checked here, on the server, on the day the report is made.

import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKey } from '../domain/dates.ts';
import { formatMonth, formatMonthName } from '../domain/format.ts';
import { effectiveTier, type PlanRecord } from '../domain/tiers.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { APP_URL } from '../lib/urls.ts';
import { getEmailProvider } from '../providers/registry.ts';
import { buildReport, type ReportData } from './data.ts';
import { loadReportInput } from './load.ts';
import { MAX_PAGES, pageCount, renderReport } from './pdf/render.ts';
import { isReportDue, monthEnd, reportMonth, reportPath } from './schedule.ts';
import { summaryEmail } from './summary-email.ts';
import { parseSummary, summaryLine, SUMMARY_TARGETS, type MonthlySummary, type SummaryTarget } from './summary.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

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

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

/** "Your September report is ready." */
export function reportNotice(month: string): string {
  return `Your ${formatMonthName(month)} report is ready.`;
}

export interface MadeReport {
  path: string;
  pages: number;
  size: number;
  data: ReportData;
  pdf: Buffer;
}

/** Builds and renders a report without saving it (for a preview, and again on approval with the summary as fixed). */
export async function renderMonth(db: Db, institutionId: string, month: string, madeAt: Date, summary: MonthlySummary | null = null): Promise<Omit<MadeReport, 'path'>> {
  const plan = await db.from('plans').select('tier, starts_at, ends_at').eq('institution_id', institutionId).maybeSingle();
  if (plan.error) throw new ReportJobError(`Could not read the plan: ${plan.error.message}`);
  const tier = effectiveTier(planRecord(plan.data), madeAt);
  if (tier === 'free') throw new ReportJobError('Monthly reports are for Paid and Client. This institution is on Free.');

  const input = await loadReportInput(db, institutionId, month, madeAt, tier);
  if (!input) throw new ReportJobError(`There is no Audit on or before the end of ${formatMonth(month)} to report on.`);
  const data = buildReport({ ...input, summary });
  const pdf = await renderReport(data);
  const pages = pageCount(pdf);
  if (pages > MAX_PAGES) throw new ReportJobError(`The report came to ${pages} pages; it must stay at ${MAX_PAGES} or fewer.`);
  return { pages, size: pdf.byteLength, data, pdf };
}

async function upload(db: Db, path: string, pdf: Buffer): Promise<void> {
  const saved = await db.storage.from(REPORTS_BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (saved.error) throw new ReportJobError(`Could not store the report: ${saved.error.message}`);
}

/** The summary by email to the owner and the members who keep it on, each send logged. Returns how many went and how many did not. */
export async function sendSummaryEmails(db: Db, reportId: string, options: { env?: Env; appUrl?: string } = {}): Promise<{ sent: number; failed: number }> {
  const found = await db.from('reports').select('institution_id, month, summary, review').eq('id', reportId).maybeSingle();
  if (found.error) throw new ReportJobError(`Could not read the report: ${found.error.message}`);
  const report = found.data;
  if (!report || report.review !== 'approved') return { sent: 0, failed: 0 };
  const summary = parseSummary(report.summary);
  if (!summary) return { sent: 0, failed: 0 };
  const [institution, recipients] = await Promise.all([
    db.from('institutions').select('name').eq('id', report.institution_id).maybeSingle(),
    db.rpc('summary_recipients', { p_institution: report.institution_id }),
  ]);
  if (institution.error || !institution.data) throw new ReportJobError('Could not read the institution.');
  if (recipients.error) throw new ReportJobError(`Could not read who gets the summary: ${recipients.error.message}`);
  const to = recipients.data ?? [];
  if (to.length === 0) return { sent: 0, failed: 0 };

  const appUrl = options.appUrl ?? APP_URL;
  const email = getEmailProvider(options.env);
  const results = await email.send(summaryEmail({ summary, institution: institution.data.name, dashboardUrl: `${appUrl}/`, pdfUrl: `${appUrl}/reports/${report.month.slice(0, 7)}` }, to));
  const logged = await db
    .from('email_log')
    .insert(results.map((result) => ({ kind: 'monthly_summary' as const, institution_id: report.institution_id, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
  if (logged.error) throw new ReportJobError(`Could not log the summary email: ${logged.error.message}`);
  return { sent: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length };
}

export interface MadeMonth extends MadeReport {
  reportId: string;
  review: 'waiting' | 'approved';
  /** The summary emails, when it went out as it was made. */
  emails: { sent: number; failed: number } | null;
}

/**
 * Makes the report and summary for `month` and saves them. Making a month again replaces its file
 * and row (no second notice). `notify` adds "Your September report is ready." to Notifications
 * once approved; `send: false` keeps the email from going. Leave `review` out to follow the
 * college's Review first setting; the seed passes the state its past months need.
 */
export async function makeReport(
  db: Db,
  institutionId: string,
  month: string,
  madeAt: Date,
  options: { notify: boolean; send?: boolean; review?: 'waiting' | 'approved'; env?: Env; appUrl?: string },
): Promise<MadeMonth> {
  const made = await renderMonth(db, institutionId, month, madeAt);
  const path = reportPath(institutionId, month);
  await upload(db, path, made.pdf);

  const [existing, status] = await Promise.all([
    db.from('reports').select('id').eq('institution_id', institutionId).eq('month', `${month}-01`).maybeSingle(),
    db.from('institution_status').select('review_first').eq('institution_id', institutionId).maybeSingle(),
  ]);
  if (existing.error) throw new ReportJobError(`Could not read reports: ${existing.error.message}`);
  if (status.error) throw new ReportJobError(`Could not read how its reports go out: ${status.error.message}`);
  const review = options.review ?? ((status.data?.review_first ?? true) ? 'waiting' : 'approved');
  const saved = await db.rpc('record_report', {
    p_institution: institutionId,
    p_month: `${month}-01`,
    p_storage_path: path,
    p_pages: made.pages,
    p_size: made.size,
    p_made_at: madeAt.toISOString(),
    p_summary: json(made.data.summary),
    p_review: review,
    p_notice: options.notify && !existing.data ? reportNotice(month) : '',
  });
  if (saved.error || !saved.data) throw new ReportJobError(`Could not record the report: ${saved.error?.message ?? 'no id came back'}`);
  const emails = review === 'approved' && options.send !== false ? await sendSummaryEmails(db, saved.data, options) : null;
  return { ...made, path, reportId: saved.data, review, emails };
}

/**
 * Approve and send (spec section 25): the PDF is made again with the summary as the team left it,
 * the two show on Reports with "Your September report is ready.", and the summary goes by email.
 */
export async function approveReport(db: Db, reportId: string, options: { by?: string | null; at?: Date; send?: boolean; env?: Env; appUrl?: string } = {}): Promise<{ emails: { sent: number; failed: number } | null }> {
  const found = await db.from('reports').select('id, institution_id, month, created_at, summary, review, storage_path').eq('id', reportId).maybeSingle();
  if (found.error) throw new ReportJobError(`Could not read the report: ${found.error.message}`);
  const report = found.data;
  if (!report) throw new ReportJobError('That report is not there.');
  if (report.review !== 'waiting') throw new ReportJobError('That summary has been approved already.');
  const month = report.month.slice(0, 7);
  const made = await renderMonth(db, report.institution_id, month, new Date(report.created_at), parseSummary(report.summary));
  await upload(db, report.storage_path, made.pdf);
  const approved = await db.rpc('approve_report', {
    p_report: reportId,
    p_pages: made.pages,
    p_size: made.size,
    p_notice: reportNotice(month),
    p_by: options.by ?? undefined,
    p_at: options.at?.toISOString() ?? undefined,
  });
  if (approved.error) {
    if (approved.error.message.includes('not_waiting')) throw new ReportJobError('That summary has been approved already.');
    throw new ReportJobError(`It did not approve: ${approved.error.message}`);
  }
  return { emails: options.send === false ? null : await sendSummaryEmails(db, reportId, options) };
}

/** A line of a waiting summary, fixed by the team, kept with who, what it was and why. */
export async function fixSummaryLine(db: Db, reportId: string, target: SummaryTarget, value: string, options: { reason?: string | null; editedBy?: string | null } = {}): Promise<void> {
  const saved = await db.rpc('record_summary_edit', {
    p_report: reportId,
    p_target: target,
    p_after: value,
    p_reason: options.reason ?? undefined,
    p_by: options.editedBy ?? undefined,
  });
  if (saved.error) {
    if (saved.error.message.includes('not_waiting')) throw new ReportJobError('That summary has been approved already.');
    if (saved.error.message.includes('bad_line')) throw new ReportJobError('Write the line, in 400 characters or fewer.');
    throw new ReportJobError(`That line did not save: ${saved.error.message}`);
  }
}

export interface WaitingSummary {
  reportId: string;
  institutionId: string;
  name: string;
  /** "September summary". */
  what: string;
  /** "Paid", "Client". */
  plan: string;
  madeAt: string;
  /** What changed, in one line: the summary's words line. */
  line: string;
}

/** Every monthly summary waiting for review, oldest first. */
export async function waitingSummaries(db: Db, now: Date = new Date()): Promise<WaitingSummary[]> {
  const { data, error } = await db.from('reports').select('id, institution_id, month, created_at, summary').eq('review', 'waiting').order('created_at');
  if (error) throw new ReportJobError(`Could not read the summaries waiting for review: ${error.message}`);
  if (!data?.length) return [];
  const ids = [...new Set(data.map((row) => row.institution_id))];
  const [institutions, plans] = await Promise.all([db.from('institutions').select('id, name').in('id', ids), db.from('plans').select('institution_id, tier, starts_at, ends_at').in('institution_id', ids)]);
  if (institutions.error || plans.error) throw new ReportJobError('Could not read the colleges waiting for review.');
  const names = new Map((institutions.data ?? []).map((row) => [row.id, row.name]));
  const tiers = new Map((plans.data ?? []).map((row) => [row.institution_id, effectiveTier(planRecord(row), now)]));
  return data.map((row) => {
    const month = row.month.slice(0, 7);
    const tier = tiers.get(row.institution_id) ?? 'free';
    return {
      reportId: row.id,
      institutionId: row.institution_id,
      name: names.get(row.institution_id) ?? 'A college',
      what: `${formatMonthName(month)} summary`,
      plan: tier === 'client' ? 'Client' : tier === 'paid' ? 'Paid' : 'Free',
      madeAt: row.created_at,
      line: parseSummary(row.summary)?.lines.words ?? 'The month’s summary and report.',
    };
  });
}

export interface SummaryReview {
  reportId: string;
  institutionId: string;
  name: string;
  month: string;
  madeAt: string;
  review: 'waiting' | 'approved';
  summary: MonthlySummary;
  /** Each line the team can fix, in reading order. */
  lines: Array<{ target: SummaryTarget; value: string }>;
  pages: number | null;
  /** Every change already made in this review, oldest first. */
  edits: Array<{ target: string; before: string | null; after: string | null; reason: string | null; by: string | null; at: string }>;
}

/** One summary for the team's review: line by line, with every change already made. */
export async function loadSummaryReview(db: Db, reportId: string): Promise<SummaryReview | null> {
  const found = await db.from('reports').select('id, institution_id, month, created_at, summary, review, pages').eq('id', reportId).maybeSingle();
  if (found.error) throw new ReportJobError(`Could not read the report: ${found.error.message}`);
  const report = found.data;
  const summary = report ? parseSummary(report.summary) : null;
  if (!report || !summary) return null;
  const [institution, edits] = await Promise.all([
    db.from('institutions').select('name').eq('id', report.institution_id).maybeSingle(),
    db.from('audit_edits').select('target, before, after, reason, edited_by, edited_at').eq('report_id', reportId).order('edited_at'),
  ]);
  if (edits.error) throw new ReportJobError(`Could not read the changes: ${edits.error.message}`);
  const editorIds = [...new Set((edits.data ?? []).flatMap((row) => (row.edited_by ? [row.edited_by] : [])))];
  const editors = new Map<string, string>();
  if (editorIds.length) {
    const people = await db.rpc('team_people');
    for (const person of people.data ?? []) if (editorIds.includes(person.user_id)) editors.set(person.user_id, person.email);
  }
  return {
    reportId: report.id,
    institutionId: report.institution_id,
    name: institution.data?.name ?? 'A college',
    month: report.month.slice(0, 7),
    madeAt: report.created_at,
    review: report.review,
    summary,
    lines: SUMMARY_TARGETS.flatMap((target) => {
      const value = summaryLine(summary, target);
      return value === null ? [] : [{ target, value }];
    }),
    pages: report.pages,
    edits: (edits.data ?? []).map((row) => ({ target: row.target, before: row.before, after: row.after, reason: row.reason, by: row.edited_by ? (editors.get(row.edited_by) ?? null) : null, at: row.edited_at })),
  };
}

/** Claimed Paid and Client institutions (on `now`) with an Audit for last month and no report for it yet. */
export async function reportsDue(db: Db, now: Date): Promise<{ month: string; due: Array<{ id: string; name: string }> }> {
  const month = reportMonth(now);
  const [plans, status, reports, institutions, audits] = await Promise.all([
    db.from('plans').select('institution_id, tier, starts_at, ends_at'),
    db.from('institution_status').select('institution_id, claimed'),
    db.from('reports').select('institution_id').eq('month', `${month}-01`),
    db.from('institutions').select('id, name'),
    db.from('audits').select('institution_id, run_at').in('kind', ['free', 'paid', 'client']).eq('review', 'approved').lt('run_at', monthEnd(month).toISOString()),
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

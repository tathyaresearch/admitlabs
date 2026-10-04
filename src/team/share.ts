// Share links for a prospect's team Audit (spec section 13, Phase 6 decisions): what a link's
// state is, and what the shared Audit shows. A link works for 90 days (config) unless the team
// stops it. The shared Audit shows the three words and every place: each check with its result,
// what was found, the source and the date, and each finding with its line and link; why it
// matters, the steps and the ready fix only for the top 3 fixes (the database sends nothing more),
// and "AdmitLabs can fix this" for the rest. Pure.

import { auditPlaces, type AuditPlacesView, type StoredFinding } from '../audit/places.ts';
import { overviewView, workingTop, type AuditView, type ListItem, type StoredAudit, type StoredCheck } from '../audit/view.ts';
import { TEAM_RULES } from '../config/team.ts';
import type { ListingProblem } from '../domain/finding-rules.ts';
import { formatDate } from '../domain/format.ts';
import { parseReadyFix } from '../domain/ready-fix.ts';
import { CHECK_KEYS, DIFFICULTIES, FINDING_KINDS, FINDING_PLACES, IMPACTS, INSTITUTION_TYPES, PILLARS, RESULTS, type CheckKey, type InstitutionType } from '../domain/types.ts';

export type LinkState = 'live' | 'expired' | 'stopped';

export interface LinkDates {
  expiresAt: string | Date;
  stoppedAt: string | Date | null;
}

export function linkState(link: LinkDates, now: Date): LinkState {
  if (link.stoppedAt) return 'stopped';
  return new Date(link.expiresAt).getTime() <= now.getTime() ? 'expired' : 'live';
}

/** "Works until 28 Dec 2026", "Expired on 28 Dec 2026", "Stopped on 3 Oct 2026". */
export function linkStateText(link: LinkDates, now: Date): string {
  const state = linkState(link, now);
  if (state === 'stopped') return `Stopped on ${formatDate(link.stoppedAt as string | Date)}`;
  if (state === 'expired') return `Expired on ${formatDate(link.expiresAt)}`;
  return `Works until ${formatDate(link.expiresAt)}`;
}

/** The page a link opens. */
export function sharePath(token: string): string {
  return `/share/${token}`;
}

export interface SharedInstitution {
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
}

export interface SharedAudit {
  sharedAt: string;
  expiresAt: string;
  institution: SharedInstitution;
  audit: StoredAudit;
  /** What people say and Other places: the fix's name for each, how to fix only for the top 3. */
  findings: StoredFinding[];
  programNames: ReadonlyMap<string, string>;
}

export type SharedLink = { status: 'expired' } | ({ status: 'live' } & SharedAudit);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const number = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null => ((allowed as readonly unknown[]).includes(value) ? (value as T) : null);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
const LISTING_PROBLEMS: readonly ListingProblem[] = ['old_details', 'missing_courses', 'missing'];

/** One finding as shared_audit() sends it, checked; null when it is not one. */
function parseFinding(entry: unknown): StoredFinding | null {
  if (!isRecord(entry)) return null;
  const id = text(entry.id);
  const place = oneOf(entry.place, FINDING_PLACES);
  const kind = oneOf(entry.kind, FINDING_KINDS);
  const findingKey = text(entry.findingKey);
  const line = text(entry.line);
  const sourceName = text(entry.sourceName);
  const sourceUrl = text(entry.sourceUrl);
  const checkedAt = text(entry.checkedAt);
  if (!id || !place || !kind || !findingKey || !line || !sourceName || !sourceUrl || !checkedAt) return null;
  const title = text(entry.fixTitle);
  const effort = oneOf(entry.effort, DIFFICULTIES);
  const impact = oneOf(entry.impact, IMPACTS);
  return {
    id,
    place,
    kind,
    findingKey,
    line,
    sourceName,
    sourceUrl,
    checkedAt,
    repeats: number(entry.repeats) ?? 1,
    listing: oneOf(entry.listing, LISTING_PROBLEMS),
    fix: title && effort && impact ? { title, why: text(entry.fixWhy), steps: strings(entry.fixSteps), readyFix: parseReadyFix(entry.readyFix), effort, impact } : null,
    fixRank: number(entry.fixRank),
    removed: false,
  };
}

/** What shared_audit() returned, checked: a live Audit, an expired link, or nothing. */
export function parseSharedLink(value: unknown): SharedLink | null {
  if (!isRecord(value)) return null;
  if (value.status === 'expired') return { status: 'expired' };
  if (value.status !== 'live' || !isRecord(value.institution) || !isRecord(value.audit) || !Array.isArray(value.programs) || !Array.isArray(value.checks)) return null;

  const institution = value.institution;
  const type = oneOf(institution.type, INSTITUTION_TYPES);
  const audit = value.audit;
  const scores = { overall: number(audit.overall), discovered: number(audit.discovered), trusted: number(audit.trusted), chosen: number(audit.chosen) };
  const sharedAt = text(value.sharedAt);
  const expiresAt = text(value.expiresAt);
  const auditId = text(audit.id);
  const runAt = text(audit.runAt);
  if (!type || !sharedAt || !expiresAt || !auditId || !runAt || Object.values(scores).some((score) => score === null)) return null;

  const names = new Map<string, string>();
  const programs: StoredAudit['programs'] = [];
  for (const entry of value.programs) {
    if (!isRecord(entry)) return null;
    const id = text(entry.id);
    const name = text(entry.name);
    const overall = number(entry.overall);
    const discovered = number(entry.discovered);
    const trusted = number(entry.trusted);
    const chosen = number(entry.chosen);
    if (!id || !name || overall === null || discovered === null || trusted === null || chosen === null) return null;
    names.set(id, name);
    programs.push({ programId: id, scores: { overall, discovered, trusted, chosen }, changes: { overall: null, discovered: null, trusted: null, chosen: null } });
  }

  const checks: StoredCheck[] = [];
  for (const entry of value.checks) {
    if (!isRecord(entry)) return null;
    const id = text(entry.id);
    const key = oneOf(entry.key, CHECK_KEYS) as CheckKey | null;
    const pillar = oneOf(entry.pillar, PILLARS);
    const result = oneOf(entry.result, RESULTS);
    const points = number(entry.pointsAwarded);
    const max = number(entry.pointsMax);
    const checkedAt = text(entry.checkedAt);
    if (!id || !key || !pillar || !result || points === null || max === null || !checkedAt) return null;
    const finding = text(entry.finding);
    const sourceUrl = text(entry.sourceUrl);
    checks.push({
      id,
      programId: text(entry.programId),
      pillar,
      key,
      result,
      pointsAwarded: points,
      pointsMax: max,
      strengthRank: number(entry.strengthRank),
      fixRank: number(entry.fixRank),
      previousResult: null,
      checkedAt,
      detail:
        finding && sourceUrl
          ? {
              finding,
              whyItMatters: text(entry.whyItMatters),
              howToFix: text(entry.howToFix),
              fixSteps: strings(entry.fixSteps),
              difficulty: oneOf(entry.difficulty, DIFFICULTIES),
              sourceUrl,
              readyFix: parseReadyFix(entry.readyFix),
              fixTitle: text(entry.fixTitle),
            }
          : null,
    });
  }

  const findings: StoredFinding[] = [];
  for (const entry of Array.isArray(value.findings) ? value.findings : []) {
    const finding = parseFinding(entry);
    if (!finding) return null;
    findings.push(finding);
  }

  return {
    status: 'live',
    sharedAt,
    expiresAt,
    institution: { name: text(institution.name) ?? 'Institution', type, city: text(institution.city) ?? '', state: text(institution.state) ?? '', website: text(institution.website) ?? '' },
    audit: {
      id: auditId,
      runAt,
      kind: 'team',
      trigger: 'manual',
      programCount: number(audit.programCount) ?? Math.max(1, programs.length),
      previousAuditId: null,
      scores: scores as StoredAudit['scores'],
      changes: { overall: null, discovered: null, trusted: null, chosen: null },
      programs,
      checks,
    },
    findings,
    programNames: names,
  };
}

export interface SharedView {
  view: AuditView;
  /** Explained in full: what was found and how to fix it. */
  topFixes: ListItem[];
  /** The problem only, with "AdmitLabs can fix this". */
  moreFixes: ListItem[];
  working: ListItem[];
}

/**
 * The shared Audit's checks, for its PDF: ranked as stored, with how to fix for the checks among
 * the top 3 fixes of the one ranking (a finding can hold one of those places).
 */
export function sharedView(shared: Pick<SharedAudit, 'audit' | 'programNames' | 'institution'>): SharedView {
  const view = overviewView(shared.audit, { institutionType: shared.institution.type, programNames: shared.programNames });
  const inFull = new Set(shared.audit.checks.filter((check) => explainedInFull(check)).map((check) => check.key));
  return {
    view,
    topFixes: view.fixes.filter((item) => inFull.has(item.key)),
    moreFixes: view.fixes.filter((item) => !inFull.has(item.key)),
    working: workingTop(view, 3),
  };
}

/** Whether a check's or a finding's fix is explained in full on the shared Audit: its place in the one ranking. */
export function explainedInFull(item: { fixRank: number | null }): boolean {
  return item.fixRank !== null && item.fixRank <= TEAM_RULES.sharedFixesInFull;
}

/** The shared Audit, place by place with the three words: the top 3 fixes in full, the rest by name. */
export function sharedPlaces(shared: Pick<SharedAudit, 'audit' | 'findings' | 'programNames' | 'institution'>): AuditPlacesView {
  return auditPlaces(shared.audit, shared.findings, { institutionType: shared.institution.type, city: shared.institution.city, programNames: shared.programNames });
}

/** Said once, above the fixes after the top 3, on the shared page and in its PDF. */
export const ADMITLABS_CAN_FIX = 'AdmitLabs can fix any of these.';

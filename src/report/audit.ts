// A prospect's shared Audit as a PDF (spec section 13, Phase 6 decisions): the same content as
// the shared page, in the report's design. Every check with its result, what was found, the
// source and the date; how to fix only for the top 3 fixes, and one line saying AdmitLabs can fix
// the rest. Built from what shared_audit() returned, so it never holds more than the link does. Pure.

import { auditVerdict } from '../audit/verdict.ts';
import { ADMITLABS_EMAIL } from '../config/team.ts';
import { formatDate, hostAndPath } from '../domain/format.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import { INSTITUTION_TYPE_LABELS, PILLAR_LABELS, PILLARS, type CheckResult, type Pillar } from '../domain/types.ts';
import { sharedView, type SharedAudit } from '../team/share.ts';
import { fixOf, programRows, REPORT_LIMITS, typeset, workingRow, type ReportData, type ReportFix } from './data.ts';

export interface AuditCheckPart {
  program: string | null;
  result: CheckResult;
  finding: string | null;
  source: string | null;
  checkedOn: string;
}

export interface AuditCheck {
  name: string;
  /** "In your top 3 fixes." for those three, otherwise nothing. */
  note: string | null;
  parts: AuditCheckPart[];
}

export interface AuditPdfData {
  institution: { name: string; place: string; website: string };
  /** For the footer: "Audit of 18 Sep 2026". */
  monthLabel: string;
  madeAt: string;
  checkedOn: string;
  sharedOn: string;
  cover: { score: number; label: ScoreLabel; verdict: string };
  pillars: Array<{ pillar: Pillar; name: string; score: number; label: ScoreLabel }>;
  working: ReportData['working'];
  topFixes: ReportFix[];
  /** Explained no further than the problem: one line above them says AdmitLabs can fix them. */
  moreFixes: ReportFix[];
  programs: ReportData['programs'];
  morePrograms: number;
  checks: Array<{ pillar: Pillar; name: string; checks: AuditCheck[] }>;
  closing: { text: string; email: string; freeAudit: string };
}

export const TOP_FIX_NOTE = 'In your top 3 fixes.';

export function buildAuditPdf(shared: SharedAudit, options: { madeAt: Date; freeAuditUrl: string }): AuditPdfData {
  const { view, topFixes, moreFixes, working } = sharedView(shared);
  const type = shared.institution.type;
  const topKeys = new Set(topFixes.map((item) => item.key));
  const checkedOn = formatDate(shared.audit.runAt);

  return typeset({
    institution: {
      name: shared.institution.name,
      place: `${INSTITUTION_TYPE_LABELS[type]} in ${shared.institution.city}, ${shared.institution.state}`,
      website: hostAndPath(shared.institution.website),
    },
    monthLabel: `Audit of ${checkedOn}`,
    madeAt: options.madeAt.toISOString(),
    checkedOn,
    sharedOn: formatDate(shared.sharedAt),
    cover: { score: shared.audit.scores.overall, label: view.label, verdict: auditVerdict(shared.audit.scores) },
    pillars: PILLARS.map((pillar) => ({ pillar, name: PILLAR_LABELS[pillar], score: shared.audit.scores[pillar], label: scoreLabel(shared.audit.scores[pillar]) })),
    working: working.map(workingRow),
    topFixes: topFixes.map(fixOf),
    moreFixes: moreFixes.map((item) => ({ ...fixOf(item), howToFix: null, difficulty: null })),
    programs: programRows(shared.audit, { institutionType: type, programNames: shared.programNames }),
    morePrograms: Math.max(0, shared.audit.programs.length - REPORT_LIMITS.programs),
    checks: view.areas.map((area) => ({
      pillar: area.pillar,
      name: PILLAR_LABELS[area.pillar],
      checks: area.rows
        .filter((row) => row.parts.length)
        .map((row) => ({
          name: row.name,
          note: topKeys.has(row.key) ? TOP_FIX_NOTE : null,
          parts: row.parts.map((part) => ({
            program: part.programName,
            result: part.result,
            finding: part.detail?.finding ?? null,
            source: part.detail?.sourceUrl ? hostAndPath(part.detail.sourceUrl) : null,
            checkedOn: formatDate(part.checkedAt),
          })),
        })),
    })),
    closing: { text: 'Want AdmitLabs to fix this for you?', email: ADMITLABS_EMAIL, freeAudit: `Get your free Audit at ${options.freeAuditUrl.replace(/^https?:\/\//, '')}` },
  });
}

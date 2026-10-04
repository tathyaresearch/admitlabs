// A prospect's shared Audit as a PDF (spec section 13): the same content as the shared page, place
// by place with the three words, in the report's design. What to fix first (the top 3 in full: what
// was found, why, the steps and the ready fix), the rest by name under one line saying AdmitLabs can
// fix them, then each place with what was found and its proof, what's good and what to fix. Built
// from what shared_audit() returned, so it never holds more than the link does. Pure.

import type { StoredFinding } from '../audit/places.ts';
import { auditVerdict } from '../audit/verdict.ts';
import { ADMITLABS_EMAIL } from '../config/team.ts';
import { formatDate, hostAndPath } from '../domain/format.ts';
import { INSTITUTION_TYPE_LABELS } from '../domain/types.ts';
import { sharedPlaces, type SharedAudit } from '../team/share.ts';
import { typeset } from './data.ts';
import { fixDetailOf, fixRowOf, placesFor, reportWords, type ReportFix, type ReportFixRow, type ReportPlace, type ReportWord } from './places.ts';

export interface AuditPdfData {
  institution: { name: string; place: string; website: string };
  /** For the footer: "Audit of 18 Sep 2026". */
  monthLabel: string;
  madeAt: string;
  checkedOn: string;
  sharedOn: string;
  /** The one line from the three words. */
  answer: string;
  words: ReportWord[];
  /** Explained in full. */
  topFixes: ReportFix[];
  /** By name only, under one line saying AdmitLabs can fix them. */
  moreFixes: ReportFixRow[];
  places: ReportPlace[];
  closing: { text: string; email: string; freeAudit: string };
}

/** The shared Audit, with its findings (a team PDF reads them as the team). */
export type AuditPdfInput = Omit<SharedAudit, 'findings'> & { findings: readonly StoredFinding[] };

export function buildAuditPdf(shared: AuditPdfInput, options: { madeAt: Date; freeAuditUrl: string }): AuditPdfData {
  const view = sharedPlaces({ ...shared, findings: [...shared.findings] });
  const checkedOn = formatDate(shared.audit.runAt);
  return typeset({
    institution: {
      name: shared.institution.name,
      place: `${INSTITUTION_TYPE_LABELS[shared.institution.type]} in ${shared.institution.city}, ${shared.institution.state}`,
      website: hostAndPath(shared.institution.website),
    },
    monthLabel: `Audit of ${checkedOn}`,
    madeAt: options.madeAt.toISOString(),
    checkedOn,
    sharedOn: formatDate(shared.sharedAt),
    answer: auditVerdict(shared.audit.scores),
    words: reportWords(view.words),
    topFixes: view.topFixes.map((fix, index) => fixDetailOf(fix, index + 1)),
    moreFixes: view.fixes.slice(view.topFixes.length).map((fix, index) => fixRowOf(fix, view.topFixes.length + index + 1)),
    places: placesFor(view),
    closing: { text: 'Want AdmitLabs to fix this for you?', email: ADMITLABS_EMAIL, freeAudit: `Get your free Audit at ${options.freeAuditUrl.replace(/^https?:\/\//, '')}` },
  });
}

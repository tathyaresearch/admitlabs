// Loads what the Audit by place needs beyond the Audit itself, as the signed-in user: its findings
// (Free: the ones among its top 3 fixes), Free's counts for the places it sees as a preview, the
// fixes marked done, the open requests to AdmitLabs and what was added in Settings. Row level
// security decides what comes back; nothing here widens it.

import { cache } from 'react';
import { auditPlaces, type AuditPlacesView, type FixView } from '@/audit/places';
import { storedFindings } from '@/audit/read';
import type { FixActionState } from '@/components/audit/FixActions';
import type { PanelAdded } from '@/components/audit/FixPanel';
import { addedByYou } from '@/domain/details';
import { formatDate } from '@/domain/format';
import type { FindingPlace } from '@/domain/types';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadAddedDetails, type AddedDetails } from '@/lib/details/load';
import { loadMarks } from '@/lib/home/load';
import { createClient } from '@/lib/supabase/server';
import type { AuditPageData } from './load';

export const loadFindings = cache(async (auditId: string) => storedFindings(await createClient(), auditId));

/** How much each unscored place holds in the latest approved Audit: counts only, for Free's preview. */
export const loadFindingsTeaser = cache(async (institutionId: string): Promise<Partial<Record<FindingPlace, { found: number; toFix: number }>>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('findings_teaser', { p_institution: institutionId });
  if (error) throw new Error(`Could not count what was found: ${error.message}`);
  return Object.fromEntries((data ?? []).map((row) => [row.place, { found: row.found, toFix: row.to_fix }]));
});

/** The open requests to AdmitLabs to fix something, by fix id: when each was sent. */
export const loadOpenFixAsks = cache(async (institutionId: string): Promise<Record<string, string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('open_fix_asks', { p_institution: institutionId });
  if (error) throw new Error(`Could not load your requests to AdmitLabs: ${error.message}`);
  const asked: Record<string, string> = {};
  for (const row of data ?? []) if (!asked[row.fix_key]) asked[row.fix_key] = row.asked_at;
  return asked;
});

/** What was added in Settings that relates to each check's fix, by fix id. Shown as "Added by you". */
export function addedForFixes(entries: readonly FixView[], details: AddedDetails, institutionType: InstitutionViewer['membership']['institution']['type'], programIds: ReadonlyMap<string, string>): Record<string, PanelAdded[]> {
  const byFix: Record<string, PanelAdded[]> = {};
  for (const entry of entries) {
    if (!entry.checkKey) continue;
    const programs = entry.results.map((result) => result.program);
    const notes = programs.flatMap((programName): PanelAdded[] => {
      const programId = programName ? programIds.get(programName) : undefined;
      const added = addedByYou(entry.checkKey as NonNullable<FixView['checkKey']>, {
        institution: details.institution,
        program: programId ? (details.programs.get(programId) ?? null) : null,
        programName,
        institutionType,
      });
      return added ? [{ added, label: programs.length > 1 && programName ? `Added by you for ${programName}` : undefined }] : [];
    });
    // An institution check repeats nothing: once is enough.
    const seen = new Set<string>();
    const unique = notes.filter((note) => {
      const key = note.added.lines.join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length) byFix[entry.id] = unique;
  }
  return byFix;
}

export interface PlacesPage {
  view: AuditPlacesView;
  state: FixActionState;
  added: Record<string, PanelAdded[]>;
}

export async function loadPlacesPage(viewer: InstitutionViewer, data: AuditPageData, programId: string | null = null): Promise<PlacesPage | null> {
  const audit = data.audit;
  if (!audit) return null;
  const { institution } = viewer.membership;
  const free = viewer.tier === 'free';
  const [findings, teaser, marks, asked, details] = await Promise.all([
    loadFindings(audit.id),
    free ? loadFindingsTeaser(institution.id) : Promise.resolve(null),
    loadMarks(institution.id, null),
    loadOpenFixAsks(institution.id),
    loadAddedDetails(institution.id),
  ]);
  const before = [...data.history].reverse().find((row) => row.runAt < audit.runAt) ?? null;
  const nextAuditOn = data.nextAudit && data.nextAudit.tier === viewer.tier ? formatDate(data.nextAudit.on) : null;
  const view = auditPlaces(audit, findings, {
    institutionType: institution.type,
    city: institution.city,
    programNames: data.names,
    programId,
    previousRunAt: before?.runAt ?? null,
    nextAuditOn,
    teaser,
  });
  const owner = viewer.membership.role === 'owner' && !viewer.viewingAs;
  const programIds = new Map([...data.names.entries()].map(([id, name]) => [name, id]));
  return {
    view,
    state: {
      marked: marks.flatMap((mark) => (mark.checkedBy ? [] : mark.checkKey ? [`check:${mark.checkKey}`] : mark.findingKey ? [`finding:${mark.findingKey}`] : [])),
      asked,
      canMark: owner,
      canAsk: owner && viewer.tier !== 'client',
      client: viewer.tier === 'client',
      nextAudit: nextAuditOn,
    },
    added: addedForFixes(view.panel, details, institution.type, programIds),
  };
}

// The Blueprint (spec section 26): the plan AdmitLabs makes for a Client, as PDF versions. Which
// version is the latest, what its status says, when it needs a fresh version, and the two steps
// after Ready: Blueprint shared, Blueprint approved (they never hold Ready back). Pure.

import { BRAIN_RULES } from '../config/brain.ts';

export const BLUEPRINT_STATUSES = ['draft', 'shared', 'approved'] as const;
export type BlueprintStatus = (typeof BLUEPRINT_STATUSES)[number];

export const BLUEPRINT_STATUS_LABELS: Readonly<Record<BlueprintStatus, string>> = { draft: 'Draft', shared: 'Shared', approved: 'Approved' };

export interface BlueprintVersion {
  id: string;
  version: number;
  fileName: string;
  sizeBytes: number;
  status: BlueprintStatus;
  uploadedAt: string;
  uploadedBy: string | null;
  sharedAt: string | null;
  sharedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  changesNote: string | null;
  changesAt: string | null;
  changesBy: string | null;
  /** The PDF's words, as the reader found them, or null. */
  text: string | null;
}

/** The newest version this person sees, or null. */
export function latestBlueprint(versions: readonly BlueprintVersion[]): BlueprintVersion | null {
  return versions.reduce<BlueprintVersion | null>((latest, entry) => (!latest || entry.version > latest.version ? entry : latest), null);
}

/** The Clients list's word: None, or the latest version's status. */
export function blueprintWord(latest: Pick<BlueprintVersion, 'status'> | null): string {
  return latest ? BLUEPRINT_STATUS_LABELS[latest.status] : 'None';
}

/** The latest version is older than the check time (90 days): time for a fresh one. */
export function blueprintStale(latest: Pick<BlueprintVersion, 'uploadedAt'> | null, now: Date): boolean {
  if (!latest) return false;
  return now.getTime() - new Date(latest.uploadedAt).getTime() > BRAIN_RULES.blueprint.checkDays * 24 * 60 * 60 * 1000;
}

/** The version Ask the brain reads: the latest Shared or Approved one. */
export function readableBlueprint(versions: readonly BlueprintVersion[]): BlueprintVersion | null {
  return latestBlueprint(versions.filter((entry) => entry.status !== 'draft'));
}

export interface AfterReadyStep {
  key: 'shared' | 'approved';
  name: string;
  done: boolean;
  at: string | null;
}

/**
 * After Ready: the latest version the college can see is shared, and approved. A new version
 * shared since an approval waits for its own.
 */
export function afterReadySteps(versions: readonly BlueprintVersion[]): AfterReadyStep[] {
  const seen = readableBlueprint(versions);
  return [
    { key: 'shared', name: 'Blueprint shared', done: Boolean(seen), at: seen?.sharedAt ?? null },
    { key: 'approved', name: 'Blueprint approved', done: seen?.status === 'approved', at: seen?.status === 'approved' ? seen.approvedAt : null },
  ];
}

/** "1.2 MB", "340 KB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** What a file may be: a PDF up to 20 MB. In words, or null when it may go up. */
export function blueprintProblem(type: string, size: number): string | null {
  if (type !== BRAIN_RULES.blueprint.type) return 'Upload a PDF.';
  if (!Number.isFinite(size) || size <= 0) return 'That file is empty.';
  if (size > BRAIN_RULES.blueprint.maxMb * 1024 * 1024) return `Keep it under ${BRAIN_RULES.blueprint.maxMb} MB.`;
  return null;
}

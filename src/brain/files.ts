// The Brain's files (spec section 26): a logo and brand guidelines. The browser sends a file
// straight to the private bucket through a signed upload link the server makes after checking the
// person, the college, the type and the size; the form then sends only where it went. A hosted
// server takes requests of a few MB at most, so a file never passes through it. Pure.

import { BRAIN_RULES, type BrainFileKind } from '../config/brain.ts';

export const FILE_EXTENSIONS: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };

export const UPLOAD_FAILED = 'The file could not be uploaded. Try again, or paste a Drive link instead.';

/** What is wrong with a file for this kind, in words, or null when it may go up. */
export function fileProblem(kind: BrainFileKind, type: string, size: number): string | null {
  const rule = BRAIN_RULES.files[kind];
  if (!(rule.types as readonly string[]).includes(type)) return kind === 'logo' ? 'Upload a PNG, JPG or WebP image.' : 'Upload a PDF.';
  if (!Number.isFinite(size) || size <= 0) return 'That file is empty.';
  if (size > rule.maxMb * 1024 * 1024) return `Keep it under ${rule.maxMb} MB.`;
  return null;
}

/** Where a new file goes: the college's own folder, under a new name. */
export function uploadPath(institutionId: string, type: string, id: string): string {
  return `${institutionId}/${id}.${FILE_EXTENSIONS[type] ?? 'bin'}`;
}

/** Whether a path the form sent back is a file this college's upload link could have made. */
export function isUploadPath(institutionId: string, path: string): boolean {
  const [folder, name, ...rest] = path.split('/');
  return folder === institutionId && rest.length === 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$/.test(name ?? '');
}

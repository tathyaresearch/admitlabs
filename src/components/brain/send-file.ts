// The browser's half of a Brain file upload (src/brain/files.ts): the server checks the person,
// the college, the type and the size and makes a signed link; the file goes straight to the
// private bucket through it. Only where it went is sent with the form.

import type { BrainFileKind } from '@/config/brain';
import { UPLOAD_FAILED, fileProblem } from '@/brain/files';
import { prepareUploadAction } from '@/lib/brain/actions';

export async function sendFile(institutionId: string, kind: BrainFileKind, file: File): Promise<{ path: string } | { error: string }> {
  const problem = fileProblem(kind, file.type, file.size);
  if (problem) return { error: problem };
  const prepared = await prepareUploadAction(institutionId, kind, { type: file.type, size: file.size });
  if ('error' in prepared) return prepared;
  // The same request the storage client makes for a signed upload: the file as a form part, so it
  // keeps its type.
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);
  try {
    const response = await fetch(prepared.url, { method: 'PUT', body, headers: { 'x-upsert': 'false' } });
    if (!response.ok) return { error: UPLOAD_FAILED };
  } catch {
    return { error: UPLOAD_FAILED };
  }
  return { path: prepared.path };
}

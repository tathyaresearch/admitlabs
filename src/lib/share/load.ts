// Reads a share link through shared_audit(), which anyone with the link may call. It returns
// only that one team Audit (or that the link has expired), so nothing here can reach more.

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { parseSharedLink, type SharedLink } from '@/team/share';

/** Tokens are 32 hexadecimal characters; anything else is not a link. */
export const TOKEN = /^[0-9a-z]{16,64}$/i;

export const loadSharedLink = cache(async (token: string): Promise<SharedLink | null> => {
  if (!TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('shared_audit', { p_token: token });
  if (error) throw new Error(`Could not open the shared Audit: ${error.message}`);
  return parseSharedLink(data);
});

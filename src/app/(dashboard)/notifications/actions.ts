'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Marks this institution's notifications read (row level security limits it to your own). */
export async function markAllReadAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('mark_notifications_read', {});
  if (!error) revalidatePath('/', 'layout');
}

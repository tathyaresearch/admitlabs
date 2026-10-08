'use server';

// Opening an institution's dashboard as it sees it, read only, and coming back. Team only: the
// cookie is honoured only for a signed-in team user (see getViewer), only for an institution that
// has signed up, and for a Client manager only for their own Clients (the database lets them read
// no other, so getViewer could not open one either).

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canManage } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { VIEW_AS_COOKIE } from '@/lib/team/view-as';

const EIGHT_HOURS = 8 * 60 * 60;

export async function viewAsAction(institutionId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) redirect('/login');
  if (!(await canManage(viewer, institutionId))) redirect('/team');
  const supabase = await createClient();
  const { data } = await supabase.from('institution_status').select('claimed').eq('institution_id', institutionId).maybeSingle();
  if (!data?.claimed) redirect(`/team/institutions/${institutionId}`);
  (await cookies()).set(VIEW_AS_COOKIE, institutionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: EIGHT_HOURS,
  });
  redirect('/');
}

export async function stopViewingAction(): Promise<void> {
  const store = await cookies();
  const viewed = store.get(VIEW_AS_COOKIE)?.value;
  store.delete(VIEW_AS_COOKIE);
  redirect(viewed ? `/team/institutions/${viewed}` : '/team');
}

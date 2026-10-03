import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthPage, DatabaseOff, OpensSoon } from '@/components/auth/AuthPage';
import { AUTH_COPY, SOON_COPY } from '@/components/auth/content';
import { stageData } from '@/components/auth/stage-data';
import { WatchStage } from '@/components/auth/WatchStage';
import { getViewer, homePathFor } from '@/lib/auth/viewer';
import { mailpitUrl, supabaseConfig } from '@/lib/env';
import { APP_OPEN, safeNextPath } from '@/lib/urls';
import { loadShowcase } from '@/product/showcase';

// Log in: for someone who already has an account. The same email code as sign up, but it never
// creates an account: an email with no account gets "No account yet" and a way to sign up.

// While Drishti is not open yet: the left side as it is, and "Drishti opens soon." with a way to
// talk to us instead of the form. Nothing reaches a database, and search engines leave it out.
export const metadata: Metadata = APP_OPEN ? { title: AUTH_COPY.login.page } : { title: SOON_COPY.page, robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const configured = APP_OPEN && supabaseConfig() !== null;
  if (configured) {
    const viewer = await getViewer();
    if (viewer) redirect(homePathFor(viewer));
  }
  const { next } = await searchParams;
  const data = stageData(await loadShowcase());

  return (
    <AuthPage left={<WatchStage data={data} />}>
      {!APP_OPEN ? (
        <OpensSoon mode="login" />
      ) : configured ? (
        <AuthForm mode="login" next={safeNextPath(next)} mailpitUrl={process.env.NODE_ENV === 'development' ? mailpitUrl() : null} />
      ) : (
        <DatabaseOff />
      )}
    </AuthPage>
  );
}

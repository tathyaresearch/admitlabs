import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthPage, DatabaseOff } from '@/components/auth/AuthPage';
import { AUTH_COPY } from '@/components/auth/content';
import { DashboardPicture } from '@/components/auth/DashboardPicture';
import { SpotlightStage } from '@/components/auth/SpotlightStage';
import { getViewer, homePathFor } from '@/lib/auth/viewer';
import { mailpitUrl, supabaseConfig } from '@/lib/env';
import { safeNextPath } from '@/lib/urls';
import { loadShowcase } from '@/product/showcase';

// Sign up: where every "Get your free Audit" leads. The same email code as log in; a new email gets
// an account, and an email that already has one is simply signed in. Then onboarding.

export const metadata: Metadata = { title: AUTH_COPY.signup.page };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const configured = supabaseConfig() !== null;
  if (configured) {
    const viewer = await getViewer();
    if (viewer) redirect(homePathFor(viewer));
  }
  const { next } = await searchParams;
  const showcase = await loadShowcase();

  return (
    <AuthPage
      left={
        <SpotlightStage>
          <DashboardPicture showcase={showcase} />
        </SpotlightStage>
      }
    >
      {configured ? <AuthForm mode="signup" next={safeNextPath(next)} mailpitUrl={process.env.NODE_ENV === 'development' ? mailpitUrl() : null} /> : <DatabaseOff />}
    </AuthPage>
  );
}

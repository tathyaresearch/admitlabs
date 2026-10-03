import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ProductLockup } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/auth/actions';
import { requireViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './OnboardingForm';
import { ProgramChoice } from './ProgramChoice';
import styles from './onboarding.module.css';

export const metadata = { title: 'Set up your institution' };

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  if (viewer.teamRole) redirect('/team');
  const supabase = await createClient();

  if (!viewer.membership) {
    // Someone an Admin added to the team joins it; someone an owner invited joins as a Member. No form for them.
    const { data: teamRole } = await supabase.rpc('accept_team_invite');
    if (teamRole) redirect('/team');
    const { data: joined } = await supabase.rpc('accept_invites');
    if (joined) redirect('/');

    return (
      <Frame step={1} email={viewer.email}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Step 1 of 2</p>
          <h1 className={styles.title}>Set up your institution</h1>
          <p className={styles.text}>Tell us who you are and where students find you. It takes about two minutes.</p>
        </header>
        <OnboardingForm />
      </Frame>
    );
  }

  const { membership } = viewer;
  const needsProgram = membership.role === 'owner' && viewer.tier === 'free' && !viewer.plan?.freeProgramId;
  if (!needsProgram) redirect('/');

  const { data: programs } = await supabase
    .from('programs')
    .select('id, name')
    .eq('institution_id', membership.institution.id)
    .is('archived_at', null)
    .order('name');

  return (
    <Frame step={2} email={viewer.email}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Step 2 of 2</p>
        <h1 className={styles.title}>Pick the program your free Audit covers</h1>
        <p className={styles.text}>
          {membership.institution.name} is set up. Your free Audit checks one program, plus everything the institution shares, like Instagram and reviews.
        </p>
      </header>
      <ProgramChoice programs={programs ?? []} />
    </Frame>
  );
}

function Frame({ step, email, children }: { step: 1 | 2; email: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <ProductLockup size="md" motion="blink" />
        <div className={styles.topbarEnd}>
          <span className={styles.signedIn}>{email}</span>
          <form action={signOut}>
            <Button type="submit" variant="quiet" size="sm" icon="signOut">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main id="main" className={styles.body} data-step={step}>
        {children}
      </main>
    </div>
  );
}

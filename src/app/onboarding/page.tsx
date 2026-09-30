import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Layout';
import { signOut } from '@/lib/auth/actions';
import { requireViewer } from '@/lib/auth/guards';
import styles from './onboarding.module.css';

export const metadata = { title: 'Set up your institution' };

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  if (viewer.teamRole) redirect('/team');
  if (viewer.membership) redirect('/');

  return (
    <main className={styles.page}>
      <Wordmark height={20} />
      <Card padding="lg" className={styles.card}>
        <p className={styles.eyebrow}>Welcome to Drishti</p>
        <h1 className={styles.title}>Set up your institution</h1>
        <p className={styles.text}>
          You&apos;re signed in as <strong>{viewer.email}</strong>. Next you will add your institution, its programs and its public links, and pick the
          program your free Audit covers.
        </p>
        <p className={styles.note}>Onboarding arrives in Phase 2.</p>
        <form action={signOut}>
          <Button type="submit" variant="secondary" icon="signOut">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}

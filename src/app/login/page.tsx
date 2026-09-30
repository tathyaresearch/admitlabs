import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProductLockup, Wordmark } from '@/components/ui/Brand';
import { Notice } from '@/components/ui/Feedback';
import { getViewer, homePathFor } from '@/lib/auth/viewer';
import { mailpitUrl, supabaseConfig } from '@/lib/env';
import { safeNextPath } from '@/lib/urls';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = { title: 'Sign in' };

const FEATURES = [
  { name: 'Audit', question: 'How do we look?' },
  { name: 'Rivals', question: "Who's ahead of us?" },
  { name: 'Demand', question: 'What do students want?' },
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const configured = supabaseConfig() !== null;
  if (configured) {
    const viewer = await getViewer();
    if (viewer) redirect(homePathFor(viewer));
  }
  const { next } = await searchParams;

  return (
    <div className={styles.page}>
      <section className={`invert ${styles.brandPanel}`} aria-label="About Drishti">
        <Wordmark height={20} />
        <div className={styles.brandBody}>
          <ProductLockup size="lg" />
          <p className={styles.brandLine}>See where you stand, who&apos;s ahead, and what students want. Every month.</p>
          <ol className={styles.features}>
            {FEATURES.map((feature, index) => (
              <li key={feature.name} className={styles.feature}>
                <span className={styles.featureIndex}>0{index + 1}</span>
                <span className={styles.featureName}>{feature.name}</span>
                <span className={styles.featureQuestion}>{feature.question}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className={styles.brandFoot}>Public data only. Every result shows its source and the date it was checked.</p>
      </section>

      <section className={styles.formPanel}>
        {configured ? (
          <LoginForm next={safeNextPath(next)} mailpitUrl={process.env.NODE_ENV === 'development' ? mailpitUrl() : null} />
        ) : (
          <div className={styles.form}>
            <Notice title="The local database is not running" tone="inverse">
              Start it with <code>npm run db:start</code>, load the sample data with <code>npm run db:reset</code>, then restart{' '}
              <code>npm run dev</code>.
            </Notice>
          </div>
        )}
      </section>
    </div>
  );
}

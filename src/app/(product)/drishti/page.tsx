import type { Metadata } from 'next';
import { ProductLockup, Wordmark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { Highlight } from '@/components/ui/Layout';
import { appLink } from '@/lib/urls';
import styles from './product.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Drishti by AdmitLabs' },
  description: "See where you stand, who's ahead, and what students want. Every month.",
};

// A placeholder so the route and the call to action work. The full product page is Phase 7.
export default function ProductPage() {
  return (
    <main className={`invert ${styles.page}`}>
      <header className={styles.header}>
        <Wordmark height={20} />
        <ButtonLink href={appLink('/login')} variant="secondary" size="sm">
          Sign in
        </ButtonLink>
      </header>
      <section className={styles.hero}>
        <ProductLockup size="md" />
        <h1 className={styles.title}>
          See where you stand, who&apos;s ahead, and what <Highlight>students want.</Highlight>
        </h1>
        <p className={styles.lede}>A monthly view of how your institution looks to students, how your rivals are doing, and what students are asking.</p>
        <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
          Get your free Audit
        </ButtonLink>
        <p className={styles.note}>The full product page arrives in Phase 7.</p>
      </section>
    </main>
  );
}

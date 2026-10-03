import type { Metadata } from 'next';
import { Wordmark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { APP_OPEN } from '@/lib/urls';
import styles from './not-found.module.css';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Wordmark height={18} />
      <div className={styles.body}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>This page is not here.</h1>
        <p className={styles.text}>The link may be old, or the page may have moved.</p>
        <ButtonLink href="/" iconAfter="arrowRight">
          {APP_OPEN ? 'Go to your dashboard' : 'Go to the home page'}
        </ButtonLink>
      </div>
    </main>
  );
}

// While a new Audit waits for the AdmitLabs team's review (spec section 25), as the version 2 mock
// was approved. Later Audits: one line above the last approved Audit, which the college keeps
// seeing. A first Audit: the line takes the place of the results, with when to expect it, what
// will show and what to do meanwhile. Nothing about the waiting Audit itself shows anywhere.

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatTime } from '@/domain/format';
import styles from './places.module.css';

const WAITING_TITLE = 'Your Audit is being checked by the AdmitLabs team.';

/** Above the last approved Audit: the college keeps seeing it until the new one is approved. */
export function WaitingNotice({ shownRunAt }: { shownRunAt: string }) {
  return (
    <Notice icon="stopwatch" title="Your new Audit is being checked by the AdmitLabs team.">
      Until it is ready you see the Audit of {formatDate(shownRunAt)}. It will show in Notifications when it is ready.
    </Notice>
  );
}

/** A first Audit waiting: in place of the results, with when to expect it. */
export function FirstAuditWaiting({ ranAt, isOwner, hasRivals, city }: { ranAt: string; isOwner: boolean; hasRivals: boolean; city: string }) {
  const ran = new Date(ranAt);
  const today = formatDate(ran) === formatDate(new Date());
  return (
    <div className={styles.page}>
      <section className={`invert ${styles.waiting}`} aria-labelledby="waiting-title">
        <Icon name="stopwatch" size={28} />
        <h2 id="waiting-title" className={styles.waitingTitle}>
          {WAITING_TITLE}
        </h2>
        <p className={styles.waitingText}>
          Drishti finished checking what students see at {formatTime(ran)} {today ? 'today' : `on ${formatDate(ran)}`}. Someone from AdmitLabs looks it over before you see it, usually within one working day.
        </p>
        <p className={styles.waitingText}>It will show here, and in Notifications, as soon as it is ready.</p>
      </section>
      <div className={styles.twoUp}>
        <section className={styles.card} aria-labelledby="see-title">
          <h2 id="see-title" className={styles.cardTitle}>
            <Icon name="audit" size={18} />
            What you will see
          </h2>
          <ul className={styles.plainList}>
            <li>Visibility, Trust and Chosen: can students find you, believe you and pick you</li>
            <li>What the internet says about you, place by place, with links and dates</li>
            <li>Your first three fixes, each with a ready fix to copy</li>
          </ul>
        </section>
        <section className={styles.card} aria-labelledby="meanwhile-title">
          <h2 id="meanwhile-title" className={styles.cardTitle}>
            <Icon name="rivals" size={18} />
            While you wait
          </h2>
          {hasRivals ? (
            <p className={styles.quiet}>Your rivals are picked. Drishti checks each one, so your first Audit can show who’s ahead in {city}.</p>
          ) : (
            <p className={styles.quiet}>Pick 3 to 5 rivals. Drishti checks each one, so your first Audit can show who’s ahead in {city}.</p>
          )}
          <div>
            {isOwner ? (
              <ButtonLink href={hasRivals ? '/rivals' : '/rivals/choose'} variant="secondary" size="sm" iconAfter="arrowRight">
                {hasRivals ? 'See your rivals' : 'Pick your rivals'}
              </ButtonLink>
            ) : (
              <Link href="/rivals" className={styles.underline}>
                See your rivals
              </Link>
            )}
          </div>
        </section>
      </div>
      <p className={styles.quiet}>Later Audits work the same way: you keep seeing your last Audit, with one line at the top, until the new one is ready.</p>
    </div>
  );
}

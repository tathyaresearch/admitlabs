// "Your AdmitLabs team" (C4), on a Client's Home: what the team did this month (or lately), what
// it does next, when the Audit last checked and when the next one runs, and how to write to the
// team, and the Client's Brain in one line (spec section 26). The whole log is on the work page.
// Only a Client has one.

import Link from 'next/link';
import { WorkList } from '@/components/work/WorkList';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import type { WorkCard } from '@/team/work';
import styles from './homepage.module.css';

export function TeamCard({
  card,
  lastChecked,
  nextAudit,
  email,
  allHref,
  brain = null,
}: {
  card: WorkCard;
  lastChecked: string | null;
  nextAudit: string | null;
  email: string;
  allHref: string;
  brain?: { line: string; href: string; action: string } | null;
}) {
  return (
    <section className={styles.card} aria-labelledby="team-title">
      <div className={styles.cardHead}>
        <h2 id="team-title" className={styles.cardTitle}>
          <Icon name="team" size={20} className={styles.blockIcon} />
          Your AdmitLabs team
        </h2>
        <Link href={allHref} className={styles.goLink}>
          See all work
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>
      <div className={styles.team}>
        <div className={styles.teamCol}>
          <h3 className={styles.changeLabel}>{card.doneLabel}</h3>
          {card.done.length ? (
            <WorkList entries={card.done} size="sm" />
          ) : (
            <p className={styles.quiet}>Your team adds each piece of work here as it is done, with the day and a link to see it.</p>
          )}
        </div>
        <div className={styles.teamCol}>
          <h3 className={styles.changeLabel}>Next</h3>
          {card.next.length ? <WorkList entries={card.next} size="sm" /> : <p className={styles.quiet}>What your team does next shows here.</p>}
        </div>
        <div className={styles.teamCol}>
          <dl className={styles.teamFacts}>
            {brain ? (
              <div className={styles.teamFact}>
                <dt>Your Brain</dt>
                <dd>
                  {brain.line}{' '}
                  <Link href={brain.href} className={styles.teamMail}>
                    {brain.action}
                  </Link>
                </dd>
              </div>
            ) : null}
            {lastChecked ? (
              <div className={styles.teamFact}>
                <dt>Last checked</dt>
                <dd>{formatDate(lastChecked)}</dd>
              </div>
            ) : null}
            {nextAudit ? (
              <div className={styles.teamFact}>
                <dt>Next Audit</dt>
                <dd>{nextAudit}</dd>
              </div>
            ) : null}
            <div className={styles.teamFact}>
              <dt>Write to your team</dt>
              <dd>
                <a href={`mailto:${email}`} className={styles.teamMail}>
                  {email}
                </a>
              </dd>
            </div>
          </dl>
          <p className={styles.quiet}>Ask, and your team runs a fresh Audit any time.</p>
        </div>
      </div>
    </section>
  );
}

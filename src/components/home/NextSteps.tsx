// What to do next, as one numbered list in one card: Home's "3 things to do this month" (Paid and
// Client) or "Fix these first" (Free). Each row says where it comes from, what to do, why, and
// opens where it came from with the same words: "See how".

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ThingSource } from '@/report/things';
import styles from './home.module.css';

export interface NextStep {
  key: string;
  source: ThingSource;
  title: string;
  detail: string;
  /** Where "See how" goes. Null in the product page's picture of Home. */
  href: string | null;
}

const SOURCES: Readonly<Record<ThingSource, { word: string; icon: IconName }>> = {
  audit: { word: 'Audit', icon: 'audit' },
  rivals: { word: 'Rivals', icon: 'rivals' },
  demand: { word: 'Demand', icon: 'demand' },
};

export function NextSteps({ id, title, description, steps, empty }: { id: string; title: string; description: string; steps: readonly NextStep[]; empty?: ReactNode }) {
  return (
    <section className={styles.block} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHead}>
        <h2 id={`${id}-title`} className={styles.blockTitle}>
          {title}
        </h2>
        <p className={styles.blockText}>{description}</p>
      </div>
      {steps.length ? (
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const source = SOURCES[step.source];
            const body = (
              <>
                <span className={`${styles.stepNumber} num`} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.stepBody}>
                  <span className={styles.stepSource}>
                    <Icon name={source.icon} size={14} />
                    <span>
                      <span className="visually-hidden">Step {index + 1}, from </span>
                      {source.word}
                    </span>
                  </span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  {step.detail ? <span className={styles.stepDetail}>{step.detail}</span> : null}
                </span>
                {step.href ? (
                  <span className={styles.stepGo} aria-hidden="true">
                    See how
                    <Icon name="arrowRight" size={16} />
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={step.key}>
                {step.href ? (
                  <Link href={step.href} className={`${styles.step} ${styles.stepLink}`}>
                    {body}
                  </Link>
                ) : (
                  <div className={styles.step}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        empty
      )}
    </section>
  );
}

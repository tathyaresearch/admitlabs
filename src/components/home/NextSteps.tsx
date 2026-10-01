// What to do next, as one numbered list in one card: Home's "3 things to do this month" (Paid and
// Client) or "Fix these first" (Free), and the same list on other pages (the Audit's fixes, what
// to learn from rivals, content ideas). Each row says where it comes from, what to do, why, and
// opens where it came from with the same words: "See how".

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ThingSource } from '@/report/things';
import styles from './home.module.css';

export interface NextStep {
  key: string;
  /** Where it comes from, on Home. Other pages give a `kicker` of their own instead. */
  source?: ThingSource;
  /** The small line above the title, like a pillar and its result. */
  kicker?: ReactNode;
  /** An icon before the title, like the check's own. */
  icon?: ReactNode;
  title: string;
  detail: string;
  /** A value on the right, like "+4 points". */
  aside?: ReactNode;
  /** More under the detail, like how to fix and the source (the shared Audit). Spans only. */
  extra?: ReactNode;
  /** Where "See how" goes. Null in the product page's picture of Home. */
  href: string | null;
  /** The link's words when not "See how", for a link that leaves Drishti (a source). */
  external?: string;
}

const SOURCES: Readonly<Record<ThingSource, { word: string; icon: IconName }>> = {
  audit: { word: 'Audit', icon: 'audit' },
  rivals: { word: 'Rivals', icon: 'rivals' },
  demand: { word: 'Demand', icon: 'demand' },
};

function Kicker({ step, index }: { step: NextStep; index: number }) {
  if (step.kicker) return <span className={styles.stepSource}>{step.kicker}</span>;
  if (!step.source) return null;
  const source = SOURCES[step.source];
  return (
    <span className={styles.stepSource}>
      <Icon name={source.icon} size={14} />
      <span>
        <span className="visually-hidden">Step {index + 1}, from </span>
        {source.word}
      </span>
    </span>
  );
}

export function NextSteps({
  id,
  title,
  description,
  steps,
  empty,
  action,
  start = 1,
  icon,
}: {
  id: string;
  title: string;
  description: string;
  steps: readonly NextStep[];
  empty?: ReactNode;
  /** A link on the right of the heading, like "See all 13 fixes". */
  action?: ReactNode;
  /** The first number, when the list carries on from another one. */
  start?: number;
  /** An icon before the list's title. */
  icon?: IconName;
}) {
  const head = (
    <div className={styles.blockHead}>
      <h2 id={`${id}-title`} className={styles.blockTitle}>
        {icon ? <Icon name={icon} size={20} className={styles.blockIcon} /> : null}
        {title}
      </h2>
      <p className={styles.blockText}>{description}</p>
    </div>
  );
  return (
    <section className={styles.block} aria-labelledby={`${id}-title`}>
      {action ? (
        <div className={styles.blockHeadRow}>
          {head}
          <div className={styles.blockAction}>{action}</div>
        </div>
      ) : (
        head
      )}
      {steps.length ? (
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const go = step.external ? (
              <span className={styles.stepGo} aria-hidden="true">
                {step.external}
                <Icon name="external" size={14} />
              </span>
            ) : step.href ? (
              <span className={styles.stepGo} aria-hidden="true">
                See how
                <Icon name="arrowRight" size={16} />
              </span>
            ) : null;
            const body = (
              <>
                <span className={`${styles.stepNumber} num`} aria-hidden="true">
                  {start + index}
                </span>
                <span className={styles.stepBody}>
                  <Kicker step={step} index={index} />
                  <span className={styles.stepTitle}>
                    {step.icon ? <span className={styles.stepIcon}>{step.icon}</span> : null}
                    {step.title}
                  </span>
                  {step.detail ? <span className={styles.stepDetail}>{step.detail}</span> : null}
                  {step.extra ? <span className={styles.stepExtra}>{step.extra}</span> : null}
                </span>
                {step.aside ? (
                  <span className={styles.stepEnd}>
                    <span className={styles.stepAside}>{step.aside}</span>
                    {go}
                  </span>
                ) : (
                  go
                )}
              </>
            );
            return (
              <li key={step.key}>
                {step.href && step.external ? (
                  <a href={step.href} target="_blank" rel="noreferrer" className={`${styles.step} ${styles.stepLink}`}>
                    {body}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                ) : step.href ? (
                  <Link href={step.href} scroll={!step.href.startsWith('?')} className={`${styles.step} ${styles.stepLink}`}>
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

// Home's demand highlight in one card: the fastest rising course or career in your city this
// month, how much it rose, and where it was found (every insight shows its source).

import Link from 'next/link';
import { Source } from '@/components/demand/Source';
import { Icon } from '@/components/ui/Icon';
import { KpiNumber } from '@/components/ui/Kpi';
import { countWords } from '@/demand/text';
import { formatMonth } from '@/domain/format';
import styles from './home.module.css';

export interface DemandHighlightData {
  text: string;
  changePct: number | null;
  count: number;
  sourceUrl: string;
  programName: string;
  region: string;
  /** 'YYYY-MM'. */
  month: string;
}

export function DemandCard({ highlight, demandHref, place }: { highlight: DemandHighlightData | null; demandHref: string | null; place: string }) {
  const rounded = highlight?.changePct === null || highlight?.changePct === undefined ? null : Math.round(highlight.changePct);
  return (
    <section className={`${styles.card} ${styles.demandCard}`} aria-labelledby="home-demand-title">
      <div className={styles.cardHead}>
        <h2 id="home-demand-title" className={styles.cardTitle}>
          What students want
        </h2>
        {demandHref && highlight ? (
          <Link href={demandHref} className={styles.headLink}>
            Open Demand
            <Icon name="arrowRight" size={16} />
          </Link>
        ) : null}
      </div>
      {highlight ? (
        <>
          <p className={styles.cardText}>Rising fastest in {place} this month.</p>
          {rounded === null ? (
            <p className={styles.newTrend}>New this month</p>
          ) : (
            <KpiNumber
              icon={<Icon name={rounded < 0 ? 'arrowDown' : rounded > 0 ? 'arrowUp' : 'equal'} size={20} />}
              value={`${Math.abs(rounded)}%`}
              suffix={rounded < 0 ? 'down since last month' : rounded > 0 ? 'up since last month' : 'same as last month'}
            />
          )}
          <p className={styles.trendName}>{highlight.text}</p>
          <p className={styles.trendMeta}>
            <span>
              {highlight.programName} in {highlight.region}, {formatMonth(highlight.month)}
            </span>
            <span>{countWords('rising', highlight.count)}</span>
            <Source url={highlight.sourceUrl} platform="trends" />
          </p>
        </>
      ) : (
        <p className={styles.cardText}>Your first Demand pull is on its way. It shows here once it is ready.</p>
      )}
    </section>
  );
}

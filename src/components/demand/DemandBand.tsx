// "This month": the one band at the top of the Demand page. The fastest rising course or career
// in large type, what students worry about most, and the season clock. Free's band holds its
// one rising trend only.

import { Icon } from '@/components/ui/Icon';
import { countWords, worrySentence } from '@/demand/text';
import { seasonClock } from '@/demand/season';
import type { DemandView } from '@/demand/view';
import type { Highlight } from '@/lib/demand/load';
import { SeasonClock } from './SeasonClock';
import { Source } from './Source';
import audit from '@/components/audit/audit.module.css';
import styles from './demand.module.css';

interface Trend {
  text: string;
  changePct: number | null;
  count: number;
  sourceUrl: string;
  programName: string;
  platform?: unknown;
}

function TrendBlock({ trend, place, showProgram }: { trend: Trend | null; place: string; showProgram: boolean }) {
  if (!trend) {
    return (
      <div className={styles.trend}>
        <h2 id="month-title" className={audit.scoreCaption}>
          Rising in {place}
        </h2>
        <p className={styles.trendName}>Nothing is rising sharply this month.</p>
      </div>
    );
  }
  return (
    <div className={styles.trend}>
      <h2 id="month-title" className={audit.scoreCaption}>
        Rising fastest in {place}
      </h2>
      <p className={audit.scoreLine}>
        <span className={`${audit.scoreNumber} num`}>{Math.round(trend.changePct ?? 0)}%</span>
        <span className={audit.scoreOutOf}>up since last month</span>
      </p>
      <p className={styles.trendName}>{trend.text}</p>
      <p className={styles.trendMeta}>
        {showProgram ? <span>{trend.programName}</span> : null}
        <span>{countWords('rising', trend.count)}</span>
        <Source url={trend.sourceUrl} platform={trend.platform ?? 'trends'} />
      </p>
    </div>
  );
}

export function DemandBand({ view, place, showProgram, today }: { view: DemandView; place: string; showProgram: boolean; today: Date }) {
  const sentence = worrySentence(place, view.asksMost);
  return (
    <section className={audit.band} aria-labelledby="month-title">
      <div className={styles.trend}>
        <TrendBlock
          trend={view.topTrend ? { ...view.topTrend, platform: view.topTrend.meta.platform } : null}
          place={place}
          showProgram={showProgram}
        />
        {sentence ? <p className={styles.worrySentence}>{sentence}</p> : null}
      </div>
      {view.season.length ? <SeasonClock clock={seasonClock(view.season, today)} stages={view.season} /> : null}
    </section>
  );
}

export function FreeDemandBand({ highlight, place }: { highlight: Highlight | null; place: string }) {
  return (
    <section className={styles.bandSolo} aria-labelledby="month-title">
      <TrendBlock trend={highlight} place={place} showProgram />
      <p className={styles.freeNote}>
        <Icon name="info" size={14} />
        One rising trend a month comes with Free, for your Free program in your city.
      </p>
    </section>
  );
}

// Home's "1 demand highlight" (spec section 13): the fastest rising course or career in your
// city this month, on every plan. Free's comes from its Free program.

import { Card } from '@/components/ui/Layout';
import { changeWords, countWords } from '@/demand/text';
import { formatMonth } from '@/domain/format';
import type { Highlight } from '@/lib/demand/load';
import { Source } from './Source';
import audit from '@/components/audit/audit.module.css';
import styles from './demand.module.css';

export function DemandHighlight({ highlight }: { highlight: Highlight | null }) {
  return (
    <Card>
      {highlight ? (
        <div className={styles.highlight}>
          <p className={styles.highlightTop}>
            <span className={styles.highlightChange}>{changeWords(highlight.changePct)}</span>
            <span className={audit.fixTitle}>{highlight.text}</span>
          </p>
          <p className={styles.trendMeta}>
            <span>
              {highlight.programName} in {highlight.region}, {formatMonth(highlight.month)}
            </span>
            <span>{countWords('rising', highlight.count)}</span>
            <Source url={highlight.sourceUrl} platform="trends" />
          </p>
        </div>
      ) : (
        <p className={audit.quietNote}>Your first Demand pull is on its way. It shows here once it is ready.</p>
      )}
    </Card>
  );
}

// The Reports page parts: the latest report as a band with one download button and what is
// inside, earlier reports as rows, and Free's one unlock card. Downloads are plain links: the
// server checks who is asking and hands over a short-lived link to the file.

import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatMonth } from '@/domain/format';
import { reportFacts, type ReportRow } from '@/lib/reports/load';
import audit from '@/components/audit/audit.module.css';
import styles from './report.module.css';

const href = (report: ReportRow) => `/reports/${report.month}`;

/** The report's pages, in the order of spec section 12. */
export function reportContents(place: string): string[] {
  return [
    'Your score and how it changed',
    "What's working",
    'What to fix, ranked',
    'Program by program',
    'You and your rivals',
    `What students in ${place} want`,
    '3 things to do this month',
    'Sources and dates checked',
  ];
}

export function LatestReport({ report, place }: { report: ReportRow; place: string }) {
  return (
    <section className={audit.band} aria-labelledby="latest-title">
      <div className={styles.latest}>
        <h2 id="latest-title" className={audit.scoreCaption}>
          Latest report
        </h2>
        <p className={styles.month}>{formatMonth(report.month)}</p>
        <p className={styles.facts}>
          <span>Made {formatDate(report.madeAt)}</span>
          {reportFacts(report).map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </p>
        <AnchorButton href={href(report)} icon="download" className={styles.download}>
          Download PDF
        </AnchorButton>
      </div>
      <div className={styles.inside}>
        <h3 className={styles.insideTitle}>What&apos;s inside</h3>
        <ol className={styles.insideList}>
          {reportContents(place).map((item, index) => (
            <li key={item} className={styles.insideItem}>
              <span className={styles.insideNumber}>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function EarlierReports({ reports }: { reports: readonly ReportRow[] }) {
  return (
    <div className={styles.rows}>
      {reports.map((report) => (
        <div key={report.month} className={styles.row}>
          <p className={styles.rowMonth}>
            {formatMonth(report.month)}
            <span className={styles.rowFacts}>{[`Made ${formatDate(report.madeAt)}`, ...reportFacts(report)].join('  ·  ')}</span>
          </p>
          <AnchorButton href={href(report)} variant="secondary" size="sm" icon="download">
            <span className="visually-hidden">{formatMonth(report.month)} </span>PDF
          </AnchorButton>
        </div>
      ))}
    </div>
  );
}

/** Free: what the monthly report holds, with the one "Unlock with Paid" action on the page. */
export function ReportsUnlockCard({ place }: { place: string }) {
  const items = [
    'One PDF on the 1st of every month, for the month just ended',
    'Your score, what is working and what to fix, ranked',
    'Every program, side by side',
    'You against your rivals, with their key moves',
    `What students in ${place} ask and search for`,
    '3 things to do this month, and where every result was found',
  ];
  return (
    <section className={audit.unlock} aria-labelledby="unlock-title">
      <div className={audit.unlockText}>
        <h2 id="unlock-title" className={audit.unlockTitle}>
          Paid gets a monthly report, readable in 5 minutes
        </h2>
        <ul className={audit.unlockList}>
          {items.map((item) => (
            <li key={item} className={audit.unlockItem}>
              <Icon name="lock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <ButtonLink href="/plan" iconAfter="arrowRight">
        Unlock with Paid
      </ButtonLink>
    </section>
  );
}

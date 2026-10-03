// The Reports page parts: the latest report in one card (the month, its score and change, one
// download button and what is inside), earlier reports as rows in one card, and Free's one unlock
// card. Downloads are plain links: the server checks who is asking and hands over a short-lived
// link to the file.

import { Sparkline } from '@/components/charts/Sparkline';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { KpiNumber } from '@/components/ui/Kpi';
import { Counted, Delta } from '@/components/ui/Results';
import { formatDate, formatMonth } from '@/domain/format';
import { reportFacts, type ReportRow } from '@/lib/reports/load';
import audit from '@/components/audit/audit.module.css';
import styles from './report.module.css';

const href = (report: ReportRow) => `/reports/${report.month}`;
/** The public sample PDF, served by app/(product)/drishti/sample-report.pdf. */
const SAMPLE_REPORT_HREF = '/drishti/sample-report.pdf';

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

export interface ReportScore {
  score: number;
  change: number | null;
  /** 'YYYY-MM' of the month the change is measured from. */
  since: string | null;
}

function Facts({ report }: { report: ReportRow }) {
  return (
    <>
      <span>Made {formatDate(report.madeAt)}</span>
      {reportFacts(report).map((fact) => (
        <span key={fact}>
          <Counted text={fact} />
        </span>
      ))}
    </>
  );
}

/**
 * The latest report: the month and its score with the months before it as a small line, the one
 * download button, then what is inside.
 */
export function LatestReport({
  report,
  place,
  score,
  trend = [],
}: {
  report: ReportRow;
  place: string;
  score: ReportScore | null;
  trend?: ReadonlyArray<{ month: string; score: number }>;
}) {
  const first = trend[0];
  const last = trend.at(-1);
  return (
    <section className={styles.latest} aria-labelledby="latest-title">
      <div className={styles.latestTop}>
        <div className={styles.latestMain}>
          <h2 id="latest-title" className={styles.label}>
            Latest report
          </h2>
          <p className={styles.month}>{formatMonth(report.month)}</p>
          <p className={styles.facts}>
            <Facts report={report} />
          </p>
          <AnchorButton href={href(report)} icon="download" className={styles.download}>
            Download PDF
          </AnchorButton>
        </div>
        {score ? (
          <div className={styles.latestScore}>
            <p className={styles.label}>Score in this report</p>
            <KpiNumber value={score.score} suffix="/100" numericSuffix spoken=" out of 100" />
            {score.change !== null && score.since ? <Delta change={score.change} since={formatMonth(score.since)} size="sm" /> : null}
            {first && last && trend.length > 1 ? (
              <figure className={styles.trend}>
                <Sparkline
                  values={trend.map((point) => point.score)}
                  months={trend.map((point) => point.month)}
                  label={`Overall score by month, ${formatMonth(first.month)} to ${formatMonth(last.month)}`}
                  width={196}
                  height={72}
                />
              </figure>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={styles.inside}>
        <h3 className={styles.label}>What&apos;s inside</h3>
        <ol className={styles.insideList}>
          {reportContents(place).map((item, index) => (
            <li key={item} className={styles.insideItem}>
              <span className={`${styles.insideNumber} num`}>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Earlier reports, newest first: one row each, in one card. */
export function EarlierReports({ reports, scores }: { reports: readonly ReportRow[]; scores: ReadonlyMap<string, ReportScore> }) {
  return (
    <ul className={styles.rows}>
      {reports.map((report) => {
        const score = scores.get(report.month);
        return (
          <li key={report.month} className={styles.row}>
            <p className={styles.rowMonth}>
              {formatMonth(report.month)}
              <span className={styles.rowFacts}>
                <Facts report={report} />
              </span>
            </p>
            {score ? (
              <p className={styles.rowScore}>
                <span className="num">{score.score}</span>
                <span className={`${styles.rowOutOf} num`}>/100</span>
                <span className="visually-hidden"> out of 100</span>
              </p>
            ) : (
              <span />
            )}
            <AnchorButton href={href(report)} variant="secondary" size="sm" icon="download">
              <span className="visually-hidden">{formatMonth(report.month)} </span>PDF
            </AnchorButton>
          </li>
        );
      })}
    </ul>
  );
}

/** Free: what the monthly report holds, with the one "Unlock with Paid" action and the sample. */
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
      <div className={styles.unlockActions}>
        <ButtonLink href="/plan" iconAfter="arrowRight">
          Unlock with Paid
        </ButtonLink>
        <a href={SAMPLE_REPORT_HREF} className={audit.headLink} download>
          <Icon name="download" size={16} />
          See a sample report
        </a>
      </div>
    </section>
  );
}

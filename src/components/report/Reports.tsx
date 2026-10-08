// The Reports page parts (spec sections 12, 13 and 24): each month's summary with its PDF, the
// latest in full (how you're doing, the 3 things to do, one rival move, a Client's enquiries) and
// earlier months folded, and Free's one unlock card. Downloads are plain links: the server checks
// who is asking and hands over a short-lived link to the file.

import type { ReactNode } from 'react';
import { AnchorButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Counted, WordScore } from '@/components/ui/Results';
import { formatDate, formatMonth } from '@/domain/format';
import { reportFacts, type ReportRow } from '@/lib/reports/load';
import { THING_SOURCE_LABELS } from '@/report/things';
import { summaryWordText, type MonthlySummary } from '@/report/summary';
import audit from '@/components/audit/places.module.css';
import styles from './report.module.css';

const href = (report: ReportRow) => `/reports/${report.month}`;
/** The public sample PDF, served by app/(product)/drishti/sample-report.pdf. */
const SAMPLE_REPORT_HREF = '/drishti/sample-report.pdf';

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

/** A month's summary: how you're doing, the 3 things to do, one rival move and a Client's enquiries. */
export function SummaryBody({ summary }: { summary: MonthlySummary }) {
  return (
    <div className={styles.summary}>
      <p className={styles.wordsLine}>{summary.lines.words}</p>
      <div className={styles.words}>
        {summary.words.map((word) => (
          <div key={word.pillar} className={styles.word}>
            <span className={styles.wordName}>{word.name}</span>
            <span className={styles.wordValue}>{word.score === null ? word.word : <WordScore score={word.score} size="md" />}</span>
            <span className={styles.wordNote}>{word.note}</span>
          </div>
        ))}
      </div>
      {summary.lines.things.length ? (
        <div className={styles.part}>
          <h3 className={audit.miniTitle}>Do these 3 things this month</h3>
          <ol className={styles.things}>
            {summary.lines.things.map((title, index) => (
              <li key={title} className={styles.thing}>
                <span className={`${styles.thingIndex} num`} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.thingBody}>
                  <span className={styles.thingSource}>{THING_SOURCE_LABELS[summary.things[index]?.source ?? 'audit']}</span>
                  <span className={styles.thingTitle}>{title}</span>
                  {summary.things[index]?.meta ? <span className={audit.quiet}>{summary.things[index]?.meta}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className={styles.pair}>
        <div className={styles.part}>
          <h3 className={audit.miniTitle}>One rival move</h3>
          <p className={styles.line}>{summary.lines.move}</p>
        </div>
        {summary.lines.enquiries ? (
          <div className={styles.part}>
            <h3 className={audit.miniTitle}>Your enquiries</h3>
            <p className={styles.line}>{summary.lines.enquiries}</p>
          </div>
        ) : null}
        {summary.brain ? (
          <div className={styles.part}>
            <h3 className={audit.miniTitle}>Your Brain</h3>
            <p className={styles.line}>{summary.brain}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The latest month: its name, the one download button and what it holds, then its summary. */
export function LatestMonth({ report }: { report: ReportRow }) {
  return (
    <section className={audit.card} aria-labelledby="latest-title">
      <div className={styles.head}>
        <div className={styles.headText}>
          <p className={audit.miniTitle}>Latest month</p>
          <h2 id="latest-title" className={styles.month}>
            {formatMonth(report.month)}
          </h2>
          <p className={styles.facts}>
            <Facts report={report} />
          </p>
        </div>
        <AnchorButton href={href(report)} icon="download">
          Download PDF
        </AnchorButton>
      </div>
      {report.summary ? <SummaryBody summary={report.summary} /> : <p className={audit.quiet}>This month’s report is in the PDF.</p>}
    </section>
  );
}

/** Earlier months, newest first: each with its three words and its PDF, the summary folded under it. */
export function EarlierMonths({ reports }: { reports: readonly ReportRow[] }) {
  return (
    <ul className={`${audit.card} ${styles.rows}`}>
      {reports.map((report) => (
        <li key={report.month} className={styles.row}>
          <div className={styles.rowHead}>
            <p className={styles.rowMonth}>
              {formatMonth(report.month)}
              <span className={styles.rowFacts}>
                {report.summary ? <span>{report.summary.words.map(summaryWordText).join(', ')}</span> : null}
                <Facts report={report} />
              </span>
            </p>
            <AnchorButton href={href(report)} variant="secondary" size="sm" icon="download">
              <span className="visually-hidden">{formatMonth(report.month)} </span>PDF
            </AnchorButton>
          </div>
          {report.summary ? (
            <details className={styles.fold}>
              <summary className={styles.foldSummary}>
                <Icon name="chevronDown" size={14} />
                The {formatMonth(report.month).split(' ')[0]} summary
              </summary>
              <SummaryBody summary={report.summary} />
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Free: what the monthly summary and report hold, with the one "Subscribe now" action and the sample. */
export function ReportsUnlockCard({ place, action }: { place: string; action: ReactNode }) {
  const items = [
    'A summary and a PDF on the 1st of every month, for the month just ended',
    'How you are doing, and the 3 things to do this month',
    'What the internet says, place by place, with what to fix first',
    'You against your rivals, with their moves',
    `What students in ${place} ask and search for, and what to make`,
    'The summary by email to you and your team',
  ];
  return (
    <section className={audit.unlock} aria-labelledby="unlock-title">
      <div>
        <h2 id="unlock-title" className={audit.unlockTitle}>
          Paid gets a monthly summary and report, readable in 5 minutes
        </h2>
        <ul className={audit.unlockList}>
          {items.map((item) => (
            <li key={item}>
              <Icon name="lock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.unlockActions}>
        {action}
        <a href={SAMPLE_REPORT_HREF} className={styles.sampleLink} download>
          <Icon name="download" size={16} />
          See a sample report
        </a>
      </div>
    </section>
  );
}

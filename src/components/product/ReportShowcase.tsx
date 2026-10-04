// The sample report section: three of its pages drawn from the same data as the PDF (the black
// cover with Visibility, Trust and Chosen, This month in short, and what to fix with the sources),
// fanned out on the ivory, and the download of the full sample PDF. The drawn pages are decoration
// for sighted readers; the words beside them say what they show.

import { AnchorButton } from '@/components/ui/Button';
import { EyeName } from '@/components/ui/Eye';
import type { ReportData } from '@/report/data';
import { THING_SOURCE_LABELS } from '@/report/things';
import { REPORT } from '@/product/content';
import site from '@/components/site/site.module.css';
import { Title } from './Sections';
import papers from './papers.module.css';
import styles from './product.module.css';

export const SAMPLE_REPORT_PATH = '/drishti/sample-report.pdf';

/** The lockup as the PDF's cover has it, with the eye still (a picture), alone at this small size. */
function Lockup() {
  return (
    <span className={papers.lockup}>
      <EyeName lashes={false}>
        <span className={papers.lockupProduct}>Drishti</span>
      </EyeName>{' '}
      <span className={papers.lockupBy}>by AdmitLabs</span>
    </span>
  );
}

function Footer({ data }: { data: ReportData }) {
  return <p className={papers.footer}>{['Drishti by AdmitLabs', data.institution.name, data.monthLabel, data.sample].filter(Boolean).join('  ·  ')}</p>;
}

function Cover({ data }: { data: ReportData }) {
  return (
    <div className={`${papers.page} ${papers.cover}`} data-theme="dark">
      <div className={papers.sheet}>
        <div className={papers.row}>
          <Lockup />
          <span className={papers.over}>Sample report</span>
        </div>
        <p className={papers.month}>{data.monthLabel}</p>
        <p className={papers.name}>{data.institution.name}</p>
        <p className={papers.place}>{data.institution.place}</p>
        {data.sample ? <p className={papers.sample}>{data.sample}</p> : null}
        <span className={papers.spacer} />
        <span className={papers.rule} />
        <p className={papers.over}>Visibility, Trust and Chosen</p>
        <div className={papers.bars}>
          {data.words.map((word) => (
            <p key={word.pillar} className={papers.barHead}>
              <span>{word.name}</span>
              <span className={papers.barValue}>{word.word}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The report's "This month in short" page: the three words, then the 3 things to do. */
function Summary({ data }: { data: ReportData }) {
  return (
    <div className={`${papers.page} ${papers.summary}`} data-theme="light">
      <div className={papers.sheet}>
        <p className={papers.over}>This month in short</p>
        <p className={papers.title}>{data.monthName} in short</p>
        <p className={papers.verdict}>{data.summary.lines.words}</p>
        <div className={papers.bars}>
          {data.words.map((word) => (
            <p key={word.pillar} className={papers.barHead}>
              <span>{word.name}</span>
              <span className={papers.barValue}>{word.word}</span>
            </p>
          ))}
        </div>
        <ol className={papers.block}>
          {data.summary.lines.things.map((title, index) => (
            <li key={title} className={papers.blockItem}>
              <span className={`${papers.blockNumber} num`}>{index + 1}</span>
              <span>
                <span className={papers.blockSource}>{THING_SOURCE_LABELS[data.summary.things[index]?.source ?? 'audit']}</span>
                <span className={papers.blockTitle}>{title}</span>
              </span>
            </li>
          ))}
        </ol>
        <span className={papers.spacer} />
        <Footer data={data} />
      </div>
    </div>
  );
}

/** What to fix first, and the sources and dates checked. */
function Things({ data }: { data: ReportData }) {
  return (
    <div className={`${papers.page} ${papers.things}`} data-theme="light">
      <div className={papers.sheet}>
        <p className={papers.over}>What to fix</p>
        <p className={papers.title}>What to fix, by impact</p>
        <ol className={papers.list}>
          {data.fixes.slice(0, 3).map((fix) => (
            <li key={fix.rank} className={papers.item}>
              <span className={`${papers.itemNumber} num`}>{fix.rank}</span>
              <span>{fix.title}</span>
            </li>
          ))}
        </ol>
        <p className={papers.over} style={{ marginTop: '3cqi' }}>
          Sources and dates checked
        </p>
        <ul className={papers.list}>
          {data.sources.map((note) => (
            <li key={note.label} className={papers.source}>
              <span className={papers.itemNumber}>{note.label}</span>
              <span>{note.text}</span>
            </li>
          ))}
        </ul>
        <span className={papers.spacer} />
        <Footer data={data} />
      </div>
    </div>
  );
}

export function ReportShowcase({ data }: { data: ReportData }) {
  return (
    <section id="report" className={styles.report} data-theme="light" aria-labelledby="report-title">
      <div className={site.container}>
        <Title id="report-title" lines={REPORT.title} light={false} className={site.reveal} />
      </div>
      <div className={`${site.container} ${styles.reportGrid}`}>
        <div className={`${styles.reportHead} ${site.reveal}`}>
          <p className={`${site.lede} ${styles.lede}`}>{REPORT.lede}</p>
          <div className={styles.download}>
            <AnchorButton href={SAMPLE_REPORT_PATH} download icon="download" size="lg" className={site.ctaInk}>
              {REPORT.download}
            </AnchorButton>
            <span className={styles.sampleNote}>{REPORT.note}</span>
          </div>
        </div>
        <div className={papers.stack} aria-hidden="true">
          <Cover data={data} />
          <Summary data={data} />
          <Things data={data} />
        </div>
      </div>
    </section>
  );
}

// The summary band: the big score with its label and change, the verdict in one sentence,
// and the three pillars as compact cards. How we're doing, in one look.

import { auditVerdict } from '@/audit/verdict';
import type { AuditView } from '@/audit/view';
import { Delta, ScoreLabel } from '@/components/ui/Results';
import { PILLAR_LABELS, PILLARS } from '@/domain/types';
import styles from './audit.module.css';

function shortChange(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return 'No change';
  return `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)}`;
}

/** `showChange` off leaves out every change, for an Audit seen on its own (a shared Audit). */
export function SummaryBand({ view, caption = 'Overall score', showChange = true }: { view: AuditView; caption?: string; showChange?: boolean }) {
  // The first Audit says so once, on the overall score. When the programs changed, the overall
  // change is left out rather than comparing different things.
  const overallChange = view.programsChanged || !showChange ? undefined : view.changes.overall;
  const quiet = view.firstAudit || view.programsChanged || !showChange;
  return (
    <section className={styles.band} aria-labelledby="summary-title">
      <h2 id="summary-title" className="visually-hidden">
        Summary
      </h2>
      <div className={styles.scoreBlock}>
        <p className={styles.scoreCaption}>{caption}</p>
        <p className={styles.scoreLine}>
          <span className={styles.scoreNumber}>{view.scores.overall}</span>
          <span className={styles.scoreOutOf}>/ 100</span>
        </p>
        <div className={styles.scoreMeta}>
          <ScoreLabel label={view.label} />
          {overallChange !== undefined ? <Delta change={overallChange} /> : null}
        </div>
        <p className={styles.verdict}>{auditVerdict(view.scores)}</p>
        {view.programsChanged ? <p className={styles.bandNote}>Your programs changed since the last Audit, so each program shows its own change.</p> : null}
      </div>
      <ul className={styles.pillars}>
        {PILLARS.map((pillar) => {
          const score = view.scores[pillar];
          const change = quiet ? null : shortChange(view.changes[pillar]);
          return (
            <li key={pillar} className={styles.pillar}>
              <span className={styles.pillarName}>{PILLAR_LABELS[pillar]}</span>
              <span className={styles.pillarScore}>
                {score}
                <span className="visually-hidden"> out of 100</span>
              </span>
              <span className={styles.pillarTrack} aria-hidden="true">
                <span className={styles.pillarFill} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
              </span>
              {change ? <span className={styles.pillarChange}>{change}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// One rival's summary band: their score with its label and change, the verdict (you against
// them), two facts (their admission push and their review trend), and the pillars side by side.

import { HeadToHead } from '@/components/charts/HeadToHead';
import { Delta, ScoreLabel } from '@/components/ui/Results';
import { PILLAR_LABELS } from '@/domain/types';
import type { ScoreSet } from '@/rivals/compare';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

interface RivalBandProps {
  rivalName: string;
  them: ScoreSet;
  change: number | null;
  you: ScoreSet | null;
  verdict: string;
  facts: ReadonlyArray<{ label: string; value: string; sub?: string | null }>;
}

export function RivalBand({ rivalName, them, change, you, verdict, facts }: RivalBandProps) {
  return (
    <section className={audit.band} aria-labelledby="summary-title">
      <div className={audit.scoreBlock}>
        <h2 id="summary-title" className={audit.scoreCaption}>
          Their overall score
        </h2>
        <p className={audit.scoreLine}>
          <span className={audit.scoreNumber}>{them.overall}</span>
          <span className={audit.scoreOutOf}>/ 100</span>
        </p>
        <div className={audit.scoreMeta}>
          <ScoreLabel score={them.overall} />
          {change !== null ? <Delta change={change} since="last month" /> : null}
        </div>
        {verdict ? <p className={audit.verdict}>{verdict}</p> : null}
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt className={styles.factLabel}>{fact.label}</dt>
              <dd className={styles.factValue}>
                {fact.value}
                {fact.sub ? <span className={styles.factSub}>{fact.sub}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {you ? (
        <HeadToHead
          rivalName={rivalName}
          youName="You"
          rows={[
            { label: 'Overall', you: you.overall, rival: them.overall },
            { label: PILLAR_LABELS.discovered, you: you.discovered, rival: them.discovered },
            { label: PILLAR_LABELS.trusted, you: you.trusted, rival: them.trusted },
            { label: PILLAR_LABELS.chosen, you: you.chosen, rival: them.chosen },
          ]}
        />
      ) : null}
    </section>
  );
}

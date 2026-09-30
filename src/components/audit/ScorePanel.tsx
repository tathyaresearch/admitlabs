import type { AuditView } from '@/audit/view';
import { PillarScores, ScoreHero } from '@/components/ui/Data';
import { Card } from '@/components/ui/Layout';
import styles from './audit.module.css';

/** The overall score (the one big number), the three pillars and the change since the last Audit. */
export function ScorePanel({ view, caption = 'Overall score' }: { view: AuditView; caption?: string }) {
  // The first Audit says so once, on the overall score. When the programs changed, the overall
  // change is left out rather than comparing different things.
  const overall = view.programsChanged ? undefined : view.changes.overall;
  const pillar = (value: number | null) => (view.firstAudit || view.programsChanged ? undefined : value);
  return (
    <Card padding="lg">
      <div className={styles.scoreCard}>
        <div>
          <ScoreHero score={view.scores.overall} change={overall} caption={caption} />
          {view.programsChanged ? (
            <p className={styles.scoreNote}>Your programs changed since the last Audit, so each program shows its own change instead.</p>
          ) : null}
        </div>
        <PillarScores
          scores={[
            { pillar: 'discovered', score: view.scores.discovered, change: pillar(view.changes.discovered) },
            { pillar: 'trusted', score: view.scores.trusted, change: pillar(view.changes.trusted) },
            { pillar: 'chosen', score: view.scores.chosen, change: pillar(view.changes.chosen) },
          ]}
        />
      </div>
    </Card>
  );
}

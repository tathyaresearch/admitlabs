// Real-looking screen previews for the product page: the dashboard's own components, filled with
// the sample institution's data, inside an app window. They can't be focused or clicked, and
// screen readers get a short summary instead. Every preview says it is sample data.

import type { ReactNode } from 'react';
import { SummaryBand } from '@/components/audit/SummaryBand';
import { FixCards } from '@/components/audit/Lists';
import { DemandBand } from '@/components/demand/DemandBand';
import { IdeaCards } from '@/components/demand/IdeaCards';
import { MovesList } from '@/components/rivals/Activity';
import { PaidStandBand } from '@/components/rivals/StandBand';
import { ProductLockup } from '@/components/ui/Brand';
import type { Showcase } from '@/product/showcase';
import styles from './product.module.css';

export const SAMPLE_CAPTION = 'Sample institution. Fictional data.';

export function Preview({ screen, summary, children }: { screen: string; summary: string; children: ReactNode }) {
  return (
    <figure className={styles.preview}>
      <div className={styles.frame} data-theme="dark">
        <div className={styles.frameBar} aria-hidden="true">
          <ProductLockup size="sm" />
          <span className={styles.frameDivider} />
          <span className={styles.frameTitle}>{screen}</span>
        </div>
        <div className={styles.screen} aria-hidden="true" inert>
          {children}
        </div>
      </div>
      <figcaption className={styles.previewCaption}>
        <span className="visually-hidden">{summary} </span>
        {SAMPLE_CAPTION}
      </figcaption>
    </figure>
  );
}

export function AuditSummaryPreview({ showcase }: { showcase: Showcase }) {
  const { audit, institution } = showcase;
  return (
    <Preview
      screen="Home"
      summary={`${institution.name}: overall score ${audit.scores.overall} out of 100, ${audit.label}. Discovered ${audit.scores.discovered}, Trusted ${audit.scores.trusted}, Chosen ${audit.scores.chosen}.`}
    >
      <SummaryBand view={audit} />
    </Preview>
  );
}

export function FixesPreview({ showcase }: { showcase: Showcase }) {
  const fixes = showcase.audit.fixes.slice(0, 3);
  return (
    <Preview screen="Audit" summary={`The top 3 fixes, ranked by the points each could add: ${fixes.map((item) => item.name).join(', ')}.`}>
      <FixCards items={fixes} />
    </Preview>
  );
}

export function RivalsPreview({ showcase }: { showcase: Showcase }) {
  const { rivals, institution } = showcase;
  return (
    <Preview screen="Rivals" summary={rivals.verdict}>
      <PaidStandBand rows={rivals.rows} verdict={rivals.verdict} youName={institution.name} />
      <MovesList moves={rivals.moves.slice(0, 2)} names={rivals.names} />
    </Preview>
  );
}

export function DemandPreview({ showcase }: { showcase: Showcase }) {
  const { view, place, today } = showcase.demand;
  const top = view.topTrend;
  return (
    <Preview screen="Demand" summary={top ? `Rising fastest in ${place}: ${top.text}, up ${Math.round(top.changePct ?? 0)}% since last month.` : `What students in ${place} want.`}>
      <DemandBand view={view} place={place} showProgram today={today} />
      <IdeaCards ideas={view.ideas.slice(0, 3)} showProgram />
    </Preview>
  );
}

// The Audit screen, readable in ten seconds (spec 7.6 and 13):
//   1. How we're doing: the summary band (score, verdict, three pillars)
//   2. What to fix first: three numbered cards, the rest folded under "See all"
//   3. What's working: a short, quiet list
//   4. Where the detail is: all 17 checks by pillar, each opening the side panel
//   5. Score history, small, at the bottom
// Free gets one "Paid shows the full picture" card instead of locked areas across the page.

import { Suspense, type ReactNode } from 'react';
import type { AuditView } from '@/audit/view';
import { limitFor } from '@/config/entitlements';
import { plural } from '@/domain/format';
import type { Tier } from '@/domain/types';
import { AuditHeader, SectionHead } from './AuditHeader';
import { CheckPanel } from './CheckPanel';
import { ChecksTable } from './ChecksTable';
import { HistorySection, type HistoryEntry } from './HistorySection';
import { FixCards, FixRows, Folded, WorkingRows } from './Lists';
import { ProgramTabs, type ProgramEntry } from './Programs';
import { SummaryBand } from './SummaryBand';
import { UnlockCard } from './UnlockCard';
import styles from './audit.module.css';

const TOP_FIXES = 3;
const SHOWN_STRENGTHS = 5;

interface AuditScreenProps {
  view: AuditView;
  tier: Tier;
  title: string;
  caption: readonly ReactNode[];
  actions?: ReactNode;
  notice?: ReactNode;
  entries: readonly ProgramEntry[];
  /** "All programs" for Paid and Client; null for Free, which covers one program. */
  allLabel: string | null;
  scoreCaption: string;
  /** Null when the plan has no score history. */
  history: readonly HistoryEntry[] | null;
  historyLabel: string;
}

export function AuditScreen(props: AuditScreenProps) {
  const { view, tier } = props;
  const fixLimit = limitFor('audit_what_to_fix', tier);
  const workingLimit = limitFor('audit_whats_working', tier);
  const fixes = fixLimit === null ? view.fixes : view.fixes.slice(0, fixLimit);
  const working = workingLimit === null ? view.working : view.working.slice(0, workingLimit);
  const hiddenFixes = view.fixes.length - fixes.length;
  const hiddenStrengths = view.working.length - working.length;
  const lockedPrograms = props.entries.filter((entry) => entry.state === 'locked').length;
  const showTabs = props.entries.length > 1 || lockedPrograms > 0;
  // Fold only when it hides more than one strength.
  const foldStrengths = working.length > SHOWN_STRENGTHS + 1;

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <AuditHeader title={props.title} caption={props.caption} actions={props.actions} />
        {props.notice}
        {showTabs ? <ProgramTabs entries={props.entries} active={view.programId} allLabel={props.allLabel} /> : null}
        <SummaryBand view={view} caption={props.scoreCaption} />
      </div>

      <section className={styles.section} aria-labelledby="fix-title">
        <SectionHead id="fix-title" title="Fix these first" help="The changes that could add the most to your score. Open one to see how." />
        {fixes.length ? (
          <Folded
            total={fixes.length}
            noun="fixes"
            shown={<FixCards items={fixes.slice(0, TOP_FIXES)} />}
            rest={fixes.length > TOP_FIXES ? <FixRows items={fixes.slice(TOP_FIXES)} /> : null}
          />
        ) : (
          <p className={styles.quietNote}>Every check is Strong. Keep it that way.</p>
        )}
        {hiddenFixes > 0 ? <p className={styles.quietNote}>{plural(hiddenFixes, 'more fix', 'more fixes')}, ranked, come with Paid.</p> : null}
      </section>

      <section className={styles.section} aria-labelledby="working-title">
        <SectionHead id="working-title" title="What's working" help="Your strengths, ranked by the points they earn." />
        {working.length ? (
          <Folded
            total={working.length}
            noun="strengths"
            shown={<WorkingRows items={foldStrengths ? working.slice(0, SHOWN_STRENGTHS) : working} />}
            rest={foldStrengths ? <WorkingRows items={working.slice(SHOWN_STRENGTHS)} /> : null}
          />
        ) : (
          <p className={styles.quietNote}>Nothing stands out yet. The fixes above are the quickest way to change that.</p>
        )}
      </section>

      {tier === 'free' ? <UnlockCard moreFixes={hiddenFixes} moreStrengths={hiddenStrengths} lockedPrograms={lockedPrograms} /> : null}

      <section className={styles.section} aria-labelledby="checks-title">
        <SectionHead id="checks-title" title="All 17 checks" help="Grouped by pillar. Open any check to see what was found, the source and how to fix it." />
        <ChecksTable view={view} />
      </section>

      {props.history ? (
        <section className={styles.section} aria-labelledby="history-title">
          <SectionHead id="history-title" title="Score history" help="Your score, Audit by Audit." />
          <HistorySection rows={props.history} label={props.historyLabel} />
        </section>
      ) : null}

      <Suspense fallback={null}>
        <CheckPanel rows={view.areas.flatMap((area) => area.rows)} />
      </Suspense>
    </div>
  );
}

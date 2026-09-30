// The Audit screen (spec 7.6 and 13): the score first, then what's working, what to fix,
// area by area, programs and history. Shared by the all-programs view and a program view.
// Everything shown comes from rows the viewer's plan allows; locked areas are placeholders.

import { Suspense, type ReactNode } from 'react';
import type { AuditView } from '@/audit/view';
import { PageHeader, Section } from '@/components/ui/Layout';
import { LockedPanel } from '@/components/ui/LockedPanel';
import { limitFor } from '@/config/entitlements';
import { plural } from '@/domain/format';
import type { Tier } from '@/domain/types';
import { AreaList } from './AreaList';
import { FixList, WorkingList } from './AuditLists';
import { CheckPanel } from './CheckPanel';
import { HistorySection, type HistoryEntry } from './HistorySection';
import { PlaceholderChart, PlaceholderList } from './Placeholders';
import { ProgramScoreList, ProgramTabs, type ProgramEntry } from './Programs';
import { ScorePanel } from './ScorePanel';
import styles from './audit.module.css';

interface AuditScreenProps {
  view: AuditView;
  tier: Tier;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
  notice?: ReactNode;
  entries: readonly ProgramEntry[];
  /** "All programs" for Paid and Client; null for Free, which covers one program. */
  allLabel: string | null;
  showProgramList: boolean;
  nextAuditText: string;
  /** Null when the plan has no score history. */
  history: readonly HistoryEntry[] | null;
  historyLabel: string;
}

export function AuditScreen(props: AuditScreenProps) {
  const { view, tier } = props;
  const workingLimit = limitFor('audit_whats_working', tier);
  const fixLimit = limitFor('audit_what_to_fix', tier);
  const working = workingLimit === null ? view.working : view.working.slice(0, workingLimit);
  const fixes = fixLimit === null ? view.fixes : view.fixes.slice(0, fixLimit);
  const moreWorking = view.working.length - working.length;
  const moreFixes = view.fixes.length - fixes.length;
  const showTabs = props.entries.length > 1 || props.entries.some((entry) => entry.state === 'locked');

  return (
    <div className={styles.page}>
      <PageHeader eyebrow={props.eyebrow} title={props.title} description={props.description} actions={props.actions} meta={props.meta} />

      {props.notice}

      <div className={styles.top}>
        {showTabs ? <ProgramTabs entries={props.entries} active={view.programId} allLabel={props.allLabel} /> : null}
        <ScorePanel view={view} caption={view.programId ? 'Program score' : 'Overall score'} />
      </div>

      <div className={styles.columns}>
        <Section id="working" title="What's working" description="Your strengths first, ranked by the points they earn.">
          {working.length ? (
            <WorkingList items={working} />
          ) : (
            <p className={styles.emptyNote}>Nothing stands out yet. The fixes are the quickest way to change that, starting with the first one.</p>
          )}
          {moreWorking > 0 ? (
            <LockedPanel
              title={`${plural(moreWorking, 'more strength', 'more strengths')}`}
              description="Paid shows every strength, with what was found and where."
              placeholder={<PlaceholderList rows={Math.min(moreWorking, 3)} />}
            />
          ) : null}
        </Section>

        <Section id="fix" title="What to fix" description="Ranked by the points each fix could add to your score.">
          {fixes.length ? <FixList items={fixes} /> : <p className={styles.emptyNote}>Every check is Strong. Keep it that way.</p>}
          {moreFixes > 0 ? (
            <LockedPanel
              title={`${plural(moreFixes, 'more fix', 'more fixes')}, ranked`}
              description="Paid shows the full ranked list, with how to fix each one."
              placeholder={<PlaceholderList rows={Math.min(moreFixes, 3)} />}
            />
          ) : null}
        </Section>
      </div>

      <Section id="areas" title="Area by area" description="Every check with its result. Open one to see what was found, where, and when it was checked.">
        <AreaList view={view} />
      </Section>

      {props.showProgramList ? (
        <Section id="programs" title="By program" description="Each program gets its own score from its own checks and the ones it shares.">
          <ProgramScoreList entries={props.entries} nextAuditText={props.nextAuditText} />
        </Section>
      ) : null}

      <Section id="history" title="Score history" description="How the score has moved, Audit by Audit.">
        {props.history ? (
          <HistorySection rows={props.history} label={props.historyLabel} />
        ) : (
          <LockedPanel
            title="See how your score moves"
            description="Paid keeps every Audit, so you can follow your score month by month."
            placeholder={<PlaceholderChart />}
          />
        )}
      </Section>

      <Suspense fallback={null}>
        <CheckPanel rows={view.areas.flatMap((area) => area.rows)} />
      </Suspense>
    </div>
  );
}

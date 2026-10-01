// The Audit screen answers "How do we look to students?", in the order every page follows:
//   1. The title and the question, then the program tabs.
//   2. The summary: the verdict, the score with its trend, and the three pillars (as on Home).
//   3. What to do next: the top 3 fixes as one numbered list.
//   4. The details in tabs: every fix, what's working, all 17 checks and the score history.
// Free gets one "Paid shows the full picture" card instead of locked areas across the page.

import { Suspense, type ReactNode } from 'react';
import type { AuditView, ListItem } from '@/audit/view';
import { addedByYou, type AddedByYou } from '@/domain/details';
import type { AddedDetails } from '@/lib/details/load';
import { HomeSummary, type ScoreTrend } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { CheckIcon } from '@/components/ui/Marks';
import { PointsValue } from '@/components/ui/Results';
import { Tabs } from '@/components/ui/Tabs';
import { limitFor } from '@/config/entitlements';
import { plural } from '@/domain/format';
import { DIFFICULTY_LABELS, PILLAR_LABELS, type InstitutionType, type Tier } from '@/domain/types';
import { SectionHead } from './AuditHeader';
import { CheckPanel } from './CheckPanel';
import { ChecksTable } from './ChecksTable';
import { HistorySection, type HistoryEntry } from './HistorySection';
import { FixRows, WorkingRows } from './Lists';
import { PartResults } from './Parts';
import { ProgramTabs, type ProgramEntry } from './Programs';
import { UnlockCard } from './UnlockCard';
import styles from './audit.module.css';

const TOP_FIXES = 3;

interface AuditScreenProps {
  view: AuditView;
  tier: Tier;
  caption?: readonly ReactNode[];
  actions?: ReactNode;
  notice?: ReactNode;
  entries: readonly ProgramEntry[];
  /** "All programs" for Paid and Client; null for Free, which covers one program. */
  allLabel: string | null;
  /** "Overall score", or "MBA score" for one program. */
  scoreCaption: string;
  checkedAt: string;
  /** The score by month for the summary's trend line. Null when the plan has no history. */
  trend: ScoreTrend | null;
  /** One quiet line under the score, like "Next free Audit on 10 Dec 2026". */
  note?: string | null;
  /** Every Audit, for the history tab. Null when the plan has no score history. */
  history: readonly HistoryEntry[] | null;
  historyLabel: string;
  /** What the institution added in Settings, shown as added by you on the checks it relates to. */
  details?: AddedDetails | null;
  institutionType: InstitutionType;
}

/** What was added that relates to each part of each check, by the part's check id. */
function addedByPart(view: AuditView, details: AddedDetails | null | undefined, institutionType: InstitutionType): Record<string, AddedByYou> {
  if (!details) return {};
  const byPart: Record<string, AddedByYou> = {};
  for (const row of view.areas.flatMap((area) => area.rows)) {
    for (const part of row.parts) {
      const added = addedByYou(row.key, {
        institution: details.institution,
        program: part.programId ? (details.programs.get(part.programId) ?? null) : null,
        programName: part.programName,
        institutionType,
      });
      if (added) byPart[part.checkId] = added;
    }
  }
  return byPart;
}

/**
 * A fix as a row of the "what to do next" list: its pillar and results, what was found, and the
 * points it could add. It opens the check, or nothing where a page has no check panel.
 */
export function fixStep(item: ListItem, href: string | null = `?check=${item.key}`): NextStep {
  const finding = item.parts.find((part) => part.detail)?.detail?.finding ?? '';
  return {
    key: item.key,
    kicker: (
      <span className={styles.fixKicker}>
        <span>{PILLAR_LABELS[item.pillar]}</span>
        <PartResults parts={item.parts} showNames={item.parts.length > 1} />
      </span>
    ),
    icon: <CheckIcon check={item.key} size={16} />,
    title: item.name,
    detail: finding,
    aside: (
      <span className={styles.fixAside}>
        <PointsValue kind="gain" points={item.points} />
        {item.difficulty ? <span className={styles.fixDifficulty}>{DIFFICULTY_LABELS[item.difficulty]} to fix</span> : null}
      </span>
    ),
    href,
  };
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
  const checks = view.areas.reduce((sum, area) => sum + area.rows.length, 0);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Audit" question="How do we look to students?" caption={props.caption} actions={props.actions} />
        {props.notice}
        {showTabs ? <ProgramTabs entries={props.entries} active={view.programId} allLabel={props.allLabel} /> : null}
      </div>

      <HomeSummary view={view} checkedAt={props.checkedAt} trend={props.trend} note={props.note} scoreLabel={props.scoreCaption} historyLabel={props.historyLabel} />

      <NextSteps
        id="fix"
        icon="wrench"
        title="Fix these first"
        description="The changes that could add the most to your score. Open one to see how."
        steps={fixes.slice(0, TOP_FIXES).map((item) => fixStep(item))}
        action={
          fixes.length > TOP_FIXES ? (
            <a href="#details" className={styles.headLink}>
              See all {fixes.length} fixes
              <Icon name="arrowDown" size={16} />
            </a>
          ) : null
        }
        empty={<p className={styles.quietNote}>Every check is Strong. Keep it that way.</p>}
      />

      {tier === 'free' ? <UnlockCard moreFixes={hiddenFixes} moreStrengths={hiddenStrengths} lockedPrograms={lockedPrograms} /> : null}

      <section id="details" className={styles.section} aria-labelledby="details-title">
        <SectionHead id="details-title" icon="audit" title="The full Audit" help="Every fix, what's working and every check. Open one to see what was found, the source and how to fix it." />
        <Tabs
          label="The full Audit"
          items={[
            {
              id: 'fixes',
              label: 'To fix',
              count: view.fixes.length,
              content: (
                <div className={styles.tabStack}>
                  {fixes.length ? <FixRows items={fixes} /> : <p className={styles.quietNote}>Every check is Strong. Keep it that way.</p>}
                  {hiddenFixes > 0 ? <p className={styles.quietNote}>{plural(hiddenFixes, 'more fix', 'more fixes')}, ranked, come with Paid.</p> : null}
                </div>
              ),
            },
            {
              id: 'working',
              label: "What's working",
              count: view.working.length,
              content: (
                <div className={styles.tabStack}>
                  {working.length ? (
                    <WorkingRows items={working} />
                  ) : (
                    <p className={styles.quietNote}>Nothing stands out yet. The fixes above are the quickest way to change that.</p>
                  )}
                  {hiddenStrengths > 0 ? <p className={styles.quietNote}>{plural(hiddenStrengths, 'more strength', 'more strengths')} come with Paid.</p> : null}
                </div>
              ),
            },
            { id: 'checks', label: 'All checks', count: checks, content: <ChecksTable view={view} /> },
            ...(props.history ? [{ id: 'history', label: 'Score history', content: <HistorySection rows={props.history} label={props.historyLabel} /> }] : []),
          ]}
        />
      </section>

      <Suspense fallback={null}>
        <CheckPanel rows={view.areas.flatMap((area) => area.rows)} added={addedByPart(view, props.details, props.institutionType)} />
      </Suspense>
    </div>
  );
}

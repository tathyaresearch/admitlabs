// The Audit answers "What does the internet say about us?" (spec 7.8 and section 13), as the
// version 2 mock was approved, in this order:
//   1. The title and the question, the line while a new Audit waits for review, the programs.
//   2. Visibility, Trust and Chosen, each with its question and what to fix first, and "What do
//      these mean?".
//   3. Fix these first: the top 3 fixes across every place, by impact.
//   4. The five places as tabs. Inside each: what we found, full width, then what's good and what
//      to fix side by side. What people say and Other places say so kindly when little is found.
//   5. Progress month by month (Paid and Client).
// Free sees its top 3 in full, every result, and the rest as counts and a preview, with one card
// saying what Paid adds. The fix panel opens over the page from any fix or check.

import { Suspense, type ReactNode } from 'react';
import type { AuditPlacesView, FixView, FoundRowView, PlaceView } from '@/audit/places';
import type { ProgressMonth } from '@/audit/progress';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { Tabs } from '@/components/ui/Tabs';
import type { Tier } from '@/domain/types';
import { FixActions, type FixActionHandlers, type FixActionState } from './FixActions';
import { FixPanel, type PanelAdded } from './FixPanel';
import { FixList, FoundList, GoodList, PlaceHead, SectionTitle, ThinState, WordsMeaning, WordTiles } from './PlaceBits';
import { ProgramTabs, type ProgramEntry } from './Programs';
import { ProgressSection, type HistoryEntry } from './ProgressSection';
import styles from './places.module.css';

export interface PlacesAuditProps {
  view: AuditPlacesView;
  tier: Tier;
  caption: readonly ReactNode[];
  /** The extra refresh (Paid owner). */
  actions?: ReactNode;
  /** The line while a newer Audit waits for the team's review. */
  notice?: ReactNode;
  entries: readonly ProgramEntry[];
  /** "All programs" on Paid and Client; null on Free, which covers one program. */
  allLabel: string | null;
  programId: string | null;
  /** Mark as done and Let AdmitLabs fix this. Null where nothing can be done (the team, a shared Audit). */
  state: FixActionState | null;
  handlers: FixActionHandlers | null;
  added?: Readonly<Record<string, readonly PanelAdded[]>>;
  progress: { months: readonly ProgressMonth[]; history: readonly HistoryEntry[]; scoreLabel: string; label: string } | null;
  /** Free: asking for Paid, in the card that says what Paid adds. */
  paidAction?: ReactNode;
}

const fixHref = (fix: FixView) => (fix.open ? `?fix=${encodeURIComponent(fix.id)}` : null);
const rowHref = (row: FoundRowView) => (row.proof ? `?fix=${encodeURIComponent(row.id)}` : null);

/** Free's preview of what Paid shows: placeholder rows, never real data hidden with CSS. */
function Preview({ rows }: { rows: readonly string[] }) {
  return (
    <div className={styles.preview} aria-hidden="true" inert>
      {rows.map((row) => (
        <p key={row} className={styles.previewRow}>
          {row}
        </p>
      ))}
    </div>
  );
}

const PREVIEW_FIXES = ['Make your program page easier to find', 'Show your results with the year'];
const PREVIEW_PEOPLE = ['A student asks about the fees for this course', 'A thread compares two colleges in the city', 'A question about hostels has no answer yet'];
const PREVIEW_OTHER = ['A college listing site with your programs', 'A news story that names you', 'A directory entry with your address'];

function count(value: number, one: string, many: string) {
  return (
    <>
      <span className="num">{value}</span> {value === 1 ? one : many}
    </>
  );
}

/**
 * One place: what we found, full width, then what's good and what to fix (the approved layout).
 * Rows open the fix panel unless `links` is false (a shared Audit, which has no panel); `fixNote`
 * sits under the fixes.
 */
export function PlaceTab({ place, free, links = true, fixNote }: { place: PlaceView; free: boolean; links?: boolean; fixNote?: ReactNode }) {
  const locked = free && !place.scored;
  return (
    <div className={styles.tabPlace}>
      <PlaceHead place={place} />
      {locked ? (
        <div className={styles.card}>
          <Preview rows={place.key === 'people' ? PREVIEW_PEOPLE : PREVIEW_OTHER} />
          <p className={styles.quiet}>
            {place.hidden.found + place.found.length > 0 ? (
              <>
                {count(place.hidden.found + place.found.length, 'thing found here', 'things found here')}
                {place.hidden.fixes + place.fixes.length > 0 ? <>, {count(place.hidden.fixes + place.fixes.length, 'with something to do', 'with something to do')}</> : null}.{' '}
              </>
            ) : null}
            Paid shows what people say about you on Reddit, Quora and forums, and where else you show up, each with its link and date.
          </p>
          {place.fixes.length ? (
            <>
              <p className={styles.columnTitle}>In your top 3 fixes</p>
              <FixList fixes={place.fixes} hrefFor={links ? fixHref : undefined} />
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <p className={styles.columnTitle}>What we found</p>
            {place.thin ? <ThinState thin={place.thin} /> : null}
            {place.found.length ? <FoundList rows={place.found} wide hrefFor={links ? rowHref : undefined} /> : null}
          </div>
          <div className={styles.twoUp}>
            <div className={styles.card}>
              <p className={styles.columnTitle}>What’s good</p>
              <GoodList items={place.good} empty={place.scored ? undefined : 'Nothing good found here yet.'} />
            </div>
            <div className={styles.card}>
              <p className={styles.columnTitle}>What to fix</p>
              <FixList fixes={place.fixes} hrefFor={links ? fixHref : undefined} empty={place.hidden.fixes ? 'Your top 3 fixes are in other places.' : 'Nothing to fix here. Keep it this way.'} />
              {place.fixes.length && fixNote ? <p className={styles.quiet}>{fixNote}</p> : null}
              {place.hidden.fixes ? (
                <>
                  <Preview rows={PREVIEW_FIXES} />
                  <p className={styles.quiet}>
                    {count(place.hidden.fixes, 'more fix here comes', 'more fixes here come')} with Paid.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PlacesAudit(props: PlacesAuditProps) {
  const { view, tier, state, handlers } = props;
  const free = tier === 'free';
  const showPrograms = props.entries.length > 1 || props.entries.some((entry) => entry.state === 'locked');
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Audit" question="What does the internet say about us?" caption={props.caption} actions={props.actions} />
        {props.notice}
        {showPrograms ? <ProgramTabs entries={props.entries} active={props.programId} allLabel={props.allLabel} /> : null}
      </div>

      <section className={styles.block} aria-label="Visibility, Trust and Chosen">
        <WordTiles words={view.words} compact fixHref={(key) => `?fix=${encodeURIComponent(`check:${key}`)}`} />
        <WordsMeaning />
      </section>

      <section className={styles.block} aria-labelledby="top-fixes-title">
        <SectionTitle id="top-fixes-title" icon="wrench" title="Fix these first" help="The fixes with the most impact, from every place. Open one to see how, with a ready fix to copy." />
        <div className={styles.card}>
          <FixList
            fixes={view.topFixes}
            hrefFor={fixHref}
            numbered
            actions={free && state && handlers ? (fix) => <FixActions fix={fix} state={state} handlers={handlers} /> : undefined}
            empty="Nothing to fix. Every check is Strong, and nothing found needs doing. Keep it this way."
          />
        </div>
      </section>

      {free ? (
        <section className={styles.unlock} aria-labelledby="unlock-title">
          <div>
            <h2 id="unlock-title" className={styles.unlockTitle}>
              Paid shows the full picture
            </h2>
            <ul className={styles.unlockList}>
              <li>
                <Icon name="lock" size={14} />
                Every fix, ranked, each with a ready fix to copy
              </li>
              <li>
                <Icon name="lock" size={14} />
                What Drishti found for every check, with its link and date
              </li>
              <li>
                <Icon name="lock" size={14} />
                What people say about you, and the other places you show up
              </li>
              <li>
                <Icon name="lock" size={14} />
                Your other programs, and your progress month by month
              </li>
            </ul>
          </div>
          <div className={styles.unlockAction}>{props.paidAction}</div>
        </section>
      ) : null}

      <section className={styles.block} aria-labelledby="places-title">
        <SectionTitle id="places-title" icon="globe" title="What the internet says, place by place" help="Each place: what we found, with the link and date; what’s good; and what to fix." />
        <Tabs
          label="Places"
          items={view.places.map((place) => ({
            id: place.key,
            label: place.name,
            count: place.fixes.length + place.hidden.fixes,
            content: <PlaceTab place={place} free={free} />,
          }))}
        />
      </section>

      {props.progress ? (
        <section className={styles.block} aria-labelledby="progress-title">
          <SectionTitle id="progress-title" icon="demand" title="Progress, month by month" help="Each month’s overall score, small, with Visibility, Trust and Chosen out of 100, your place among your rivals and the checks that moved." />
          <ProgressSection
            months={props.progress.months}
            history={props.progress.history}
            scoreLabel={props.progress.scoreLabel}
            showPlace={props.progress.months.some((month) => month.place !== null)}
            label={props.progress.label}
          />
        </section>
      ) : null}

      <Suspense fallback={null}>
        <FixPanel entries={view.panel} state={state} handlers={handlers} added={props.added} />
      </Suspense>
    </div>
  );
}

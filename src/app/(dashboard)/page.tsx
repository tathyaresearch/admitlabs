import { markKey, markOutcome } from '@/audit/marks';
import { auditVerdict } from '@/audit/verdict';
import { movedChecks, overviewView } from '@/audit/view';
import { WordTiles } from '@/components/audit/PlaceBits';
import { FirstAuditWaiting, WaitingNotice } from '@/components/audit/Waiting';
import { DemandHighlightCard, EnquiriesCard, RivalsLineCard } from '@/components/home/HomeCards';
import { HomeThings, type HomeThing } from '@/components/home/HomeThings';
import { StartGuide } from '@/components/home/StartGuide';
import { TeamCard } from '@/components/home/TeamCard';
import { WhatChanged, type CheckedMark } from '@/components/home/WhatChanged';
import { PaidAction } from '@/components/plan/PaidAction';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { limitFor } from '@/config/entitlements';
import { ADMITLABS_EMAIL } from '@/config/team';
import { nextPullOn } from '@/demand/schedule';
import { checkName } from '@/domain/checks';
import { monthKey, previousMonth } from '@/domain/dates';
import { auditFixPath } from '@/domain/fix-key';
import { formatDate } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { leadsSummary } from '@/leads/summary';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText } from '@/lib/audit/load';
import { loadPlacesPage } from '@/lib/audit/places';
import { loadHighlight, loadHighlightHistory, loadLatestPicks } from '@/lib/demand/load';
import { loadGuideClosed, loadMarks, loadMovesSince, loadSpikes } from '@/lib/home/load';
import { loadLinkCounts } from '@/lib/leads/load';
import { loadActions, loadRivalLine, loadRivalList, loadRivalSnapshot } from '@/lib/rivals/load';
import { loadWork } from '@/lib/team/work';
import { freeThings, threeThings, type Thing } from '@/report/things';
import { workCard } from '@/team/work';
import { askFixAction, closeStartGuideAction, markDoneAction, markFixAction } from './actions';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/home/today.module.css';

export const metadata = { title: 'Home' };

const QUESTION = 'How are we doing this month?';

/** Where a thing opens: the fix's panel in the Audit, the rival, or Demand. */
function thingHref(thing: Thing): string {
  if (thing.fixId) return auditFixPath(thing.fixId);
  if (thing.source === 'rivals') return thing.rivalId ? `/rivals/${thing.rivalId}` : '/rivals';
  return '/demand';
}

function homeThing(thing: Thing, done: ReadonlySet<string>): HomeThing {
  return {
    key: thing.fixId ?? `${thing.source}:${thing.title}`,
    source: thing.source,
    title: thing.title,
    label: thing.label,
    href: thingHref(thing),
    impact: thing.impact,
    effort: thing.effort,
    programs: thing.programs,
    weight: thing.weight,
    fixId: thing.fixId,
    mark: thing.mark,
    done: thing.mark ? done.has(markKey({ checkKey: null, thing: thing.mark.thing, month: thing.mark.month })) : false,
  };
}

// Home answers "How are we doing this month?" (spec section 13), as the version 2 mock was
// approved: the one line from the three words, the three words with what to fix first in each,
// a Client's team and enquiries, the things to do this month, what changed since the last Audit,
// then the rivals' one line and one demand highlight. No score and no gauge.
export default async function HomePage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const full = viewer.tier !== 'free';
  const client = viewer.tier === 'client';
  const owner = role === 'owner' && !viewer.viewingAs;
  const now = new Date();
  const [data, rivals, rivalList, highlight, guideClosed, work, links] = await Promise.all([
    loadAuditPage(viewer),
    loadRivalSnapshot(viewer),
    loadRivalList(institution.id),
    loadHighlight(institution.id),
    loadGuideClosed(viewer),
    client ? loadWork(institution.id) : Promise.resolve(null),
    client ? loadLinkCounts(institution.id) : Promise.resolve(null),
  ]);
  const [line, searches] = await Promise.all([loadRivalLine(institution.id, rivalList.map((rival) => rival.id)), loadHighlightHistory(viewer, highlight)]);
  const reminder = planReminder(viewer.plan, now);
  const nextAudit = data.nextAudit && data.nextAudit.tier === viewer.tier ? formatDate(data.nextAudit.on) : null;
  const planLine = viewer.tier === 'paid' && viewer.plan?.endsAt ? `Paid until ${formatDate(viewer.plan.endsAt)}` : viewer.tier === 'client' ? 'Client' : 'Free plan';

  const reminderNotice =
    reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
      <Notice
        icon="info"
        title={`Your Paid plan ends in ${reminder.daysLeft} ${reminder.daysLeft === 1 ? 'day' : 'days'}.`}
        action={<PaidAction viewer={viewer} variant="secondary" size="sm" note={false} />}
      >
        It does not renew on its own. When it ends you move to Free and keep your last Audit. Ask AdmitLabs to continue it: the same price and terms, and nothing is paid here.
      </Notice>
    ) : null;
  const clientCards =
    work && links ? (
      <div className={styles.pair}>
        <TeamCard card={workCard(work, now)} lastChecked={data.audit?.runAt ?? null} nextAudit={nextAudit} email={ADMITLABS_EMAIL} allHref="/work" />
        <EnquiriesCard summary={leadsSummary(links)} thisMonth={monthKey(now)} lastMonth={previousMonth(monthKey(now))} />
      </div>
    ) : null;
  const cards = (
    <div className={styles.pair}>
      <RivalsLineCard city={institution.city} line={line} latest={rivals.latestMove} hasRivals={rivalList.length > 0} owner={owner} />
      <DemandHighlightCard
        highlight={highlight}
        history={searches.flatMap((point) => (point.count === null ? [] : [{ month: point.month, count: point.count }]))}
        city={institution.city}
        nextUpdate={formatDate(nextPullOn(now))}
      />
    </div>
  );

  const places = data.audit ? await loadPlacesPage(viewer, data) : null;
  if (!data.audit || !places) {
    return (
      <div className={audit.page}>
        <div className={audit.top}>
          <PageHead title="Home" question={QUESTION} caption={[planLine]} />
          {reminderNotice}
        </div>
        {data.waiting ? (
          // A first Audit waiting for the AdmitLabs team's review: the line takes the place of the results.
          <FirstAuditWaiting ranAt={data.waiting.runAt} isOwner={owner} hasRivals={rivalList.length > 0} city={institution.city} />
        ) : (
          <EmptyState
            icon="audit"
            title={viewer.tier === 'free' && !viewer.plan?.freeProgramId ? 'Pick the program your free Audit covers' : 'Your first Audit is on its way'}
            action={
              viewer.tier === 'free' && !viewer.plan?.freeProgramId && role === 'owner' ? (
                <ButtonLink href="/onboarding" iconAfter="arrowRight">
                  Pick a program
                </ButtonLink>
              ) : undefined
            }
          >
            {data.nextAudit ? `${nextAuditText(data)}.` : 'What students see about you, and what to fix first, will show here.'}
          </EmptyState>
        )}
        {clientCards}
        {cards}
      </div>
    );
  }

  const latest = data.audit;
  const { view, state } = places;
  const overview = overviewView(latest, { institutionType: institution.type, programNames: data.names });
  // The Audit before the latest, for "What changed since": Paid and Client see their history; Free sees its own.
  const before = [...data.history].reverse().find((row) => row.runAt < latest.runAt) ?? null;
  const [marks, moves, spikes, lessons, picks] = await Promise.all([
    loadMarks(institution.id, latest.id),
    full ? loadMovesSince(institution.id, before?.runAt ?? latest.runAt) : Promise.resolve(null),
    full ? loadSpikes(viewer) : Promise.resolve(null),
    full ? loadActions(institution.id) : Promise.resolve([]),
    full ? loadLatestPicks(institution.id) : Promise.resolve([]),
  ]);
  const thingMarks = new Set(marks.filter((mark) => mark.thing).map(markKey));
  const things = full
    ? threeThings({
        fixes: view.fixes,
        lessons: lessons.map((lesson) => ({ ...lesson, month: lesson.month.slice(0, 7) })),
        picks,
        rivalNames: new Map(rivalList.map((rival) => [rival.id, rival.name])),
      })
    : freeThings(view.fixes, limitFor('audit_what_to_fix', 'free') ?? 3);
  const checked: CheckedMark[] = marks.flatMap((mark) =>
    mark.checkKey && mark.checkedBy === latest.id
      ? [{ key: mark.checkKey, name: checkName(mark.checkKey, institution.type), markedAt: mark.markedAt, outcome: markOutcome(mark.checkKey, latest, data.names) }]
      : [],
  );
  const firstFix = view.fixes[0];
  const words = view.words.map((word) => `${word.name} ${word.word}`).join(', ');

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Home" question={QUESTION} caption={[`Audit checked ${formatDate(latest.runAt)}`, planLine]} />
        {reminderNotice}
        {data.waiting ? <WaitingNotice shownRunAt={latest.runAt} /> : null}
        <p className={styles.answer}>{auditVerdict(overview.scores)}</p>
      </div>

      <WordTiles words={view.words} fixHref={(key) => auditFixPath(`check:${key}`)} />

      {guideClosed ? null : (
        <StartGuide
          words={words}
          firstFix={firstFix ? { title: firstFix.title, impact: firstFix.impact, href: auditFixPath(firstFix.id) } : null}
          fixMarked={firstFix ? state.marked.includes(firstFix.id) : false}
          rivalsPicked={rivalList.length > 0}
          owner={role === 'owner'}
          onClose={closeStartGuideAction}
        />
      )}

      {clientCards}

      <HomeThings
        id="things"
        title={full ? 'Do these 3 things this month' : 'Fix these first'}
        help={
          full
            ? 'Ordered by impact: a fix from your Audit, a lesson from your rivals and one of Make these 3. Mark one done when it is done: your next Audit checks a fix.'
            : 'The changes that matter most, from your free Audit. Mark one done when it is done: your next Audit checks it.'
        }
        items={things.map((thing) => homeThing(thing, thingMarks))}
        fixState={state}
        fixHandlers={{ onMark: markFixAction, onAsk: askFixAction }}
        onMarkThing={markDoneAction}
        empty="Nothing needs fixing right now. Keep it that way."
      />

      <WhatChanged
        since={full ? (before?.runAt ?? null) : null}
        first={overview.firstAudit}
        words={view.words}
        moved={movedChecks(overview)}
        marks={checked}
        moves={moves}
        spikes={spikes}
        place={institution.city}
        checkedOn={latest.runAt}
        paidAction={full ? null : <PaidAction viewer={viewer} variant="secondary" size="sm" />}
      />

      {cards}
    </div>
  );
}

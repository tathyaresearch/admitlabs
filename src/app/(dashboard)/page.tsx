import Link from 'next/link';
import { markKey, markOutcome } from '@/audit/marks';
import { auditVerdict } from '@/audit/verdict';
import { movedChecks, overviewView, scoresByMonth, type AuditView } from '@/audit/view';
import { DemandCard } from '@/components/home/DemandCard';
import { HomeScore } from '@/components/home/HomeScore';
import { HomeThings, type HomeThing } from '@/components/home/HomeThings';
import { RivalsCard } from '@/components/home/RivalsCard';
import { StartGuide } from '@/components/home/StartGuide';
import { WhatChanged, type CheckedMark } from '@/components/home/WhatChanged';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { limitFor } from '@/config/entitlements';
import { checkName } from '@/domain/checks';
import { monthKey } from '@/domain/dates';
import { formatCount, formatDate } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { LANGUAGE_LABELS, type InstitutionType } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { auditNote, loadAuditPage, nextAuditText, type AuditPageData } from '@/lib/audit/load';
import { loadCityIdeas, loadHighlight, loadHighlightHistory } from '@/lib/demand/load';
import { loadGuideClosed, loadMarks, loadMovesSince, loadSpikes } from '@/lib/home/load';
import { loadActions, loadRivalSnapshot } from '@/lib/rivals/load';
import { byPoints, fixThing, threeThings, type Thing } from '@/report/things';
import { closeStartGuideAction, markDoneAction } from './actions';
import styles from '@/components/home/home.module.css';

export const metadata = { title: 'Home' };

/** Where a thing to do opens: the check in the Audit, the rival, or Demand. */
function thingHref(thing: Thing): string {
  switch (thing.source) {
    case 'audit':
      return thing.checkKey ? `/audit?check=${thing.checkKey}` : '/audit';
    case 'rivals':
      return thing.rivalId ? `/rivals/${thing.rivalId}` : '/rivals';
    default:
      return '/demand';
  }
}

/** What a thing says under its title. The points, or how often a question was asked, sit beside it. */
function thingDetail(thing: Thing): string {
  if (thing.source === 'audit') return thing.detail.replace(/^Could add (up to \d+ points?|less than 1 point)\. /, '');
  const question = thing.question;
  if (!question) return thing.detail;
  const asked = question.language === 'en' ? 'It answers' : `It answers a question asked in ${LANGUAGE_LABELS[question.language]}`;
  return `${asked}: “${question.text}”`;
}

/** A thing as Home lists it, with what Mark as done saves and whether it is marked. */
function homeThing(thing: Thing, type: InstitutionType, place: string, done: ReadonlySet<string>): HomeThing {
  const mark = thing.checkKey ? { check: thing.checkKey, thing: null, month: null } : { check: null, thing: thing.title, month: thing.month };
  const key = markKey({ checkKey: mark.check, thing: mark.thing, month: mark.month });
  return {
    key,
    source: thing.source,
    title: thing.title,
    check: thing.checkKey ? { key: thing.checkKey, name: checkName(thing.checkKey, type) } : null,
    programs: thing.programs,
    format: thing.format,
    detail: thingDetail(thing),
    points: thing.points,
    weight: thing.question ? `Asked about ${formatCount(thing.question.count)} ${thing.question.count === 1 ? 'time' : 'times'} in ${place}` : null,
    effort: thing.effort,
    href: thingHref(thing),
    mark,
    done: done.has(key),
  };
}

/** "Up 14 since April": the first month with a score, and the overall change since. */
function sinceFirst(data: AuditPageData): { month: string; change: number } | null {
  const months = scoresByMonth(data.history, (runAt) => monthKey(new Date(runAt)));
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last || months.length < 2) return null;
  return { month: first.month, change: last.scores.overall - first.scores.overall };
}

// Home answers one question: "How are we doing this month?" The answer first, then what to do
// this month, what changed since the last Audit, the score, and rivals and demand.
export default async function HomePage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  // Paid and Client see the month's 3 things to do (the same three as the monthly report); Free
  // keeps its top 3 fixes.
  const full = viewer.tier !== 'free';
  const [data, rivals, highlight, lessons, ideas, guideClosed] = await Promise.all([
    loadAuditPage(viewer),
    loadRivalSnapshot(viewer),
    loadHighlight(institution.id),
    full ? loadActions(institution.id) : Promise.resolve([]),
    full ? loadCityIdeas(viewer) : Promise.resolve([]),
    loadGuideClosed(viewer),
  ]);
  const searches = await loadHighlightHistory(viewer, highlight);
  const reminder = planReminder(viewer.plan, new Date());
  const view: AuditView | null = data.audit ? overviewView(data.audit, { institutionType: institution.type, programNames: data.names }) : null;

  const reminderNotice =
    reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
      <Notice
        icon="info"
        title={`Your Paid plan ends in ${reminder.daysLeft} ${reminder.daysLeft === 1 ? 'day' : 'days'}.`}
        action={
          <ButtonLink href="/plan" size="sm" variant="secondary">
            See your plan
          </ButtonLink>
        }
      >
        It does not renew on its own. When it ends you move to Free and keep your last Audit score.
      </Notice>
    ) : null;

  if (!view || !data.audit) {
    return (
      <div className={styles.home}>
        <div className={styles.summary}>
          <PageHead title="Home" question="How are we doing this month?" />
          {reminderNotice}
        </div>
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
          {data.nextAudit ? `${nextAuditText(data)}.` : 'Your score and what to fix first will show here.'}
        </EmptyState>
        <div className={styles.pair}>
          <RivalsCard
            ladder={rivals.ladder}
            standings={rivals.standings?.map((rival) => ({ id: rival.id, name: rival.name, standing: rival.standing })) ?? null}
            verdict={rivals.verdict}
            rivalsHref="/rivals"
            chooseHref={role === 'owner' ? '/rivals/choose' : null}
            latestMove={rivals.latestMove}
          />
          <DemandCard highlight={highlight} demandHref="/demand" place={institution.city} history={searches} />
        </div>
      </div>
    );
  }

  const audit = data.audit;
  // The Audit before the latest, for "What changed since": Paid and Client see their history; Free sees the latest only.
  const previous = full ? (data.history.at(-2) ?? null) : null;
  const [marks, moves, spikes] = await Promise.all([
    loadMarks(institution.id, audit.id),
    full ? loadMovesSince(institution.id, previous?.runAt ?? audit.runAt) : Promise.resolve(null),
    full ? loadSpikes(viewer) : Promise.resolve(null),
  ]);
  const open = new Set(marks.filter((mark) => mark.checkedBy === null).map(markKey));

  const things: HomeThing[] = full
    ? byPoints(
        threeThings({
          institutionType: institution.type,
          place: institution.city,
          fixes: view.fixes,
          lessons: lessons.map((lesson) => ({ text: lesson.text, detail: lesson.detail, checkKey: lesson.checkKey, rivalId: lesson.rivalId, effort: lesson.effort, month: lesson.month.slice(0, 7) })),
          ideas,
        }),
      ).map((thing) => homeThing(thing, institution.type, institution.city, open))
    : view.fixes.slice(0, limitFor('audit_what_to_fix', 'free') ?? 3).map((fix) => homeThing(fixThing(fix, institution.type), institution.type, institution.city, open));

  const checked: CheckedMark[] = marks.flatMap((mark) =>
    mark.checkKey && mark.checkedBy === audit.id
      ? [{ key: mark.checkKey, name: checkName(mark.checkKey, institution.type), markedAt: mark.markedAt, outcome: markOutcome(mark.checkKey, audit, data.names) }]
      : [],
  );
  // Only an Audit on the current plan checks what was marked done (a Paid plan ending first does not).
  const nextAudit = data.nextAudit && data.nextAudit.tier === viewer.tier ? formatDate(data.nextAudit.on) : null;
  const firstFix = view.fixes[0];
  const showGuide = !guideClosed;

  return (
    <div className={styles.home}>
      <div className={styles.summary}>
        <PageHead title="Home" question="How are we doing this month?" />
        {reminderNotice}
        <div className={styles.answer}>
          <p className={styles.verdict}>{auditVerdict(view.scores)}</p>
          <Link href="/audit" className={styles.headLink}>
            Open Audit
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>

      {showGuide ? (
        <StartGuide
          score={view.scores.overall}
          firstFix={firstFix ? { title: fixThing(firstFix, institution.type).title, points: firstFix.points, href: `/audit?check=${firstFix.key}` } : null}
          fixMarked={firstFix ? open.has(markKey({ checkKey: firstFix.key, thing: null, month: null })) : false}
          rivalsPicked={rivals.rivals.length > 0}
          owner={role === 'owner'}
          onClose={closeStartGuideAction}
        />
      ) : null}

      <HomeThings
        id="things"
        title={full ? 'Do these 3 things this month' : 'Fix these first'}
        description={[
          full ? 'Ordered by the points each could add.' : 'The changes that could add the most to your score.',
          role === 'owner' && !viewer.viewingAs ? 'Mark one done when it is done: your next Audit checks it.' : 'When one is marked done, your next Audit checks it.',
        ].join(' ')}
        items={things}
        canMark={role === 'owner' && !viewer.viewingAs}
        nextAudit={nextAudit}
        onMark={markDoneAction}
        empty="Every check is Strong. Keep it that way."
      />

      {/* A first free Audit has nothing to compare with yet; Paid and Client still see their rivals and searches. */}
      {full || !view.firstAudit ? (
        <WhatChanged
          since={previous?.runAt ?? null}
          first={view.firstAudit}
          change={view.firstAudit || view.programsChanged ? null : view.changes.overall}
          score={view.scores.overall}
          moved={movedChecks(view)}
          marks={checked}
          moves={moves}
          spikes={spikes}
          checkedOn={audit.runAt}
          paidHref={full ? null : '/plan'}
        />
      ) : null}

      <HomeScore
        view={view}
        checkedAt={audit.runAt}
        since={full ? sinceFirst(data) : null}
        note={auditNote(data, viewer.tier)}
        checkLinks="/audit?check="
        upsell={full ? null : { href: '/plan', text: 'See your score month by month with Paid' }}
      />

      <div className={styles.pair}>
        <RivalsCard
          ladder={rivals.ladder}
          standings={rivals.standings?.map((rival) => ({ id: rival.id, name: rival.name, standing: rival.standing })) ?? null}
          verdict={rivals.verdict}
          rivalsHref="/rivals"
          chooseHref={role === 'owner' ? '/rivals/choose' : null}
          latestMove={rivals.latestMove}
        />
        <DemandCard highlight={highlight} demandHref="/demand" place={institution.city} history={searches} />
      </div>
    </div>
  );
}

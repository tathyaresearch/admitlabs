import { overviewView, scoresByMonth } from '@/audit/view';
import { DemandCard } from '@/components/home/DemandCard';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { RivalsCard } from '@/components/home/RivalsCard';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { limitFor } from '@/config/entitlements';
import { monthKey } from '@/domain/dates';
import { planReminder } from '@/domain/tiers';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { auditNote, loadAuditPage, nextAuditText } from '@/lib/audit/load';
import { loadCityIdeas, loadHighlight, loadHighlightHistory } from '@/lib/demand/load';
import { loadActions, loadRivalSnapshot } from '@/lib/rivals/load';
import { fixThing, threeThings, type Thing } from '@/report/things';
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

// Home answers one question: "How are we doing this month?" The answer and the numbers first,
// then what to do next, then rivals and demand.
export default async function HomePage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  // Paid and Client see the month's 3 things to do (the same list as the monthly report); Free
  // keeps its top 3 fixes.
  const full = viewer.tier !== 'free';
  const [data, rivals, highlight, lessons, ideas] = await Promise.all([
    loadAuditPage(viewer),
    loadRivalSnapshot(viewer),
    loadHighlight(institution.id),
    full ? loadActions(institution.id) : Promise.resolve([]),
    full ? loadCityIdeas(viewer) : Promise.resolve([]),
  ]);
  const searches = await loadHighlightHistory(viewer, highlight);
  const reminder = planReminder(viewer.plan, new Date());
  const view = data.audit ? overviewView(data.audit, { institutionType: institution.type, programNames: data.names }) : null;

  const steps: NextStep[] = !view
    ? []
    : full
      ? threeThings({
          institutionType: institution.type,
          place: institution.city,
          fixes: view.fixes,
          lessons: lessons.map((lesson) => ({ text: lesson.text, detail: lesson.detail, checkKey: lesson.checkKey, rivalId: lesson.rivalId })),
          ideas,
        }).map((thing, index) => ({ key: `${thing.source}-${index}`, source: thing.source, title: thing.title, detail: thing.detail, href: thingHref(thing) }))
      : view.fixes.slice(0, limitFor('audit_what_to_fix', 'free') ?? 3).map((fix) => {
          const thing = fixThing(fix, institution.type);
          return { key: fix.key, source: thing.source, title: thing.title, detail: thing.detail, href: `/audit?check=${fix.key}` };
        });

  // Score history is a Paid and Client feature; Free sees the latest Audit only, and a preview of what Paid adds.
  const trend = full ? scoresByMonth(data.history, (runAt) => monthKey(new Date(runAt))) : null;
  // Only an Audit on the current plan: a Paid plan ending before its next Audit says so in the notice instead.
  const note = auditNote(data, viewer.tier);

  return (
    <div className={styles.home}>
      <div className={styles.summary}>
        <PageHead title="Home" question="How are we doing this month?" />
        {reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
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
        ) : null}
      </div>

      {view && data.audit ? (
        <HomeSummary view={view} checkedAt={data.audit.runAt} trend={trend} side="locked" note={note} auditHref="/audit" checkLinks="/audit?check=" />
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
          {data.nextAudit ? `${nextAuditText(data)}.` : 'Your score and what to fix first will show here.'}
        </EmptyState>
      )}

      {view ? (
        <NextSteps
          id="next"
          icon="wrench"
          title={full ? '3 things to do this month' : 'Fix these first'}
          description={full ? 'In order: the steps that could make the most difference this month.' : 'The changes that could add the most to your score.'}
          steps={steps}
          empty={<p className={styles.cardText}>Every check is Strong. Keep it that way.</p>}
        />
      ) : null}

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

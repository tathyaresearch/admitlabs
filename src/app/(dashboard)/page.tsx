import { overviewView } from '@/audit/view';
import { FixCards } from '@/components/audit/Lists';
import { SummaryBand } from '@/components/audit/SummaryBand';
import { DemandHighlight } from '@/components/demand/DemandHighlight';
import { MonthThings } from '@/components/report/MonthThings';
import { RivalSnapshot } from '@/components/rivals/RivalSnapshot';
import { ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Card, FactList, PageHeader, Section } from '@/components/ui/Layout';
import { limitFor } from '@/config/entitlements';
import { formatDate } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText } from '@/lib/audit/load';
import { loadCityIdeas, loadHighlight } from '@/lib/demand/load';
import { loadActions, loadRivalSnapshot } from '@/lib/rivals/load';
import { threeThings } from '@/report/things';
import styles from './home.module.css';

export const metadata = { title: 'Home' };


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
  const reminder = planReminder(viewer.plan, new Date());
  const view = data.audit ? overviewView(data.audit, { institutionType: institution.type, programNames: data.names }) : null;
  const topFixes = view ? view.fixes.slice(0, limitFor('audit_what_to_fix', 'free') ?? 3) : [];
  const things = full
    ? threeThings({
        institutionType: institution.type,
        place: institution.city,
        fixes: view?.fixes ?? [],
        lessons: lessons.map((lesson) => ({ text: lesson.text, detail: lesson.detail, checkKey: lesson.checkKey, rivalId: lesson.rivalId })),
        ideas,
      })
    : [];
  const activePrograms = data.programs.filter((program) => !program.archived);
  const freeProgram = viewer.tier === 'free' ? activePrograms.find((program) => program.id === viewer.plan?.freeProgramId) : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`}
        title={institution.name}
        meta={
          <>
            <Tag variant="solid">{TIER_LABELS[viewer.tier]} plan</Tag>
            <Tag>{viewer.viewingAs ? 'Read only' : MEMBERSHIP_ROLE_LABELS[role]}</Tag>
            <a className={styles.site} href={institution.website} target="_blank" rel="noreferrer">
              {institution.website.replace(/^https?:\/\//, '')}
              <Icon name="external" size={14} />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </>
        }
      />

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

      {view && data.audit ? (
        <section aria-labelledby="score-title" className={styles.scoreBlock}>
          <div className={styles.blockHead}>
            <h2 id="score-title" className={styles.blockTitle}>
              Your Audit
            </h2>
            <p className={styles.blockMeta}>
              Checked {formatDate(data.audit.runAt)}. {nextAuditText(data)}.
            </p>
          </div>
          <SummaryBand view={view} />
        </section>
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

      {full && things.length ? (
        <Section id="month-things" title="3 things to do this month" description="The steps that could make the most difference this month, in order.">
          <MonthThings things={things} />
        </Section>
      ) : null}

      {!full && view ? (
        <Section
          id="top-fixes"
          title="Fix these first"
          description="The changes that could add the most to your score."
          actions={
            <ButtonLink href="/audit" size="sm" variant="quiet" iconAfter="arrowRight">
              Open your Audit
            </ButtonLink>
          }
        >
          {topFixes.length ? <FixCards items={topFixes} basePath="/audit" /> : <p className={styles.note}>Every check is Strong. Keep it that way.</p>}
        </Section>
      ) : null}

      <Section
        id="rivals"
        title="Your rivals"
        description="Where you stand against the rivals you track."
        actions={
          rivals.rivals.length ? (
            <ButtonLink href="/rivals" size="sm" variant="quiet" iconAfter="arrowRight">
              Open Rivals
            </ButtonLink>
          ) : undefined
        }
      >
        <RivalSnapshot snapshot={rivals} youName={institution.name} canChoose={role === 'owner'} />
      </Section>

      <Section
        id="demand"
        title="What students want"
        description={`The fastest rising course or career in ${institution.city} this month.`}
        actions={
          <ButtonLink href="/demand" size="sm" variant="quiet" iconAfter="arrowRight">
            Open Demand
          </ButtonLink>
        }
      >
        <DemandHighlight highlight={highlight} />
      </Section>

      <div className={styles.split}>
        <Card>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Programs</h2>
            <span className={styles.count}>{activePrograms.length}</span>
          </div>
          <ul className={styles.programs}>
            {activePrograms.map((program) => (
              <li key={program.id} className={styles.program}>
                <span>{program.name}</span>
                {freeProgram?.id === program.id ? <Tag>Free Audit</Tag> : null}
              </li>
            ))}
          </ul>
          {freeProgram ? <p className={styles.note}>Your Free Audit covers one program: {freeProgram.name}.</p> : null}
        </Card>

        <Card>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Plan</h2>
            <Tag variant="solid">{TIER_LABELS[viewer.tier]}</Tag>
          </div>
          <FactList
            items={[
              { label: 'Started', value: viewer.plan ? formatDate(viewer.plan.startsAt) : 'Not set' },
              {
                label: 'Ends',
                value: viewer.plan?.endsAt ? formatDate(viewer.plan.endsAt) : viewer.tier === 'client' ? 'While your service is active' : 'No end date',
              },
              ...(viewer.tier === 'paid' ? [{ label: 'Renews', value: 'Only if you choose to' }] : []),
            ]}
          />
          <div className={styles.cardFoot}>
            <ButtonLink href="/plan" variant="secondary" size="sm" iconAfter="arrowRight">
              Plan and access
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}

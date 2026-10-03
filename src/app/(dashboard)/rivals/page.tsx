import { redirect } from 'next/navigation';
import { SectionHead } from '@/components/audit/AuditHeader';
import { MonthTable } from '@/components/charts/MonthTable';
import { PartRanks } from '@/components/charts/PartRanks';
import { NextSteps } from '@/components/home/NextSteps';
import { RivalsCard } from '@/components/home/RivalsCard';
import { ActivityTabs } from '@/components/rivals/Activity';
import { lessonSteps } from '@/components/rivals/Lessons';
import { RivalUnlockCard } from '@/components/rivals/RivalUnlockCard';
import { StandTable } from '@/components/rivals/StandTable';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { RIVAL_RULES } from '@/config/rivals';
import { formatDate, plural } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadRivalsPage } from '@/lib/rivals/load';
import { freeRivalsVerdict, rivalsVerdict } from '@/rivals/verdict';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/rivals/rivals.module.css';

export const metadata = { title: 'Rivals' };

const QUESTION = "Who's ahead of us?";

// Rivals answers "Who's ahead of us?": the answer and where you stand, how you compare pillar by
// pillar and month by month, what to learn from them, then what they are doing.
export default async function RivalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [data, params] = await Promise.all([loadRivalsPage(viewer), searchParams]);
  const owner = role === 'owner';

  if (data.rivals.length === 0) {
    if (owner) redirect('/rivals/choose');
    return (
      <div className={audit.page}>
        <PageHead title="Rivals" question={QUESTION} />
        <EmptyState icon="rivals" title="No rivals picked yet">
          The owner of your account picks 3 to 5 rivals to track. They show here once picked.
        </EmptyState>
      </div>
    );
  }

  const change = data.change;
  const changeAction =
    owner && (change.kind === 'available' || change.kind === 'anytime') ? (
      <div className={audit.actions}>
        <ButtonLink href="/rivals/choose" variant="secondary" size="sm" icon="rivals">
          Change rivals
        </ButtonLink>
        <p className={audit.actionNote}>{change.kind === 'anytime' ? 'Change them any time.' : 'You can change them once a month.'}</p>
      </div>
    ) : owner && change.kind === 'used' ? (
      <div className={audit.actions}>
        <p className={audit.actionNote}>
          Changed on {formatDate(change.changedOn)}. You can change them again from {formatDate(change.nextOn)}.
        </p>
      </div>
    ) : undefined;

  const notice =
    params.saved === '1' ? (
      <Notice tone="inverse" icon="check" title="Your rivals are saved.">
        {viewer.tier === 'free' ? 'Drishti has checked each one. Where you stand is below.' : 'Drishti has checked each one. Their scores and activity are below.'}
      </Notice>
    ) : undefined;

  if (data.free) {
    const standings = data.free.standings;
    return (
      <div className={audit.page}>
        <div className={audit.top}>
          <PageHead
            title="Rivals"
            question={QUESTION}
            caption={[plural(data.rivals.length, 'rival', 'rivals'), 'Checked on the 1st of each month', 'Free keeps the rivals you picked']}
          />
          {notice}
        </div>
        <RivalsCard
          ladder={null}
          standings={standings.map((rival) => ({ id: rival.id, name: rival.name, standing: rival.standing }))}
          verdict={freeRivalsVerdict(standings)}
          rivalsHref={null}
        />
        <RivalUnlockCard {...data.free.teaser} />
      </div>
    );
  }

  const full = data.full;
  if (!full) return null;
  const names = new Map(data.rivals.map((rival) => [rival.id, rival.name]));
  const scored = full.rows.flatMap((row) => (row.audit ? [{ name: row.rival.name, scores: row.audit.scores }] : []));
  const caption = [
    plural(data.rivals.length, 'rival', 'rivals'),
    data.lastScored ? `Scores checked ${formatDate(data.lastScored)}` : 'Scores are being checked',
    full.activity.lastChecked ? `Moves checked ${formatDate(full.activity.lastChecked)}` : 'Moves are checked every Monday',
  ];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Rivals" question={QUESTION} caption={caption} actions={changeAction} />
        {notice}
      </div>

      {full.you ? (
        <section className={audit.summary} aria-labelledby="stand-title">
          <h2 id="stand-title" className="visually-hidden">
            Where you stand
          </h2>
          <p className={audit.lead}>{rivalsVerdict(full.you.scores, scored)}</p>
          <StandTable ladder={full.ladder} rows={full.rows} you={full.you.scores} />
        </section>
      ) : (
        <Notice icon="info" title="Your first Audit is on its way.">
          Where you stand shows once your own Audit is ready.
        </Notice>
      )}

      {full.you ? (
        <section className={audit.section} aria-labelledby="parts-title">
          <SectionHead id="parts-title" title="Part by part" help="Each part of the score ranked, from the latest Audit of each. Your row is highlighted." />
          <div className={styles.pillarCard}>
            <PartRanks rows={full.spread} />
          </div>
        </section>
      ) : null}

      {full.you && full.trend.months.length > 1 ? (
        <section className={audit.section} aria-labelledby="months-title">
          <SectionHead
            id="months-title"
            title="Month by month"
            help={`Your overall score and your rivals', over the last ${RIVAL_RULES.trendMonths} months. Rivals are checked on the 1st of each month.`}
          />
          <div className={styles.pillarCard}>
            <MonthTable trend={full.trend} label="Overall score by month, you and your rivals" />
          </div>
        </section>
      ) : null}

      <NextSteps
        id="learn"
        icon="rivals"
        title="What to learn from your rivals"
        description="Learned from your rivals this month. Take the idea, never copy."
        steps={lessonSteps(full.actions, names, institution.type)}
        empty={<p className={audit.quietNote}>What to learn from your rivals arrives with your next Audit.</p>}
      />

      <section className={audit.section} aria-labelledby="activity-title">
        <SectionHead id="activity-title" title="What they're doing" help="Their moves, best content and ads. Every item links to where it was found." />
        <ActivityTabs
          activity={full.activity}
          moves={full.activity.moves}
          names={names}
          postLimit={RIVAL_RULES.postsOnOverview}
          movesNote="New programs, fee changes, new pages and admission dates from the last 30 days. Drishti checks every Monday and alerts you when it finds one."
        />
      </section>
    </div>
  );
}

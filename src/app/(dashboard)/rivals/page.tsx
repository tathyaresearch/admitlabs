import { redirect } from 'next/navigation';
import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { ActivityTabs } from '@/components/rivals/Activity';
import { HeadToHeadLegend, HeadToHeadTable } from '@/components/rivals/HeadToHeadTable';
import { RivalUnlockCard } from '@/components/rivals/RivalUnlockCard';
import { FreeStandBand, PaidStandBand } from '@/components/rivals/StandBand';
import { ThingsToDo } from '@/components/rivals/ThingsToDo';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { RIVAL_RULES } from '@/config/rivals';
import { formatDate, plural } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadRivalsPage } from '@/lib/rivals/load';
import { freeRivalsVerdict, rivalsVerdict } from '@/rivals/verdict';
import audit from '@/components/audit/audit.module.css';

export const metadata = { title: 'Rivals' };

export default async function RivalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [data, params] = await Promise.all([loadRivalsPage(viewer), searchParams]);
  const owner = role === 'owner';

  if (data.rivals.length === 0) {
    if (owner) redirect('/rivals/choose');
    return (
      <EmptyState icon="rivals" title="No rivals picked yet">
        The owner of your account picks 3 to 5 rivals to track. They show here once picked.
      </EmptyState>
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
          <AuditHeader
            title="Rivals"
            caption={[plural(data.rivals.length, 'rival', 'rivals'), 'Checked on the 1st of each month', 'Free keeps the rivals you picked']}
          />
          {notice}
          <FreeStandBand
            rivals={standings.map((rival) => ({ id: rival.id, name: rival.name, city: rival.city, standing: rival.standing }))}
            verdict={freeRivalsVerdict(standings)}
            youName={institution.name}
          />
        </div>
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
        <AuditHeader title="Rivals" caption={caption} actions={changeAction} />
        {notice}
        {full.you ? (
          <PaidStandBand rows={full.ladder} verdict={rivalsVerdict(full.you.scores, scored)} youName={institution.name} />
        ) : (
          <Notice icon="info" title="Your first Audit is on its way.">
            Where you stand shows once your own Audit is ready.
          </Notice>
        )}
      </div>

      <section className={audit.section} aria-labelledby="todo-title">
        <SectionHead id="todo-title" title="3 things to do" help="Learned from your rivals this month. Take the idea, never copy." />
        {full.actions.length ? (
          <ThingsToDo items={full.actions} rivalNames={names} />
        ) : (
          <p className={audit.quietNote}>Your 3 things to do arrive with your next Audit.</p>
        )}
      </section>

      <section className={audit.section} aria-labelledby="h2h-title">
        <SectionHead id="h2h-title" title="Head to head" help="Your scores next to each rival's. Open a rival to see where each of you leads." />
        <HeadToHeadTable you={{ name: institution.name, scores: full.you?.scores ?? null }} rows={full.rows} institutionType={institution.type} />
        <HeadToHeadLegend />
      </section>

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

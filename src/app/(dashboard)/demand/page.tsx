import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { AskTabs } from '@/components/demand/AskTabs';
import { DemandBand, FreeDemandBand } from '@/components/demand/DemandBand';
import { DemandUnlockCard } from '@/components/demand/DemandUnlockCard';
import { IdeaCards } from '@/components/demand/IdeaCards';
import { MentionsTable } from '@/components/demand/MentionsTable';
import { DemandProgramTabs, RegionSwitch } from '@/components/demand/Nav';
import { EmptyState } from '@/components/ui/Feedback';
import { DEMAND_RULES } from '@/config/demand';
import { parseScope, regionLabel, regionPlace } from '@/demand/regions';
import { nextPullOn } from '@/demand/schedule';
import { sourcesCaption } from '@/demand/text';
import { demandView } from '@/demand/view';
import { formatDate, formatMonth, joinNames } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadDemandPage } from '@/lib/demand/load';
import { loadRivalList } from '@/lib/rivals/load';
import audit from '@/components/audit/audit.module.css';

export const metadata = { title: 'Demand' };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function DemandPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution } = viewer.membership;
  const params = await searchParams;
  // Free looks at its own city only (spec section 10: one rising trend).
  const scope = viewer.tier === 'free' ? 'city' : parseScope(one(params.scope));
  const data = await loadDemandPage(viewer, scope);
  const now = new Date();

  if (data.free) {
    const highlight = data.free.highlight;
    return (
      <div className={audit.page}>
        <div className={audit.top}>
          <AuditHeader
            title="Demand"
            caption={[institution.city, highlight ? formatMonth(highlight.month) : 'Pulled once a month', 'Grouped, never personal']}
          />
          <FreeDemandBand highlight={highlight} place={institution.city} />
        </div>
        <DemandUnlockCard teaser={data.free.teaser} />
      </div>
    );
  }

  if (data.programs.length === 0) {
    return (
      <EmptyState icon="demand" title="Demand covers programs from the list">
        {data.uncovered.length
          ? `Programs added under Other are not covered yet: ${joinNames(data.uncovered)}. Add a listed program in Settings to see what students ask.`
          : 'Add your programs in Settings to see what students ask.'}
      </EmptyState>
    );
  }

  const programId = one(params.program) ?? null;
  const program = data.programs.find((entry) => entry.id === programId) ?? null;
  const rows = program ? data.rows.filter((row) => row.programKey === program.programKey) : data.rows;
  const single = program !== null || data.programs.length === 1;
  const view = demandView(rows, { singleProgram: single, skills: institution.type === 'skilling' });
  const place = regionPlace(data.region);
  const labels = { city: institution.city, state: institution.state, india: 'All India' };
  const rivals = await loadRivalList(institution.id);

  const caption = [
    view.month ? `${regionLabel(data.region)}, ${formatMonth(view.month)}` : regionLabel(data.region),
    data.pulledAt ? `Pulled ${formatDate(data.pulledAt)}` : 'Being pulled now',
    `Next pull ${formatDate(nextPullOn(now))}`,
    view.platforms.length ? sourcesCaption(view.platforms.length, Math.max(1, view.languages.length)) : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <AuditHeader title="Demand" caption={caption} actions={<RegionSwitch scope={scope} programId={program?.id ?? null} labels={labels} />} />
        {data.programs.length > 1 ? <DemandProgramTabs scope={scope} programs={data.programs} active={program?.id ?? null} /> : null}
        {rows.length ? (
          <DemandBand view={view} place={place} showProgram={!single} today={now} />
        ) : (
          <EmptyState icon="demand" title="This pull is on its way">
            Demand for {program?.name ?? 'your programs'} in {place} shows here after the next pull, on {formatDate(nextPullOn(now))}.
          </EmptyState>
        )}
      </div>

      {view.ideas.length ? (
        <section className={audit.section} aria-labelledby="ideas-title">
          <SectionHead id="ideas-title" title={`${Math.min(DEMAND_RULES.contentIdeas, view.ideas.length)} content ideas`} help={`Each one is built on a real student question from ${place}, with where it was asked.`} />
          <IdeaCards ideas={view.ideas.slice(0, DEMAND_RULES.contentIdeas)} showProgram={!single} />
        </section>
      ) : null}

      {rows.length ? (
        <section className={audit.section} aria-labelledby="ask-title">
          <SectionHead id="ask-title" title="What students ask" help={`Grouped from public questions, posts and searches in ${place}. Never a person.`} />
          <AskTabs view={view} showProgram={!single} />
        </section>
      ) : null}

      <section className={audit.section} aria-labelledby="say-title">
        <SectionHead
          id="say-title"
          title="What students say about you and your rivals"
          help={`Grouped topics from public posts in each one's state, with counts and sources. It does not change with the region above.`}
        />
        <MentionsTable
          subjects={[
            { id: institution.id, name: institution.name, sub: institution.name, you: true },
            ...rivals.map((rival) => ({ id: rival.id, name: rival.name, sub: `${INSTITUTION_TYPE_LABELS[rival.type]}, ${rival.city}`, you: false })),
          ]}
          mentions={data.mentions}
        />
      </section>

      {data.uncovered.length ? (
        <p className={audit.quietNote}>Programs added under Other are not covered yet: {joinNames(data.uncovered)}.</p>
      ) : null}
    </div>
  );
}

import { SectionHead } from '@/components/audit/AuditHeader';
import { MonthBars } from '@/components/charts/MonthBars';
import { AskTabs } from '@/components/demand/AskTabs';
import { DemandUnlockCard } from '@/components/demand/DemandUnlockCard';
import { IdeaList } from '@/components/demand/IdeaList';
import { PaidAction } from '@/components/plan/PaidAction';
import { MentionsTable } from '@/components/demand/MentionsTable';
import { DemandProgramTabs, RegionSwitch } from '@/components/demand/Nav';
import { SeasonClock } from '@/components/demand/SeasonClock';
import { Source } from '@/components/demand/Source';
import { DemandCard } from '@/components/home/DemandCard';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { KpiCard, KpiNumber } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { DEMAND_RULES } from '@/config/demand';
import { parseScope, regionLabel, regionPlace } from '@/demand/regions';
import { nextPullOn } from '@/demand/schedule';
import { seasonClock } from '@/demand/season';
import { countWords, sourcesCaption, worrySentence } from '@/demand/text';
import { demandView } from '@/demand/view';
import { formatDate, formatMonth, joinNames } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadDemandPage, loadTopicHistory } from '@/lib/demand/load';
import { loadRivalList } from '@/lib/rivals/load';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/demand/demand.module.css';

export const metadata = { title: 'Demand' };

const QUESTION = 'What do students want?';
/** Ideas shown before "Show more". */
const IDEAS_SHOWN = 3;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Demand answers "What do students want?": the answer and the fastest rise with the admission
// year, the content ideas to make, then everything students ask in tabs.
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
        <PageHead
          title="Demand"
          question={QUESTION}
          caption={[institution.city, highlight ? formatMonth(highlight.month) : 'Updated once a month', 'Grouped, never personal']}
        />
        <DemandCard highlight={highlight} demandHref={null} place={institution.city} nextUpdate={nextPullOn(now).toISOString()} />
        <DemandUnlockCard teaser={data.free.teaser} action={<PaidAction viewer={viewer} />} />
      </div>
    );
  }

  if (data.programs.length === 0) {
    return (
      <div className={audit.page}>
        <PageHead title="Demand" question={QUESTION} />
        <EmptyState icon="demand" title="Demand covers programs from the list">
          {data.uncovered.length
            ? `Programs added under Other are not covered yet: ${joinNames(data.uncovered)}. Add a listed program in Settings to see what students ask.`
            : 'Add your programs in Settings to see what students ask.'}
        </EmptyState>
      </div>
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
  const ideas = view.ideas.slice(0, DEMAND_RULES.contentIdeas);
  const top = view.topTrend;
  const rise = top?.changePct === null || top?.changePct === undefined ? null : Math.round(top.changePct);
  const history = top ? await loadTopicHistory(data.region, top) : [];

  const caption = [
    view.month ? `${regionLabel(data.region)}, ${formatMonth(view.month)}` : regionLabel(data.region),
    data.pulledAt ? `Updated ${formatDate(data.pulledAt)}` : 'Being updated now',
    `Next update ${formatDate(nextPullOn(now))}`,
    view.platforms.length ? sourcesCaption(view.platforms, view.languages) : null,
  ];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Demand" question={QUESTION} caption={caption} actions={<RegionSwitch scope={scope} programId={program?.id ?? null} labels={labels} />} />
        {data.programs.length > 1 ? <DemandProgramTabs scope={scope} programs={data.programs} active={program?.id ?? null} /> : null}
      </div>

      {rows.length ? (
        <section className={audit.summary} aria-labelledby="month-title">
          <h2 id="month-title" className="visually-hidden">
            This month in {place}
          </h2>
          <p className={audit.lead}>{worrySentence(place, view.asksMost) || `What students in ${place} search for, ask and worry about this month.`}</p>
          <div className={styles.kpis}>
            <KpiCard label={`Rising fastest in ${place}`} className={styles.riseCard}>
              {top ? (
                // The words and the searches by month side by side, so this card is as tall as the season's.
                <div className={history.length > 1 ? styles.rise : undefined}>
                  <div className={styles.riseWords}>
                    {rise === null ? (
                      <p className={styles.kpiTitle}>New this month</p>
                    ) : (
                      <KpiNumber
                        icon={<Icon name={rise < 0 ? 'arrowDown' : 'arrowUp'} size={20} />}
                        value={`${Math.abs(rise)}%`}
                        suffix={rise < 0 ? 'down since last month' : 'up since last month'}
                      />
                    )}
                    <p className={styles.kpiTitle}>{top.text}</p>
                    <p className={styles.trendMeta}>
                      {!single ? <span>{top.programName}</span> : null}
                      <span>{countWords('rising', top.count)}</span>
                      <Source url={top.sourceUrl} platform={top.meta.platform ?? 'trends'} />
                    </p>
                  </div>
                  <MonthBars points={history} title="Searches by month" valueLabel="Searches" />
                </div>
              ) : (
                <p className={styles.kpiTitle}>Nothing is rising sharply this month.</p>
              )}
            </KpiCard>
            {view.season.length ? <SeasonClock clock={seasonClock(view.season, now)} stages={view.season} today={now} /> : null}
          </div>
        </section>
      ) : (
        <EmptyState icon="demand" title="This update is on its way">
          Demand for {program?.name ?? 'your programs'} in {place} shows here after the next update, on {formatDate(nextPullOn(now))}.
        </EmptyState>
      )}

      {rows.length ? (
        <section className={audit.section} aria-labelledby="ideas-title">
          <SectionHead
            id="ideas-title"
            icon="demand"
            title="Content ideas"
            help={`What to make this month. Each one answers a real question students in ${place} asked, with where they asked it.`}
          />
          {ideas.length ? (
            <div className={styles.moreIdeas}>
              <IdeaList ideas={ideas.slice(0, IDEAS_SHOWN)} place={place} showProgram={!single} />
              {ideas.length > IDEAS_SHOWN ? (
                <details className={styles.moreIdeas}>
                  <summary className={audit.headLink}>
                    Show {ideas.length - IDEAS_SHOWN} more {ideas.length - IDEAS_SHOWN === 1 ? 'idea' : 'ideas'}
                    <Icon name="chevronDown" size={16} />
                  </summary>
                  <IdeaList ideas={ideas.slice(IDEAS_SHOWN)} start={IDEAS_SHOWN + 1} place={place} showProgram={!single} />
                </details>
              ) : null}
            </div>
          ) : (
            <p className={audit.quietNote}>Ideas are written from the questions students ask. This month’s arrive with the next update, on {formatDate(nextPullOn(now))}.</p>
          )}
        </section>
      ) : null}

      {rows.length ? (
        <section className={audit.section} aria-labelledby="ask-title">
          <SectionHead id="ask-title" icon="forum" title="What students ask" help={`Grouped from public questions, posts and searches in ${place}. Never a person.`} />
          <AskTabs
            view={view}
            showProgram={!single}
            more={[
              {
                id: 'mentions',
                label: 'About you and your rivals',
                content: (
                  <>
                    <p className={styles.tabNote}>
                      What students say in public posts across {institution.state}, about you and each rival you track. Topics and counts only.
                    </p>
                    <MentionsTable
                      subjects={[
                        { id: institution.id, name: institution.name, sub: institution.name, you: true },
                        ...rivals.map((rival) => ({ id: rival.id, name: rival.name, sub: `${INSTITUTION_TYPE_LABELS[rival.type]}, ${rival.city}`, you: false })),
                      ]}
                      mentions={data.mentions}
                    />
                  </>
                ),
              },
            ]}
          />
        </section>
      ) : null}

      {data.uncovered.length ? <p className={audit.quietNote}>Programs added under Other are not covered yet: {joinNames(data.uncovered)}.</p> : null}
    </div>
  );
}

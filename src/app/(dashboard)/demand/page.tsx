import type { ReactNode } from 'react';
import { markDoneAction } from '@/app/(dashboard)/actions';
import { SectionTitle } from '@/components/audit/PlaceBits';
import { IdeaCards, IdeaRows, type IdeaItem } from '@/components/demand/IdeaCards';
import { AsksByProgram, AttentionList, BestMonths, biggestChange, Found, NotOfferedList, TrendList } from '@/components/demand/Signals';
import { PaidAction } from '@/components/plan/PaidAction';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { DEMAND_RULES } from '@/config/demand';
import { nextPullOn } from '@/demand/schedule';
import { ideaWhy, named, type IdeaView, type TrendRow } from '@/demand/signals';
import { filledInNote, LANGUAGE_TAGS, lastMonthLine, LIKE_YOURS, sourcesCaption, trendWord } from '@/demand/text';
import { formatDate, formatMonth, joinNames, plural } from '@/domain/format';
import { IDEA_FORMAT_LABELS, type Language } from '@/domain/types';
import { requireInstitutionViewer, type InstitutionViewer } from '@/lib/auth/guards';
import { ideaMarkKey, loadDemandPage, type DemandPageData, type DemandPick } from '@/lib/demand/load';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/demand/demand.module.css';

export const metadata = { title: 'Demand' };

const QUESTION = 'What do students want?';

/** Where a question was asked, when, and in what language. */
function Asked({ url, platform, at, language }: { url: string; platform: string | null; at: string; language: Language }) {
  const tag = LANGUAGE_TAGS[language];
  return (
    <span className={styles.trendMeta}>
      <span>From</span>
      <Found url={url} platform={platform} at={at} />
      {tag ? <span>{tag}</span> : null}
    </span>
  );
}

function pickItem(pick: DemandPick): IdeaItem {
  const { idea } = pick;
  return {
    key: ideaMarkKey(pick.month, idea.text),
    index: pick.rank,
    title: idea.title,
    why: idea.why,
    hook: idea.hook,
    points: idea.points,
    format: idea.format ? IDEA_FORMAT_LABELS[idea.format] : null,
    program: idea.programName,
    source: <Asked url={idea.sourceUrl} platform={idea.platform} at={idea.foundAt} language={idea.language} />,
    mark: { thing: idea.text, month: pick.month },
    made: pick.made,
  };
}

function ideaItem(idea: IdeaView, index: number, institutionName: string, made: ReadonlySet<string>): IdeaItem {
  const key = ideaMarkKey(idea.month, idea.text);
  return {
    key,
    index,
    title: named(idea.title, institutionName),
    why: ideaWhy(idea),
    hook: named(idea.hook, institutionName),
    points: idea.points.map((point) => named(point, institutionName)),
    format: idea.format ? IDEA_FORMAT_LABELS[idea.format] : null,
    program: idea.program.name,
    source: <Asked url={idea.sourceUrl} platform={idea.platform} at={idea.foundAt} language={idea.language} />,
    mark: { thing: idea.text, month: idea.month },
    made: made.has(key),
  };
}

function ShowMore({ count, noun, children }: { count: number; noun: [string, string]; children: ReactNode }) {
  return (
    <details className={styles.showMore}>
      <summary className={styles.showMoreSummary}>
        Show {plural(count, `more ${noun[0]}`, `more ${noun[1]}`)}
        <Icon name="chevronDown" size={16} />
      </summary>
      {children}
    </details>
  );
}

// Demand answers "What do students want?" for the institution's city (spec 9.4), as the version 2
// mock was approved: Make these 3 this month at the top, then the programs rising and falling,
// what students ask, what gets attention with the best months to post, and more ideas. Free sees
// the first of the 3 and one rising program, then what Paid adds.
export default async function DemandPage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const data = await loadDemandPage(viewer);
  const now = new Date();
  const nextUpdate = formatDate(nextPullOn(now));
  const canMark = role === 'owner' && !viewer.viewingAs;

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

  if (data.free) return <FreeDemand viewer={viewer} data={data} free={data.free} nextUpdate={nextUpdate} canMark={canMark} />;

  const signals = data.signals;
  if (!signals || signals.sources.length === 0) {
    return (
      <div className={audit.page}>
        <PageHead title="Demand" question={QUESTION} caption={[institution.city, `Next update ${nextUpdate}`]} />
        <EmptyState icon="demand" title="This update is on its way">
          What students in {institution.city} search for and ask shows here after the next update, on {nextUpdate}. It is grouped, never personal.
        </EmptyState>
      </div>
    );
  }

  const allFilled = signals.filledIn.length === signals.sources.length;
  const mixed = signals.filledIn.length > 0 && !allFilled;
  const place = allFilled ? institution.state : institution.city;
  const single = signals.sources.length === 1;
  const caption = [
    signals.month ? `${place}, ${formatMonth(signals.month)}` : place,
    signals.pulledAt ? `Updated ${formatDate(signals.pulledAt)}` : null,
    `Next update ${nextUpdate}`,
    signals.platforms.length ? sourcesCaption(signals.platforms, signals.languages) : null,
  ];

  const picks = data.picks;
  const picked = new Set(picks?.items.map((pick) => pick.idea.text) ?? []);
  const more = signals.ideas.filter((idea) => !picked.has(idea.text)).map((idea, index) => ideaItem(idea, index + (picks?.items.length ?? 0) + 1, institution.name, data.made));
  // Rising and falling both show before "Show more": the fastest rises, then the steepest falls.
  const rising = signals.trends.filter((trend) => trend.kind === 'rising');
  const falling = signals.trends.filter((trend) => trend.kind === 'falling');
  const fallingShown = falling.slice(0, Math.min(2, Math.floor(DEMAND_RULES.trendsShown / 3)));
  const risingShown = rising.slice(0, DEMAND_RULES.trendsShown - fallingShown.length);
  const trends = [...risingShown, ...fallingShown];
  const moreTrends = [...rising.slice(risingShown.length), ...falling.slice(fallingShown.length)];
  const scale = biggestChange(signals.trends);

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Demand" question={QUESTION} caption={caption} />
        {signals.filledIn.length ? (
          <p className={styles.fillNote}>
            <Icon name="info" size={16} />
            {filledInNote(institution.city, institution.state, signals.filledIn, allFilled)}
          </p>
        ) : null}
      </div>

      <section className={audit.block} aria-labelledby="three-title">
        {data.last ? (
          <p className={styles.lastMonth}>
            <Icon name="checkCircle" size={18} />
            <span>{lastMonthLine(data.last.month, data.last.made, data.last.total, data.last.stillRising)}</span>
          </p>
        ) : null}
        <SectionTitle
          id="three-title"
          icon="spark"
          title="Make these 3 this month"
          help={`Picked from what students ask most that your website does not answer yet, one for each program where possible. They stay until the next update, on ${nextUpdate}.`}
        />
        {picks?.items.length ? (
          <IdeaCards items={picks.items.map(pickItem)} canMark={canMark} onMark={markDoneAction} />
        ) : (
          <p className={audit.quiet}>Your 3 are picked with the next update, on {nextUpdate}.</p>
        )}
      </section>

      <section className={audit.block} aria-labelledby="programs-title">
        <SectionTitle id="programs-title" icon="demand" title={`Programs in ${place}`} help="Rising and falling this month. A number shows only when the keyword tool counts real searches; otherwise the words say how fast." />
        <div className={audit.twoUp}>
          <div className={audit.card}>
            <p className={audit.columnTitle}>Rising and falling</p>
            {trends.length ? (
              <>
                <TrendList trends={trends} showProgram={!single} showRegion={mixed} scale={scale} />
                {moreTrends.length ? (
                  <ShowMore count={moreTrends.length} noun={['program', 'programs']}>
                    <TrendList trends={moreTrends} showProgram={!single} showRegion={mixed} scale={scale} />
                  </ShowMore>
                ) : null}
              </>
            ) : (
              <p className={audit.quiet}>Search trends have nothing for your programs in {place} this month.</p>
            )}
          </div>
          <div className={audit.card}>
            <p className={audit.columnTitle}>Courses students ask for that you don’t offer</p>
            {signals.notOffered.length ? (
              <>
                <NotOfferedList trends={signals.notOffered.slice(0, DEMAND_RULES.trendsShown)} />
                {signals.notOffered.length > DEMAND_RULES.trendsShown ? (
                  <ShowMore count={signals.notOffered.length - DEMAND_RULES.trendsShown} noun={['course', 'courses']}>
                    <NotOfferedList trends={signals.notOffered.slice(DEMAND_RULES.trendsShown)} />
                  </ShowMore>
                ) : null}
              </>
            ) : (
              <p className={audit.quiet}>Every course rising near your programs is one you offer.</p>
            )}
          </div>
        </div>
      </section>

      {signals.asks.length ? (
        <section className={audit.block} aria-labelledby="asks-title">
          <SectionTitle id="asks-title" icon="forum" title="What students ask, by program" help="Fees, placements, scholarships, hostel and careers, each with the questions asked most and where. Grouped from public questions, never a person." />
          <AsksByProgram asks={signals.asks} showRegion={mixed} />
        </section>
      ) : null}

      {signals.attention.length || signals.bestMonths.length ? (
        <section className={audit.block} aria-labelledby="attention-title">
          <SectionTitle id="attention-title" icon="video" title="What gets attention" help={`Topics and formats that get the most attention from students in ${place}, in posts by ${LIKE_YOURS[institution.type]}.`} />
          <div className={audit.twoUp}>
            <div className={audit.card}>
              <p className={audit.columnTitle}>Topics and formats</p>
              {signals.attention.length ? <AttentionList rows={signals.attention} showProgram={!single} /> : <p className={audit.quiet}>Not enough posts to say this month.</p>}
            </div>
            <div className={audit.card}>
              <p className={audit.columnTitle}>Best months to post</p>
              {signals.bestMonths.length ? <BestMonths rows={signals.bestMonths} /> : <p className={audit.quiet}>Search trends have too little to say yet.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {more.length ? (
        <section className={audit.block} aria-labelledby="more-title">
          <SectionTitle id="more-title" icon="spark" title="More ideas" help="The month’s other ideas, asked most first. Each is built on a real student question, with where it was asked." />
          <div className={audit.card}>
            <IdeaRows items={more.slice(0, DEMAND_RULES.moreIdeasShown)} canMark={canMark} onMark={markDoneAction} />
            {more.length > DEMAND_RULES.moreIdeasShown ? (
              <ShowMore count={more.length - DEMAND_RULES.moreIdeasShown} noun={['idea', 'ideas']}>
                <IdeaRows items={more.slice(DEMAND_RULES.moreIdeasShown)} canMark={canMark} onMark={markDoneAction} />
              </ShowMore>
            ) : null}
          </div>
        </section>
      ) : null}

      {data.uncovered.length ? <p className={audit.quiet}>Programs added under Other are not covered yet: {joinNames(data.uncovered)}.</p> : null}
    </div>
  );
}

/** Free: the first of Make these 3, for its program, and one program rising, then what Paid adds (spec section 10). */
function FreeDemand({
  viewer,
  data,
  free,
  nextUpdate,
  canMark,
}: {
  viewer: InstitutionViewer;
  data: DemandPageData;
  free: NonNullable<DemandPageData['free']>;
  nextUpdate: string;
  canMark: boolean;
}) {
  const { institution } = viewer.membership;
  const program = data.programs[0];
  const highlight = free.highlight;
  const first = data.picks?.items[0] ?? null;
  const place = highlight?.region ?? first?.idea.region ?? institution.city;
  const month = data.picks?.month ?? highlight?.month ?? null;
  const caption = [month ? `${place}, ${formatMonth(month)}` : place, highlight ? `Updated ${formatDate(highlight.foundAt)}` : null, `Next update ${nextUpdate}`, 'Free shows your Free program'];

  if (!highlight && !first) {
    return (
      <div className={audit.page}>
        <PageHead title="Demand" question={QUESTION} caption={caption} />
        <EmptyState icon="demand" title="This update is on its way">
          What students in {institution.city} search for and ask about {program?.name ?? 'your program'} shows here after the next update, on {nextUpdate}.
        </EmptyState>
      </div>
    );
  }

  const trend: TrendRow | null = highlight
    ? {
        key: 'highlight',
        kind: 'rising',
        text: highlight.text,
        programName: highlight.programName,
        programKey: program?.programKey ?? '',
        region: highlight.region,
        changePct: highlight.changePct,
        word: trendWord(highlight.changePct),
        searches: highlight.count,
        searchesUrl: highlight.countSource,
        sourceUrl: highlight.sourceUrl,
        foundAt: highlight.foundAt,
        course: true,
        offered: true,
      }
    : null;
  const teaser = free.teaser;
  const programName = program?.name ?? highlight?.programName ?? 'your program';

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Demand" question={QUESTION} caption={caption} />
        {place !== institution.city ? (
          <p className={styles.fillNote}>
            <Icon name="info" size={16} />
            {filledInNote(institution.city, institution.state, [programName], true)}
          </p>
        ) : null}
      </div>

      {first ? (
        <section className={audit.block} aria-labelledby="three-title">
          <SectionTitle id="three-title" icon="spark" title="Make these 3 this month" help={`Free shows the first, for ${programName}. Picked from what students ask most that your website does not answer yet.`} />
          <IdeaCards
            items={[pickItem(first)]}
            canMark={canMark}
            onMark={markDoneAction}
            after={
              <li className={styles.lockedCard}>
                <Icon name="lock" size={18} />
                <p className={styles.lockedTitle}>2 more with Paid</p>
                <p className={audit.quiet}>One for each of your other programs where possible, each with its hook and key points.</p>
              </li>
            }
          />
        </section>
      ) : null}

      {trend ? (
        <section className={audit.block} aria-labelledby="programs-title">
          <SectionTitle id="programs-title" icon="demand" title={`Programs in ${place}`} help="Rising fastest this month. A number shows only when the keyword tool counts real searches." />
          <div className={audit.card}>
            <TrendList trends={[trend]} showProgram={false} showRegion={false} />
            {teaser.trends > 1 ? <p className={audit.quiet}>{plural(teaser.trends - 1, 'more program', 'more programs')} rising and falling for {programName} with Paid.</p> : null}
          </div>
        </section>
      ) : null}

      <section className={audit.unlock} aria-labelledby="unlock-title">
        <div>
          <h2 id="unlock-title" className={audit.unlockTitle}>
            Paid shows everything students want
          </h2>
          <ul className={audit.unlockList}>
            <li>
              <Icon name="lock" size={14} />
              All 3 ideas to make each month, with hooks and key points
            </li>
            <li>
              <Icon name="lock" size={14} />
              Every program rising and falling in {place}, and the courses students ask for that you don’t offer
            </li>
            <li>
              <Icon name="lock" size={14} />
              {teaser.topics
                ? `What students ask about ${programName}: ${plural(teaser.topics, 'topic', 'topics')} and ${plural(teaser.questions, 'question', 'questions')} found this month, with where they asked`
                : 'What students ask about each program, with where they asked'}
            </li>
            <li>
              <Icon name="lock" size={14} />
              What gets attention, and the best months to post for each program
            </li>
            <li>
              <Icon name="lock" size={14} />
              {teaser.ideas > 1 ? `${plural(teaser.ideas - 1, 'more idea', 'more ideas')} for ${programName} this month, each built on a real question` : 'More ideas each month, each built on a real question'}
            </li>
          </ul>
        </div>
        <div className={audit.unlockAction}>
          <PaidAction viewer={viewer} />
        </div>
      </section>
    </div>
  );
}

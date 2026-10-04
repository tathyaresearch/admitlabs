// Version 2 mock (Step 2, development only): Rivals in your city, the Nearby city chooser, and
// Demand with Make these 3.

import { Button, ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { ResultBar } from '@/components/ui/Results';
import { EFFORT_LABELS, type CheckResult } from '@/domain/types';
import { SectionTitle, Tag, fmt } from './Bits';
import { CHOOSER, DEMAND, type Idea, type MockRivals, type RivalSide } from './data-more';
import { PLACES, WORDS, type Word } from './model';
import styles from './mock.module.css';

const WORD_RESULT: Readonly<Record<Word, CheckResult>> = { Strong: 'strong', Okay: 'okay', Weak: 'weak' };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function SideName({ side }: { side: RivalSide }) {
  return (
    <span className={styles.sideName}>
      {side.you ? 'You' : side.name}
      {side.you ? <Tag strong>{side.name}</Tag> : null}
      {side.nearby ? <Tag>Nearby city</Tag> : null}
    </span>
  );
}

function Ranking({ rivals }: { rivals: MockRivals }) {
  return (
    <section className={styles.block} aria-labelledby="ranking-title">
      <SectionTitle id="ranking-title" icon="rivals" title="The ranking" help={`You and your rivals in ${rivals.city}, from each one’s own Audit of 1 September. The score is small on purpose: the words say more.`} />
      <div className={styles.card}>
        <ol className={styles.ranking}>
          {rivals.sides.map((side, index) => (
            <li key={side.id} className={[styles.rankRow, side.you ? styles.rankYou : ''].join(' ')}>
              <span className={`${styles.rankPlace} num`}>{index + 1}</span>
              <SideName side={side} />
              <span className={styles.rankWords}>
                {WORDS.map((word, wordIndex) => (
                  <span key={word.pillar} className={styles.rankWord}>
                    <span className={styles.rankWordName}>{word.name}</span>
                    {side.words[wordIndex]}
                  </span>
                ))}
              </span>
              <span className={styles.rankScore}>
                <span className="num">{side.score}</span>
                <span className="visually-hidden"> out of 100</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PlaceGrid({ rivals }: { rivals: MockRivals }) {
  return (
    <div className={[styles.card, styles.gridCard].join(' ')}>
      <div className={styles.gridScroll}>
        <table className={styles.placeGrid}>
          <thead>
            <tr>
              <th scope="col">Place</th>
              {rivals.sides.map((side) => (
                <th key={side.id} scope="col">
                  {side.you ? 'You' : side.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLACES.map((place) => (
              <tr key={place.key}>
                <th scope="row">
                  <span className={styles.gridPlace}>
                    <Icon name={place.icon} size={16} />
                    {place.name}
                  </span>
                </th>
                {rivals.sides.map((side) => {
                  const standing = side.places[place.key];
                  return (
                    <td key={side.id} className={standing.leads ? styles.gridLead : undefined}>
                      {standing.word ? (
                        <span className={styles.gridCell}>
                          <span className={styles.gridWord}>{standing.word}</span>
                          {standing.leads ? <span className={styles.leadsMark}>Leads</span> : null}
                        </span>
                      ) : (
                        <span className={styles.gridNote}>{standing.note}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.quiet}>Website, Google and Social media say who leads. What people say and Other places show what was found for each side.</p>
    </div>
  );
}

function PlaceCards({ rivals }: { rivals: MockRivals }) {
  return (
    <div className={styles.placeCards}>
      {PLACES.map((place) => {
        const leader = rivals.sides.find((side) => side.places[place.key].leads);
        return (
          <section key={place.key} className={styles.card} aria-labelledby={`pc-${place.key}`}>
            <div className={styles.cardHead}>
              <h3 id={`pc-${place.key}`} className={styles.cardTitle}>
                <Icon name={place.icon} size={18} />
                {place.name}
              </h3>
              <span className={styles.quiet}>{place.scored ? (leader ? (leader.you ? 'You lead' : `${leader.name} leads`) : '') : 'What was found'}</span>
            </div>
            <ul className={styles.sideRows}>
              {rivals.sides.map((side) => {
                const standing = side.places[place.key];
                return (
                  <li key={side.id} className={[styles.sideRow, side.you ? styles.sideRowYou : ''].join(' ')}>
                    <span className={styles.sideRowName}>
                      {side.you ? 'You' : side.name}
                      {standing.leads ? <span className={styles.leadsMark}>Leads</span> : null}
                    </span>
                    {standing.word ? <ResultBar result={WORD_RESULT[standing.word]} share={standing.share ?? 0} showPoints={false} size="sm" /> : <span className={styles.gridNote}>{standing.note}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CheckByCheck({ rivals }: { rivals: MockRivals }) {
  const heads = ['You', ...rivals.sides.filter((side) => !side.you).map((side) => side.name)];
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Icon name="share" size={18} />
          Social media, check by check
        </h3>
        <span className={styles.quiet}>Opened from the place above</span>
      </div>
      <div className={styles.gridScroll}>
        <table className={styles.placeGrid}>
          <thead>
            <tr>
              <th scope="col">Check</th>
              {heads.map((head) => (
                <th key={head} scope="col">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rivals.checks.map((check) => (
              <tr key={check.name}>
                <th scope="row">{check.name}</th>
                {heads.map((head) => {
                  const cell = check.results.find((result) => result.side === head);
                  return (
                    <td key={head} className={cell?.leads ? styles.gridLead : undefined}>
                      {cell ? (
                        <span className={styles.gridCell}>
                          <ResultBar result={cell.result} showPoints={false} size="sm" />
                          {cell.leads ? <span className={styles.leadsMark}>Leads</span> : null}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.learn}>
        <span className={styles.learnLabel}>What to learn from Silverline College</span>
        Their best post this month opens on a real student at work, and the outcome shows in the first two seconds. Take the idea with your own students; never copy the post.
      </p>
    </div>
  );
}

export function RivalsView({ rivals, option }: { rivals: MockRivals; option: 1 | 2 }) {
  const count = rivals.sides.length - 1;
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead
          title="Rivals"
          question="Who’s ahead in our city?"
          caption={[`${count} rivals in ${rivals.city}`, 'Checked 1 Sep 2026', 'Alerts checked every Monday']}
          actions={
            <ButtonLink href="/mock/rivals/choose" variant="secondary" size="sm" icon="rivals">
              Change rivals
            </ButtonLink>
          }
        />
      </div>
      <p className={styles.bigLine}>{rivals.line}</p>
      <Ranking rivals={rivals} />
      <section className={styles.block} aria-labelledby="pbp-title">
        <SectionTitle id="pbp-title" icon="globe" title="Place by place" help="The same five places as your Audit. Open a place to see each check, what was found for each side, and what to learn from the one ahead." />
        {option === 1 ? <PlaceGrid rivals={rivals} /> : <PlaceCards rivals={rivals} />}
        <CheckByCheck rivals={rivals} />
      </section>
      <section className={styles.block} aria-labelledby="learn-title">
        <SectionTitle id="learn-title" icon="spark" title="What to learn from them" help="Learned from your rivals this month. Take the idea, never copy." />
        <div className={styles.card}>
          <ol className={styles.fixes}>
            {rivals.lessons.map((lesson, index) => (
              <li key={lesson.title} className={styles.fixRow}>
                <span className={`${styles.fixIndex} num`}>{index + 1}</span>
                <span className={styles.fixBody}>
                  <span className={styles.fixLabel}>From {lesson.rival}</span>
                  <span className={styles.fixTitle}>{lesson.title}</span>
                  {lesson.detail ? <span className={styles.quiet}>{lesson.detail}</span> : null}
                  {lesson.effort ? (
                    <span className={styles.tags}>
                      <Tag>Effort {EFFORT_LABELS[lesson.effort]}</Tag>
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className={styles.block} aria-labelledby="alerts-title">
        <SectionTitle id="alerts-title" icon="bell" title="Alerts" help="The last 30 days: new programs, fee changes, new pages, admission dates, ads and big jumps in reviews. Each links to where it was found." />
        <div className={styles.card}>
          <ul className={styles.alerts}>
            {rivals.alerts.map((alert) => (
              <li key={alert.id} className={styles.alertRow}>
                <span className={styles.alertDay}>{fmt(alert.day)}</span>
                <span className={styles.alertBody}>
                  <span className={styles.alertHead}>
                    <Tag strong={alert.kind === 'Started ads' || alert.kind === 'Big jump in reviews'}>{alert.kind}</Tag>
                    <span className={styles.strongText}>{alert.rival}</span>
                  </span>
                  <span>{alert.text}</span>
                  <span className={styles.alertSource}>{alert.source.startsWith('http') ? alert.source.replace(/^https?:\/\//, '') : alert.source}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function ChooserRow({ row, nearby }: { row: { name: string; type: string; city: string; shared: readonly string[]; picked: boolean }; nearby: boolean }) {
  return (
    <li className={styles.chooseRow}>
      <span className={[styles.checkBox, row.picked ? styles.checkBoxOn : ''].join(' ')} aria-hidden="true">
        {row.picked ? <Icon name="check" size={14} /> : null}
      </span>
      <span className={styles.chooseText}>
        <span className={styles.chooseName}>
          {row.name}
          {nearby ? <Tag>Nearby city</Tag> : null}
        </span>
        <span className={styles.quiet}>
          {row.type}, {row.city}. Also offers {row.shared.join(' and ')}.
        </span>
      </span>
    </li>
  );
}

export function ChooserView() {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Rivals" question="Who’s ahead in our city?" caption={['Pick 3 to 5 rivals', 'Free keeps the rivals you pick']} />
      </div>
      <section className={styles.block} aria-labelledby="in-city">
        <SectionTitle id="in-city" icon="mapPin" title={`In ${CHOOSER.city}`} help="Institutions in your city that offer one of your programs." />
        <div className={styles.card}>
          <ul className={styles.chooseList}>
            {CHOOSER.local.map((row) => (
              <ChooserRow key={row.name} row={row} nearby={false} />
            ))}
          </ul>
        </div>
      </section>
      <Notice icon="info" title={`Only one institution in ${CHOOSER.city} shares your programs.`}>
        So here are some from {CHOOSER.nearCity}, the nearest bigger city. They are marked Nearby city wherever they show.
      </Notice>
      <section className={styles.block} aria-labelledby="near-city">
        <SectionTitle id="near-city" icon="mapPin" title={`Nearby city: ${CHOOSER.nearCity}`} />
        <div className={styles.card}>
          <ul className={styles.chooseList}>
            {CHOOSER.nearby.map((row) => (
              <ChooserRow key={row.name} row={row} nearby />
            ))}
          </ul>
        </div>
      </section>
      <div className={styles.chooseFoot}>
        <button type="button" className={styles.linkButton}>
          <Icon name="plus" size={16} />
          Add one that is not here
        </button>
        <span className={styles.chooseCount}>
          <span className="num">3</span> picked
        </span>
        <Button>Save rivals</Button>
      </div>
    </div>
  );
}

// Demand ------------------------------------------------------------------------------------------

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  return (
    <article className={[styles.card, styles.ideaCard].join(' ')}>
      <p className={styles.ideaTop}>
        <span className={`${styles.fixIndex} num`}>{index}</span>
        <Tag strong>{idea.format}</Tag>
        <Tag>{idea.program}</Tag>
      </p>
      <h3 className={styles.ideaTitle}>{idea.title}</h3>
      <p className={styles.ideaWhy}>{idea.why}</p>
      <p className={styles.ideaHook}>
        <span className={styles.ideaLabel}>Hook</span>
        {idea.hook}
      </p>
      <div>
        <p className={styles.ideaLabel}>Key points</p>
        <ul className={styles.ideaPoints}>
          {idea.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <p className={styles.ideaSource}>From {idea.source}</p>
      <Button variant="secondary" size="sm" icon="check">
        Mark as made
      </Button>
    </article>
  );
}

function IdeaRow({ idea, index, open }: { idea: Idea; index: number; open: boolean }) {
  return (
    <details className={styles.ideaRow} open={open}>
      <summary className={styles.ideaSummary}>
        <span className={`${styles.fixIndex} num`}>{index}</span>
        <span className={styles.ideaSummaryText}>
          <span className={styles.fixTitle}>{idea.title}</span>
          <span className={styles.tags}>
            <Tag strong>{idea.format}</Tag>
            <Tag>{idea.program}</Tag>
            <span className={styles.weight}>{idea.why.split('.')[0]}.</span>
          </span>
        </span>
        <Icon name="chevronDown" size={18} className={styles.ideaChevron} />
      </summary>
      <div className={styles.ideaOpen}>
        <p className={styles.ideaHook}>
          <span className={styles.ideaLabel}>Hook</span>
          {idea.hook}
        </p>
        <div>
          <p className={styles.ideaLabel}>Key points</p>
          <ul className={styles.ideaPoints}>
            {idea.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <p className={styles.ideaSource}>
          {idea.why} From {idea.source}.
        </p>
        <Button variant="secondary" size="sm" icon="check">
          Mark as made
        </Button>
      </div>
    </details>
  );
}

const TREND_ICON = { 'Rising fast': 'arrowUp', Rising: 'arrowUpRight', Steady: 'equal', Falling: 'arrowDown' } as const;

export function DemandView({ option }: { option: 1 | 2 }) {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Demand" question="What do students want?" caption={[`${DEMAND.place}, September 2026`, `Updated ${DEMAND.updated}`, `Next update ${DEMAND.next}`, DEMAND.sources]} />
      </div>

      <section className={styles.block} aria-labelledby="three-title">
        <p className={styles.lastMonth}>
          <Icon name="checkCircle" size={18} />
          <span>
            In {DEMAND.last.month} you made <span className="num">{DEMAND.last.made}</span> of <span className="num">{DEMAND.last.of}</span>. Still rising: {DEMAND.last.stillRising.join(', ')}.
          </span>
        </p>
        <SectionTitle id="three-title" icon="spark" title="Make these 3 this month" help="Picked from what students ask most that your website and posts do not answer yet, one per program." />
        {option === 1 ? (
          <div className={styles.ideaGrid}>
            {DEMAND.three.map((idea, index) => (
              <IdeaCard key={idea.title} idea={idea} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className={styles.card}>
            {DEMAND.three.map((idea, index) => (
              <IdeaRow key={idea.title} idea={idea} index={index + 1} open={index === 0} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.block} aria-labelledby="programs-title">
        <SectionTitle id="programs-title" icon="demand" title={`Programs in ${DEMAND.place}`} help="Rising and falling this month. A number shows only when the keyword tool counts real searches." />
        <div className={styles.twoUp}>
          <div className={styles.card}>
            <p className={styles.columnTitle}>Rising and falling</p>
            <ul className={styles.trendList}>
              {DEMAND.programs.map((program) => (
                <li key={program.name} className={styles.trendRow}>
                  <span className={styles.trendName}>
                    {program.name}
                    {program.offered ? null : <Tag>You don’t offer it</Tag>}
                  </span>
                  <span className={styles.trendWord}>
                    <Icon name={TREND_ICON[program.trend as keyof typeof TREND_ICON]} size={14} />
                    {program.trend}
                  </span>
                  <span className={styles.trendCount}>
                    {program.searches ? (
                      <>
                        About <span className="num">{program.searches.toLocaleString('en-IN')}</span> searches a month
                      </>
                    ) : (
                      'No count from a source'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.card}>
            <p className={styles.columnTitle}>Courses students ask for that you don’t offer</p>
            <ul className={styles.gapList}>
              {DEMAND.gaps.map((gap) => (
                <li key={gap.name}>
                  <span className={styles.trendName}>
                    {gap.name}
                    <span className={styles.trendWord}>
                      <Icon name={TREND_ICON[gap.trend as keyof typeof TREND_ICON]} size={14} />
                      {gap.trend}
                    </span>
                  </span>
                  <span className={styles.quiet}>{gap.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="asks-title">
        <SectionTitle id="asks-title" icon="forum" title="What students ask, by program" help="Fees, placements, scholarships, hostel and careers. Grouped from public questions, never a person." />
        <div className={styles.twoUp}>
          {DEMAND.asks.map((group) => (
            <div key={group.program} className={styles.card}>
              <p className={styles.columnTitle}>{group.program}</p>
              <ul className={styles.askList}>
                {group.topics.map((topic) => (
                  <li key={topic.name} className={styles.askRow}>
                    <span className={styles.askHead}>
                      <span className={styles.askName}>{topic.name}</span>
                      <span className={styles.askBar} aria-hidden="true">
                        <span style={{ width: `${topic.share}%` }} />
                      </span>
                      <span className={styles.askShare}>
                        <span className="num">{topic.share}%</span> of questions
                      </span>
                    </span>
                    <span className={styles.askQuestion}>“{topic.question}”</span>
                    <span className={styles.quiet}>
                      Asked about {topic.count} times · {topic.source}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block} aria-labelledby="content-title">
        <SectionTitle id="content-title" icon="video" title="What gets attention" help={`Topics and formats that get the most attention from students in ${DEMAND.place}, among institutions like yours.`} />
        <div className={styles.twoUp}>
          <div className={styles.card}>
            <p className={styles.columnTitle}>Topics and formats</p>
            <ul className={styles.trendList}>
              {DEMAND.attention.map((item) => (
                <li key={item.topic} className={styles.trendRow}>
                  <span className={styles.trendName}>{item.topic}</span>
                  <span className={styles.trendWord}>{item.format}</span>
                  <span className={styles.trendCount}>{item.level}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.card}>
            <p className={styles.columnTitle}>Best months to post</p>
            <ul className={styles.monthList}>
              {DEMAND.months.map((row) => (
                <li key={row.program} className={styles.monthRow}>
                  <span className={styles.monthProgram}>
                    {row.program}
                    <span className={styles.quiet}>{row.text}</span>
                  </span>
                  <span className={styles.monthStrip}>
                    {MONTHS.map((letter, index) => {
                      const best = row.best.includes(index + 1);
                      return (
                        <span key={index} className={[styles.monthCell, best ? styles.monthBest : ''].join(' ')} title={MONTH_NAMES[index]}>
                          {letter}
                          <span className="visually-hidden">{best ? `${MONTH_NAMES[index]}, a best month` : MONTH_NAMES[index]}</span>
                        </span>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="more-title">
        <SectionTitle id="more-title" icon="spark" title="More ideas" help="The month’s other ideas, each built on a real question." />
        <div className={styles.card}>
          {DEMAND.more.map((idea, index) => (
            <IdeaRow key={idea.title} idea={idea} index={index + 4} open={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

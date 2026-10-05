// Real pictures of the dashboard for the product page: the dashboard's own components, filled with
// the sample institution's data (the sample world through the real scoring engine, under the
// website's names: Larkmoor University, Bangalore; src/product/showcase.ts), as Paid sees them.
// They can't be focused or clicked, carry no links into the dashboard, and screen readers get a
// short summary instead. Like the website's pictures, they carry no caption.

import type { ReactNode } from 'react';
import { FixList, FoundList, SectionTitle, WordTiles } from '@/components/audit/PlaceBits';
import { IdeaCard, type IdeaItem } from '@/components/demand/IdeaCard';
import { biggestChange, Found, TrendList } from '@/components/demand/Signals';
import { DemandHighlightCard, RivalsLineCard } from '@/components/home/HomeCards';
import { ThingList, type HomeThing } from '@/components/home/ThingList';
import { PlacesBoard, Ranking, RivalLine } from '@/components/rivals/City';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { Tabs } from '@/components/ui/Tabs';
import { LANGUAGE_TAGS } from '@/demand/text';
import { formatDate } from '@/domain/format';
import { wordScoreText } from '@/domain/scores';
import { IDEA_FORMAT_LABELS } from '@/domain/types';
import type { Showcase } from '@/product/showcase';
import type { MonthPick, Thing } from '@/report/things';
import audit from '@/components/audit/places.module.css';
import demand from '@/components/demand/demand.module.css';
import today from '@/components/home/today.module.css';
import shell from '@/components/shell/AppShell.module.css';
import styles from './pictures.module.css';

const SAMPLE_EMAIL = 'owner@larkmoor-university.example';

/** A thing to do as Home lists it, with nothing to open from a picture. */
function pictureThing(thing: Thing, index: number): HomeThing {
  return {
    key: `${thing.source}-${index}`,
    source: thing.source,
    title: thing.title,
    label: thing.label,
    href: null,
    impact: thing.impact,
    effort: thing.effort,
    programs: thing.programs,
    weight: thing.weight,
    fixId: thing.fixId,
    mark: thing.mark,
    done: false,
  };
}

/** One of Make these 3 as the Demand page shows it, with where its question was asked. */
function pickItem(pick: MonthPick): IdeaItem {
  const { idea } = pick;
  const language = LANGUAGE_TAGS[idea.language];
  return {
    key: `${pick.month}:${idea.text}`,
    index: pick.rank,
    title: idea.title,
    why: idea.why,
    hook: idea.hook,
    points: idea.points,
    format: idea.format ? IDEA_FORMAT_LABELS[idea.format] : null,
    program: idea.programName,
    source: (
      <span className={demand.trendMeta}>
        <span>From</span>
        <Found url={idea.sourceUrl} platform={idea.platform} at={idea.foundAt} />
        {language ? <span>{language}</span> : null}
      </span>
    ),
    mark: { thing: idea.text, month: pick.month },
    made: false,
  };
}

/** A part of Home the signup stage's light can find (`data-zone`), kept as tall as the part beside it. */
function Zone({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className={styles.zone} data-zone={name}>
      {children}
    </div>
  );
}

/**
 * Home as the dashboard draws it for Paid: the one line from the three words, the three words with
 * what to fix first in each, Do these 3 things this month, then the rivals' one line and the demand
 * highlight. Its parts are marked for the signup stage's light.
 */
export function HomePicture({ showcase }: { showcase: Showcase }) {
  const { institution, audit: view, things, rivals, demand: wants } = showcase;
  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Home" question="How are we doing this month?" caption={[`Audit checked ${formatDate(showcase.checkedAt)}`]} titleAs="p" />
        <p className={today.answer}>{showcase.answer}</p>
      </div>
      <Zone name="words">
        <WordTiles words={view.words} />
      </Zone>
      <Zone name="things">
        <section className={audit.block}>
          <SectionTitle
            icon="check"
            title="Do these 3 things this month"
            help="Ordered by impact: a fix from your Audit, a lesson from your rivals and one of Make these 3."
          />
          <ThingList items={things.map(pictureThing)} />
        </section>
      </Zone>
      <div className={today.pair}>
        <Zone name="rivals">
          <RivalsLineCard city={institution.city} line={rivals.line} latest={rivals.latest} hasRivals owner={false} links={false} />
        </Zone>
        <Zone name="demand">
          <DemandHighlightCard highlight={wants.highlight} history={wants.history} city={institution.city} nextUpdate={formatDate(wants.nextUpdate)} links={false} />
        </Zone>
      </div>
    </div>
  );
}

/** The sidebar as the dashboard draws it, with Home open. */
export function SidebarPicture({ name }: { name: string }) {
  return (
    <>
      <div className={shell.context}>
        <span className={shell.contextText}>
          <span className={shell.contextTitle}>{name}</span>
          <span className={shell.contextDetail}>Paid plan</span>
        </span>
      </div>
      <div className={shell.sidebarNav}>
        {INSTITUTION_NAV.map((section) => (
          <ul key={section.label} className={shell.navList}>
            {section.items.map((item) => (
              <li key={item.href}>
                <span className={[shell.navLink, item.href === '/' ? shell.navLinkActive : ''].join(' ')}>
                  <Icon name={item.icon} size={18} className={shell.navIcon} />
                  <span className={shell.navText}>{item.label}</span>
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </>
  );
}

/** What a reader hears instead of a picture of Home. */
export function homeSummary(showcase: Showcase): string {
  const words = showcase.audit.words.map((word) => wordScoreText(word.name, word.score, word.word)).join(', ');
  return `The Drishti dashboard’s Home for ${showcase.institution.name}: ${words}. ${showcase.answer} Then 3 things to do this month, the rivals in ${showcase.institution.city} and what students want.`;
}

/** The hero: Home, as the dashboard shows it, in an app window. */
export function AppWindow({ showcase }: { showcase: Showcase }) {
  return (
    <figure className={styles.window}>
      <div className={styles.windowFrame} data-theme="dark">
        <div className={styles.windowScreen} aria-hidden="true" inert>
          <div className={styles.windowSidebar}>
            <SidebarPicture name={showcase.institution.name} />
            <div className={shell.accountSide}>
              <span className={shell.avatar}>
                <Icon name="user" size={18} />
              </span>
              <span className={shell.accountText}>
                <span className={shell.accountEmail}>{SAMPLE_EMAIL}</span>
                <span className={shell.accountRole}>Owner</span>
              </span>
            </div>
          </div>
          <div className={styles.windowPanel}>
            <HomePicture showcase={showcase} />
          </div>
        </div>
      </div>
      <figcaption className="visually-hidden">{homeSummary(showcase)}</figcaption>
    </figure>
  );
}

/**
 * The Audit tile: the three words, then Fix these first beside the five places, with one place
 * open on what was found there, each result with its source and date. Side by side once there is
 * room.
 */
export function AuditPicture({ showcase }: { showcase: Showcase }) {
  const { audit: view } = showcase;
  const opened = view.places.find((place) => place.key === 'google') ?? view.places[0];
  return (
    <div className={styles.picture} data-theme="dark" aria-hidden="true" inert>
      <WordTiles words={view.words} compact />
      <div className={styles.pictureWide}>
        <section className={audit.block}>
          <SectionTitle icon="wrench" title="Fix these first" />
          <div className={audit.card}>
            <FixList fixes={view.topFixes} numbered />
          </div>
        </section>
        <section className={audit.block}>
          <SectionTitle icon="globe" title="What the internet says, place by place" />
          <Tabs
            label="Places"
            defaultTab={opened?.key}
            items={view.places.map((place) => ({
              id: place.key,
              label: place.name,
              count: place.fixes.length,
              content:
                place.key === opened?.key ? (
                  <div className={audit.card}>
                    <p className={audit.columnTitle}>What we found</p>
                    <FoundList rows={place.found} />
                  </div>
                ) : null,
            }))}
          />
        </section>
      </div>
    </div>
  );
}

/** Where each row stands before the picture ranks them: in the order of their names, as a list is kept before anyone ranks it. */
function byName(rows: ReadonlyArray<{ id: string; name: string }>): Map<string, number> {
  const named = [...rows].sort((a, b) => a.name.localeCompare(b.name)).map((row) => row.id);
  return new Map(rows.map((row, index) => [row.id, named.indexOf(row.id) - index]));
}

/** The Rivals tile: the month's one line, the ranking sliding into rank order, then every place side by side. */
export function RivalsPicture({ showcase }: { showcase: Showcase }) {
  const { line, view, opened } = showcase.rivals;
  return (
    <div className={styles.picture} data-theme="dark" aria-hidden="true" inert>
      {line ? <RivalLine line={line} /> : null}
      <Ranking rows={view.ranking} from={byName(view.ranking)} />
      <PlacesBoard view={view} opened={opened} links={false} />
    </div>
  );
}

/** The Demand tile: Make these 3 this month, then the programs rising in the city. */
export function DemandPicture({ showcase }: { showcase: Showcase }) {
  const { picks, signals, place } = showcase.demand;
  const rising = signals.trends.filter((trend) => trend.kind === 'rising').slice(0, 5);
  return (
    <div className={styles.picture} data-theme="dark" aria-hidden="true" inert>
      <ol className={demand.ideaGrid}>
        {picks.map((pick) => (
          <IdeaCard key={pick.rank} item={pickItem(pick)} made={false} />
        ))}
      </ol>
      <div className={audit.card}>
        <p className={audit.columnTitle}>Programs rising in {place}</p>
        <TrendList trends={rising} showProgram showRegion={false} scale={biggestChange(signals.trends)} />
      </div>
    </div>
  );
}

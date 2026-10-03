// Real pictures of the dashboard for the product page: the dashboard's own components, filled with
// the sample institution's data (the sample world through the real scoring engine, under the
// website's names: Larkmoor University, Bangalore; src/product/showcase.ts). They can't be focused
// or clicked, and screen readers get a short summary instead. Like the website's pictures, they
// carry no caption.

import { MonthBars } from '@/components/charts/MonthBars';
import { PartRanks } from '@/components/charts/PartRanks';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { DemandCard, type DemandHighlightData } from '@/components/home/DemandCard';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { RivalLadder, RivalsCard } from '@/components/home/RivalsCard';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { Icon } from '@/components/ui/Icon';
import { KpiNumber } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { CheckIcon, PillarIcon, PlatformMark } from '@/components/ui/Marks';
import { SplitBar } from '@/components/ui/CheckSummary';
import { Delta, ResultBar, ScoreLabel } from '@/components/ui/Results';
import { pillarChecks, type ListItem } from '@/audit/view';
import { countWords } from '@/demand/text';
import { formatDate, hostAndPath, ordinal } from '@/domain/format';
import { PILLAR_LABELS, PILLARS, RESULTS, type CheckResult } from '@/domain/types';
import type { DemandRow } from '@/demand/view';
import { DEMAND_PLATFORMS, platformFromUrl, type Platform } from '@/graphics/platforms';
import type { Showcase } from '@/product/showcase';
import type { LadderRow } from '@/rivals/compare';
import home from '@/components/home/home.module.css';
import shell from '@/components/shell/AppShell.module.css';
import styles from './pictures.module.css';

const SAMPLE_EMAIL = 'owner@larkmoor-university.example';

/** Where a student asked something: the platform it was pulled from, else read from its link. */
export function askedOn(row: Pick<DemandRow, 'meta' | 'sourceUrl'>): Platform {
  return (typeof row.meta.platform === 'string' ? DEMAND_PLATFORMS[row.meta.platform] : undefined) ?? platformFromUrl(row.sourceUrl) ?? 'website';
}

function demandHighlight(showcase: Showcase): DemandHighlightData | null {
  const top = showcase.demand.view.topTrend;
  if (!top) return null;
  return { text: top.text, changePct: top.changePct, count: top.count, sourceUrl: top.sourceUrl, programName: top.programName, region: showcase.demand.place, month: top.month };
}

/** The ladder as the product page shows it: your own change, and no change beside a rival. */
function pictureLadder(rows: readonly LadderRow[]): LadderRow[] {
  return rows.map((row) => (row.you ? row : { ...row, change: null }));
}

/** The sidebar as the dashboard draws it, with Home open. */
function SidebarPicture({ name }: { name: string }) {
  return (
    <div className={styles.windowSidebar}>
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
  );
}

/** The hero: Home, as the dashboard shows it, in an app window. */
export function AppWindow({ showcase }: { showcase: Showcase }) {
  const { audit, institution, home: picture, rivals, demand, report } = showcase;
  const steps: NextStep[] = report.things.map((thing, index) => ({ key: `${thing.source}-${index}`, source: thing.source, title: thing.title, detail: thing.detail, href: null }));
  const move = rivals.moves[0];
  const latestMove = move ? { rivalName: rivals.names.get(move.rivalId) ?? '', description: move.description, sourceUrl: move.sourceUrl, detectedAt: move.detectedAt } : null;
  return (
    <figure className={styles.window}>
      <div className={styles.windowFrame} data-theme="dark">
        <div className={styles.windowScreen} aria-hidden="true" inert>
          <SidebarPicture name={institution.name} />
          <div className={styles.windowPanel}>
            <div className={home.home}>
              <PageHead title="Home" question="How are we doing this month?" titleAs="p" />
              <HomeSummary view={audit} checkedAt={picture.checkedAt} trend={picture.trend} checks="split" />
              <NextSteps id="picture-next" title="3 things to do this month" description="In order: the steps that could make the most difference this month." steps={steps} />
              <div className={home.pair}>
                <RivalsCard ladder={pictureLadder(rivals.rows)} standings={null} verdict={rivals.verdict} rivalsHref={null} latestMove={latestMove} />
                <DemandCard highlight={demandHighlight(showcase)} demandHref={null} place={demand.place} history={demand.topHistory} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="visually-hidden">
        The Drishti dashboard’s Home for {institution.name}: overall score {audit.scores.overall} out of 100, {audit.label}. Discovered{' '}
        {audit.scores.discovered}, Trusted {audit.scores.trusted}, Chosen {audit.scores.chosen}. Then 3 things to do this month, the rivals and what
        students want.
      </figcaption>
    </figure>
  );
}

const RESULT_ORDER = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));

/** The weakest result among the programs the fix covers. */
function weakest(item: ListItem): CheckResult {
  return item.parts.reduce<CheckResult>((worst, part) => ((RESULT_ORDER.get(part.result) ?? 0) > (RESULT_ORDER.get(worst) ?? 0) ? part.result : worst), 'strong');
}

/** The Audit tile: the score with its pillars, the top 3 fixes, and every check at a glance. */
export function AuditPicture({ showcase }: { showcase: Showcase }) {
  const { audit } = showcase;
  const fixes = audit.fixes.slice(0, 3);
  const pillars = pillarChecks(audit);
  const checks = pillars.reduce((sum, row) => sum + row.checks.length, 0);
  return (
    <div className={`${styles.picture} ${styles.auditPicture}`} data-theme="dark" aria-hidden="true" inert>
      <div className={`${styles.pictureCard} ${styles.scoreCard}`}>
        <p className={styles.pictureHead}>Overall score</p>
        <div className={styles.scoreGauge}>
          <ScoreGauge score={audit.scores.overall} countUp />
        </div>
        <p className={styles.scoreCardMeta}>
          <ScoreLabel score={audit.scores.overall} />
          <Delta change={audit.changes.overall} since="last Audit" size="sm" />
        </p>
        <ul className={styles.pillarBars}>
          {PILLARS.map((pillar) => (
            <li key={pillar} className={styles.pillarBar}>
              <PillarIcon pillar={pillar} />
              <span>{PILLAR_LABELS[pillar]}</span>
              <span className={styles.pillarTrack}>
                <span className={styles.pillarFill} style={{ width: `${Math.max(0, Math.min(100, audit.scores[pillar]))}%` }} data-fill />
              </span>
              <span className={`${styles.pillarValue} num`}>{audit.scores[pillar]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.pictureCard}>
        <p className={styles.pictureHead}>
          <span>Fix these first</span>
          <span>
            <span className="num">{audit.fixes.length}</span> to fix
          </span>
        </p>
        <ol className={styles.fixList}>
          {fixes.map((fix, index) => (
            <li key={fix.key} className={styles.fixRow}>
              <span className={`${styles.fixNumber} num`}>{index + 1}</span>
              <span className={styles.fixName}>
                <CheckIcon check={fix.key} />
                {fix.name}
              </span>
              <ResultBar result={weakest(fix)} size="sm" />
              <span className={styles.fixGain}>
                <span className="num">+{Math.round(fix.points)}</span> points
              </span>
            </li>
          ))}
        </ol>
        <p className={`${styles.pictureHead} ${styles.pictureHeadNext}`}>
          <span>Every check</span>
          <span>
            <span className="num">{checks}</span> checks
          </span>
        </p>
        <ul className={styles.everyCheck}>
          {pillars.map((row) => (
            <li key={row.pillar} className={styles.everyCheckPart}>
              <span className={styles.everyCheckName}>
                <PillarIcon pillar={row.pillar} size={14} />
                {PILLAR_LABELS[row.pillar]}
              </span>
              <SplitBar checks={row.checks} label={`${PILLAR_LABELS[row.pillar]} checks`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Where each row stands before the picture ranks them: in the order of their names, as a list is kept before anyone ranks it. */
function byName(rows: readonly LadderRow[]): Map<string, number> {
  return new Map([...rows].sort((a, b) => a.name.localeCompare(b.name)).map((row, index) => [row.id, index]));
}

/**
 * The Rivals tile: you and your rivals by overall score, sliding into rank order, and the latest
 * move with where it was found, side by side once there is room; under them, each part ranked
 * across the full width, where its three lists have room to name everyone.
 */
export function RivalsPicture({ showcase }: { showcase: Showcase }) {
  const rows = pictureLadder(showcase.rivals.rows);
  const you = rows.find((row) => row.you);
  const move = showcase.rivals.moves[0];
  const mover = move ? showcase.rivals.names.get(move.rivalId) : undefined;
  return (
    <div className={styles.picture} data-theme="dark" aria-hidden="true" inert>
      <div className={styles.pictureWide}>
        <div className={styles.pictureCard}>
          <p className={styles.pictureHead}>
            <span>Your rank by overall score</span>
            {you?.rank ? (
              <span>
                <span className={`${styles.pictureRank} num`}>{ordinal(you.rank)}</span> of {rows.length}
              </span>
            ) : null}
          </p>
          <RivalLadder rows={rows} from={byName(rows)} />
        </div>
        {move && mover ? (
          <div className={`${styles.pictureCard} ${styles.pictureGrow}`}>
            <p className={styles.pictureHead}>
              <span>Latest move</span>
              <span>{formatDate(move.detectedAt)}</span>
            </p>
            <p className={styles.pictureTitle}>{mover}</p>
            <p className={styles.moveText}>{move.description}</p>
            <p className={styles.pictureMeta}>
              <PlatformMark platform={platformFromUrl(move.sourceUrl) ?? 'website'} name={false} />
              {hostAndPath(move.sourceUrl)}
            </p>
          </div>
        ) : null}
      </div>
      <div className={styles.pictureCard}>
        <p className={styles.pictureHead}>Part by part</p>
        <PartRanks rows={showcase.rivals.spread} />
      </div>
    </div>
  );
}

/**
 * The Demand tile: the fastest rise in the city this month and its searches by month; beside it,
 * what else is rising and the question asked most. Side by side once there is room.
 */
export function DemandPicture({ showcase }: { showcase: Showcase }) {
  const highlight = demandHighlight(showcase);
  const rising = showcase.demand.view.rising.filter((row) => row.text !== highlight?.text).slice(0, 4);
  const asked = showcase.demand.view.questions[0] ?? null;
  if (!highlight) return null;
  const rounded = Math.round(highlight.changePct ?? 0);
  return (
    <div className={`${styles.picture} ${styles.pictureWide}`} data-theme="dark" aria-hidden="true" inert>
      <div className={`${styles.pictureCard} ${styles.pictureGrow}`}>
        <p className={styles.pictureHead}>Rising fastest in {highlight.region}</p>
        <KpiNumber icon={<Icon name="arrowUp" size={20} />} value={`${rounded}%`} suffix="up since last month" />
        <p className={styles.pictureTitle}>{highlight.text}</p>
        <p className={styles.pictureMeta}>
          <PlatformMark platform="search_trends" name={false} />
          {countWords('rising', highlight.count)}
        </p>
        <MonthBars points={showcase.demand.topHistory} title="Searches by month" valueLabel="Searches" grow />
      </div>
      <div className={styles.pictureColumn}>
        {rising.length ? (
          <div className={styles.pictureCard}>
            <p className={styles.pictureHead}>Also rising in {highlight.region}</p>
            <ul className={styles.risingList}>
              {rising.map((row) => (
                <li key={row.id} className={styles.risingRow}>
                  <span>{row.text}</span>
                  <span className="num">+{Math.round(row.changePct ?? 0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {asked ? (
          <div className={`${styles.pictureCard} ${styles.pictureGrow}`}>
            <p className={styles.pictureHead}>What students ask</p>
            <p className={styles.pictureTitle}>{asked.text}</p>
            <p className={styles.pictureMeta}>
              <PlatformMark platform={askedOn(asked)} name={false} />
              <span>{asked.programName}</span>
              <span>{countWords('question', asked.count)}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

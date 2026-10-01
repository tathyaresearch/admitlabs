// Real pictures of the dashboard for the product page: the dashboard's own components, filled with
// the sample institution's data (Eastgate University, from the sample world, through the real
// scoring engine). They can't be focused or clicked, and screen readers get a short summary
// instead. Every picture says it is sample data.

import { DemandCard, type DemandHighlightData } from '@/components/home/DemandCard';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { RivalLadder, RivalsCard } from '@/components/home/RivalsCard';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { Icon } from '@/components/ui/Icon';
import { KpiNumber } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { CheckIcon, PlatformMark } from '@/components/ui/Marks';
import { ResultGauge } from '@/components/ui/Results';
import type { ListItem } from '@/audit/view';
import { countWords } from '@/demand/text';
import { RESULTS, type CheckResult } from '@/domain/types';
import type { Showcase } from '@/product/showcase';
import home from '@/components/home/home.module.css';
import shell from '@/components/shell/AppShell.module.css';
import styles from './product.module.css';

export const SAMPLE_CAPTION = 'Sample institution. Fictional data.';

const SAMPLE_EMAIL = 'owner@eastgate-university.example';

function demandHighlight(showcase: Showcase): DemandHighlightData | null {
  const top = showcase.demand.view.topTrend;
  if (!top) return null;
  return { text: top.text, changePct: top.changePct, count: top.count, sourceUrl: top.sourceUrl, programName: top.programName, region: showcase.demand.place, month: top.month };
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
  return (
    <figure className={styles.window}>
      <div className={styles.windowFrame} data-theme="dark">
        <div className={styles.windowScreen} aria-hidden="true" inert>
          <SidebarPicture name={institution.name} />
          <div className={styles.windowPanel}>
            <div className={home.home}>
              <PageHead title="Home" question="How are we doing this month?" titleAs="p" />
              <HomeSummary view={audit} checkedAt={picture.checkedAt} trend={{ points: picture.trend }} />
              <NextSteps id="picture-next" title="3 things to do this month" description="In order: the steps that could make the most difference this month." steps={steps} />
              <div className={home.pair}>
                <RivalsCard ladder={rivals.rows} standings={null} verdict={rivals.verdict} rivalsHref={null} />
                <DemandCard highlight={demandHighlight(showcase)} demandHref={null} place={demand.place} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className={styles.windowCaption} data-theme="light">
        <span className="visually-hidden">
          The Drishti dashboard’s Home for {institution.name}: overall score {audit.scores.overall} out of 100, {audit.label}. Discovered{' '}
          {audit.scores.discovered}, Trusted {audit.scores.trusted}, Chosen {audit.scores.chosen}. Then 3 things to do this month, the rivals and what
          students want.{' '}
        </span>
        {SAMPLE_CAPTION}
      </figcaption>
    </figure>
  );
}

const RESULT_ORDER = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));

/** The weakest result among the programs the fix covers. */
function weakest(item: ListItem): CheckResult {
  return item.parts.reduce<CheckResult>((worst, part) => ((RESULT_ORDER.get(part.result) ?? 0) > (RESULT_ORDER.get(worst) ?? 0) ? part.result : worst), 'strong');
}

/** The Audit tile: the top 3 fixes, each with its result and the points it could add. */
export function FixesPicture({ showcase }: { showcase: Showcase }) {
  const fixes = showcase.audit.fixes.slice(0, 3);
  return (
    <div className={styles.picture} aria-hidden="true" inert>
      <p className={styles.pictureHead}>Fix these first</p>
      <ol className={styles.fixList}>
        {fixes.map((fix, index) => (
          <li key={fix.key} className={styles.fixRow}>
            <span className={`${styles.fixNumber} num`}>{index + 1}</span>
            <span className={styles.fixName}>
              <CheckIcon check={fix.key} />
              {fix.name}
            </span>
            <ResultGauge result={weakest(fix)} size="sm" />
            <span className={styles.fixGain}>
              <span className="num">+{Math.round(fix.points)}</span> points
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The Rivals tile: you and your rivals by overall score. */
export function LadderPicture({ showcase }: { showcase: Showcase }) {
  return (
    <div className={styles.picture} aria-hidden="true" inert>
      <RivalLadder rows={showcase.rivals.rows} />
    </div>
  );
}

/** The Demand tile: the fastest rise in the city this month. */
export function DemandPicture({ showcase }: { showcase: Showcase }) {
  const highlight = demandHighlight(showcase);
  const rising = showcase.demand.view.rising.filter((row) => row.text !== highlight?.text).slice(0, 2);
  if (!highlight) return null;
  const rounded = Math.round(highlight.changePct ?? 0);
  return (
    <div className={styles.picture} aria-hidden="true" inert>
      <p className={styles.pictureHead}>Rising fastest in {highlight.region}</p>
      <KpiNumber icon={<Icon name="arrowUp" size={20} />} value={`${rounded}%`} suffix="up since last month" />
      <p className={styles.pictureTitle}>{highlight.text}</p>
      <p className={styles.pictureMeta}>
        <PlatformMark platform="search_trends" name={false} />
        {countWords('rising', highlight.count)}
      </p>
      {rising.length ? (
        <ul className={styles.risingList}>
          {rising.map((row) => (
            <li key={row.id} className={styles.risingRow}>
              <span>{row.text}</span>
              <span className="num">+{Math.round(row.changePct ?? 0)}%</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// What /signup's spotlight shows: Home as the dashboard draws it, with its own components, for the
// sample university (the product page's sample, src/product/showcase.ts). The parts the light
// makes come alive are marked with data-zone. It can't be focused or clicked.

import { DemandCard } from '@/components/home/DemandCard';
import { HomeSummary } from '@/components/home/HomeSummary';
import { RivalsCard } from '@/components/home/RivalsCard';
import { INSTITUTION_NAV } from '@/components/shell/nav';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import type { Showcase } from '@/product/showcase';
import type { LadderRow } from '@/rivals/compare';
import home from '@/components/home/home.module.css';
import shell from '@/components/shell/AppShell.module.css';
import styles from './stage.module.css';

/** The ladder as the product page shows it: your own change, and no change beside a rival. */
function pictureLadder(rows: readonly LadderRow[]): LadderRow[] {
  return rows.map((row) => (row.you ? row : { ...row, change: null }));
}

export function DashboardPicture({ showcase }: { showcase: Showcase }) {
  const { audit, institution, home: picture, rivals, demand } = showcase;
  const top = demand.view.topTrend;
  const move = rivals.moves[0];
  const latestMove = move ? { rivalName: rivals.names.get(move.rivalId) ?? '', description: move.description, sourceUrl: move.sourceUrl, detectedAt: move.detectedAt } : null;
  return (
    <div className={styles.dashScreen} data-theme="dark" inert>
      <div className={styles.dashSidebar}>
        <div className={shell.context}>
          <span className={shell.contextText}>
            <span className={shell.contextTitle}>{institution.name}</span>
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
      </div>
      <div className={styles.dashPanel}>
        <div className={home.home}>
          <PageHead title="Home" question="How are we doing this month?" titleAs="p" />
          <div data-zone="score">
            <HomeSummary view={audit} checkedAt={picture.checkedAt} trend={picture.trend} />
          </div>
          <div className={home.pair}>
            <div data-zone="rivals">
              <RivalsCard ladder={pictureLadder(rivals.rows)} standings={null} verdict={rivals.verdict} rivalsHref={null} latestMove={latestMove} />
            </div>
            <div data-zone="demand">
              <DemandCard
                highlight={top ? { text: top.text, changePct: top.changePct, count: top.count, sourceUrl: top.sourceUrl, programName: top.programName, region: demand.place, month: top.month } : null}
                demandHref={null}
                place={demand.place}
                history={demand.topHistory}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

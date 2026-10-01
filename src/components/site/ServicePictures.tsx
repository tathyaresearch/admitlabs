// Simple pictures of what each service makes, for the services tiles. Drawings, not client work:
// the real samples go in "Our work" (src/site/work.ts) once they are ready.

import { Icon, type IconName } from '@/components/ui/Icon';
import type { ServiceKey } from '@/site/content';
import styles from './sections.module.css';

/** Program Growth: a program's own page, on a phone, with posts that show outcomes, people and proof. */
const PAGE_TILES: readonly IconName[] = ['placements', 'lecturer', 'video', 'user', 'star', 'fees', 'briefcase', 'mapPin', 'seal'];

function ProgramPage() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneTop}>
        <span className={styles.phoneAvatar}>BBA</span>
        <span className={styles.phoneName}>
          <span>BBA at your college</span>
          <span>Your program’s own page</span>
        </span>
      </div>
      <div className={styles.phoneBio}>
        <span />
        <span />
      </div>
      <div className={styles.phoneGrid}>
        {PAGE_TILES.map((icon) => (
          <span key={icon} className={styles.phoneTile}>
            <Icon name={icon} size={14} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Institution Branding: posts for the official page, in three columns. */
const BRAND_COLUMNS: ReadonlyArray<{ head: string; posts: ReadonlyArray<{ icon: IconName; bold?: boolean }> }> = [
  { head: 'Outcomes', posts: [{ icon: 'placements', bold: true }, { icon: 'briefcase' }] },
  { head: 'People', posts: [{ icon: 'lecturer' }, { icon: 'user', bold: true }] },
  { head: 'Proof', posts: [{ icon: 'seal' }, { icon: 'star' }] },
];

function BrandPosts() {
  return (
    <div className={styles.brand}>
      {BRAND_COLUMNS.map((column) => (
        <div key={column.head} className={styles.brandColumn}>
          <span className={styles.brandHead}>{column.head}</span>
          {column.posts.map((post) => (
            <span key={post.icon} className={post.bold ? `${styles.post} ${styles.postBold}` : styles.post}>
              <Icon name={post.icon} size={16} />
              <span className={styles.postLines}>
                <span />
                <span />
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Admit Campaign: content through the year, at its fullest in admission season. */
const SEASON: ReadonlyArray<{ month: string; height: number; inSeason?: boolean }> = [
  { month: 'Jan', height: 16 },
  { month: 'Feb', height: 22 },
  { month: 'Mar', height: 34 },
  { month: 'Apr', height: 62, inSeason: true },
  { month: 'May', height: 88, inSeason: true },
  { month: 'Jun', height: 100, inSeason: true },
  { month: 'Jul', height: 56 },
  { month: 'Aug', height: 26 },
];

function SeasonPush() {
  return (
    <div className={styles.season}>
      <div className={styles.seasonWindow}>
        <span>Admission season</span>
      </div>
      <div className={styles.seasonBars}>
        {SEASON.map((bar) => (
          <span key={bar.month} className={styles.seasonBar} data-season={bar.inSeason ? 'true' : undefined} style={{ ['--h' as string]: `${bar.height}%` }} />
        ))}
      </div>
      <div className={styles.seasonMonths}>
        {SEASON.map((bar) => (
          <span key={bar.month}>{bar.month}</span>
        ))}
      </div>
    </div>
  );
}

export function ServicePicture({ service }: { service: ServiceKey }) {
  if (service === 'program-growth') return <ProgramPage />;
  if (service === 'institution-branding') return <BrandPosts />;
  return <SeasonPush />;
}

// What /signup's spotlight shows: Home as the dashboard draws it, with its own components, for the
// sample university (the product page's sample, src/product/showcase.ts, drawn as the product
// page's hero draws it). The parts the light makes come alive are marked with data-zone: the three
// words, the 3 things to do, the rivals and what students want. It can't be focused or clicked.

import { HomePicture, SidebarPicture } from '@/components/product/Previews';
import type { Showcase } from '@/product/showcase';
import styles from './stage.module.css';

export function DashboardPicture({ showcase }: { showcase: Showcase }) {
  return (
    <div className={styles.dashScreen} data-theme="dark" inert>
      <div className={styles.dashSidebar}>
        <SidebarPicture name={showcase.institution.name} />
      </div>
      <div className={styles.dashPanel}>
        <HomePicture showcase={showcase} />
      </div>
    </div>
  );
}

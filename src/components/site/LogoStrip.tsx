// The logo strip under the hero's proof line: education companies AdmitLabs has worked with,
// sliding slowly right to left in an endless loop, faded at both ends, a little dim until a logo
// is pointed at, and still while the strip is. CSS only. Reduced motion (the default state) shows
// one still row, centred when it fits and swiped sideways when it doesn't.

import type { CSSProperties } from 'react';
import { CLIENTS } from '@/site/content';
import styles from './logo-strip.module.css';

/** One set of logos. The loop draws the set twice; the second is decoration for the seam. */
function Logos({ copy = false }: { copy?: boolean }) {
  return (
    <ul className={`${styles.set} ${copy ? styles.copy : ''}`} aria-hidden={copy || undefined}>
      {CLIENTS.map((client) => (
        <li key={client.name} className={styles.item}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny WebPs made at twice their size; the optimizer would only add a round trip */}
          <img
            src={client.src}
            alt={client.name}
            width={client.width}
            height={client.height}
            decoding="async"
            className={styles.logo}
            style={{ '--w': `${client.width / 2}px` } as CSSProperties}
          />
        </li>
      ))}
    </ul>
  );
}

/** `labelledBy`: the id of the line that says who these are (the proof line). */
export function LogoStrip({ labelledBy }: { labelledBy: string }) {
  return (
    <div className={styles.strip} role="group" aria-labelledby={labelledBy}>
      <div className={styles.track}>
        <Logos />
        <Logos copy />
      </div>
    </div>
  );
}

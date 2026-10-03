// The Drishti eye drawn large for the left side of /login: the logo's own drawing
// (src/graphics/eye.ts), its lids, round iris and three lashes, in nested groups so each motion
// moves one thing (stage.module.css). The lids open as it appears (bigOpen) and blink when the stage
// says (bigLid, data-blink on the eye's wrapper); the iris looks where the stage points it (--look-x
// and --look-y, in the drawing's own units) and shows only through the opening, so a closing lid
// covers it. The lashes ride the upper lid.

import { useId, type CSSProperties } from 'react';
import { EYE_IRIS, EYE_LASHES, EYE_LIDS, EYE_OPENING, EYE_SHUT, type EyeLash } from '@/graphics/eye';
import styles from './stage.module.css';

/** Each lash turns about its root and drops with the lid, as in the logo (src/components/ui/Eye.tsx). */
const lashStyle = (item: EyeLash) => ({ transformOrigin: `${item.x.toFixed(2)}px ${item.y.toFixed(2)}px`, '--drop': `${((12.4 - item.y) / 0.94).toFixed(2)}px` }) as CSSProperties;

export function BigEye() {
  const mask = `big-eye-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className={styles.bigEye} viewBox="0 -5 40 29" focusable="false">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="-4" y="-8" width="48" height="36">
          <g className={styles.bigOpen}>
            <g className={styles.bigLid}>
              <path d={EYE_OPENING} fill="#fff" />
            </g>
          </g>
        </mask>
      </defs>
      <g className={styles.bigLashes}>
        {EYE_LASHES.map((item) => (
          <g key={item.d} className={styles.bigLashOpen} style={lashStyle(item)}>
            <g className={styles.bigLash} style={lashStyle(item)}>
              <path d={item.d} />
            </g>
          </g>
        ))}
      </g>
      <g mask={`url(#${mask})`}>
        <g className={styles.bigIris}>
          <circle cx={EYE_IRIS.cx} cy={EYE_IRIS.cy} r={EYE_IRIS.r} />
        </g>
      </g>
      <g className={styles.bigOpen}>
        <g className={styles.bigLid}>
          <path className={styles.bigLids} d={EYE_LIDS} />
        </g>
      </g>
      <path className={`${styles.bigShut} ${styles.bigShutOpen}`} d={EYE_SHUT} />
      <path className={`${styles.bigShut} ${styles.bigShutBlink}`} d={EYE_SHUT} />
    </svg>
  );
}

// The Drishti eye before the word, drawn from src/graphics/eye.ts in the text's colour. Still,
// unless an ancestor sets data-eye (ProductLockup does): every motion is CSS in Eye.module.css,
// inside prefers-reduced-motion: no-preference. The pointer follow, and a reveal that waits until
// it is seen, come from EyeMotion.tsx.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { EYE_IRIS, EYE_LASHES, EYE_LIDS, EYE_OPENING, EYE_SHUT, eyeBox, type EyeLash } from '@/graphics/eye';
import styles from './Eye.module.css';

/**
 * Each lash turns about its root, and drops with the lid until its root sits on the closed eye's
 * line (y 12.4), where it hangs down from it. The keyframes drop it by a share of --drop: 0.94 when
 * the lids meet, less when they are part open.
 */
const lashStyle = (item: EyeLash) => ({ transformOrigin: `${item.x.toFixed(2)}px ${item.y.toFixed(2)}px`, '--drop': `${((12.4 - item.y) / 0.94).toFixed(2)}px` }) as CSSProperties;

/** The lids' moving groups: the same nesting draws the lids and cuts the opening the iris shows through. */
function LidGroups({ children }: { children: ReactNode }) {
  return (
    <g className={styles.lidLoad}>
      <g className={styles.lidHover}>{children}</g>
    </g>
  );
}

/**
 * The eye. Nested groups so each motion moves one thing: the lids open on load and blink now and
 * then (lidLoad) and blink on hover (lidHover). The iris shows only through the opening (a mask cut
 * by the same moving lids), so a part-closed lid covers it rather than squashing it; it follows the
 * pointer (irisLook) and settles or looks around on load (irisLoad). The lashes ride the upper lid:
 * each drops with it and sweeps down as the lids meet (lashLoad, lashHover), and all shift a touch
 * with the gaze (lashLook). The closed eye is a line drawn over the flattened lids.
 */
export function Eye({ lashes, className }: { lashes: boolean; className?: string }) {
  const mask = `eye-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const box = eyeBox(lashes);
  return (
    <svg className={[styles.eye, className].filter(Boolean).join(' ')} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true" focusable="false">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="-4" y="-8" width="48" height="36">
          <LidGroups>
            <path d={EYE_OPENING} fill="#fff" />
          </LidGroups>
        </mask>
      </defs>
      {lashes ? (
        <g className={styles.lashLook}>
          {EYE_LASHES.map((item) => (
            <g key={item.d} className={styles.lashLoad} style={lashStyle(item)}>
              <g className={styles.lashHover} style={lashStyle(item)}>
                <path className={styles.lash} d={item.d} />
              </g>
            </g>
          ))}
        </g>
      ) : null}
      <g mask={`url(#${mask})`}>
        <g className={styles.irisLook}>
          <g className={styles.irisLoad}>
            <circle className={styles.iris} cx={EYE_IRIS.cx} cy={EYE_IRIS.cy} r={EYE_IRIS.r} />
          </g>
        </g>
      </g>
      <LidGroups>
        <path className={styles.lids} d={EYE_LIDS} />
      </LidGroups>
      <path className={`${styles.shut} ${styles.shutLoad}`} d={EYE_SHUT} />
      <path className={`${styles.shut} ${styles.shutHover}`} d={EYE_SHUT} />
    </svg>
  );
}

/**
 * The eye in its place before a word: 1.12 em wide, its foot on the word's baseline, 0.24 em from
 * it, in a slot that lets it hide behind the word in the reveals. `children` is the word.
 */
export function EyeName({ lashes, className, children }: { lashes: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={[styles.name, className].filter(Boolean).join(' ')}>
      <span className={styles.slot}>
        <Eye lashes={lashes} className={lashes ? styles.mark : styles.markPlain} />
      </span>
      {children}
    </span>
  );
}

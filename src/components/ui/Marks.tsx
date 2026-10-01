// Marks: a check's, a pillar's or a platform's icon. Instagram, X and YouTube show their own
// one-colour logos (src/graphics/brands), in the colours their owners allow; every other platform
// a neutral line icon of Drishti's own. Decorative: the name always sits beside them.

import type { CheckKey, Pillar } from '@/domain/types';
import { BRAND_MARKS, YOUTUBE_PLAY, type Brand } from '@/graphics/brands';
import { CHECK_ICONS, PILLAR_ICONS, type IconRef } from '@/graphics/icons';
import { PLATFORM_ICONS, PLATFORM_NAMES, type Platform } from '@/graphics/platforms';
import { Icon } from './Icon';
import styles from './Marks.module.css';

export function BrandLogo({ brand, size = 16 }: { brand: Brand; size?: number }) {
  const mark = BRAND_MARKS[brand];
  return (
    <svg className={styles.mark} width={size} height={size} viewBox={mark.viewBox} aria-hidden="true" focusable="false">
      {brand === 'youtube' ? <path d={YOUTUBE_PLAY} className={styles.youtubePlay} /> : null}
      <path d={mark.path} className={styles[brand]} />
    </svg>
  );
}

export function Mark({ icon, size = 16 }: { icon: IconRef; size?: number }) {
  return icon.kind === 'brand' ? <BrandLogo brand={icon.brand} size={size} /> : <Icon name={icon.name} size={size} className={styles.mark} />;
}

export function CheckIcon({ check, size = 16 }: { check: CheckKey; size?: number }) {
  return <Mark icon={CHECK_ICONS[check]} size={size} />;
}

export function PillarIcon({ pillar, size = 16 }: { pillar: Pillar; size?: number }) {
  return <Icon name={PILLAR_ICONS[pillar]} size={size} className={styles.mark} />;
}

/** A platform's mark, with its name unless the name is already shown. */
export function PlatformMark({ platform, size = 14, name = true }: { platform: Platform; size?: number; name?: boolean | string }) {
  return (
    <span className={styles.platform}>
      <Mark icon={PLATFORM_ICONS[platform]} size={size} />
      {name ? <span>{typeof name === 'string' ? name : PLATFORM_NAMES[platform]}</span> : null}
    </span>
  );
}

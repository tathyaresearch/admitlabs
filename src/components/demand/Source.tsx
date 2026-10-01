import { Icon } from '@/components/ui/Icon';
import { hostAndPath } from '@/domain/format';
import { PLATFORM_LABELS, platformOf } from '@/demand/text';
import { Mark } from '@/components/ui/Marks';
import { DEMAND_PLATFORMS, PLATFORM_ICONS, platformFromUrl } from '@/graphics/platforms';
import styles from './demand.module.css';

/** Where a grouped item was found. Every insight shows its source (spec 9.5). */
export function Source({ url, platform, label }: { url: string; platform?: unknown; label?: string }) {
  const key = typeof platform === 'string' ? platform : platformOf(url);
  const name = label ?? (key ? PLATFORM_LABELS[key] : undefined) ?? hostAndPath(url);
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.source}>
      <Mark icon={PLATFORM_ICONS[(key ? DEMAND_PLATFORMS[key] : null) ?? platformFromUrl(url) ?? 'website']} size={13} />
      {name}
      <Icon name="external" size={12} />
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

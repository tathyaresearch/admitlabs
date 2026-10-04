// A rival's best posts of the month, and what to learn from each (the idea, never a copy). Every
// post shows its numbers, its date and a link to see it.

import { Icon } from '@/components/ui/Icon';
import { BrandLogo, Mark } from '@/components/ui/Marks';
import { formatCount, formatDate, formatMonth, hostAndPath } from '@/domain/format';
import { PLATFORM_ICONS, platformFromUrl } from '@/graphics/platforms';
import type { PostRow } from '@/lib/rivals/load';
import styles from './rivals.module.css';

const PLATFORM_LABELS = { instagram: 'Instagram', youtube: 'YouTube' } as const;

/** "20 Sep" (the year shows on the source line). */
function shortDate(value: string): string {
  return formatDate(value).split(' ').slice(0, 2).join(' ');
}

function Source({ url, label = 'Source' }: { url: string; label?: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.sourceLink}>
      <Mark icon={PLATFORM_ICONS[platformFromUrl(url) ?? 'website']} size={13} />
      {label === 'Source' ? hostAndPath(url) : label}
      <Icon name="external" size={12} />
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function PostCards({ posts, names, showRival = true }: { posts: readonly PostRow[]; names: ReadonlyMap<string, string>; showRival?: boolean }) {
  if (posts.length === 0) return <p className={styles.leadNone}>No posts found yet. Drishti checks every Monday.</p>;
  return (
    <ul className={styles.posts}>
      {posts.map((post) => (
        <li key={post.id} className={styles.post}>
          <span className={styles.postMeta}>
            <span className={styles.postPlatform}>
              <BrandLogo brand={post.platform} size={14} />
              {showRival ? (names.get(post.rivalId) ?? 'A rival') : PLATFORM_LABELS[post.platform]}
            </span>
            <span>
              {showRival ? `${PLATFORM_LABELS[post.platform]}, ` : ''}
              {post.postedAt ? shortDate(post.postedAt) : formatMonth(post.month)}
            </span>
          </span>
          <span className={styles.postTitle}>{post.title}</span>
          <span className={styles.postNumbers}>
            <span>
              <span className="num">{formatCount(post.views)}</span> {post.views === 1 ? 'view' : 'views'}
            </span>
            <span>
              <span className="num">{formatCount(post.likes)}</span> likes
            </span>
            <span>
              <span className="num">{formatCount(post.comments)}</span> comments
            </span>
          </span>
          <span className={styles.postWhy}>
            <span className={styles.postWhyLabel}>What to learn</span>
            {post.whyItWorked ?? 'Why it worked is being written.'}
          </span>
          <Source url={post.url} label="See the post" />
        </li>
      ))}
    </ul>
  );
}

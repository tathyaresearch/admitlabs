// What rivals are doing, in three tabs so the page stays short: moves found on their websites,
// their best posts and why they worked (to learn from, never to copy), and what they promise
// in ads. Every item shows its source and date.

import { Tabs } from '@/components/ui/Tabs';
import { Icon } from '@/components/ui/Icon';
import { formatCount, formatDate, formatMonth, hostAndPath } from '@/domain/format';
import type { Activity, AdRow, MoveRow, PostRow } from '@/lib/rivals/load';
import { MOVE_KIND_LABELS } from '@/rivals/text';
import styles from './rivals.module.css';

const PLATFORM_LABELS = { instagram: 'Instagram', youtube: 'YouTube' } as const;

/** "20 Sep" (the year shows on the source line). */
function shortDate(value: string): string {
  return formatDate(value).split(' ').slice(0, 2).join(' ');
}

function Source({ url, label = 'Source' }: { url: string; label?: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.sourceLink}>
      {label === 'Source' ? hostAndPath(url) : label}
      <Icon name="external" size={12} />
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function MovesList({ moves, names, showRival = true }: { moves: readonly MoveRow[]; names: ReadonlyMap<string, string>; showRival?: boolean }) {
  if (moves.length === 0) return <p className={styles.leadNone}>No moves in this period. Drishti checks every Monday.</p>;
  return (
    <ul className={styles.activityList}>
      {moves.map((move) => (
        <li key={move.id} className={styles.move}>
          <span className={styles.moveDate}>{shortDate(move.detectedAt)}</span>
          <span className={styles.moveBody}>
            <span className={styles.moveTop}>
              {showRival ? <span className={styles.moveRival}>{names.get(move.rivalId) ?? 'A rival'}</span> : null}
              <span className={styles.moveKind}>{MOVE_KIND_LABELS[move.kind]}</span>
            </span>
            <span className={styles.moveText}>{move.description}</span>
          </span>
          <Source url={move.sourceUrl} />
        </li>
      ))}
    </ul>
  );
}

export function PostCards({ posts, names, showRival = true }: { posts: readonly PostRow[]; names: ReadonlyMap<string, string>; showRival?: boolean }) {
  if (posts.length === 0) return <p className={styles.leadNone}>No posts found yet. Drishti checks every Monday.</p>;
  return (
    <ul className={styles.posts}>
      {posts.map((post) => (
        <li key={post.id} className={styles.post}>
          <span className={styles.postMeta}>
            <span>{showRival ? (names.get(post.rivalId) ?? 'A rival') : PLATFORM_LABELS[post.platform]}</span>
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

export function AdsList({ ads, names, showRival = true }: { ads: readonly AdRow[]; names: ReadonlyMap<string, string>; showRival?: boolean }) {
  if (ads.length === 0) return <p className={styles.leadNone}>No ads entered yet. The AdmitLabs team adds them as they appear.</p>;
  return (
    <ul className={styles.activityList}>
      {ads.map((ad) => (
        <li key={ad.id} className={styles.ad}>
          <span className={styles.adPromise}>&ldquo;{ad.promise}&rdquo;</span>
          <span className={styles.adMeta}>
            {showRival ? <span>{names.get(ad.rivalId) ?? 'A rival'}</span> : null}
            <span>Seen {formatDate(ad.enteredAt)}</span>
            <Source url={ad.sourceUrl} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Moves, best content and ads, one tab each. */
export function ActivityTabs({
  activity,
  moves,
  names,
  showRival = true,
  movesNote,
  postLimit,
}: {
  activity: Activity;
  moves: readonly MoveRow[];
  names: ReadonlyMap<string, string>;
  showRival?: boolean;
  movesNote: string;
  /** Show only the top posts across rivals (the Rivals page); each rival's page shows its own top 5. */
  postLimit?: number;
}) {
  const posts = postLimit ? activity.posts.slice(0, postLimit) : activity.posts;
  const month = activity.postsMonth ? formatMonth(activity.postsMonth.slice(0, 7)) : null;
  const postsNote = [
    month ? (postLimit ? `The top posts across your rivals in ${month}. Each rival's page has its top 5.` : `Their best posts from ${month}.`) : null,
    'Learn from the idea, never copy the post.',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tabs
      label="What your rivals are doing"
      items={[
        {
          id: 'moves',
          label: `Moves (${moves.length})`,
          content: (
            <>
              <p className={styles.tabNote}>{movesNote}</p>
              <MovesList moves={moves} names={names} showRival={showRival} />
            </>
          ),
        },
        {
          id: 'content',
          label: `Best content (${posts.length})`,
          content: (
            <>
              <p className={styles.tabNote}>{postsNote}</p>
              <PostCards posts={posts} names={names} showRival={showRival} />
            </>
          ),
        },
        {
          id: 'ads',
          label: `Ads (${activity.ads.length})`,
          content: (
            <>
              <p className={styles.tabNote}>What they promise in their ads, entered by the AdmitLabs team.</p>
              <AdsList ads={activity.ads} names={names} showRival={showRival} />
            </>
          ),
        },
      ]}
    />
  );
}

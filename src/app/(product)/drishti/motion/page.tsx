import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductLockup } from '@/components/ui/Brand';
import styles from './motion.module.css';

// The stage the Drishti reveals are recorded from (scripts/record-reveal.ts writes them to
// brand/motion): the logo alone, centred, on black or ivory, sized for a square (1080) or a wide
// (1920 by 1080) frame, as "Drishti by AdmitLabs" or "Drishti" alone. The script pauses the motion
// and steps through it frame by frame. Open while developing only, and kept out of search.

export const metadata: Metadata = { title: { absolute: 'Drishti motion stage' }, robots: { index: false, follow: false } };

type Query = { reveal?: string; bg?: string; size?: string; name?: string };

/** Sizes that fill each frame calmly: the full lockup is twice as wide as the eye and the word. */
const FONT_SIZE = {
  full: { square: '6.5rem', wide: '9.5rem' },
  only: { square: '11rem', wide: '15rem' },
} as const;

export default async function MotionStage({ searchParams }: { searchParams: Promise<Query> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { reveal, bg, size, name } = await searchParams;
  const nameOnly = name === 'only';
  const fontSize = FONT_SIZE[nameOnly ? 'only' : 'full'][size === 'wide' ? 'wide' : 'square'];
  return (
    <div className={styles.stage} data-theme={bg === 'ivory' ? 'light' : 'dark'} style={{ fontSize }}>
      <ProductLockup size="inherit" motion={reveal === 'side' ? 'side' : 'rise'} byline={!nameOnly} />
    </div>
  );
}

'use client';

// A short silent loop inside one of the website's pictures: muted, inline, no controls, hidden from
// screen readers. Nothing of it loads with the page. When it comes close to the screen its still
// (the loop's first frame) and the video load; the video plays while it is on screen and pauses
// when it scrolls away. Reduced motion keeps the still and never loads the video. A box hidden at
// this width (display none) never comes close, so it loads nothing. It fills its box, so the box
// keeps its own size, corners and background.

import { useEffect, useRef, useState } from 'react';
import styles from './loop-video.module.css';
import { LOAD_AHEAD } from './NearScreen';

type Clip = { readonly src: string; readonly poster: string; readonly width: number; readonly height: number };

export function LoopVideo({ clip, className }: { clip: Clip; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [close, setClose] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const frame = box.current;
    const video = ref.current;
    if (!frame || !video) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    let near = false;
    let seen = false;

    const update = () => {
      if (calm.matches || !near) {
        video.pause();
        return;
      }
      if (!video.getAttribute('src')) {
        video.muted = true;
        video.preload = 'auto';
        video.src = clip.src;
      }
      if (seen) video.play().catch(() => {});
      else video.pause();
    };

    const loader = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) near = entry.isIntersecting;
        if (near) setClose(true);
        update();
      },
      { rootMargin: LOAD_AHEAD },
    );
    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) seen = entry.isIntersecting;
      update();
    });
    loader.observe(frame);
    watcher.observe(frame);
    calm.addEventListener('change', update);
    return () => {
      loader.disconnect();
      watcher.disconnect();
      calm.removeEventListener('change', update);
    };
  }, [clip.src]);

  return (
    <span ref={box} className={`${styles.clip} ${className ?? ''}`} aria-hidden="true">
      {close ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small WebP made at twice its size; the optimizer would only add a round trip
        <img src={clip.poster} alt="" width={clip.width} height={clip.height} decoding="async" className={styles.still} />
      ) : null}
      <video
        ref={ref}
        className={`${styles.video} ${playing ? styles.playing : ''}`}
        width={clip.width}
        height={clip.height}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        aria-hidden="true"
        onPlaying={() => setPlaying(true)}
      />
    </span>
  );
}

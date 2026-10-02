'use client';

// The two motions of the Drishti eye that need a script, for the one logo it wraps (the element with
// data-eye inside it). C: the iris turns gently towards the pointer, a little further the further
// away the pointer is, and eases there; nothing runs between moves. A reveal (`intro`): if the logo
// is out of sight as the page loads, its motion waits at the start until it comes into view, then
// plays once. With reduced motion nothing runs; on a touch screen the eye looks ahead.

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Eye.module.css';

/** How far the iris may move, in the eye's own units (the eye is 40 wide and 24 tall). */
const MAX_X = 4.8;
const MAX_Y = 1;
/** From this far away (in pixels) the iris looks as far as it can. */
const REACH = 320;
/** How much of the way it moves each frame: calm, never snappy. */
const EASE = 0.12;
/** In view: wholly inside the top four fifths of the screen, so it is clearly seen. */
const SEEN = { rootMargin: '0px 0px -20% 0px', threshold: 1 };

function followPointer(logo: HTMLElement): () => void {
  let pointer: { x: number; y: number } | null = null;
  const look = { x: 0, y: 0 };
  let frame = 0;

  const tick = () => {
    frame = 0;
    let target = { x: 0, y: 0 };
    const eye = logo.querySelector('svg')?.getBoundingClientRect();
    if (pointer && eye) {
      const dx = pointer.x - (eye.left + eye.width / 2);
      const dy = pointer.y - (eye.top + eye.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / REACH);
      target = { x: (dx / distance) * MAX_X * reach, y: (dy / distance) * MAX_Y * reach };
    }
    look.x += (target.x - look.x) * EASE;
    look.y += (target.y - look.y) * EASE;
    logo.style.setProperty('--look-x', `${look.x.toFixed(2)}px`);
    logo.style.setProperty('--look-y', `${look.y.toFixed(2)}px`);
    if (Math.abs(target.x - look.x) > 0.02 || Math.abs(target.y - look.y) > 0.02) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const move = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    wake();
  };
  const leave = () => {
    pointer = null;
    wake();
  };

  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  return () => {
    window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', leave);
    if (frame) cancelAnimationFrame(frame);
  };
}

function playWhenSeen(logo: HTMLElement): () => void {
  const box = logo.getBoundingClientRect();
  if (box.top >= 0 && box.bottom <= window.innerHeight * 0.8) return () => {};
  // Out of sight: every motion of the logo goes back to its start and waits there.
  const waiting = logo.getAnimations({ subtree: true });
  for (const animation of waiting) {
    animation.pause();
    animation.currentTime = 0;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    for (const animation of waiting) animation.play();
  }, SEEN);
  observer.observe(logo);
  return () => observer.disconnect();
}

export function EyeMotion({ intro = false, children }: { intro?: boolean; children: ReactNode }) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const logo = root.current?.querySelector<HTMLElement>('[data-eye]');
    if (!logo || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    const stops: Array<() => void> = [];
    if (intro) stops.push(playWhenSeen(logo));
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) stops.push(followPointer(logo));
    return () => {
      for (const stop of stops) stop();
    };
  }, [intro]);

  return (
    <span ref={root} className={styles.motion}>
      {children}
    </span>
  );
}

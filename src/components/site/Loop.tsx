'use client';

// "Measure. Fix. Repeat." as a track round the three steps, with a small dot that laps it every
// ten seconds. Each step lights when the dot reaches it and stays lit until the lap ends, then the
// dot comes back round, next month. The dot follows the track as drawn (the rectangle's own
// outline), so it fits any width. Paused while out of view; with reduced motion, or without
// script, the track stands still and every step is plain.

import { useEffect, useRef, useState } from 'react';
import styles from './site.module.css';

const LAP_MS = 10_000;
const SAMPLES = 240;
/** Wide, the steps sit along the top of the track; narrow, down its left side. */
const WIDE = '(min-width: 48rem)';

interface Step {
  name: string;
  who: string;
  line: string;
}

export function Loop({ steps, back }: { steps: readonly Step[]; back: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const root = track.current;
    if (!root || typeof root.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let animations: Animation[] = [];
    let inView = false;
    let frame = 0;

    const build = () => {
      const rect = root.querySelector('rect');
      const dot = root.querySelector<HTMLElement>('[data-dot]');
      const svg = rect?.ownerSVGElement;
      if (!rect || !dot || !svg) return;
      const length = rect.getTotalLength();
      if (!length) return;
      const time = Number(animations[0]?.currentTime ?? 0);
      for (const animation of animations) animation.cancel();

      // The rectangle's outline starts at its top left and runs clockwise. Wide, that passes the
      // steps in order; narrow, the steps are on the left, so the dot runs the other way.
      const points = Array.from({ length: SAMPLES + 1 }, (_, index) => rect.getPointAtLength((index / SAMPLES) * length));
      if (!matchMedia(WIDE).matches) points.reverse();
      const next: Animation[] = [dot.animate(points.map((point) => ({ transform: `translate(${point.x}px, ${point.y}px)` })), { duration: LAP_MS, iterations: Infinity })];

      // Where along the lap each step's node sits: the nearest point of the track to its centre.
      const box = svg.getBoundingClientRect();
      for (const lit of root.querySelectorAll<HTMLElement>('[data-lit]')) {
        const node = lit.parentElement?.getBoundingClientRect();
        if (!node) continue;
        const x = node.left + node.width / 2 - box.left;
        const y = node.top + node.height / 2 - box.top;
        let nearest = 0;
        let best = Infinity;
        points.forEach((point, index) => {
          const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
          if (distance < best) {
            best = distance;
            nearest = index;
          }
        });
        const at = Math.min(0.94, Math.max(0.01, nearest / SAMPLES));
        next.push(
          lit.animate(
            [
              { offset: 0, opacity: 0 },
              { offset: at - 0.008, opacity: 0 },
              { offset: at, opacity: 1 },
              { offset: 0.96, opacity: 1 },
              { offset: 1, opacity: 0 },
            ],
            { duration: LAP_MS, iterations: Infinity },
          ),
        );
      }
      for (const animation of next) {
        animation.currentTime = time;
        if (!inView) animation.pause();
      }
      animations = next;
      setMoving(true);
    };

    const rebuild = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(build);
    };
    const resize = new ResizeObserver(rebuild);
    // Nothing is worked out until the loop comes near the screen, so it costs nothing at load.
    let watching = false;
    const view = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        if (inView && !watching) {
          watching = true;
          resize.observe(root);
        }
        for (const animation of animations) {
          if (inView) animation.play();
          else animation.pause();
        }
      },
      { rootMargin: '0px 0px 25% 0px' },
    );
    view.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      view.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, []);

  return (
    <div ref={track} className={styles.track}>
      <div className={styles.trackLine} aria-hidden="true">
        <svg>
          <rect x="0" y="0" width="100%" height="100%" rx="26" className={styles.trackRect} pathLength={100} />
        </svg>
        <span className={styles.back}>{back}</span>
        <span className={styles.dotFade}>
          <span className={styles.dot} data-dot hidden={!moving} />
        </span>
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const number = String(index + 1).padStart(2, '0');
          return (
            <li key={step.name} className={styles.step}>
              <span className={styles.node} aria-hidden="true">
                <span className="num">{number}</span>
                <span className={`${styles.nodeLit} num`} data-lit>
                  {number}
                </span>
              </span>
              <h4 className={styles.stepName}>{step.name}</h4>
              <p className={styles.stepWho}>{step.who}</p>
              <p className={styles.stepLine}>{step.line}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

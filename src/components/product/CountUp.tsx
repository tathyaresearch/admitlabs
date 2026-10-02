'use client';

// The product page's score counts up from 0 as its gauge comes into view, and the arc draws with it
// (the gauge's own styles, keyed on data-count-state). It counts again each time it comes back. The
// page is rendered with the final numbers, so with no script, or for anyone who prefers reduced
// motion, everything simply shows. Screen readers read the gauge's label, never the moving number.

import { useEffect } from 'react';

const DURATION = 1400;

/** Ease out, the same curve as the arc's transition (cubic-bezier(0.33, 1, 0.68, 1)). */
const ease = (t: number) => 1 - (1 - t) ** 3;

export function CountUp() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    const numbers = [...document.querySelectorAll<HTMLElement | SVGElement>('[data-count]')];
    const frames = new Map<Element, number>();

    const rootOf = (number: Element) => number.closest('[data-count-root]') ?? number;

    const stop = (number: Element) => {
      const frame = frames.get(number);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frames.delete(number);
    };

    const ready = (number: HTMLElement | SVGElement) => {
      stop(number);
      number.textContent = '0';
      rootOf(number).setAttribute('data-count-state', 'ready');
    };

    const run = (number: HTMLElement | SVGElement) => {
      const value = Number(number.dataset.count ?? 0);
      const root = rootOf(number);
      if (root.getAttribute('data-count-state') !== 'ready') ready(number);
      // Paint the undrawn arc once, so the drawing is a transition from it.
      void root.getBoundingClientRect();
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION);
        number.textContent = String(Math.round(value * ease(progress)));
        if (progress < 1) frames.set(number, requestAnimationFrame(step));
        else frames.delete(number);
      };
      frames.set(
        number,
        requestAnimationFrame((now) => {
          root.setAttribute('data-count-state', 'run');
          step(now);
        }),
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const number = numbers.find((each) => rootOf(each) === entry.target);
          if (!number) continue;
          const state = rootOf(number).getAttribute('data-count-state');
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (state !== 'run') run(number);
          } else if (!entry.isIntersecting || state === null) {
            // Out of view, or only peeking in when the page opens: wait at 0.
            ready(number);
          }
        }
      },
      { threshold: [0, 0.6] },
    );
    for (const number of numbers) observer.observe(rootOf(number));

    return () => {
      observer.disconnect();
      for (const number of numbers) {
        stop(number);
        number.textContent = number.dataset.count ?? number.textContent;
        rootOf(number).removeAttribute('data-count-state');
      }
    };
  }, []);

  return null;
}

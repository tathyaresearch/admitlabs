'use client';

// Holds the hero card's measuring moment until the card is on screen. On a wide screen the card is
// in view at load and plays straight away; on a phone it sits below the first screen, so it goes
// back to its start, waits, and plays as it scrolls into view. The movement itself is CSS; this
// only holds and starts it.

import { useEffect, useRef, type ReactNode } from 'react';

export function PlayWhenSeen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.getAnimations !== 'function') return;
    // Already on screen: let it play as it started.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.8) return;
    const animations = element.getAnimations({ subtree: true });
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 0;
    }
    const view = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        for (const animation of animations) animation.play();
        view.disconnect();
      },
      { threshold: 0.35 },
    );
    view.observe(element);
    return () => view.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

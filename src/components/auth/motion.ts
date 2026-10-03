// Small helpers the left sides of /signup and /login share: a frame loop that runs only while its
// stage is on screen, smoothing that does not depend on the frame rate, and a count that eases out.
// Nothing here runs for anyone who prefers reduced motion: each stage checks first and shows its
// still.

/** Prefers reduced motion: the stages show their still version. */
export function reducedMotion(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

/** A mouse or a trackpad: the left side answers the cursor. Otherwise (touch) it plays on its own. */
export function finePointer(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Moves `current` towards `target`: `rate` is how quickly, per second, whatever the frame rate. */
export function approach(current: number, target: number, rate: number, seconds: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * seconds));
}

/** Ease out: quick at first, calm at the end. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Ease in and out, for glides between two places. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Calls `frame(seconds since the last frame, now)` every frame while `stage` is on screen and the
 * tab is shown. Returns a stop function.
 */
export function frameLoop(stage: Element, frame: (seconds: number, now: number) => void): () => void {
  let id = 0;
  let last = 0;
  let seen = true;
  const tick = (now: number) => {
    const seconds = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    frame(seconds, now);
    id = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!id && seen) {
      last = 0;
      id = requestAnimationFrame(tick);
    }
  };
  const stop = () => {
    if (id) cancelAnimationFrame(id);
    id = 0;
  };
  const observer = new IntersectionObserver((entries) => {
    seen = entries.some((entry) => entry.isIntersecting);
    if (seen) start();
    else stop();
  });
  observer.observe(stage);
  start();
  return () => {
    observer.disconnect();
    stop();
  };
}

/** Plays a CSS animation keyed on an attribute again from its start. */
export function replay(element: Element, attribute: string, value = 'true'): void {
  element.removeAttribute(attribute);
  void (element as HTMLElement).offsetWidth;
  element.setAttribute(attribute, value);
}

/** Counts a number up from 0 to `to` in the element's text, easing out. Returns a stop function. */
export function countUp(element: Element, to: number, duration: number, prefix = '', suffix = ''): () => void {
  const start = performance.now();
  let id = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    element.textContent = `${prefix}${Math.round(to * easeOut(t))}${suffix}`;
    if (t < 1) id = requestAnimationFrame(step);
  };
  element.textContent = `${prefix}0${suffix}`;
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

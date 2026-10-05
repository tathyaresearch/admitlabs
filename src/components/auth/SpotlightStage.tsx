'use client';

// The left side of /signup, the spotlight: Drishti's Home for the sample university lies in the
// dark, and the cursor is a soft light that shows it. Where the light falls the dashboard comes
// alive: the three words settle in turn, the things to do come in, the rivals' line comes up, the
// searches by month grow and their count counts up. Home is larger than the stage and drifts the
// other way as the light moves, so the light can reach all of it. With no cursor (a phone or a
// touch screen), or when the cursor rests, the light moves through Home on its own; on a phone
// Home glides under a light that stays put. Reduced motion: the light rests on the three words.

import { useEffect, useRef, type ReactNode } from 'react';
import { approach, countUp, easeInOut, finePointer, frameLoop, reducedMotion, replay } from './motion';
import styles from './stage.module.css';

/** The cursor counts as resting after this long; then the light moves on its own. */
const REST = 2600;
/** How long the light glides to each part of Home on its own, and how long it stays. */
const GLIDE = 1600;
const DWELL = 2600;
/** A part plays again only after the light has been away this long. */
const AGAIN = 7000;
/** Below this height the stage is the phone's band: Home moves under a still light. */
const BAND = 380;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

type Stop = 'words' | 'things' | 'rivals' | 'demand';
const TOUR: readonly Stop[] = ['words', 'rivals', 'demand', 'things'];
/** How far down each part the light rests. */
const DOWN: Readonly<Record<Stop, number>> = { words: 0.5, things: 0.4, rivals: 0.4, demand: 0.5 };

export function SpotlightStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = root.current;
    const frame = stage?.querySelector<HTMLElement>('[data-dash]');
    if (!stage || !frame) return;
    const zones = [...frame.querySelectorAll<HTMLElement>('[data-zone]')];

    // Home is drawn at its own size and scaled; places on it are kept in its own pixels.
    let k = 1;
    let band = false;
    let view = { width: 1, height: 1 };
    let dash = { width: 1160, height: 1100 };
    let home: Point = { x: 0, y: 0 };
    let still: Point = { x: 0, y: 0 };
    const stops = new Map<Stop, Point>();
    const zoneBoxes = new Map<HTMLElement, Box>();
    // By the scale Home is drawn at this moment (a style change can take a frame to show).
    const local = (element: Element): Box => {
      const f = frame.getBoundingClientRect();
      const r = element.getBoundingClientRect();
      const drawn = f.width / (frame.offsetWidth || 1) || 1;
      return { x: (r.left - f.left) / drawn, y: (r.top - f.top) / drawn, width: r.width / drawn, height: r.height / drawn };
    };
    const centre = (box: Box, down = 0.5): Point => ({ x: box.x + box.width / 2, y: box.y + box.height * down });
    const measure = () => {
      const box = stage.getBoundingClientRect();
      view = { width: box.width, height: box.height };
      band = box.height < BAND;
      dash = { width: frame.offsetWidth || 1160, height: frame.offsetHeight || 1100 };
      k = band ? clamp(box.height / 330, 0.44, 0.6) : Math.min(0.95, (box.width * 1.1) / dash.width);
      home = band ? { x: 0, y: 0 } : { x: box.width * 0.05, y: Math.max(84, box.height * 0.11) };
      still = { x: box.width * 0.56, y: box.height * 0.6 };
      frame.style.scale = String(k);
      for (const zone of zones) zoneBoxes.set(zone, local(zone));
      for (const stop of TOUR) {
        const zone = zones.find((each) => each.dataset.zone === stop);
        if (zone) stops.set(stop, centre(local(zone), DOWN[stop]));
      }
    };

    // How far Home may drift: never so far that its far edges come into the stage.
    const panRange = () =>
      band
        ? { minX: view.width - dash.width * k, maxX: 0, minY: view.height - dash.height * k, maxY: 0 }
        : { minX: Math.min(home.x, view.width - 24 - dash.width * k), maxX: home.x, minY: Math.min(home.y, view.height * 0.84 - dash.height * k), maxY: home.y };
    /** Where Home sits, and where the light falls, to show a stop. */
    const aimAt = (stop: Point): { pan: Point; light: Point } => {
      const range = panRange();
      if (band) {
        const pan = { x: clamp(still.x - stop.x * k, range.minX, range.maxX), y: clamp(still.y - stop.y * k, range.minY, range.maxY) };
        return { pan, light: { x: pan.x + stop.x * k, y: pan.y + stop.y * k } };
      }
      // On a wide stage the light stays clear of the logo and the line: Home drifts to bring it there.
      const want = { x: clamp(home.x + stop.x * k, view.width * 0.22, view.width * 0.64), y: clamp(home.y + stop.y * k, view.height * 0.24, view.height * 0.6) };
      const pan = { x: clamp(want.x - stop.x * k, range.minX, range.maxX), y: clamp(want.y - stop.y * k, range.minY, range.maxY) };
      return { pan, light: { x: pan.x + stop.x * k, y: pan.y + stop.y * k } };
    };

    const light: Point = { x: 0, y: 0 };
    const pan: Point = { x: 0, y: 0 };
    const draw = () => {
      stage.style.setProperty('--lx', `${light.x.toFixed(1)}px`);
      stage.style.setProperty('--ly', `${light.y.toFixed(1)}px`);
      frame.style.translate = `${pan.x.toFixed(1)}px ${pan.y.toFixed(1)}px`;
    };
    // The light on the three words: where it starts, and where it stays for reduced motion.
    const rest = () => {
      const aim = aimAt(stops.get('words') ?? { x: 300, y: 260 });
      Object.assign(pan, aim.pan);
      Object.assign(light, aim.light);
      draw();
    };
    const calm = reducedMotion();
    // Measured again whenever the stage or Home changes size (Home's charts size themselves after
    // it first draws, which moves what is below them) and once the fonts are in.
    const remeasure = () => {
      measure();
      if (calm) rest();
    };
    const resize = new ResizeObserver(remeasure);
    resize.observe(stage);
    resize.observe(frame);
    void document.fonts.ready.then(remeasure);
    measure();
    rest();
    if (calm) {
      stage.dataset.still = 'true';
      return () => resize.disconnect();
    }
    stage.dataset.live = 'true';

    // A part of Home comes alive as the light reaches it: the words settle, the rows come in and
    // the bars grow (CSS, keyed on data-play), and counts count up. A list's own numbers (1, 2, 3)
    // stay as they are.
    const played = new Map<HTMLElement, number>();
    const counts: Array<() => void> = [];
    const play = (zone: HTMLElement) => {
      replay(zone, 'data-play');
      for (const element of zone.querySelectorAll<HTMLElement>('.num')) {
        element.dataset.value ??= element.textContent ?? '';
        const match = /^(\+?)(\d+)(%?)$/.exec(element.dataset.value);
        if (match && Number(match[2]) >= 10) counts.push(countUp(element, Number(match[2]), 1100, match[1], match[3]));
      }
    };

    const fine = finePointer();
    let pointer: Point | null = null;
    let moved = -Infinity;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      moved = performance.now();
    };
    const onLeave = () => {
      pointer = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    // On its own: a glide to the next stop, then a rest there with a slow sway, as if held by hand.
    let tour = 0;
    let leg = performance.now();
    let from = { pan: { ...pan }, light: { ...light } };
    let following = false;

    const stopLoop = frameLoop(stage, (seconds, now) => {
      const box = stage.getBoundingClientRect();
      const inside = Boolean(pointer && pointer.x >= box.left && pointer.x <= box.right && pointer.y >= box.top && pointer.y <= box.bottom);

      if (fine && !band && inside && pointer && now - moved < REST) {
        // The light follows the cursor; Home drifts the other way, so the light can reach all of it.
        light.x = approach(light.x, pointer.x - box.left, 11, seconds);
        light.y = approach(light.y, pointer.y - box.top, 11, seconds);
        const range = panRange();
        // Only once the light passes the middle, so the top of Home stays in place while it is read.
        const fx = clamp((light.x - view.width * 0.35) / (view.width * 0.4), 0, 1);
        const fy = clamp((light.y - view.height * 0.35) / (view.height * 0.4), 0, 1);
        pan.x = approach(pan.x, range.maxX - fx * (range.maxX - range.minX), 2.6, seconds);
        pan.y = approach(pan.y, range.maxY - fy * (range.maxY - range.minY), 2.6, seconds);
        following = true;
      } else {
        if (following || now - leg > GLIDE + DWELL) {
          if (!following) tour = (tour + 1) % TOUR.length;
          following = false;
          from = { pan: { ...pan }, light: { ...light } };
          leg = now;
        }
        const aim = aimAt(stops.get(TOUR[tour] ?? 'words') ?? { x: 300, y: 260 });
        const t = easeInOut(Math.min(1, (now - leg) / GLIDE));
        const s = now / 1000;
        const sway = { x: Math.sin(s * 0.9) * 9 * t, y: Math.cos(s * 0.7) * 6 * t };
        pan.x = from.pan.x + (aim.pan.x - from.pan.x) * t + (band ? sway.x : 0);
        pan.y = from.pan.y + (aim.pan.y - from.pan.y) * t + (band ? sway.y : 0);
        light.x = band ? still.x : from.light.x + (aim.light.x - from.light.x) * t + sway.x;
        light.y = band ? still.y : from.light.y + (aim.light.y - from.light.y) * t + sway.y;
      }
      draw();

      // The part under the light plays when the light arrives, if it has been away a while.
      const lx = (light.x - pan.x) / k;
      const ly = (light.y - pan.y) / k;
      for (const [zone, z] of zoneBoxes) {
        const lit = lx > z.x - 24 && lx < z.x + z.width + 24 && ly > z.y - 24 && ly < z.y + z.height + 24;
        if (lit && now - (played.get(zone) ?? -Infinity) > AGAIN) play(zone);
        if (lit) played.set(zone, now);
      }
    });

    return () => {
      stopLoop();
      resize.disconnect();
      for (const stop of counts) stop();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={root} className={styles.lightStage} aria-hidden="true">
      <div className={styles.dashFrame} data-dash>
        {children}
      </div>
      <div className={styles.veil} />
      <div className={styles.lamp} />
    </div>
  );
}

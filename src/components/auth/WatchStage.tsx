'use client';

// The left side of /login: the Drishti eye, big, in the middle, and around it four pieces of the
// dashboard for the sample university. The cards lean with the cursor at different depths, and each
// plays in turn: Visibility, Trust and Chosen settle one by one with their bars, the rivals change
// places into rank order, the questions students ask come in one by one, the searches by month
// grow. The eye follows the cursor; when the cursor rests it watches each card as it changes, and
// while someone types their email it looks at the field. It blinks now and then, and when touched.
// On a phone the cards are small tags around the eye (the words' tag names each word in turn), and
// everything plays on its own. Reduced motion: the eye open, every card full, nothing moves.

import { useEffect, useRef, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatCount, ordinal } from '@/domain/format';
import { PILLAR_ICONS } from '@/graphics/icons';
import { BigEye } from './BigEye';
import { approach, countUp, finePointer, frameLoop, reducedMotion, replay } from './motion';
import type { StageData } from './stage-data';
import styles from './stage.module.css';

type Card = 'words' | 'rivals' | 'asked' | 'trend';
const ORDER: readonly Card[] = ['words', 'rivals', 'asked', 'trend'];

/** The cards' own space, in pixels, scaled to fit the stage, with the eye in its middle. */
const DESK = { width: 980, height: 800 };
/** Where each card stands on the desk (its top left corner), how wide, and how near it floats. */
const PLACES: Record<Card, { x: number; y: number; width: number; depth: number }> = {
  words: { x: 30, y: 40, width: 310, depth: 1 },
  rivals: { x: 650, y: 20, width: 320, depth: 0.6 },
  asked: { x: 620, y: 470, width: 350, depth: 0.85 },
  trend: { x: 30, y: 480, width: 300, depth: 0.45 },
};
/** The eye's width on the desk. */
const EYE_WIDTH = 250;
/** How far the iris may move, in the eye's own units (the drawing is 40 wide). */
const LOOK = { x: 6.4, y: 2.6 };
/** From this far away, in eye widths, the iris looks as far as it can. */
const REACH = 0.85;
/** The cursor holds the eye this long after it last moved; typing holds it this long. */
const CURSOR = 1400;
const TYPING = 2600;

interface Point {
  x: number;
  y: number;
}

const wait = (ms: number, timers: number[]) => new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms)));
const place = (key: Card) => ({ '--depth': PLACES[key].depth, '--x': `${PLACES[key].x}px`, '--y': `${PLACES[key].y}px`, '--w': `${PLACES[key].width}px` }) as CSSProperties;

export function WatchStage({ data }: { data: StageData }) {
  const root = useRef<HTMLDivElement>(null);
  const you = data.rivals.find((row) => row.you);
  const top = data.trend.history.length ? Math.max(...data.trend.history) : 1;
  const asked = data.questions[0];

  useEffect(() => {
    const stage = root.current;
    const eye = stage?.querySelector<HTMLElement>('[data-eye-wrap]');
    if (!stage || !eye) return;
    const card = (key: Card) => stage.querySelector<HTMLElement>(`[data-card="${key}"]`);
    const chip = (key: Card) => stage.querySelector<HTMLElement>(`[data-chip="${key}"]`);
    const phone = window.matchMedia('(max-width: 59.99rem)');

    // Sizes: the desk is scaled to the room between the logo and the line; the eye sits in its middle.
    let band = phone.matches;
    let k = 1;
    let centre: Point = { x: 0, y: 0 };
    let eyeAt: Point = { x: 0, y: 0 };
    let eyeWidth = 1;
    const heights = new Map<Card, number>();
    const chipAt = new Map<Card, Point>();
    const layout = () => {
      const box = stage.getBoundingClientRect();
      band = phone.matches;
      const room = { width: box.width * 0.94, height: box.height - 176 };
      k = Math.max(0.3, Math.min(1.05, room.width / DESK.width, room.height / DESK.height));
      centre = { x: box.width / 2, y: 88 + room.height / 2 };
      stage.style.setProperty('--k', k.toFixed(4));
      stage.style.setProperty('--cx', `${centre.x.toFixed(1)}px`);
      stage.style.setProperty('--cy', `${centre.y.toFixed(1)}px`);
      for (const key of ORDER) heights.set(key, card(key)?.offsetHeight ?? 220);
      if (!band) {
        eyeWidth = EYE_WIDTH * k;
        const height = (eyeWidth * 29) / 40;
        // The drawing is 29 tall with the lashes (5 above the eye): the eye's middle is at 17 of 29.
        eyeAt = { x: centre.x, y: centre.y - height / 2 + (height * 17) / 29 };
      }
      // On a phone the eye and the tags are placed by the styles: read them once they apply.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!band) return;
          const now = stage.getBoundingClientRect();
          const svg = eye.getBoundingClientRect();
          eyeWidth = svg.width || 1;
          eyeAt = { x: svg.left - now.left + svg.width / 2, y: svg.top - now.top + (svg.height * 17) / 29 };
          for (const key of ORDER) {
            const r = chip(key)?.getBoundingClientRect();
            if (r) chipAt.set(key, { x: r.left - now.left + r.width / 2, y: r.top - now.top + r.height / 2 });
          }
        }),
      );
    };
    const resize = new ResizeObserver(layout);
    resize.observe(stage);
    void document.fonts.ready.then(layout);
    layout();
    if (reducedMotion()) return () => resize.disconnect();
    stage.dataset.live = 'true';

    // The lean, the light and the eye: moved every frame.
    const fine = finePointer();
    let pointer: Point | null = null;
    let moved = -Infinity;
    let field: HTMLInputElement | null = null;
    let typed = -Infinity;
    let watching: Card | null = null;
    let blinkAt = performance.now() + 3000;
    const blink = () => {
      replay(eye, 'data-blink');
      blinkAt = performance.now() + 3400 + Math.random() * 3600;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      moved = performance.now();
    };
    const onLeave = () => {
      pointer = null;
    };
    // A field draws the eye when it is chosen and while someone types; then it looks back.
    const onType = (event: Event) => {
      field = event.target instanceof HTMLInputElement && !stage.contains(event.target) ? event.target : null;
      typed = performance.now();
    };
    const onBlur = () => {
      field = null;
    };
    const onSubmit = () => blink();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('focusin', onType);
    document.addEventListener('input', onType, true);
    document.addEventListener('focusout', onBlur);
    document.addEventListener('submit', onSubmit, true);
    eye.addEventListener('pointerenter', blink);
    // The field the page opens with in focus counts once someone types in it, not before.
    if (document.activeElement instanceof HTMLInputElement) field = document.activeElement;

    // Where the caret is in a field: the eye reads along as someone types.
    const canvas = document.createElement('canvas').getContext('2d');
    const caret = (input: HTMLInputElement): Point => {
      const r = input.getBoundingClientRect();
      const style = getComputedStyle(input);
      let width = 0;
      if (canvas) {
        canvas.font = style.font;
        width = canvas.measureText(input.value || '').width;
      }
      const start = parseFloat(style.paddingLeft) || 0;
      return { x: r.left + start + Math.min(width, r.width - start * 2), y: r.top + r.height / 2 };
    };

    const lean = { x: 0, y: 0 };
    const light = { x: 0.5, y: 0.45 };
    const look = { x: 0, y: 0 };
    let glance: Point = { x: 0, y: 0 };
    let glanceAt = performance.now() + 2000;
    const cardAt = (key: Card): Point => {
      const spot = PLACES[key];
      const x = spot.x + spot.width / 2 + lean.x * spot.depth * 30 - DESK.width / 2;
      const y = spot.y + (heights.get(key) ?? 220) / 2 + lean.y * spot.depth * 24 - DESK.height / 2;
      return { x: centre.x + x * k, y: centre.y + y * k };
    };

    const stopLoop = frameLoop(stage, (seconds, now) => {
      const box = stage.getBoundingClientRect();
      const s = now / 1000;
      if (now >= blinkAt) {
        blink();
        if (Math.random() < 0.2) window.setTimeout(blink, 460);
      }

      // The cards lean towards the cursor, or drift slowly on their own; the light goes with them.
      const recent = fine && pointer && now - moved < 4000;
      let tilt = { x: Math.sin(s * 0.42) * 0.5, y: Math.sin(s * 0.31 + 1) * 0.4 };
      let glow = { x: 0.5 + tilt.x * 0.2, y: 0.45 + tilt.y * 0.15 };
      if (recent && pointer) {
        const x = (pointer.x - box.left) / box.width;
        const y = (pointer.y - box.top) / box.height;
        tilt = { x: Math.max(-1, Math.min(1, x * 2 - 1)), y: Math.max(-1, Math.min(1, y * 2 - 1)) };
        glow = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
      }
      lean.x = approach(lean.x, tilt.x, 4, seconds);
      lean.y = approach(lean.y, tilt.y, 4, seconds);
      light.x = approach(light.x, glow.x, 3, seconds);
      light.y = approach(light.y, glow.y, 3, seconds);
      stage.style.setProperty('--px', lean.x.toFixed(4));
      stage.style.setProperty('--py', lean.y.toFixed(4));
      stage.style.setProperty('--gx', `${(light.x * 100).toFixed(2)}%`);
      stage.style.setProperty('--gy', `${(light.y * 100).toFixed(2)}%`);

      // What the eye looks at: the field while someone types, else the cursor while it moves, else
      // the card that is changing, else ahead with a small glance now and then.
      const typing = field && document.activeElement === field && now - typed < TYPING;
      const following = fine && pointer && now - moved < CURSOR;
      let target: Point;
      if (typing && field && (!following || typed > moved)) {
        const at = caret(field);
        target = { x: at.x - box.left, y: at.y - box.top };
      } else if (following && pointer) {
        target = { x: pointer.x - box.left, y: pointer.y - box.top };
      } else if (watching) {
        target = band ? (chipAt.get(watching) ?? eyeAt) : cardAt(watching);
      } else {
        if (now >= glanceAt) {
          glance = Math.random() < 0.4 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * eyeWidth * 1.6, y: (Math.random() - 0.5) * eyeWidth * 0.5 };
          glanceAt = now + 1400 + Math.random() * 1800;
        }
        target = { x: eyeAt.x + glance.x, y: eyeAt.y + glance.y + eyeWidth * 0.05 };
      }
      const dx = target.x - eyeAt.x;
      const dy = target.y - eyeAt.y;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / (eyeWidth * REACH));
      look.x = approach(look.x, (dx / distance) * LOOK.x * reach, 9, seconds);
      look.y = approach(look.y, (dy / distance) * LOOK.y * reach, 9, seconds);
      eye.style.setProperty('--look-x', `${look.x.toFixed(3)}px`);
      eye.style.setProperty('--look-y', `${look.y.toFixed(3)}px`);
    });

    // Each card's change, played in turn, the eye watching it. A card is set empty at once (no
    // transition) just before it fills again; the others stay full.
    let alive = true;
    const timers: number[] = [];
    const counts: Array<() => void> = [];
    const at = <T extends Element>(parent: Element | null | undefined, selector: string) => parent?.querySelector<T>(selector) ?? null;
    const instantly = (change: () => void) => {
      stage.setAttribute('data-setting', '');
      change();
      void stage.offsetWidth;
      stage.removeAttribute('data-setting');
    };
    const phase = (key: Card, value: string) => {
      card(key)?.setAttribute('data-phase', value);
      chip(key)?.setAttribute('data-phase', value);
    };
    const count = (element: Element | null, to: number, duration: number, prefix = '', suffix = '') => {
      if (element) counts.push(countUp(element, to, duration, prefix, suffix));
    };
    const watch = (key: Card | null) => {
      for (const each of ORDER) {
        card(each)?.toggleAttribute('data-watched', each === key);
        chip(each)?.toggleAttribute('data-watched', each === key);
      }
      watching = key;
    };

    // The words' tag names one word at a time.
    const tagWord = (index: number) => {
      const word = data.words[index];
      const name = at(chip('words'), '[data-name]');
      const value = at(chip('words'), '[data-word]');
      if (word && name && value) {
        name.textContent = word.label;
        value.textContent = word.word;
      }
    };

    const films: Record<Card, () => Promise<void>> = {
      words: async () => {
        instantly(() => {
          phase('words', 'start');
          card('words')?.style.setProperty('--shown', '0');
        });
        await wait(160, timers);
        phase('words', 'run');
        for (let shown = 1; shown <= data.words.length && alive; shown += 1) {
          card('words')?.style.setProperty('--shown', String(shown));
          tagWord(shown - 1);
          const tag = chip('words');
          if (tag) replay(tag, 'data-tick');
          await wait(650, timers);
        }
        await wait(700, timers);
      },
      rivals: async () => {
        phase('rivals', 'names');
        await wait(1100, timers);
        phase('rivals', 'ranked');
        await wait(1500, timers);
      },
      asked: async () => {
        card('asked')?.style.setProperty('--shown', '0');
        instantly(() => {
          const number = at(chip('asked'), '[data-to]');
          if (number) number.textContent = '0';
        });
        count(at(chip('asked'), '[data-to]'), asked?.count ?? 0, 1600);
        await wait(600, timers);
        for (let shown = 1; shown <= data.questions.length && alive; shown += 1) {
          card('asked')?.style.setProperty('--shown', String(shown));
          await wait(700, timers);
        }
        await wait(400, timers);
      },
      trend: async () => {
        instantly(() => {
          phase('trend', 'start');
          const searches = at(card('trend'), '[data-to]');
          if (searches && data.trend.count !== null) searches.textContent = '0';
        });
        await wait(160, timers);
        phase('trend', 'run');
        if (data.trend.count !== null) count(at(card('trend'), '[data-to]'), data.trend.count, 1300);
        await wait(1900, timers);
      },
    };

    const run = async () => {
      // The eye opens first; then it checks each card in turn, again and again.
      await wait(1300, timers);
      while (alive) {
        for (const key of ORDER) {
          if (!alive) return;
          watch(key);
          if (Math.random() < 0.3) blink();
          await films[key]();
          watch(null);
          await wait(1000, timers);
        }
        await wait(2400, timers);
      }
    };
    void run();

    return () => {
      alive = false;
      stopLoop();
      resize.disconnect();
      for (const timer of timers) window.clearTimeout(timer);
      for (const stop of counts) stop();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('focusin', onType);
      document.removeEventListener('input', onType, true);
      document.removeEventListener('focusout', onBlur);
      document.removeEventListener('submit', onSubmit, true);
      eye.removeEventListener('pointerenter', blink);
    };
  }, [asked?.count, data.questions.length, data.trend.count, data.words]);

  return (
    <div ref={root} className={styles.watch} aria-hidden="true">
      <div className={styles.watchLight} />

      <div className={styles.desk}>
        <div className={styles.float} style={place('trend')}>
          <div className={`${styles.mini} ${styles.miniTrend}`} data-card="trend">
            <p className={styles.miniHead}>
              <span>Rising fastest in {data.city}</span>
            </p>
            <p className={styles.miniBig}>
              <Icon name="arrowUpRight" size={18} />
              <span className={styles.miniBigWord}>{data.trend.word}</span>
              <span className={styles.miniMuted}>this month</span>
            </p>
            <p className={styles.miniTitle}>{data.trend.text}</p>
            <div className={styles.miniMonths}>
              {data.trend.history.map((value, index) => (
                <span key={index} style={{ '--i': index } as CSSProperties}>
                  <i style={{ height: `${Math.max(8, Math.round((value / top) * 100))}%` }} />
                </span>
              ))}
            </div>
            <p className={styles.miniMeta}>
              Search trends
              {data.trend.count !== null ? (
                <>
                  {' '}
                  · About{' '}
                  <span className="num" data-to>
                    {formatCount(data.trend.count)}
                  </span>{' '}
                  searches a month
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className={styles.float} style={place('rivals')}>
          <div className={`${styles.mini} ${styles.miniRivals}`} data-card="rivals">
            <p className={styles.miniHead}>
              <span>Rivals in {data.city}</span>
              {you ? (
                <span className={styles.miniRank}>
                  <span className="num">{ordinal(you.rank)}</span> of {data.rivals.length}
                </span>
              ) : null}
            </p>
            <ol className={styles.miniLadder}>
              {data.rivals.map((row) => (
                <li key={row.id} className={styles.miniRung} data-you={row.you || undefined} style={{ '--from': row.from } as CSSProperties}>
                  <span className={`${styles.miniRungRank} num`}>{row.rank}</span>
                  <span className={styles.miniRungName}>{row.name}</span>
                  <span className={styles.miniTrack}>
                    <i style={{ width: `${row.score}%` }} />
                  </span>
                  <span className={`${styles.miniRungScore} num`}>{row.score}</span>
                </li>
              ))}
            </ol>
            {data.line ? <p className={styles.miniLine}>{data.line}</p> : null}
          </div>
        </div>

        <div className={styles.float} style={place('words')}>
          <div className={`${styles.mini} ${styles.miniWords}`} data-card="words">
            <p className={styles.miniHead}>
              <span>What the internet says</span>
              <span>Checked {data.checked}</span>
            </p>
            <ul className={styles.miniWordList}>
              {data.words.map((word, index) => (
                <li key={word.key} style={{ '--i': index } as CSSProperties}>
                  <Icon name={PILLAR_ICONS[word.key]} size={16} />
                  <span>{word.label}</span>
                  <span className={styles.miniTrack}>
                    <i style={{ width: `${word.score}%` }} />
                  </span>
                  <span className={styles.miniWord}>{word.word}</span>
                </li>
              ))}
            </ul>
            <p className={styles.miniAnswer}>{data.answer}</p>
          </div>
        </div>

        <div className={styles.float} style={place('asked')}>
          <div className={`${styles.mini} ${styles.miniAsked}`} data-card="asked">
            <p className={styles.miniHead}>
              <span>What students ask in {data.city}</span>
            </p>
            <ol className={styles.miniQuestions}>
              {data.questions.map((question, index) => (
                <li key={question.text} style={{ '--i': index } as CSSProperties}>
                  <span className={styles.miniQuestion}>{question.text}</span>
                  <span className={styles.miniMeta}>
                    {question.platform} · <span className="num">{question.count}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className={styles.chip} data-chip="words">
        <span className={styles.chipWord} data-name>
          {data.words[0]?.label}
        </span>
        <span className={styles.chipText} data-word>
          {data.words[0]?.word}
        </span>
      </div>
      <div className={styles.chip} data-chip="rivals">
        <span className={styles.chipLadder}>
          {data.rivals.map((row) => (
            <i key={row.id} data-you={row.you || undefined} style={{ height: `${Math.max(18, row.score)}%`, '--from': row.from } as CSSProperties} />
          ))}
        </span>
        <span className={`${styles.chipValue} num`}>{you ? ordinal(you.rank) : ''}</span>
        <span className={styles.chipWord}>of {data.rivals.length}</span>
      </div>
      <div className={styles.chip} data-chip="asked">
        <Icon name="forum" size={14} />
        <span className={styles.chipWord}>{asked?.platform} ·</span>
        <span className={`${styles.chipValue} num`} data-to>
          {asked?.count}
        </span>
      </div>
      <div className={styles.chip} data-chip="trend">
        <span className={styles.chipBars}>
          {data.trend.history.map((value, index) => (
            <i key={index} style={{ height: `${Math.max(14, Math.round((value / top) * 100))}%`, '--i': index } as CSSProperties} />
          ))}
        </span>
        <span className={styles.chipText}>{data.trend.word}</span>
      </div>

      <div className={styles.eyeWrap} data-eye-wrap>
        <BigEye />
      </div>
    </div>
  );
}

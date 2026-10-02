// Records the Drishti reveals as motion graphics into brand/motion. A headless browser (Edge or
// Chrome) opens the development-only stage at /drishti/motion, holds every animation still and
// steps it 30 frames a second; ffmpeg then makes, for each reveal (side and rise), MP4s (H.264,
// tagged BT.709) square 1080 and wide 1920 by 1080, on black and on ivory, with "Drishti by
// AdmitLabs" and with "Drishti" alone, and a looping GIF of each square. Each file is half a
// second of the word, the reveal, then the logo held.
//
// Needs the app running (npm run dev), ffmpeg on the PATH, and Edge or Chrome (or BROWSER set to
// one). Usage: npm run motion:record, or npm run motion:record -- side (or rise) for one reveal.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { PRODUCT_URL } from '../src/lib/urls.ts';
import { fail, ROOT } from './lib/local.ts';

const FPS = 30;
const GIF_FPS = 25;
/** Seconds of the word alone before the reveal, and of the logo held after it. */
const LEAD = 0.5;
const HOLD = 1.7;

const REVEALS = ['side', 'rise'] as const;
type Reveal = (typeof REVEALS)[number];

const BACKGROUNDS = { black: '0x0A0A0C', ivory: '0xF2E8D6' } as const;
type Background = keyof typeof BACKGROUNDS;

const FRAMES = [
  { size: 'square', width: 1080, height: 1080 },
  { size: 'wide', width: 1920, height: 1080 },
] as const;
type Frame = (typeof FRAMES)[number];

/** The lockup in full, or the eye and the word alone; and how the files are named. */
const NAMES = [
  { name: 'full', file: 'drishti-by-admitlabs' },
  { name: 'only', file: 'drishti' },
] as const;

const BROWSERS = [
  process.env.BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

/** Converted with accurate rounding and tagged BT.709, so players show the black and the ivory exactly. */
const COLOR =
  'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,' +
  'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv';

type Params = Record<string, unknown>;

/** The browser's DevTools connection: one socket, many pages (each a session). */
interface Cdp {
  send<T = unknown>(method: string, params?: Params, sessionId?: string): Promise<T>;
  close(): void;
}

function ffmpeg(args: string[]) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (run.status !== 0) fail(`ffmpeg could not write ${args.at(-1)}.`);
}

function findBrowser(): string {
  const found = BROWSERS.find((path): path is string => Boolean(path) && existsSync(path as string));
  if (!found) fail('No browser found. Install Edge or Chrome, or set BROWSER to one.');
  return found;
}

async function checkStage(url: string) {
  let status = 0;
  try {
    status = (await fetch(`${url}?reveal=side`)).status;
  } catch {
    // Nothing answered: the app is not running.
  }
  if (status === 404) fail(`${url} answered 404. The motion stage only opens while developing: run npm run dev, then this again.`);
  if (status !== 200) fail(`The app is not running at ${url}. Start it with npm run dev, then run this again.`);
}

/** Starts the browser with DevTools on a free port, which it writes into its profile folder. */
async function launch(path: string, profile: string): Promise<{ cdp: Cdp; done: Promise<unknown> }> {
  const browser = spawn(path, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], {
    stdio: 'ignore',
  });
  const done = new Promise((resolve) => browser.once('exit', resolve));
  const portFile = join(profile, 'DevToolsActivePort');
  let url = '';
  for (let i = 0; i < 100 && !url; i += 1) {
    if (existsSync(portFile)) {
      const [port, socket] = readFileSync(portFile, 'utf8').split('\n').map((line) => line.trim());
      if (port && socket) url = `ws://127.0.0.1:${port}${socket}`;
    }
    if (!url) await sleep(150);
  }
  if (!url) {
    browser.kill();
    fail(`The browser did not start: ${path}`);
  }

  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not reach the browser')), { once: true });
  });
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } };
    const waiting = message.id ? pending.get(message.id) : undefined;
    if (!waiting || !message.id) return;
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(message.error.message));
    else waiting.resolve(message.result);
  });
  const cdp: Cdp = {
    send: <T>(method: string, params: Params = {}, sessionId?: string) =>
      new Promise<T>((resolve, reject) => {
        nextId += 1;
        pending.set(nextId, { resolve: resolve as (value: unknown) => void, reject });
        socket.send(JSON.stringify({ id: nextId, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
    close: () => socket.close(),
  };
  return { cdp, done };
}

/** Steps one reveal on the stage and saves every frame; returns how long the reveal runs, in ms. */
async function record(cdp: Cdp, url: string, frame: Frame, dir: string): Promise<number> {
  const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
    const page = <T = unknown>(method: string, params?: Params) => cdp.send<T>(method, params, sessionId);
    const evaluate = async <T>(expression: string) =>
      (await page<{ result: { value: T } }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

    await page('Page.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: frame.width, height: frame.height, deviceScaleFactor: 1, mobile: false });
    await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await page('Page.navigate', { url });
    for (let i = 0; i < 100 && (await evaluate<string>('document.readyState')) !== 'complete'; i += 1) await sleep(100);
    await evaluate('document.fonts.ready.then(() => true)');
    await sleep(500);

    // Next's development badge is not part of the picture. Then every animation is held still, and
    // the reveal's length is its longest animation that ends (the rare blink repeats forever).
    const ms = await evaluate<number>(`(() => {
      document.querySelector('nextjs-portal')?.remove();
      const all = document.getAnimations();
      all.forEach((a) => a.pause());
      return Math.max(0, ...all.map((a) => Number(a.effect?.getComputedTiming().endTime)).filter((end) => Number.isFinite(end)));
    })()`);
    if (!ms) fail(`No reveal plays at ${url}.`);

    const count = Math.round((ms / 1000) * FPS);
    for (let index = 0; index <= count; index += 1) {
      const time = (index * 1000) / FPS;
      await evaluate(
        `new Promise((done) => { document.getAnimations().forEach((a) => { a.currentTime = ${time}; }); requestAnimationFrame(() => requestAnimationFrame(() => done(true))); })`,
      );
      const { data } = await page<{ data: string }>('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(dir, `f-${String(index).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
    }
    return ms;
  } finally {
    await cdp.send('Target.closeTarget', { targetId });
  }
}

/** The MP4, and for a square the GIF: it fades in from the background and out to it, so it loops. */
function encode(dir: string, out: string, background: Background, square: boolean, ms: number) {
  const input = ['-framerate', String(FPS), '-i', join(dir, 'f-%04d.png')];
  const pad = `tpad=start_duration=${LEAD}:start_mode=clone:stop_duration=${HOLD}:stop_mode=clone`;
  ffmpeg([...input, '-vf', `${pad},${COLOR}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', `${out}.mp4`]);
  if (!square) return;
  const total = LEAD + ms / 1000 + HOLD;
  const color = BACKGROUNDS[background];
  const fades = `fade=t=in:st=0:d=0.3:color=${color},fade=t=out:st=${(total - 0.45).toFixed(2)}:d=0.45:color=${color}`;
  const palette = 'split[a][b];[a]palettegen=max_colors=48:stats_mode=full[p];[b][p]paletteuse=dither=none';
  ffmpeg([...input, '-filter_complex', `${pad},fps=${GIF_FPS},${fades},${palette}`, '-loop', '0', `${out}.gif`]);
}

const which = process.argv[2];
if (which && !REVEALS.includes(which as Reveal)) fail(`Unknown reveal "${which}". Use side or rise, or nothing for both.`);
const reveals: readonly Reveal[] = which ? [which as Reveal] : REVEALS;

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) fail('ffmpeg is needed. Install it and make sure it is on the PATH.');
const stage = `${PRODUCT_URL}/motion`;
await checkStage(stage);
const browserPath = findBrowser();

const work = mkdtempSync(join(tmpdir(), 'drishti-motion-'));
const profile = join(work, 'browser');
mkdirSync(profile);
const { cdp, done } = await launch(browserPath, profile);
try {
  for (const reveal of reveals) {
    const folder = join(ROOT, 'brand', 'motion', `${reveal}-reveal`);
    mkdirSync(folder, { recursive: true });
    for (const { name, file } of NAMES) {
      for (const background of Object.keys(BACKGROUNDS) as Background[]) {
        for (const frame of FRAMES) {
          const base = `${file}-${reveal}-reveal-${background}-${frame.width}x${frame.height}`;
          const frames = join(work, base);
          mkdirSync(frames);
          const ms = await record(cdp, `${stage}?reveal=${reveal}&bg=${background}&size=${frame.size}&name=${name}`, frame, frames);
          encode(frames, join(folder, base), background, frame.size === 'square', ms);
          rmSync(frames, { recursive: true, force: true });
          const made = frame.size === 'square' ? ['mp4', 'gif'] : ['mp4'];
          for (const extension of made) {
            const path = join(folder, `${base}.${extension}`);
            console.log(`${relative(ROOT, path).replaceAll('\\', '/')}  ${Math.round(statSync(path).size / 1024)} KB`);
          }
        }
      }
    }
  }
} finally {
  await cdp.send('Browser.close').catch(() => undefined);
  cdp.close();
  await Promise.race([done, sleep(5000)]);
  rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

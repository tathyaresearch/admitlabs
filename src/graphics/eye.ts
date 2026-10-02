// The Drishti eye: two lids drawn as an almond within an almond (filled, so the upper lid is heavier
// than the lower and both taper to sharp corners), a round iris, and three short lashes on the upper
// lid. Drawn on a 40 by 24 grid; the lashes reach 5 above it. One drawing for every place the eye
// shows: the screens (src/components/ui/Eye.tsx), the PDFs, the link previews and the favicon.

/** The lids: the outer almond, with the opening cut out of it (fill with the even-odd rule). */
export const EYE_LIDS =
  'M0.6 12A24.72 24.72 0 0 1 39.4 12A24.72 24.72 0 0 1 0.6 12Z' + 'M5.6 12A21.9 21.9 0 0 1 34.4 12A18.65 18.65 0 0 1 5.6 12Z';

/** The opening between the lids, where the iris shows. */
export const EYE_OPENING = 'M5.6 12A21.9 21.9 0 0 1 34.4 12A18.65 18.65 0 0 1 5.6 12Z';

/** The closed eye: one line where the lids meet. */
export const EYE_SHUT = 'M2.8 12.4H37.2';

/** The iris. Open, it sits wholly inside the opening. */
export const EYE_IRIS = { cx: 20, cy: 12.7, r: 5.85 } as const;

/** The upper lid's outer edge, which the lashes grow from: a circle's arc. */
const LID = { cx: 20, cy: 27.32, r: 24.72 };

export interface EyeLash {
  /** Where it grows from the lid. */
  x: number;
  y: number;
  d: string;
}

/**
 * One lash: a thin tapered stroke, rooted a unit into the upper lid (so it joins it), pointing
 * outwards and curling a little further out towards its tip. `at` places it along the lid, in
 * degrees from the top; `lean` tilts it a little more than the lid's own curve, so the lashes fan
 * out. The middle lash stands straight.
 */
function lash(at: number, lean: number, length: number): EyeLash {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const x = LID.cx + LID.r * Math.sin(rad(at));
  const y = LID.cy - LID.r * Math.cos(rad(at));
  const out = { x: Math.sin(rad(lean)), y: -Math.cos(rad(lean)) };
  const side = { x: -out.y, y: out.x };
  const half = 0.9;
  const curl = Math.sign(lean) * length * 0.14;
  const root = { x: x - out.x, y: y - out.y };
  const tip = { x: x + out.x * length + side.x * curl, y: y + out.y * length + side.y * curl };
  // The bend: a little past half way along, pushed out by half the curl.
  const bend = { x: x + out.x * length * 0.55 + side.x * curl * 0.35, y: y + out.y * length * 0.55 + side.y * curl * 0.35 };
  const f = (value: number) => value.toFixed(2);
  return {
    x,
    y,
    d:
      `M${f(root.x + side.x * half)} ${f(root.y + side.y * half)}` +
      `Q${f(bend.x + side.x * half * 0.45)} ${f(bend.y + side.y * half * 0.45)} ${f(tip.x)} ${f(tip.y)}` +
      `Q${f(bend.x - side.x * half * 0.45)} ${f(bend.y - side.y * half * 0.45)} ${f(root.x - side.x * half)} ${f(root.y - side.y * half)}Z`,
  };
}

/** Three lashes: from 20 px up. Smaller (and in the favicon) the eye stands alone. */
export const EYE_LASHES: readonly EyeLash[] = [lash(-24, -33, 5.4), lash(0, 0, 6), lash(24, 33, 5.4)];

/** The drawing's box: 40 by 24, or 40 by 29 with the lashes (they reach 5 above the eye). */
export function eyeBox(lashes: boolean) {
  return lashes ? { x: 0, y: -5, width: 40, height: 29 } : { x: 0, y: 0, width: 40, height: 24 };
}

/**
 * The eye before the word, in ems of the word's size: its width, its height with and without the
 * lashes, the gap to the word, and how far its foot sits below the baseline (it centres the eye on
 * the word's middle, the lashes reaching up to its ascenders).
 */
export const EYE_EM = { width: 1.12, lashes: 0.812, plain: 0.672, gap: 0.24, drop: 0.02 } as const;

const f2 = (value: number) => Number(value.toFixed(3)).toString();

/** The open eye's shapes as SVG markup in one colour, placed by a transform. */
function shapes(lashes: boolean, color: string): string {
  const lids = `<path d="${EYE_LIDS}" fill="${color}" fill-rule="evenodd"/>`;
  const iris = `<circle cx="${EYE_IRIS.cx}" cy="${EYE_IRIS.cy}" r="${EYE_IRIS.r}" fill="${color}"/>`;
  const lashPaths = lashes ? EYE_LASHES.map((item) => `<path d="${item.d}" fill="${color}"/>`).join('') : '';
  return lashPaths + lids + iris;
}

/** The still, open eye as an SVG document: for link previews. */
export function eyeSvg({ lashes, color }: { lashes: boolean; color: string }): string {
  const box = eyeBox(lashes);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">${shapes(lashes, color)}</svg>`;
}

/**
 * The favicon: the eye alone, ivory on a black rounded square (the same square as the AdmitLabs
 * "AL" mark), three quarters of its width. src/app/icon.svg is this, written out; a test checks.
 */
export function eyeIconSvg(): string {
  const side = 240;
  const scale = (side * 0.76) / 40;
  const x = (side - 40 * scale) / 2;
  const y = (side - 24 * scale) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${side}" height="${side}" role="img" aria-label="Drishti">` +
    `<rect width="${side}" height="${side}" rx="48" fill="#0A0A0C"/>` +
    `<g transform="translate(${f2(x)},${f2(y)}) scale(${f2(scale)})">${shapes(false, '#F2E8D6')}</g>` +
    `</svg>\n`
  );
}

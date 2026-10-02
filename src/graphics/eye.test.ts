import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { EYE_EM, EYE_IRIS, EYE_LASHES, EYE_LIDS, EYE_OPENING, eyeBox, eyeIconSvg, eyeSvg } from './eye.ts';

// The Drishti eye: one drawing for the screens, the PDFs, the link previews and the favicon.

const app = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8');

describe('the Drishti eye', () => {
  test('three lashes, each rooted on the upper lid, the middle one straight up', () => {
    assert.equal(EYE_LASHES.length, 3);
    for (const lash of EYE_LASHES) {
      // On the upper lid's outer edge: the arc of a circle 24.72 round, centred at (20, 27.32).
      assert.ok(Math.abs(Math.hypot(lash.x - 20, lash.y - 27.32) - 24.72) < 1e-9);
      assert.ok(lash.y < 12, 'above the eye’s middle');
    }
    assert.equal(EYE_LASHES[1]?.x, 20);
    // Mirror images either side.
    assert.ok(Math.abs((EYE_LASHES[0]?.x ?? 0) + (EYE_LASHES[2]?.x ?? 0) - 40) < 1e-9);
  });

  test('open, the iris sits wholly inside the opening, so a still eye needs no mask', () => {
    // The opening's edges where the iris is widest and at its top and bottom.
    const upper = (x: number) => 12 - (Math.sqrt(21.9 ** 2 - (x - 20) ** 2) - Math.sqrt(21.9 ** 2 - 14.4 ** 2));
    const lower = (x: number) => 12 + (Math.sqrt(18.65 ** 2 - (x - 20) ** 2) - Math.sqrt(18.65 ** 2 - 14.4 ** 2));
    for (let x = EYE_IRIS.cx - EYE_IRIS.r; x <= EYE_IRIS.cx + EYE_IRIS.r; x += 0.05) {
      const half = Math.sqrt(Math.max(0, EYE_IRIS.r ** 2 - (x - EYE_IRIS.cx) ** 2));
      assert.ok(EYE_IRIS.cy - half >= upper(x), `top inside at x ${x.toFixed(2)}`);
      assert.ok(EYE_IRIS.cy + half <= lower(x), `bottom inside at x ${x.toFixed(2)}`);
    }
    assert.ok(EYE_LIDS.endsWith(EYE_OPENING), 'the lids are the outer almond with the opening cut out');
  });

  test('its box and its measures beside the word', () => {
    assert.deepEqual(eyeBox(false), { x: 0, y: 0, width: 40, height: 24 });
    assert.deepEqual(eyeBox(true), { x: 0, y: -5, width: 40, height: 29 });
    // The height in ems follows the box: 1.12 em wide.
    assert.ok(Math.abs((EYE_EM.width * 29) / 40 - EYE_EM.lashes) < 1e-9);
    assert.ok(Math.abs((EYE_EM.width * 24) / 40 - EYE_EM.plain) < 1e-9);
  });

  test('the link preview’s eye is the drawing in one colour, lashes and all', () => {
    const svg = eyeSvg({ lashes: true, color: '#F2E8D6' });
    assert.ok(svg.includes(`d="${EYE_LIDS}"`));
    assert.ok(svg.includes('fill-rule="evenodd"'));
    for (const lash of EYE_LASHES) assert.ok(svg.includes(lash.d));
    assert.ok(svg.includes('viewBox="0 -5 40 29"'));
    assert.ok(!eyeSvg({ lashes: false, color: '#000' }).includes(EYE_LASHES[1]?.d ?? '?'));
  });

  test('the favicon of the dashboard, login and /drishti is the eye alone; the website keeps AL', () => {
    assert.equal(app('icon.svg'), eyeIconSvg(), 'src/app/icon.svg is eyeIconSvg() written out');
    assert.ok(!app('icon.svg').includes(EYE_LASHES[1]?.d ?? '?'), 'no lashes at favicon size');
    assert.ok(app('(site)/site/icon.svg').includes('aria-label="AdmitLabs"'));
  });
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { LARKMOOR_MARK } from './larkmoor-mark.ts';

// Larkmoor's mark (2026-10-09): drawn once, inline on the website, and kept as two standalone
// files (near-black on cream, cream on near-black) with the very same shapes.

const PUBLIC = join(import.meta.dirname, '..', '..', 'public', 'brand');
const VERSIONS = [
  { file: 'larkmoor-mark-on-ivory.svg', background: '#F2E8D6', ink: '#0A0A0C' },
  { file: 'larkmoor-mark-on-black.svg', background: '#0A0A0C', ink: '#F2E8D6' },
];

describe('Larkmoor’s mark', () => {
  test('drawn on a 32 grid, inside it', () => {
    assert.equal(LARKMOOR_MARK.viewBox, '0 0 32 32');
    for (const d of [LARKMOOR_MARK.hills, LARKMOOR_MARK.bird]) {
      for (const n of d.match(/-?\d+(\.\d+)?/g) ?? []) assert.ok(Number(n) >= 0 && Number(n) <= 32, n);
    }
  });

  for (const { file, background, ink } of VERSIONS) {
    test(`${file}: the same shapes, in the brand’s two colours only`, () => {
      const svg = readFileSync(join(PUBLIC, file), 'utf8');
      for (const d of [LARKMOOR_MARK.shield, LARKMOOR_MARK.hills, LARKMOOR_MARK.bird]) assert.ok(svg.includes(`d="${d}"`));
      assert.ok(svg.includes(`viewBox="${LARKMOOR_MARK.viewBox}"`));
      assert.deepEqual([...new Set(svg.match(/#[0-9A-Fa-f]{6}/g))].sort(), [background, ink].sort());
    });
  }
});

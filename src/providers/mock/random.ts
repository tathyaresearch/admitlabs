// Deterministic randomness for mocks: the same inputs always give the same sample data.

/** FNV-1a 32-bit hash. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: a small, fast PRNG returning numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  /** Whole number from min to max, inclusive. */
  int(min: number, max: number): number;
  /** Number from min to max, rounded to `decimals` places. */
  between(min: number, max: number, decimals?: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) {
      if (max < min) throw new Error(`int(${min}, ${max}): max is below min`);
      return min + Math.floor(next() * (max - min + 1));
    },
    between(min, max, decimals = 1) {
      const factor = 10 ** decimals;
      return Math.round((min + next() * (max - min)) * factor) / factor;
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() needs at least one item');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}

/** An Rng seeded from any list of parts, for example ('search', slug, programKey, month). */
export function rngFor(...parts: ReadonlyArray<string | number | null>): Rng {
  return createRng(hashString(parts.map((part) => String(part ?? '-')).join('|')));
}

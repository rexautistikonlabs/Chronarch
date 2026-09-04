/** Deterministic PRNG seeded from a hex hash (the head_hash).
 *
 * The scene's rest pose is a pure function of session state: the same
 * head_hash always yields the same pose, two different hashes yield visibly
 * different ones. sfc32 seeded from the first 128 bits of the hash; a short or
 * non-hex string is hashed through xmur3 first so any label still seeds.
 */
export type Rng = {
  next(): number; // [0, 1)
  range(min: number, max: number): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  sign(): 1 | -1;
};

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function seedWords(seed: string): [number, number, number, number] {
  const hex = /^[0-9a-f]{32,}$/i.test(seed) ? seed : null;
  if (hex) {
    const w = (i: number) => parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0;
    return [w(0), w(1), w(2), w(3)];
  }
  const m = xmur3(seed || "genesis");
  return [m(), m(), m(), m()];
}

export function rngFromSeed(seed: string): Rng {
  const [a, b, c, d] = seedWords(seed);
  const next = sfc32(a, b, c, d);
  for (let i = 0; i < 12; i++) next(); // warm up
  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return rng;
}

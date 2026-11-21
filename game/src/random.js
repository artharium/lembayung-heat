// Seeded random: the same seed always gives the same city, traffic and
// shots. One linear congruential stream drives every helper, so a shuffled
// list or a weighted pick is still deterministic for a given seed.
export function createRandom(seed) {
  let s = (seed >>> 0) || 1;
  function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  function range(a, b) { return a + (b - a) * next(); }
  function pick(arr) { return arr[Math.floor(next() * arr.length) % arr.length]; }
  function int(a, b) { return Math.floor(range(a, b + 1)); }
  // Fisher-Yates shuffle that spends the same seeded stream, so a shuffled
  // list is still deterministic for a given seed. Returns a new array.
  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  // True with probability 1/n on the seeded stream.
  function oneIn(n) { return next() < 1 / n; }
  // A bell-shaped value around 0 (Box-Muller on the seeded stream), for
  // anything that should cluster near a centre instead of spreading flat.
  function gauss() {
    const u = Math.max(next(), 1e-9); const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Pick one entry from [value, weight] pairs, weighted by the second
  // number. Falls back to the first entry when the weights add to nothing.
  function weighted(pairs) {
    let total = 0;
    for (const [, w] of pairs) total += w;
    if (total <= 0) return pairs[0][0];
    let roll = next() * total;
    for (const [value, w] of pairs) {
      roll -= w;
      if (roll <= 0) return value;
    }
    return pairs[pairs.length - 1][0];
  }
  // A bell-shaped value clamped around a centre: the seeded gauss,
  // pulled back inside [centre - spread, centre + spread], for anything
  // that should cluster near a centre but never run away from it.
  function gaussRange(centre, spread) {
    const v = centre + gauss() * spread;
    return Math.max(centre - spread, Math.min(centre + spread, v));
  }
  return { next, range, pick, int, shuffle, oneIn, gauss, weighted, gaussRange, seed };
}

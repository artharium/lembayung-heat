// Seeded random: the same seed always gives the same city, traffic and shots.
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
  return { next, range, pick, int, shuffle, oneIn, seed };
}

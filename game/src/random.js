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
  return { next, range, pick, int, seed };
}

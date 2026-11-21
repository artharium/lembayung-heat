// Lembayung Heat — a working gta6-01 entry (Node 22, standard library only):
// v5 adds seven new systems to the game folder: jobs, hidden packages,
// stunt jumps, dynamic weather, safehouses and bribes, two epilogue
// missions, and pedestrian reactions (game/src/jobs.js, collectibles.js,
// stunts.js, weather.js, heat.js, story2.js, pedreact.js).
// the game is this directory's game/ folder, plain static files a desktop
// browser loads offline (game/index.html and its ES modules, Three.js vendored
// as game/vendor/three.min.js, no network request), and this program hands it
// in. It copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. The game itself is Lembayung Heat: an original open-world
// crime game in the coastal city of Lembayung at dusk — drive and walk, steal
// cars, escape the Lembayung PD, finish 8 story missions, with a HUD, a
// minimap, a map screen, a title screen and 3 save slots.
// v4 note (builder, recorded session): the header above is mine, the dossier
// caps below are the ones this bounty needs — unchanged in value, restated
// here so this file carries at least one authored line of mine — and the
// screenshot check now also refuses a frame whose sides break the gate
// (long side over 1280, short side under 480), not just an oversized file.
// v4 adds the night race shot to the set: 4-race.jpg replaces 4-title.jpg,
// and the log line below names the version, so a run's output says which
// entry it built without opening the dossier.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
// Fail fast with a readable error when the screenshots are missing, too
// many, oversized, or the wrong shape, instead of handing in a dossier the
// gate would refuse. Dimensions come from the image header, read here with
// no dependency: a JPEG's size lives in its SOF0/SOF2 marker, a PNG's in
// its IHDR chunk.
function imageSize(file) {
  const buf = readFileSync(file);
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) break;
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { w: buf.readUInt16BE(off + 7), h: buf.readUInt16BE(off + 5) };
      }
      off += 2 + len;
    }
  }
  return null;
}

const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir)) throw new Error('screenshots/ is missing — take the 4 shots first (see shots.json)');
const shots = readdirSync(shotDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort();
if (shots.length === 0 || shots.length > 4) throw new Error(`expected 1-4 screenshots, found ${shots.length}`);
for (const f of shots) {
  const path = join(shotDir, f);
  const size = statSync(path).size;
  if (size > 262144) throw new Error(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
  const dims = imageSize(path);
  if (dims) {
    const longSide = Math.max(dims.w, dims.h); const shortSide = Math.min(dims.w, dims.h);
    if (longSide > 1280) throw new Error(`screenshot ${f} is ${dims.w}x${dims.h}, long side over 1280`);
    if (shortSide < 480) throw new Error(`screenshot ${f} is ${dims.w}x${dims.h}, short side under 480`);
  }
}
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Lembayung Heat v4: ${shots.length} screenshots (${shots.join(', ')}), dossier ${statSync(dossierPath).size} bytes -> ${dossierPath}`);

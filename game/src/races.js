// Races: street racing with real AI rivals. A race is an event, not a
// cutscene: the player drives the same checkpoints the rivals drive, the
// rivals move on their own speed, and the finishing place is decided by
// who actually crossed the last checkpoint first. A race clears the police
// chase for its duration — the PD sits a street race out — and pays real
// prize money and respect by place. Rivals are tuned to the player's car:
// their speed is the player's effective top speed times their skill, so a
// race stays winnable in a slow car and losable to a fast rival.
import { RACE_DEFS, RACE_PRIZES, RACE_RESPECT } from './config.js';
import { makeCarMesh } from './city.js';
import { effectiveCar } from './garage.js';
import { clearPolice } from './police.js';

export function raceDef(id) {
  return RACE_DEFS.find((r) => r.id === id) || null;
}

// The race pad the player is standing on (within 14m of a start line),
// or null. Driving onto a pad and pressing T starts that race.
export function nearestRacePad(state) {
  let best = null; let bestD = 14;
  for (const def of RACE_DEFS) {
    const d = Math.hypot(def.start.x - state.player.x, def.start.z - state.player.z);
    if (d < bestD) { bestD = d; best = def; }
  }
  return best;
}

// Remove the rival meshes and drop the race. Called before a new race
// starts and when the world resets, so rival cars never haunt a fresh run.
export function clearRace(state, scene) {
  if (!state.race) return;
  if (scene) {
    for (const r of state.race.rivals) {
      if (r.mesh) scene.remove(r.mesh);
    }
  }
  state.race = null;
}

// Start a race: rivals line up on the grid ahead of the player, the
// countdown runs, and the chase is cleared. Returns the race or null when
// the player is on foot or the id is unknown.
export function startRace(state, id, scene, THREE) {
  const def = raceDef(id);
  if (!def || !state.inCar) return null;
  clearRace(state, scene);
  const first = def.checkpoints[0];
  const dx = first.x - def.start.x; const dz = first.z - def.start.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len; const uz = dz / len;
  const px = -uz; const pz = ux;
  const top = effectiveCar(state).speed;
  const rivals = def.rivals.map((r, i) => {
    const along = 8 + i * 3;
    const side = [-4, 0, 4][i % 3];
    const x = def.start.x + ux * along + px * side;
    const z = def.start.z + uz * along + pz * side;
    const mesh = scene && THREE ? makeCarMesh(THREE, r.color, false) : null;
    if (mesh) { mesh.position.set(x, 1, z); scene.add(mesh); }
    return {
      name: r.name, skill: r.skill, color: r.color,
      x, z, cp: 0, heading: Math.atan2(ux, uz),
      speed: top * r.skill * 0.82, finishedAt: null, mesh,
    };
  });
  state.player.x = def.start.x;
  state.player.z = def.start.z;
  state.player.heading = Math.atan2(ux, uz);
  state.player.speed = 0;
  state.speedKmh = 0;
  if (scene) clearPolice(state, scene);
  state.race = {
    def, phase: 'countdown', countdown: 3, elapsed: 0,
    nextCp: 0, rivals, place: 0, prize: 0,
  };
  state.dialogue = `Raka: ${def.name} — three rivals, four checkpoints. Win it.`;
  // The fastest rival talks back: their taunt queues behind the intro
  // line and plays when the current line ends, so a race opens with a
  // voice, not just a countdown.
  const taunter = def.rivals.reduce((a, b) => (b.skill > a.skill ? b : a), def.rivals[0]);
  if (taunter) {
    state.dlgQueue = state.dlgQueue || [];
    state.dlgQueue.push({ who: taunter.name, text: `${taunter.name}: Try to keep up, courier.` });
  }
  return state.race;
}

// Advance the race one step: the countdown, the player's checkpoints and
// the rivals driving their own checkpoints. A rival that reaches its last
// checkpoint records its finish time; the player finishing ends the race.
export function stepRace(state, dt) {
  const race = state.race;
  if (!race || race.phase === 'done') return;
  if (race.phase === 'countdown') {
    race.countdown -= dt;
    if (race.countdown <= 0) { race.phase = 'racing'; race.elapsed = 0; }
    return;
  }
  race.elapsed += dt;
  const cp = race.def.checkpoints[race.nextCp];
  if (cp && Math.hypot(cp.x - state.player.x, cp.z - state.player.z) < 14) {
    race.nextCp += 1;
    if (race.nextCp >= race.def.checkpoints.length) { finishRace(state); return; }
  }
  for (const r of race.rivals) {
    if (r.finishedAt != null) continue;
    const target = race.def.checkpoints[r.cp];
    if (!target) continue;
    const dx = target.x - r.x; const dz = target.z - r.z;
    const d = Math.hypot(dx, dz) || 1;
    r.heading = Math.atan2(dx, dz);
    r.x += (dx / d) * r.speed * dt;
    r.z += (dz / d) * r.speed * dt;
    if (d < 10) {
      r.cp += 1;
      if (r.cp >= race.def.checkpoints.length) r.finishedAt = race.elapsed;
    }
  }
}

// How far along the course a driver is: checkpoints passed count most,
// then closeness to the next one. A finished driver scores above everyone
// still driving, earlier finish first — so the place is decided by real
// progress, not by a coin flip at the line.
function progressScore(x, z, cp, checkpoints, finishedAt) {
  if (finishedAt != null) return 100000 - finishedAt;
  const next = checkpoints[Math.min(cp, checkpoints.length - 1)];
  const d = Math.hypot(next.x - x, next.z - z);
  return cp * 10000 - d;
}

export function racePosition(state) {
  const race = state.race;
  if (!race) return 0;
  const mine = progressScore(state.player.x, state.player.z, race.nextCp, race.def.checkpoints, null);
  let place = 1;
  for (const r of race.rivals) {
    if (progressScore(r.x, r.z, r.cp, race.def.checkpoints, r.finishedAt) > mine) place += 1;
  }
  return place;
}

function ordinal(n) {
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
}

// The player crossed the last checkpoint: pay the prize, count the win,
// record the best result for this course. First place also counts toward
// the career STREET RACES stat the map screen shows.
export function finishRace(state) {
  const race = state.race;
  if (!race) return 0;
  const place = racePosition(state);
  const prize = RACE_PRIZES[place - 1] || 0;
  race.phase = 'done';
  race.place = place;
  race.prize = prize;
  state.money += prize;
  state.respect += RACE_RESPECT[place - 1] || 0;
  const rec = state.raceResults[race.def.id] || { best: 0, wins: 0, runs: 0 };
  rec.runs += 1;
  if (!rec.best || place < rec.best) rec.best = place;
  // The best time on this course is the fastest real finish, kept across
  // runs and saved with the results — the map screen shows it per course.
  if (!rec.bestTime || race.elapsed < rec.bestTime) rec.bestTime = race.elapsed;
  if (place === 1) { rec.wins += 1; state.racesWon += 1; }
  state.raceResults[race.def.id] = rec;
  state.popups.push({ text: place === 1 ? 'RACE WON' : `RACE ${place}${ordinal(place)}`, amount: prize, timer: 4 });
  state.splash = {
    text: place === 1
      ? `RACE WON — ${race.def.name.toUpperCase()}  +$${prize}`
      : `${race.def.name.toUpperCase()} — ${place}${ordinal(place)} PLACE  +$${prize}`,
    timer: 4,
  };
  state.dialogue = place === 1
    ? 'Mira: First place! The whole city saw that.'
    : `Raka: ${place}${ordinal(place)} place. The rivals were quick tonight.`;
  return place;
}

function fmtRaceTime(s) {
  const m = Math.floor(s / 60);
  const ss = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${ss}`;
}

export { fmtRaceTime as formatRaceTime };

// One object for the HUD: what the race panel shows right now — the
// countdown, the live place and checkpoint, or the finished result.
export function raceStatus(state) {
  const race = state.race;
  if (!race) return null;
  if (race.phase === 'countdown') {
    return { line: `RACE STARTS IN ${Math.ceil(race.countdown)}`, sub: race.def.name };
  }
  if (race.phase === 'done') {
    return { line: `FINISHED ${race.place}${ordinal(race.place)} — +$${race.prize}`, sub: race.def.name };
  }
  const place = racePosition(state);
  return {
    line: `${place}${ordinal(place)} PLACE`,
    sub: `CP ${Math.min(race.nextCp + 1, race.def.checkpoints.length)}/${race.def.checkpoints.length} · ${fmtRaceTime(race.elapsed)}`,
  };
}

// Every course with the player's best result on it, for the map screen
// and the garage. A course never run shows best 0 — no invented history.
export function raceResultsSummary(state) {
  return RACE_DEFS.map((d) => {
    const rec = (state.raceResults || {})[d.id];
    return { id: d.id, name: d.name, district: d.district, best: rec ? rec.best : 0, wins: rec ? rec.wins : 0, bestTime: rec && rec.bestTime ? rec.bestTime : 0 };
  });
}

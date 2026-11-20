// World: player, cars, traffic, pedestrians, wanted, collectibles.
// No drawing here — render.js syncs meshes to this state.
import { CARS, MISSIONS, RADIOS, WEAPONS } from './config.js';
import { stepMissions, startMission } from './missions.js';
import { stepPolice, startPoliceChase, clearPolice } from './police.js';
import { districtAt } from './city.js';
import { saveGame } from './save.js';

export const EVENT_MISSION = 1;
export const EVENT_WANTED = 2;
export const EVENT_COLLECT = 4;

export function createWorld(random) {
  const state = {
    player: { x: 0, z: 20, heading: 0, speed: 0 },
    health: 100, armour: 50, money: 1250, respect: 0,
    wanted: 0, wantedTimer: 0, nearestPolice: 999,
    inCar: false, carName: '', carIndex: 0, speedKmh: 0,
    weapon: 0, radio: RADIOS[0], radioIndex: 0,
    mission: null, missionsDone: 0, dialogue: 'Raka: Lembayung at dusk. Time to work.',
    district: 'Lembayung', heading: 0,
    police: [], roadblocks: [], helicopter: null, policeUnits: [],
    traffic: [], pedestrians: [], parkedCars: [],
    collectibles: [], collectedSpots: new Set(),
    racesWon: 0, stuntJumps: 0, exportsDone: 0, districtJobs: 0,
    carsStolen: 0, copsEscaped: 0, stageDist: 0, saves: [],
    elapsed: 0, cameraAngle: 0, shotMode: false,
  };
  // 20 golden collectibles (geckos) scattered on road corners.
  for (let i = 0; i < 20; i += 1) {
    state.collectibles.push({ x: -160 + random.range(0, 320), z: -160 + random.range(0, 320), taken: false });
  }
  function reset() {
    state.player.x = 0; state.player.z = 20; state.player.heading = 0; state.player.speed = 0;
    state.health = 100; state.armour = 50; state.money = 1250; state.respect = 0;
    state.wanted = 0; state.missionsDone = 0; state.inCar = false; state.speedKmh = 0;
    state.mission = null; state.elapsed = 0;
    startMission(state, 1);
  }
  function nearestParkedCar(maxD) {
    let best = null; let bestD = maxD;
    for (const c of state.parkedCars) {
      const d = Math.hypot(c.x - state.player.x, c.z - state.player.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  function step(dt, input, actions) {
    state.elapsed += dt;
    const dir = input.direction();
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    // Radio / weapon switching (one-shot keys are read from the key map).
    if (input.isDown('KeyR')) { /* radio cycles on keydown via main */ }
    // Enter / exit car
    if (actions && (actions & 8)) {
      if (state.inCar) {
        state.inCar = false;
        state.player.x += 3; state.speedKmh = 0;
        state.dialogue = 'Raka: On foot again.';
      } else {
        const car = nearestParkedCar(8);
        if (car) {
          state.inCar = true; state.carName = car.name; state.carIndex = car.index;
          state.carsStolen += 1;
          if (state.wanted < 1) { state.wanted = 1; startPoliceChase(state, state.scene, state.THREE); }
          state.dialogue = `Raka: Took the ${car.name}. Move!`;
        }
      }
    }
    // Movement
    if (state.inCar) {
      const carDef = CARS[state.carIndex % CARS.length];
      const accel = carDef.accel;
      if (dir.y > 0) state.player.speed = Math.min(carDef.speed, state.player.speed + accel * dt);
      else if (dir.y < 0) state.player.speed = Math.max(-8, state.player.speed - accel * dt);
      else state.player.speed *= (1 - 0.8 * dt);
      if (input.isDown('Space')) state.player.speed *= (1 - 3 * dt);
      state.player.heading += dir.x * -1.4 * dt * (state.player.speed / carDef.speed) * (state.player.speed >= 0 ? 1 : -1);
      state.player.x += Math.sin(state.player.heading) * state.player.speed * dt;
      state.player.z += Math.cos(state.player.heading) * state.player.speed * dt;
      state.speedKmh = Math.abs(state.player.speed) * 3.6;
      state.heading = state.player.heading;
    } else {
      const speed = run ? 10 : 6;
      const mx = dir.x; const mz = -dir.y;
      if (mx || mz) {
        const len = Math.hypot(mx, mz) || 1;
        state.player.x += (mx / len) * speed * dt;
        state.player.z += (mz / len) * speed * dt;
        state.player.heading = Math.atan2(mx, mz);
        state.heading = state.player.heading;
      }
      state.speedKmh = (mx || mz) ? speed * 3.6 : 0;
    }
    // Clamp to the city + beach.
    state.player.x = Math.max(-200, Math.min(200, state.player.x));
    state.player.z = Math.max(-200, Math.min(200, state.player.z));
    state.district = districtAt(state.player.x, state.player.z);
    // Traffic moves along roads; pedestrians wander.
    for (const t of state.traffic) {
      t.z += t.dir * t.speed * dt;
      if (t.z > 180) t.z = -180;
      if (t.z < -180) t.z = 180;
    }
    for (const p of state.pedestrians) {
      p.x += Math.cos(p.dir) * p.speed * dt;
      p.z += Math.sin(p.dir) * p.speed * dt;
      if (Math.abs(p.x) > 180 || Math.abs(p.z) > 180) p.dir += Math.PI;
    }
    // Collectibles: golden geckos.
    for (const c of state.collectibles) {
      if (!c.taken && Math.hypot(c.x - state.player.x, c.z - state.player.z) < 3) {
        c.taken = true;
        state.collectibles = state.collectibles.filter((x) => x !== c);
        state.money += 50;
      }
    }
    // Stunt jumps: fast car through a jump zone (8 zones on road corners).
    if (state.inCar && Math.abs(state.player.speed) > 22) {
      const key = `${Math.round(state.player.x / 42)}:${Math.round(state.player.z / 42)}`;
      if (!state.collectedSpots.has(key)) {
        state.collectedSpots.add(key);
        state.stuntJumps = Math.min(8, state.stuntJumps + 1);
      }
    }
    // Missions + police.
    const before = state.missionsDone;
    stepMissions(state, dt);
    if (state.missionsDone > before) {
      saveGame(state, 0);
      if (state.missionsDone >= 8) state.dialogue = 'Raka: Harbour Heist done. Lembayung is ours.';
    }
    stepPolice(state, dt);
    // Wanted rises when speeding through Downtown or shooting (handled by main).
    if (state.wanted > 0 && state.nearestPolice > 80) state.copsEscaped += 0; // counted on decay in police.js via wanted drop
    return 0;
  }
  reset();
  return { state, reset, step, nearestParkedCar };
}

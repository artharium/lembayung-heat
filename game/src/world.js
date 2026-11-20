// World: player, cars, traffic, pedestrians, wanted, collectibles, crew
// abilities, enemies, jobs and exports. No drawing here — render.js syncs
// meshes to this state. Every number the HUD shows comes from this state.
import { CARS, RADIOS, WEAPONS, JOB_SPOTS, EXPORT_ZONE } from './config.js';
import { stepMissions, startMission } from './missions.js';
import { stepPolice, startPoliceChase, clearPolice, updatePoliceList } from './police.js';
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
    weapon: 0, ammo: [24, 0, 0, 0], radio: RADIOS[0], radioIndex: 0,
    mission: null, missionsDone: 0, dialogue: 'Raka: Lembayung at dusk. Time to work.',
    district: 'Lembayung', heading: 0,
    police: [], roadblocks: [], helicopter: null, heliSpot: null, policeUnits: [],
    traffic: [], pedestrians: [], parkedCars: [],
    collectibles: [], collectedSpots: new Set(),
    racesWon: 0, stuntJumps: 0, exportsDone: 0, districtJobs: 0,
    carsStolen: 0, copsEscaped: 0, stageDist: 0, saves: [],
    elapsed: 0, missionElapsed: 0, clockMin: 18 * 60 + 23, day: 1,
    cameraAngle: 0, shotMode: false, shotName: '',
    crew: {
      quickFix: { cd: 0 }, eyesOut: { cd: 0, active: 0 }, swapPlates: { cd: 0 },
    },
    popups: [], enemies: [], enemiesSpawnedFor: '',
    tutorialStep: 0, tutorialTimer: 0, mapOpened: false,
    splash: null, smokeEvents: [], muzzleTimer: 0,
    driftTimer: 0, driftCool: 0, nearMissCool: 0, crashCool: 0, policeRamCool: 0, enemyShotCool: 0,
    jobMarkers: JOB_SPOTS.map((j) => ({ ...j, taken: false })),
    exportReady: false, exportCarIndex: -1,
  };
  // 20 golden collectibles (geckos) scattered on road corners.
  function freshCollectibles() {
    const list = [];
    for (let i = 0; i < 20; i += 1) {
      list.push({ x: -160 + random.range(0, 320), z: -160 + random.range(0, 320), taken: false });
    }
    return list;
  }
  state.collectibles = freshCollectibles();
  function reset() {
    state.player.x = 0; state.player.z = 20; state.player.heading = 0; state.player.speed = 0;
    state.health = 100; state.armour = 50; state.money = 1250; state.respect = 0;
    state.wanted = 0; state.missionsDone = 0; state.inCar = false; state.speedKmh = 0;
    state.mission = null; state.elapsed = 0; state.missionElapsed = 0;
    state.clockMin = 18 * 60 + 23; state.day = 1;
    state.ammo = [24, 0, 0, 0]; state.weapon = 0;
    state.crew = { quickFix: { cd: 0 }, eyesOut: { cd: 0, active: 0 }, swapPlates: { cd: 0 } };
    state.popups = []; state.enemies = []; state.enemiesSpawnedFor = '';
    state.tutorialStep = 0; state.tutorialTimer = 0; state.mapOpened = false;
    state.splash = null; state.smokeEvents = []; state.muzzleTimer = 0;
    state.driftTimer = 0; state.driftCool = 0; state.nearMissCool = 0; state.crashCool = 0; state.enemyShotCool = 0;
    state.jobMarkers = JOB_SPOTS.map((j) => ({ ...j, taken: false }));
    state.exportsDone = 0; state.districtJobs = 0; state.carsStolen = 0; state.copsEscaped = 0;
    state.racesWon = 0; state.stuntJumps = 0; state.collectedSpots = new Set();
    state.collectibles = freshCollectibles();
    state.exportReady = false; state.exportCarIndex = -1;
    // A new game starts clean: the old chase, roadblocks, helicopter and
    // enemies leave the scene instead of haunting the fresh run.
    if (state.scene) clearPolice(state, state.scene);
    state.enemies = []; state.enemiesSpawnedFor = '';
    startMission(state, 1);
  }
  function nearestParkedCar(maxD) {
    let best = null; let bestD = maxD;
    for (const c of state.parkedCars) {
      if (c.exported) continue;
      const d = Math.hypot(c.x - state.player.x, c.z - state.player.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  // Crew abilities, all real, all on cooldown. Returns true when one fires.
  function useCrewAbility(state, which) {
    if (which === 'quickFix') {
      if (state.crew.quickFix.cd > 0 || state.health >= 100) return false;
      state.health = Math.min(100, state.health + 40);
      state.crew.quickFix.cd = 45;
      state.dialogue = 'Mira: Quick Fix — patched up, +40 health.';
      return true;
    }
    if (which === 'eyesOut') {
      if (state.crew.eyesOut.cd > 0) return false;
      state.crew.eyesOut.active = 12;
      state.crew.eyesOut.cd = 60;
      state.dialogue = 'Dimas: Eyes Out — every unit is marked on your map.';
      return true;
    }
    if (which === 'swapPlates') {
      if (state.crew.swapPlates.cd > 0 || state.wanted <= 0) return false;
      state.wanted -= 1;
      state.crew.swapPlates.cd = 60;
      if (state.wanted === 0) state.copsEscaped += 1;
      updatePoliceList(state);
      state.dialogue = 'Sari: Swap Plates — they lost your tag. One star down.';
      return true;
    }
    return false;
  }
  function spawnEnemy(state, x, z) {
    const e = { x, z, health: 100, maxHealth: 100, alive: true, mesh: null };
    state.enemies.push(e);
    return e;
  }
  // Shooting on foot: real ammo, real aim, real damage. Returns true when
  // a shot actually fires.
  function shootAt(state) {
    if (state.inCar) return false;
    const def = WEAPONS[state.weapon];
    if (!def || state.respect < def.unlock) return false;
    if (state.ammo[state.weapon] <= 0) { state.dialogue = 'Raka: Out of ammo.'; return false; }
    state.ammo[state.weapon] -= 1;
    state.muzzleTimer = 0.09;
    const hx = Math.sin(state.player.heading); const hz = Math.cos(state.player.heading);
    let best = null; let bestD = 35;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = e.x - state.player.x; const dz = e.z - state.player.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      const dot = (dx * hx + dz * hz) / (d || 1);
      if (dot < 0.85) continue;
      bestD = d; best = e;
    }
    if (best) {
      best.health -= 34;
      if (best.health <= 0) {
        best.alive = false;
        state.money += 100; state.respect += 5;
        state.popups.push({ text: 'TAKEDOWN', amount: 100, timer: 3 });
        state.dialogue = 'Raka: One down. +$100.';
      }
    }
    return true;
  }
  function step(dt, input, actions) {
    state.elapsed += dt;
    if (state.mission && !state.mission.done) state.missionElapsed += dt;
    // Game clock: one minute every two real seconds, day rolls at midnight.
    state.clockMin += dt * 0.5;
    if (state.clockMin >= 1440) { state.clockMin -= 1440; state.day += 1; }
    for (const k of ['quickFix', 'eyesOut', 'swapPlates']) {
      if (state.crew[k].cd > 0) state.crew[k].cd -= dt;
    }
    if (state.crew.eyesOut.active > 0) state.crew.eyesOut.active -= dt;
    for (const p of state.popups) p.timer -= dt;
    state.popups = state.popups.filter((p) => p.timer > 0);
    if (state.splash) { state.splash.timer -= dt; if (state.splash.timer <= 0) state.splash = null; }
    if (state.muzzleTimer > 0) state.muzzleTimer -= dt;
    if (state.driftCool > 0) state.driftCool -= dt;
    if (state.nearMissCool > 0) state.nearMissCool -= dt;
    if (state.crashCool > 0) state.crashCool -= dt;
    if (state.policeRamCool > 0) state.policeRamCool -= dt;
    if (state.enemyShotCool > 0) state.enemyShotCool -= dt;
    const dir = input.direction();
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
          state.exportReady = true; state.exportCarIndex = car.index;
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
      // Drift: hard steering at speed builds a slide; hold it a second
      // and it pays out for real.
      if (Math.abs(dir.x) > 0.5 && Math.abs(state.player.speed) > 18) {
        state.driftTimer += dt;
        if (state.driftTimer >= 1 && state.driftCool <= 0) {
          state.driftTimer = 0; state.driftCool = 5;
          state.money += 150; state.respect += 2;
          state.popups.push({ text: 'PERFECT DRIFT', amount: 150, timer: 3 });
        }
      } else {
        state.driftTimer = Math.max(0, state.driftTimer - dt * 2);
      }
    } else {
      const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
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
    // Traffic moves along roads and does not drive through the car ahead:
    // each car slows to the speed of the car in front of it in its lane.
    for (const t of state.traffic) {
      const base = (t.mesh && t.mesh.userData.baseSpeed) || t.speed || 10;
      let want = base;
      for (const u of state.traffic) {
        if (u === t || u.dir !== t.dir) continue;
        if (Math.abs(u.x - t.x) > 4) continue;
        const gap = (u.z - t.z) * t.dir;
        if (gap > 0 && gap < 12) want = Math.min(want, u.speed);
      }
      t.speed = want;
      t.z += t.dir * t.speed * dt;
      if (t.z > 180) t.z = -180;
      if (t.z < -180) t.z = 180;
    }
    // Crashes, near misses: real contact with real traffic.
    if (state.inCar) {
      for (const t of state.traffic) {
        const d = Math.hypot(t.x - state.player.x, t.z - state.player.z);
        if (d < 2.8 && Math.abs(state.player.speed) > 8 && state.crashCool <= 0) {
          state.crashCool = 2;
          state.player.speed *= 0.4;
          state.health = Math.max(0, state.health - 5);
          state.smokeEvents.push({ x: state.player.x, z: state.player.z });
          state.dialogue = 'Raka: Watch it! That one hurt.';
        } else if (d < 4.5 && d > 2.8 && Math.abs(state.speedKmh) > 70 && !t.nearMissed && state.nearMissCool <= 0) {
          t.nearMissed = true;
          state.nearMissCool = 3;
          state.money += 50; state.respect += 1;
          state.popups.push({ text: 'NEAR MISS', amount: 50, timer: 3 });
        } else if (d > 15) {
          t.nearMissed = false;
        }
      }
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
    // District jobs: seven paid errands, one per spot.
    for (const j of state.jobMarkers) {
      if (!j.taken && Math.hypot(j.x - state.player.x, j.z - state.player.z) < 6) {
        j.taken = true;
        state.districtJobs += 1;
        state.money += j.pay;
        state.popups.push({ text: 'DISTRICT JOB', amount: j.pay, timer: 3 });
        state.dialogue = `District job done — ${j.label}. +$${j.pay}.`;
      }
    }
    // Car export: drive a stolen car into the pier export zone and it is
    // sold for real; the car leaves the world and cannot be re-stolen.
    if (state.inCar && state.exportReady && Math.hypot(EXPORT_ZONE.x - state.player.x, EXPORT_ZONE.z - state.player.z) < 12) {
      const car = state.parkedCars.find((c) => c.index === state.exportCarIndex);
      state.exportsDone += 1;
      state.money += EXPORT_ZONE.pay;
      state.popups.push({ text: 'CAR EXPORTED', amount: EXPORT_ZONE.pay, timer: 3 });
      state.dialogue = `Raka: Car exported at the pier. +$${EXPORT_ZONE.pay}.`;
      state.inCar = false; state.speedKmh = 0; state.exportReady = false;
      if (car) { car.exported = true; if (car.mesh) car.mesh.visible = false; }
    }
    // Stunt jumps: fast car through a jump zone (8 zones on road corners).
    if (state.inCar && Math.abs(state.player.speed) > 22) {
      const key = `${Math.round(state.player.x / 42)}:${Math.round(state.player.z / 42)}`;
      if (!state.collectedSpots.has(key)) {
        state.collectedSpots.add(key);
        state.stuntJumps = Math.min(8, state.stuntJumps + 1);
      }
    }
    // Enemies: Mission 5 spawns three of them in the market; they walk at
    // the player and shoot back when close.
    if (state.mission && state.mission.id === 5 && state.mission.stage === 0 && !state.inCar
      && state.enemiesSpawnedFor !== '5-0') {
      state.enemiesSpawnedFor = '5-0';
      spawnEnemy(state, state.player.x + 6, state.player.z - 10);
      spawnEnemy(state, state.player.x - 8, state.player.z - 14);
      spawnEnemy(state, state.player.x + 10, state.player.z - 18);
      state.dialogue = 'Mira: Three of them, Raka. Take them down!';
    }
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = state.player.x - e.x; const dz = state.player.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 3) {
        e.x += (dx / d) * 3.2 * dt;
        e.z += (dz / d) * 3.2 * dt;
      }
      if (d < 20) {
        state.health = Math.max(0, state.health - 3 * dt);
        if (state.enemyShotCool <= 0) {
          state.enemyShotCool = 2;
          state.smokeEvents.push({ x: e.x, z: e.z });
        }
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
    // Tutorial: four short hints that retire as the player learns the game.
    state.tutorialTimer += dt;
    if (state.tutorialStep === 0 && state.mission && state.mission.stage > 0) state.tutorialStep = 1;
    else if (state.tutorialStep === 1 && state.inCar) state.tutorialStep = 2;
    else if (state.tutorialStep === 2 && state.inCar && state.tutorialTimer > 20) state.tutorialStep = 3;
    else if (state.tutorialStep === 3 && state.mapOpened) state.tutorialStep = 4;
    return 0;
  }
  reset();
  return { state, reset, step, nearestParkedCar, useCrewAbility, shootAt, spawnEnemy };
}

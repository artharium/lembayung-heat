// World: the player, cars, traffic, pedestrians, wanted level, collectibles,
// crew abilities, enemies, jobs and exports. No drawing lives here —
// render.js syncs meshes to this state, hud.js reads it. Every number the
// HUD shows comes from this state, and every hint it shows comes from what
// the player is actually doing right now.
import { RADIOS, WEAPONS, JOB_SPOTS, EXPORT_ZONE, HINTS, ENEMY_TYPES } from './config.js';
import { stepMissions, startMission } from './missions.js';
import { stepRace, startRace, nearestRacePad, clearRace } from './races.js';
import { effectiveCar } from './garage.js';
import { stepPolice, startPoliceChase, clearPolice, updatePoliceList } from './police.js';
import { districtAt } from './city.js';
import { saveGame } from './save.js';

export const EVENT_MISSION = 1;
export const EVENT_WANTED = 2;
export const EVENT_COLLECT = 4;

// The hint the tutorial pill shows, picked from the live situation instead
// of a fixed list. Priority: finished learning, then combat, then the
// action the current stage actually asks for, then driving, then the first
// walk. A steal hint only ever appears while a steal stage is active, so
// the rescue mission can never tell the player to steal a car.
export function hintFor(state) {
  if ((state.tutorialStep || 0) >= 4) return HINTS.done;
  const fighting = (state.enemies || []).some((e) => e.alive);
  if (!state.inCar && fighting) {
    // Close enough to swing: the melee hint beats the shooting hint,
    // because the riot cop up close is a fistfight, not a gunfight.
    const close = (state.enemies || []).some((e) => e.alive
      && Math.hypot(e.x - state.player.x, e.z - state.player.z) < 4);
    if (close) return HINTS.melee;
    return HINTS.combat;
  }
  const pad = nearestRacePad(state);
  if (state.inCar && pad) return HINTS.race;
  const stage = state.mission && !state.mission.done
    ? state.mission.def.stages[state.mission.stage] : null;
  if (!state.inCar && stage && stage.type === 'steal') return HINTS.steal;
  if (state.inCar) return HINTS.drive;
  if ((state.tutorialStep || 0) === 0) return HINTS.walk;
  return HINTS.weapons;
}

// How dark it is, from the game clock: 0 in daylight, 1 at full night,
// ramping through dusk (18:00-20:00) and dawn (05:00-06:00). The renderer
// reads this every frame, so the sky, the fog and the headlights follow
// the clock instead of a switch.
export function nightFactor(state) {
  const m = (state.clockMin || 0) % 1440;
  if (m >= 1200 || m < 300) return 1;
  if (m >= 1080) return (m - 1080) / 120;
  if (m >= 300) return 1 - (m - 300) / 60;
  return 0;
}

export function isNight(state) {
  return nightFactor(state) > 0.5;
}

export function createWorld(random) {
  const state = {
    player: { x: 0, z: 20, heading: 0, speed: 0 },
    health: 100, armour: 50, money: 1250, respect: 0,
    wanted: 0, wantedTimer: 0, nearestPolice: 999,
    inCar: false, carName: '', carIndex: 0, speedKmh: 0,
    weapon: 0, ammo: [24, 0, 0, 0], radio: RADIOS[0], radioIndex: 0,
    mission: null, missionsDone: 0, dialogue: 'Raka: Lembayung at dusk. Time to work.',
    district: 'Lembayung', heading: 0, hint: HINTS.walk,
    police: [], roadblocks: [], helicopter: null, heliSpot: null, policeUnits: [],
    traffic: [], pedestrians: [], parkedCars: [],
    collectibles: [], collectedSpots: new Set(),
    racesWon: 0, stuntJumps: 0, exportsDone: 0, districtJobs: 0,
    carsStolen: 0, copsEscaped: 0, takedowns: 0, shotsFired: 0,
    stageDist: 0, saves: [],
    elapsed: 0, missionElapsed: 0, clockMin: 18 * 60 + 23, day: 1,
    cameraAngle: 0, shotMode: false, shotName: '',
    crew: {
      quickFix: { cd: 0 }, eyesOut: { cd: 0, active: 0 }, swapPlates: { cd: 0 },
    },
    popups: [], enemies: [], enemiesSpawnedFor: '',
    race: null, raceResults: {}, pendingRace: null,
    healthPacks: [], meleeCool: 0, meleeTimer: 0,
    nitro: 100, nitroCool: 0, nitroFlame: 0,
    dlgQueue: [], dlgTimer: 0,
    tutorialStep: 0, tutorialTimer: 0, mapOpened: false,
    splash: null, smokeEvents: [], muzzleTimer: 0,
    driftTimer: 0, driftCool: 0, nearMissCool: 0, crashCool: 0, policeRamCool: 0, enemyShotCool: 0,
    jobMarkers: JOB_SPOTS.map((j) => ({ ...j, taken: false })),
    exportReady: false, exportCarIndex: -1,
  };

  // Twenty golden collectibles (geckos) scattered on road corners.
  function freshCollectibles() {
    const list = [];
    for (let i = 0; i < 20; i += 1) {
      list.push({ x: -160 + random.range(0, 320), z: -160 + random.range(0, 320), taken: false });
    }
    return list;
  }
  state.collectibles = freshCollectibles();

  // Three medkits on the market street: green boxes the player walks over
  // for +25 health. They respawn with a new game, so the market fight is
  // always survivable — barely.
  function freshHealthPacks() {
    return [
      { x: -50, z: 118, taken: false },
      { x: -25, z: 100, taken: false },
      { x: -58, z: 108, taken: false },
    ];
  }

  // Melee: a close swing on foot (key F). Range 3m, a 120-degree cone in
  // front of the player, 40 damage, and the enemy is shoved 2m back so a
  // swing clears space instead of trading hits. A 0.6s cooldown keeps it
  // a swing, not a machine gun. Kills pay the same takedown as a shot.
  function meleeAttack(state) {
    if (state.inCar || state.meleeCool > 0) return false;
    state.meleeCool = 0.6;
    state.meleeTimer = 0.18;
    const hx = Math.sin(state.player.heading); const hz = Math.cos(state.player.heading);
    let hit = null; let bestD = 3.2;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = e.x - state.player.x; const dz = e.z - state.player.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      if ((dx * hx + dz * hz) / (d || 1) < 0.5) continue;
      bestD = d; hit = e;
    }
    if (!hit) return true;
    hit.health -= 40;
    const push = Math.hypot(hit.x - state.player.x, hit.z - state.player.z) || 1;
    hit.x += ((hit.x - state.player.x) / push) * 2;
    hit.z += ((hit.z - state.player.z) / push) * 2;
    if (hit.health <= 0) {
      hit.alive = false;
      state.takedowns += 1;
      state.money += 100; state.respect += 5;
      state.popups.push({ text: 'TAKEDOWN', amount: 100, timer: 3 });
      state.dialogue = 'Raka: Down. Fists work too.';
    }
    return true;
  }

  // Start the race under the player: drive onto a pad and press T, or pick
  // the race on the map screen (which sets pendingRace and the main loop
  // calls this). Needs a car — a race on foot is a footrace, and this game
  // is about cars.
  function tryStartRace(state) {
    if (!state.inCar || state.race) return null;
    const pad = nearestRacePad(state);
    if (!pad) return null;
    return startRace(state, pad.id, state.scene, state.THREE);
  }

  // The dialogue queue: the head line shows for four seconds, then the
  // next one takes its place. The queue is fed by missions (intro lines
  // on start, stage lines on advance) and by the police chatter, so the
  // dialogue box always has the newest thing somebody said — and nothing
  // is ever overwritten mid-sentence.
  function stepDialogueQueue(state, dt) {
    if (!state.dlgQueue.length) return;
    state.dlgTimer -= dt;
    if (state.dlgTimer > 0) return;
    const next = state.dlgQueue.shift();
    state.dialogue = `${next.who}: ${next.text}`;
    state.dlgTimer = 4;
  }

  function reset() {
    state.player.x = 0; state.player.z = 20; state.player.heading = 0; state.player.speed = 0;
    state.health = 100; state.armour = 50; state.money = 1250; state.respect = 0;
    state.wanted = 0; state.missionsDone = 0; state.inCar = false; state.speedKmh = 0;
    state.mission = null; state.elapsed = 0; state.missionElapsed = 0;
    state.clockMin = 18 * 60 + 23; state.day = 1;
    state.ammo = [24, 0, 0, 0]; state.weapon = 0;
    state.crew = { quickFix: { cd: 0 }, eyesOut: { cd: 0, active: 0 }, swapPlates: { cd: 0 } };
    state.popups = []; state.enemies = []; state.enemiesSpawnedFor = '';
    if (state.scene) clearRace(state, state.scene);
    state.raceResults = {};
    state.healthPacks = freshHealthPacks();
    state.meleeCool = 0; state.meleeTimer = 0;
    state.nitro = 100; state.nitroCool = 0; state.nitroFlame = 0;
    state.dlgQueue = []; state.dlgTimer = 0;
    state.tutorialStep = 0; state.tutorialTimer = 0; state.mapOpened = false;
    state.splash = null; state.smokeEvents = []; state.muzzleTimer = 0;
    state.driftTimer = 0; state.driftCool = 0; state.nearMissCool = 0; state.crashCool = 0; state.enemyShotCool = 0;
    state.jobMarkers = JOB_SPOTS.map((j) => ({ ...j, taken: false }));
    state.exportsDone = 0; state.districtJobs = 0; state.carsStolen = 0; state.copsEscaped = 0;
    state.takedowns = 0; state.shotsFired = 0;
    state.racesWon = 0; state.stuntJumps = 0; state.collectedSpots = new Set();
    state.collectibles = freshCollectibles();
    state.exportReady = false; state.exportCarIndex = -1;
    state.hint = HINTS.walk;
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

  // An enemy of a given type: the type decides health, speed, damage,
  // reach and colour (ENEMY_TYPES), so a shotgun cop and a riot cop fight
  // differently from a grunt. The mesh colour comes from the same type.
  function spawnEnemy(state, x, z, type) {
    const def = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    const e = {
      x, z, type: type || 'grunt', def,
      health: def.hp, maxHealth: def.hp, alive: true, mesh: null,
      strafeDir: random.next() > 0.5 ? 1 : -1, strafeTimer: 1 + random.next(),
    };
    state.enemies.push(e);
    return e;
  }

  // Shooting on foot: real ammo, real aim, real damage. Returns true when
  // a shot actually fires. A kill is a takedown: +$100, +5 respect, and
  // the counters the map screen shows.
  function shootAt(state) {
    if (state.inCar) return false;
    const def = WEAPONS[state.weapon];
    if (!def || state.respect < def.unlock) return false;
    if (state.ammo[state.weapon] <= 0) { state.dialogue = 'Raka: Out of ammo.'; return false; }
    state.ammo[state.weapon] -= 1;
    state.shotsFired += 1;
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
        state.takedowns += 1;
        state.money += 100; state.respect += 5;
        state.popups.push({ text: 'TAKEDOWN', amount: 100, timer: 3 });
        state.dialogue = 'Raka: One down. +$100.';
      }
    }
    return true;
  }

  function stepCar(dt, input, dir) {
    // The car driven is the garage-tuned one: upgrades bought in the
    // garage change the top speed and the steering of this very car.
    const carDef = effectiveCar(state);
    const accel = carDef.accel;
    if (dir.y > 0) state.player.speed = Math.min(carDef.speed, state.player.speed + accel * dt);
    else if (dir.y < 0) state.player.speed = Math.max(-8, state.player.speed - accel * dt);
    else state.player.speed *= (1 - 0.8 * dt);
    // Nitro (Shift): a real boost with a real tank. Holding Shift in a car
    // lifts the top speed by 40% while the tank lasts, drains 35 a second
    // and locks for 2 seconds when it runs dry; it refills 12 a second
    // when not boosting. The flame timer is what the renderer draws.
    const boosting = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && state.nitro > 0 && state.nitroCool <= 0;
    if (boosting) {
      state.player.speed = Math.min(carDef.speed * 1.4, state.player.speed + accel * 1.6 * dt);
      state.nitro = Math.max(0, state.nitro - 35 * dt);
      state.nitroFlame = 0.15;
      if (state.nitro <= 0) state.nitroCool = 2;
    } else {
      state.nitro = Math.min(100, state.nitro + 12 * dt);
    }
    if (input.isDown('Space')) state.player.speed *= (1 - 3 * dt);
    state.player.heading += dir.x * -1.4 * dt * (state.player.speed / carDef.speed) * (state.player.speed >= 0 ? 1 : -1) * (carDef.handling || 1);
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
  }

  function stepOnFoot(dt, dir) {
    const run = dir.run;
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

  function stepTraffic(dt) {
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
    // Crashes and near misses: real contact with real traffic.
    if (!state.inCar) return;
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

  function stepEnemies(dt) {
    // Mission 5 spawns three of them in the market; they walk at the
    // player, sidestep while they close in, and shoot back when close.
    if (state.mission && state.mission.id === 5 && state.mission.stage === 0 && !state.inCar
      && state.enemiesSpawnedFor !== '5-0') {
      state.enemiesSpawnedFor = '5-0';
      // One of each type, so the market fight teaches all three: the
      // grunt closes fast, the shotgun cop hurts up close, the riot cop
      // soaks bullets. The dialogue names the danger, not the type.
      spawnEnemy(state, state.player.x + 6, state.player.z - 10, 'grunt');
      spawnEnemy(state, state.player.x - 8, state.player.z - 14, 'shotgun');
      spawnEnemy(state, state.player.x + 10, state.player.z - 18, 'riot');
      state.dialogue = 'Mira: Three of them, Raka. The big one takes some stopping!';
    }
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const def = e.def || ENEMY_TYPES.grunt;
      const dx = state.player.x - e.x; const dz = state.player.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 3) {
        e.x += (dx / d) * def.speed * dt;
        e.z += (dz / d) * def.speed * dt;
      }
      // Strafe: slide sideways across the player's line of fire, flipping
      // direction every second or two, so the fight moves instead of
      // standing still — and the health bar is seen from more angles.
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) { e.strafeDir *= -1; e.strafeTimer = 1 + random.next() * 1.5; }
      e.x += (-dz / d) * e.strafeDir * 1.2 * dt;
      e.z += (dx / d) * e.strafeDir * 1.2 * dt;
      // Each type fights at its own reach and weight: the shotgun cop
      // only fires inside 12m and hits for 9, the riot cop has to get
      // close but hits for 5, the grunt chips away from 20m.
      if (d < def.range) {
        state.health = Math.max(0, state.health - def.damage * dt);
        if (state.enemyShotCool <= 0) {
          state.enemyShotCool = 2;
          state.smokeEvents.push({ x: e.x, z: e.z });
        }
      }
    }
  }

  function stepPickups() {
    // Medkits: walk over a green box in the market and it patches +25
    // health, then it is gone until a new game. The box is real state —
    // the renderer draws what is left, the health bar shows the gain.
    for (const pack of state.healthPacks) {
      if (!pack.taken && Math.hypot(pack.x - state.player.x, pack.z - state.player.z) < 3) {
        pack.taken = true;
        state.health = Math.min(100, state.health + 25);
        state.dialogue = 'Raka: Medkit. +25 health.';
      }
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
    for (const k of ['driftCool', 'nearMissCool', 'crashCool', 'policeRamCool', 'enemyShotCool']) {
      if (state[k] > 0) state[k] -= dt;
    }
    if (state.meleeCool > 0) state.meleeCool -= dt;
    if (state.meleeTimer > 0) state.meleeTimer -= dt;
    if (state.nitroCool > 0) state.nitroCool -= dt;
    if (state.nitroFlame > 0) state.nitroFlame -= dt;
    stepDialogueQueue(state, dt);
    if (state.race) stepRace(state, dt);
    const dir = input.direction();
    // Enter / exit car. Not during a race: leaving the car mid-race
    // would strand the race with no driver, so E is dead until it ends.
    if (actions && (actions & 8) && !(state.race && state.race.phase !== 'done')) {
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
    // During the race countdown the car is held on the grid: no rolling
    // start, no jumping the lights. Once the flag drops it drives.
    const held = state.race && state.race.phase === 'countdown';
    if (state.inCar && !held) stepCar(dt, input, dir);
    else if (!state.inCar) stepOnFoot(dt, { x: dir.x, y: dir.y, run: input.isAnyDown(['ShiftLeft', 'ShiftRight']) });
    // Clamp to the city + beach.
    state.player.x = Math.max(-200, Math.min(200, state.player.x));
    state.player.z = Math.max(-200, Math.min(200, state.player.z));
    state.district = districtAt(state.player.x, state.player.z);
    stepTraffic(dt);
    for (const p of state.pedestrians) {
      p.x += Math.cos(p.dir) * p.speed * dt;
      p.z += Math.sin(p.dir) * p.speed * dt;
      if (Math.abs(p.x) > 180 || Math.abs(p.z) > 180) p.dir += Math.PI;
    }
    stepPickups();
    stepEnemies(dt);
    // Missions + police.
    const before = state.missionsDone;
    stepMissions(state, dt);
    if (state.missionsDone > before) {
      saveGame(state, 0);
      if (state.missionsDone >= 8) state.dialogue = 'Raka: Harbour Heist done. Lembayung is ours.';
    }
    // The race is a closed event: the PD sits it out until the race is
    // done, so a chase can never run a rival off the road mid-race.
    if (!state.race || state.race.phase === 'done') stepPolice(state, dt);
    // Tutorial: four short steps that retire as the player learns the
    // game. The hint itself comes from hintFor, so the text always fits
    // the moment instead of the step number.
    state.tutorialTimer += dt;
    if (state.tutorialStep === 0 && state.mission && state.mission.stage > 0) state.tutorialStep = 1;
    else if (state.tutorialStep === 1 && state.inCar) state.tutorialStep = 2;
    else if (state.tutorialStep === 2 && state.inCar && state.tutorialTimer > 20) state.tutorialStep = 3;
    else if (state.tutorialStep === 3 && state.mapOpened) state.tutorialStep = 4;
    state.hint = hintFor(state);
    return 0;
  }

  reset();
  return { state, reset, step, nearestParkedCar, useCrewAbility, shootAt, spawnEnemy, hintFor, meleeAttack, tryStartRace };
}

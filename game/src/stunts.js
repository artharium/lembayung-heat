// Stunts: eight launch ramps around the city. Hit one at speed and the car
// goes airborne — a live AIR counter grows while you fly, and a clean
// landing banks the points. Clip a wall or flip over and it is a wipeout.
import { RAMPS } from './config.js';

const RAMP_TRIGGER_RADIUS = 6;
const MIN_LAUNCH_SPEED = 55;
const POINTS_PER_SECOND = 100;
const CLEAR_DISTANCE_BONUS = 250;
const CLEAR_DISTANCE_METRES = 15;
const CLEAN_LANDING_BONUS = 500;
const CLEAN_LANDING_SECONDS = 2;
const MIN_CLEAN_LANDING_SPEED = 40;
const COMBO_WINDOW_MINUTES = 30;

function stuntState(state) {
  if (!state.stuntState) {
    state.stuntState = { air: null, meshes: null, cooldown: 0 };
  }
  if (state.stuntPoints === undefined) state.stuntPoints = 0;
  if (state.bestJump === undefined) state.bestJump = 0;
  if (state.stuntJumps === undefined) state.stuntJumps = 0;
  return state.stuntState;
}

function speedOf(state) {
  if (typeof state.speedKmh === 'number') return state.speedKmh;
  return Math.abs(state.player.speed || 0) * 3.6;
}

export function startStunt(state, ramp) {
  const ss = stuntState(state);
  if (ss.air) return null;
  const speed = speedOf(state);
  if (speed < MIN_LAUNCH_SPEED) return null;
  const airSeconds = 1.1 + Math.min(1.6, (speed - MIN_LAUNCH_SPEED) / 60);
  ss.air = {
    rampId: ramp.id,
    label: ramp.label,
    startedAt: state.clockMin || 0,
    airSeconds,
    elapsed: 0,
    startX: state.player.x,
    startZ: state.player.z,
    startSpeed: speed,
  };
  state.lastStunt = { x: state.player.x, z: state.player.z, at: performance.now() };
  return ss.air;
}

function landStunt(state) {
  const ss = stuntState(state);
  const air = ss.air;
  if (!air) return 0;
  ss.air = null;
  const airtime = air.elapsed;
  const dx = state.player.x - air.startX;
  const dz = state.player.z - air.startZ;
  const distance = Math.hypot(dx, dz);
  const stillMoving = speedOf(state) >= MIN_CLEAN_LANDING_SPEED;
  const stillInCar = !!state.inCar;
  const clean = stillMoving && stillInCar;
  if (!clean) {
    state.splash = { text: `WIPEOUT — ${air.label} — NO POINTS BANKED`, timer: 3 };
    return 0;
  }
  let points = Math.round(airtime * POINTS_PER_SECOND);
  if (distance >= CLEAR_DISTANCE_METRES) points += CLEAR_DISTANCE_BONUS;
  if (airtime >= CLEAN_LANDING_SECONDS) points += CLEAN_LANDING_BONUS;
  const combo = stuntCombo(state);
  if (combo > 1) points = Math.round(points * combo);
  state.stuntPoints += points;
  state.stuntJumps += 1;
  if (airtime > state.bestJump) state.bestJump = Math.round(airtime * 10) / 10;
  ss.leaderboard = ss.leaderboard || [];
  ss.leaderboard.push({ label: air.label, points, airtime: Math.round(airtime * 10) / 10, day: state.day || 1 });
  ss.leaderboard.sort((a, b) => b.points - a.points);
  if (ss.leaderboard.length > 5) ss.leaderboard.length = 5;
  ss.lastLand = state.clockMin || 0;
  state.money = (state.money || 0) + points;
  state.splash = { text: `STUNT +${points} — ${air.label} · ${airtime.toFixed(1)}s AIR${combo > 1 ? ' · COMBO x2' : ''}`, timer: 4 };
  return points;
}

export function updateStunts(state, dt, THREE) {
  const ss = stuntState(state);
  if (ss.cooldown > 0) ss.cooldown = Math.max(0, ss.cooldown - dt);
  if (ss.air) {
    const air = ss.air;
    air.elapsed += dt;
    const progress = Math.min(1, air.elapsed / air.airSeconds);
    const arc = Math.sin(progress * Math.PI) * 3.2;
    if (state.player) state.player.y = arc;
    if (air.elapsed >= air.airSeconds) {
      if (state.player) state.player.y = 0;
      landStunt(state);
      ss.cooldown = 1.5;
    }
  } else if (state.inCar && ss.cooldown <= 0) {
    for (const ramp of RAMPS) {
      const d = Math.hypot(ramp.x - state.player.x, ramp.z - state.player.z);
      if (d < RAMP_TRIGGER_RADIUS && speedOf(state) >= MIN_LAUNCH_SPEED) {
        startStunt(state, ramp);
        break;
      }
    }
  }
  drawRamps(state, THREE);
}

function makeWedge(THREE) {
  const geo = new THREE.BoxGeometry(5, 1.2, 3.2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff5a3c });
  const wedge = new THREE.Mesh(geo, mat);
  wedge.rotation.z = 0.32;
  return wedge;
}

function makeChevron(THREE) {
  const geo = new THREE.BoxGeometry(4.4, 0.25, 0.7);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  return new THREE.Mesh(geo, mat);
}

function makeLabel(THREE, color) {
  const geo = new THREE.PlaneGeometry(6.5, 1.1);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

export function drawRamps(state, THREE) {
  const ss = stuntState(state);
  if (!THREE || !state.scene) return;
  if (!ss.meshes) {
    ss.meshes = RAMPS.map((ramp) => {
      const group = new THREE.Group();
      const wedge = makeWedge(THREE);
      const chevron = makeChevron(THREE);
      chevron.position.set(0, 0.9, 0);
      const label = makeLabel(THREE, 0xff5a3c);
      label.position.set(0, 3.4, 0);
      group.add(wedge);
      group.add(chevron);
      group.add(label);
      group.position.set(ramp.x, 0.6, ramp.z);
      group.rotation.y = ramp.heading;
      state.scene.add(group);
      return { ramp, group, label };
    });
  }
  const t = performance.now() / 700;
  for (const entry of ss.meshes) {
    entry.label.rotation.y = -entry.group.rotation.y + Math.sin(t) * 0.08;
    const near = Math.hypot(entry.ramp.x - state.player.x, entry.ramp.z - state.player.z) < 25;
    entry.group.visible = true;
    entry.label.material.opacity = near ? 1 : 0.6;
  }
}

export function stuntHudLine(state) {
  const ss = stuntState(state);
  if (!ss.air) return '';
  const air = ss.air;
  const live = Math.round(air.elapsed * POINTS_PER_SECOND);
  return `AIR +${live} · ${air.label}`;
}

export function stuntSummary(state) {
  return {
    points: state.stuntPoints || 0,
    jumps: state.stuntJumps || 0,
    best: state.bestJump || 0,
  };
}

// Stunt leaderboard: the five best jumps ever, with ramp name, points and
// airtime. It lives in the stunt state and survives a save.
export function stuntLeaderboard(state) {
  const ss = stuntState(state);
  return (ss.leaderboard || []).slice();
}

export function stuntLeaderboardLine(state) {
  const board = stuntLeaderboard(state);
  if (board.length === 0) return 'NO STUNTS YET — FIND A RAMP';
  return board.map((e, i) => `${i + 1}. ${e.label} +${e.points} (${e.airtime}s)`).join(' · ');
}

// Stunt combo: land a second jump within thirty game-minutes of the last
// one and it pays double. The window is generous on purpose — chaining
// ramps down the coast road is the whole point of the stunt system.
export function stuntCombo(state) {
  const ss = stuntState(state);
  if (ss.lastLand === undefined || ss.lastLand === null) return 1;
  const now = state.clockMin || 0;
  return now - ss.lastLand <= COMBO_WINDOW_MINUTES ? 2 : 1;
}

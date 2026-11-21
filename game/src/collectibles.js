// Collectibles: twenty hidden packages scattered across the five districts.
// Each one is a small glowing crate with a sparkle ring. Get close and a
// distance ping appears; walk or drive within three metres and it is yours.
// Every package pays $500 on the spot, with big bonuses at 10 and 20.
import { PACKAGE_SPOTS } from './config.js';

const PING_RADIUS = 40;
const COLLECT_RADIUS = 3;
const PACKAGE_PAYOUT = 500;
const BONUS_AT_TEN = 2000;
const BONUS_AT_TWENTY = 5000;

function pkgState(state) {
  if (!state.pkgState) {
    state.pkgState = { collected: [], ping: null, meshes: null, sparkles: null };
  }
  if (state.collectiblesFound === undefined) state.collectiblesFound = 0;
  if (state.packageBonusPaid === undefined) state.packageBonusPaid = 0;
  return state.pkgState;
}

export function collectPackage(state, spot) {
  const ps = pkgState(state);
  if (ps.collected.includes(spot.id)) return 0;
  ps.collected.push(spot.id);
  state.collectiblesFound += 1;
  let payout = PACKAGE_PAYOUT;
  let extra = '';
  if (state.collectiblesFound === 10 && state.packageBonusPaid < 1) {
    payout += BONUS_AT_TEN;
    state.packageBonusPaid = 1;
    extra = ' · HALFWAY BONUS +$2,000';
  }
  if (state.collectiblesFound === 20 && state.packageBonusPaid < 2) {
    payout += BONUS_AT_TWENTY;
    state.packageBonusPaid = 2;
    extra = ' · PACKAGE KING +$5,000';
  }
  state.money = (state.money || 0) + payout;
  state.splash = { text: `PACKAGE FOUND +$${payout}${extra}`, timer: 3 };
  return payout;
}

function nearestUncollected(state) {
  const ps = pkgState(state);
  let best = null;
  let bestDist = Infinity;
  for (const spot of PACKAGE_SPOTS) {
    if (ps.collected.includes(spot.id)) continue;
    const d = Math.hypot(spot.x - state.player.x, spot.z - state.player.z);
    if (d < bestDist) {
      bestDist = d;
      best = spot;
    }
  }
  return { spot: best, dist: bestDist };
}

export function updateCollectibles(state, dt, THREE) {
  const ps = pkgState(state);
  const found = nearestUncollected(state);
  if (found.spot && found.dist < PING_RADIUS) {
    ps.ping = { id: found.spot.id, dist: Math.round(found.dist), district: found.spot.district };
  } else {
    ps.ping = null;
  }
  if (found.spot && found.dist < COLLECT_RADIUS) {
    collectPackage(state, found.spot);
  }
  drawPackageMarkers(state, THREE);
}

function makeCrate(THREE) {
  const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  return new THREE.Mesh(geo, mat);
}

function makeSparkle(THREE) {
  const geo = new THREE.RingGeometry(1.4, 2.1, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function drawPackageMarkers(state, THREE) {
  const ps = pkgState(state);
  if (!THREE || !state.scene) return;
  if (!ps.meshes) {
    ps.meshes = PACKAGE_SPOTS.map((spot) => {
      const crate = makeCrate(THREE);
      const ring = makeSparkle(THREE);
      crate.position.set(spot.x, 1.1, spot.z);
      ring.position.set(spot.x, 0.4, spot.z);
      state.scene.add(crate);
      state.scene.add(ring);
      return { spot, crate, ring };
    });
  }
  const t = performance.now() / 600;
  for (const entry of ps.meshes) {
    const taken = ps.collected.includes(entry.spot.id);
    entry.crate.visible = !taken;
    entry.ring.visible = !taken;
    if (!taken) {
      entry.crate.position.y = 1.1 + Math.sin(t + entry.spot.x) * 0.25;
      entry.crate.rotation.y = t * 0.4;
      entry.ring.scale.setScalar(1 + Math.sin(t * 1.5 + entry.spot.z) * 0.15);
    }
  }
}

export function packagePingLine(state) {
  const ps = pkgState(state);
  if (!ps.ping) return '';
  return `PACKAGE ${ps.ping.dist}m · ${ps.ping.district.toUpperCase()}`;
}

export function packageKingTitle(state) {
  return (state.collectiblesFound || 0) >= 20 ? 'PACKAGE KING' : '';
}

export function resetCollectibles(state) {
  const ps = pkgState(state);
  ps.collected = [];
  ps.ping = null;
  state.collectiblesFound = 0;
  state.packageBonusPaid = 0;
}

// Package milestones: the hunt has a story — halfway pays a bonus, the
// last five are the run to PACKAGE KING. Callers show the line on the map.
export function packageMilestones(state) {
  const found = state.collectiblesFound || 0;
  if (found >= 20) return 'PACKAGE KING — ALL 20 FOUND';
  if (found >= 15) return '15/20 — 5 TO GO FOR PACKAGE KING';
  if (found >= 10) return '10/20 — HALFWAY BONUS CLAIMED';
  if (found >= 5) return '5/20 — KEEP HUNTING';
  return `${found}/20 PACKAGES`;
}

// Nearest-package compass: which direction the closest uncollected
// package is, so the player can hunt without opening the map.
export function nearestPackageDirection(state) {
  const ps = pkgState(state);
  let best = null;
  let bestD = Infinity;
  for (const p of ps.packages) {
    if (p.collected) continue;
    const d = Math.hypot(p.x - state.player.x, p.z - state.player.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best) return null;
  const dx = best.x - state.player.x;
  const dz = best.z - state.player.z;
  const angle = Math.atan2(dx, -dz);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(angle / (Math.PI / 4)) % 8;
  return { direction: dirs[(idx + 8) % 8], distance: Math.round(bestD), district: best.district };
}

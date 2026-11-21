// Heat: safehouses, bribes and cooling off. Two green safehouses let you
// lay low until the trail goes cold. A bribe near a cop car buys one star
// down — if you are not too hot. And if no unit can see you for a full
// minute, the heat decays on its own.
import { SAFEHOUSES } from './config.js';

const SAFEHOUSE_RADIUS = 10;
const LAY_LOW_SECONDS = 3;
const BRIBE_RADIUS = 15;
const BRIBE_PER_STAR = 300;
const BRIBE_RESPECT_COST = 5;
const MAX_BRIBE_WANTED = 2;
const DECAY_SECONDS = 60;
const DECAY_SIGHT_RADIUS = 60;

function heatState(state) {
  if (!state.heatState) {
    state.heatState = { layingLow: null, decayTimer: 0, decayRunning: false, meshes: null };
  }
  if (state.heatClears === undefined) state.heatClears = 0;
  if (state.bribesPaid === undefined) state.bribesPaid = 0;
  if (state.bribeSpent === undefined) state.bribeSpent = 0;
  return state.heatState;
}

function policeUnits(state) {
  return state.policeUnits || state.police || state.cops || [];
}

function nearestUnitDistance(state) {
  const units = policeUnits(state);
  let best = Infinity;
  for (const unit of units) {
    const ux = unit.x !== undefined ? unit.x : (unit.pos ? unit.pos.x : 0);
    const uz = unit.z !== undefined ? unit.z : (unit.pos ? unit.pos.z : 0);
    const d = Math.hypot(ux - state.player.x, uz - state.player.z);
    if (d < best) best = d;
  }
  return best;
}

export function enterSafehouse(state, house) {
  const hs = heatState(state);
  if (hs.layingLow) return false;
  if ((state.wanted || 0) <= 0) return false;
  hs.layingLow = { houseId: house.id, label: house.label, timer: LAY_LOW_SECONDS };
  state.splash = { text: 'LAYING LOW...', timer: 2 };
  return true;
}

function clearHeat(state) {
  const hs = heatState(state);
  const house = hs.layingLow;
  hs.layingLow = null;
  state.wanted = 0;
  state.wantedTimer = 0;
  state.heatClears += 1;
  state.splash = { text: `SAFE — HEAT CLEARED · ${house ? house.label : ''}`, timer: 4 };
}

export function payBribe(state) {
  const hs = heatState(state);
  const wanted = state.wanted || 0;
  if (wanted <= 0) return 'NO HEAT TO BRIBE';
  if (wanted > MAX_BRIBE_WANTED) {
    state.splash = { text: 'TOO HOT TO BRIBE', timer: 3 };
    return 'TOO HOT TO BRIBE';
  }
  const nearest = nearestUnitDistance(state);
  if (nearest > BRIBE_RADIUS) {
    state.splash = { text: 'NO COP NEARBY — BRIBE NEEDS A UNIT CLOSE', timer: 3 };
    return 'NO COP NEARBY';
  }
  const cost = BRIBE_PER_STAR;
  if ((state.money || 0) < cost) {
    state.splash = { text: 'NOT ENOUGH CASH TO BRIBE', timer: 3 };
    return 'NOT ENOUGH CASH';
  }
  state.money -= cost;
  state.bribeSpent += cost;
  state.bribesPaid += 1;
  state.wanted = Math.max(0, wanted - 1);
  state.respect = Math.max(0, (state.respect || 0) - BRIBE_RESPECT_COST);
  state.splash = { text: `BRIBE PAID -$${cost} · WANTED ${state.wanted} STAR${state.wanted === 1 ? '' : 'S'}`, timer: 3 };
  return 'BRIBE PAID';
}

export function updateHeat(state, dt, THREE) {
  const hs = heatState(state);
  if (hs.layingLow) {
    hs.layingLow.timer -= dt;
    if (hs.layingLow.timer <= 0) clearHeat(state);
  } else if ((state.wanted || 0) > 0) {
    let inside = false;
    for (const house of SAFEHOUSES) {
      const d = Math.hypot(house.x - state.player.x, house.z - state.player.z);
      if (d < SAFEHOUSE_RADIUS) {
        inside = true;
        enterSafehouse(state, house);
        break;
      }
    }
    if (!inside) {
      const nearest = nearestUnitDistance(state);
      const unseen = nearest > DECAY_SIGHT_RADIUS && !state.pointedOut;
      if (unseen) {
        hs.decayTimer += dt;
        hs.decayRunning = true;
        if (hs.decayTimer >= DECAY_SECONDS) {
          hs.decayTimer = 0;
          state.wanted = Math.max(0, state.wanted - 1);
          state.splash = { text: `HEAT DECAYED · WANTED ${state.wanted} STAR${state.wanted === 1 ? '' : 'S'}`, timer: 3 };
        }
      } else {
        hs.decayTimer = 0;
        hs.decayRunning = false;
      }
    }
  } else {
    hs.decayTimer = 0;
    hs.decayRunning = false;
  }
  drawSafehouseMarkers(state, THREE);
}

function makeHouseIcon(THREE) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.6, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x2fae5f }),
  );
  base.position.y = 1.3;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 1.8, 4),
    new THREE.MeshBasicMaterial({ color: 0x1d7a3f }),
  );
  roof.position.y = 3.5;
  roof.rotation.y = Math.PI / 4;
  group.add(base);
  group.add(roof);
  return group;
}

function makeSafeRing(THREE) {
  const geo = new THREE.RingGeometry(4.5, 5.6, 36);
  const mat = new THREE.MeshBasicMaterial({ color: 0x39d353, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function drawSafehouseMarkers(state, THREE) {
  const hs = heatState(state);
  if (!THREE || !state.scene) return;
  if (!hs.meshes) {
    hs.meshes = SAFEHOUSES.map((house) => {
      const icon = makeHouseIcon(THREE);
      icon.position.set(house.x, 0.4, house.z);
      const ring = makeSafeRing(THREE);
      ring.position.set(house.x, 0.5, house.z);
      state.scene.add(icon);
      state.scene.add(ring);
      return { house, icon, ring };
    });
  }
  const t = performance.now() / 600;
  for (const entry of hs.meshes) {
    entry.ring.scale.setScalar(1 + Math.sin(t) * 0.08);
    entry.icon.position.y = 0.4 + Math.sin(t * 1.2 + entry.house.x) * 0.15;
  }
}

export function heatHudLine(state) {
  const hs = heatState(state);
  if (hs.layingLow) return `LAYING LOW ${Math.ceil(hs.layingLow.timer)}s`;
  if (hs.decayRunning && (state.wanted || 0) > 0) {
    const left = Math.ceil(DECAY_SECONDS - hs.decayTimer);
    return `HEAT ${left}s`;
  }
  return '';
}

export function heatSummary(state) {
  return {
    clears: state.heatClears || 0,
    bribes: state.bribesPaid || 0,
    spent: state.bribeSpent || 0,
    wanted: state.wanted || 0,
  };
}

// Heat rank: a title that grows with your heat history — the more you lay
// low and bribe, the cooler your reputation runs. A GHOST is a driver the
// police can never seem to pin down.
export function heatRank(state) {
  const score = (state.heatClears || 0) * 2 + (state.bribesPaid || 0);
  if (score >= 12) return 'GHOST';
  if (score >= 7) return 'SHADOW';
  if (score >= 3) return 'SLIPPERY';
  return 'WARM';
}

export function heatRankLine(state) {
  return `HEAT RANK — ${heatRank(state)} · ${(state.heatClears || 0)} LAY LOWS · ${(state.bribesPaid || 0)} BRIBES`;
}

export function heatHistoryLine(state) {
  const clears = state.heatClears || 0;
  const bribes = state.bribesPaid || 0;
  const spent = state.bribeSpent || 0;
  if (clears === 0 && bribes === 0) return 'NO HEAT HISTORY — STAY CLEAN';
  return `${clears} LAY LOW${clears === 1 ? '' : 'S'} · ${bribes} BRIBE${bribes === 1 ? '' : 'S'} · $${spent} PAID`;
}

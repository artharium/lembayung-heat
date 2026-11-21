// Pedestrian reactions: the crowds of Lembayung are alive. They flee a
// police chase that thunders past, they cheer and tip a driver who lands
// a stunt jump in front of them, and they scatter when a car mounts the
// sidewalk beside them. Each pedestrian needs a breather between reactions.
export const REACTION_COOLDOWN = 5;
const CHASE_FLEE_RADIUS = 20;
const STUNT_CHEER_RADIUS = 30;
const SIDEWALK_SCATTER_RADIUS = 5;
const POINT_RADIUS = 15;
const WAVE_RADIUS = 4;
const TIP_PER_CHEER = 10;
const MAX_TIP_PER_JUMP = 50;

function pedState(state) {
  if (!state.pedState) {
    state.pedState = { reactions: {}, lastJumpTipped: 0, cheerTotal: 0 };
  }
  if (state.crowdTips === undefined) state.crowdTips = 0;
  return state.pedState;
}

function pedPos(ped) {
  return {
    x: ped.x !== undefined ? ped.x : (ped.pos ? ped.pos.x : 0),
    z: ped.z !== undefined ? ped.z : (ped.pos ? ped.pos.z : 0),
  };
}

function setPedPos(ped, x, z) {
  if (ped.x !== undefined) ped.x = x;
  if (ped.z !== undefined) ped.z = z;
  if (ped.pos) {
    ped.pos.x = x;
    ped.pos.z = z;
  }
}

function cooldownReady(ps, ped, now) {
  const key = ped.id !== undefined ? ped.id : `${Math.round(pedPos(ped).x)}:${Math.round(pedPos(ped).z)}`;
  const last = ps.reactions[key] || 0;
  if (now - last < REACTION_COOLDOWN * 1000) return null;
  ps.reactions[key] = now;
  return key;
}

function fleeFrom(ped, fromX, fromZ, distance) {
  const pos = pedPos(ped);
  const dx = pos.x - fromX;
  const dz = pos.z - fromZ;
  const d = Math.hypot(dx, dz) || 1;
  const step = distance * 0.9;
  setPedPos(ped, pos.x + (dx / d) * step, pos.z + (dz / d) * step);
  ped.bubble = '!';
  ped.bubbleTimer = 2;
}

function cheer(ped) {
  ped.bubble = '^_^';
  ped.bubbleTimer = 2.5;
  if (ped.y !== undefined) ped.y = 0.6;
  if (ped.pos && ped.pos.y !== undefined) ped.pos.y = 0.6;
}

function scatter(ped, fromX, fromZ) {
  const pos = pedPos(ped);
  const dx = pos.x - fromX;
  const dz = pos.z - fromZ;
  const d = Math.hypot(dx, dz) || 1;
  setPedPos(ped, pos.x + (dx / d) * 7, pos.z + (dz / d) * 7);
  ped.bubble = '!!';
  ped.bubbleTimer = 2;
}

// Pointing: when the player is wanted at three stars or more, nearby
// pedestrians point at them. The police notice — while anyone is pointing,
// heat does not decay, because the crowd keeps giving you away.
function pointAt(ped) {
  ped.bubble = '->';
  ped.bubbleTimer = 3;
}

function waveAt(ped) {
  ped.bubble = '~';
  ped.bubbleTimer = 2;
}

export function reactPedestrians(state, dt) {
  const ps = pedState(state);
  const peds = state.pedestrians || [];
  if (peds.length === 0) return;
  state.pointedOut = false;
  const now = performance.now();
  const wanted = state.wanted || 0;
  const px = state.player.x;
  const pz = state.player.z;
  const stunt = state.lastStunt;
  const stuntFresh = stunt && (now - stunt.at) < 4000;
  let tipsThisJump = 0;
  for (const ped of peds) {
    const pos = pedPos(ped);
    if (ped.bubbleTimer !== undefined && ped.bubbleTimer > 0) {
      ped.bubbleTimer -= dt;
      if (ped.bubbleTimer <= 0) ped.bubble = '';
    }
    const distPlayer = Math.hypot(pos.x - px, pos.z - pz);
    if (wanted >= 2 && distPlayer < CHASE_FLEE_RADIUS) {
      if (cooldownReady(ps, ped, now)) {
        fleeFrom(ped, px, pz, CHASE_FLEE_RADIUS - distPlayer + 6);
      }
      continue;
    }
    if (stuntFresh && stunt) {
      const distStunt = Math.hypot(pos.x - stunt.x, pos.z - stunt.z);
      if (distStunt < STUNT_CHEER_RADIUS && tipsThisJump < MAX_TIP_PER_JUMP) {
        if (cooldownReady(ps, ped, now)) {
          cheer(ped);
          tipsThisJump += TIP_PER_CHEER;
          ps.cheerTotal += 1;
        }
      }
    }
    if (wanted >= 3 && distPlayer < POINT_RADIUS) {
      if (cooldownReady(ps, ped, now)) {
        pointAt(ped);
        state.pointedOut = true;
      }
    }
    if (!state.inCar && distPlayer < WAVE_RADIUS && !state.pointedOut) {
      const speed = Math.hypot(state.player.speed || 0, 0);
      if (speed < 0.5 && cooldownReady(ps, ped, now)) {
        waveAt(ped);
      }
    }
    if (state.inCar && distPlayer < SIDEWALK_SCATTER_RADIUS) {
      if (cooldownReady(ps, ped, now)) {
        scatter(ped, px, pz);
      }
    }
  }
  if (tipsThisJump > 0) {
    state.money = (state.money || 0) + tipsThisJump;
    state.crowdTips += tipsThisJump;
    state.splash = { text: `CROWD TIP +$${tipsThisJump}`, timer: 2 };
  }
}

export function updatePedReactions(state, dt) {
  reactPedestrians(state, dt);
  const peds = state.pedestrians || [];
  for (const ped of peds) {
    if (ped.y !== undefined && ped.y > 0) {
      ped.y = Math.max(0, ped.y - dt * 1.8);
    }
    if (ped.pos && ped.pos.y !== undefined && ped.pos.y > 0) {
      ped.pos.y = Math.max(0, ped.pos.y - dt * 1.8);
    }
  }
}

export function pedReactionSummary(state) {
  const ps = pedState(state);
  return {
    tips: state.crowdTips || 0,
    cheers: ps.cheerTotal,
    reacting: (state.pedestrians || []).filter((p) => p.bubble).length,
  };
}

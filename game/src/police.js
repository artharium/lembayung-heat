// Police: wanted level, chase, roadblocks and the helicopter.
// Key functions first: startPoliceChase, spawnRoadblock, spawnHelicopter.
// v3 paints Air One light grey-blue with a glass cockpit, so the helicopter
// reads as a helicopter against the orange sky instead of a black slab, and
// banks it toward the player as it follows the chase.
import { makeCarMesh } from './city.js';
import { HELI_STYLE } from './config.js';

export function startPoliceChase(state, scene, THREE) {
  if (state.wanted < 1) state.wanted = 1;
  const want = Math.min(5, state.wanted);
  // 1-2 stars: patrol cars. 3-4: + roadblocks. 5: + helicopter.
  const targetCars = want <= 2 ? 2 : want <= 4 ? 4 : 6;
  while (state.police.length < targetCars) {
    const car = makeCarMesh(THREE, 0x111111, true);
    const px = state.player.x; const pz = state.player.z;
    // Spawn behind the player (opposite the heading) so the chase is in frame.
    car.position.set(px + (state.police.length % 2 ? 8 : -8), 1, pz + 22 + state.police.length * 10);
    car.userData = { speed: 16 + want * 2, police: true };
    scene.add(car);
    state.police.push(car);
  }
  if (want >= 3) spawnRoadblock(state, scene, THREE);
  if (want >= 5) spawnHelicopter(state, scene, THREE);
  updatePoliceList(state);
  return state.police.length;
}

// A real roadblock: two police cars parked across the road ahead of the
// player, a striped barrier between them and cones — placed along the
// player's heading, so the player (and the cover camera) drives into it.
export function spawnRoadblock(state, scene, THREE) {
  if (state.roadblocks.length >= 2) return state.roadblocks;
  const hx = Math.sin(state.player.heading); const hz = Math.cos(state.player.heading);
  for (let i = 0; i < 2; i += 1) {
    const block = new THREE.Group();
    const ahead = 45 + i * 30;
    const cx = state.player.x + hx * ahead;
    const cz = state.player.z + hz * ahead;
    // Two police cars across the road: local +x is the across-road axis
    // once the block is rotated to the player's heading.
    for (const side of [-4.5, 4.5]) {
      const car = makeCarMesh(THREE, 0x111111, true);
      car.position.set(side, 0, 0);
      // Face the player (opposite the player's heading): the car's forward
      // is its local +x, so its total rotation must be -PI/2 - heading.
      car.rotation.y = -Math.PI / 2 - state.player.heading;
      block.add(car);
    }
    // Striped barrier between the two cars.
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    barrier.position.set(0, 1.2, 0);
    block.add(barrier);
    for (let s = 0; s < 3; s += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 0.65),
        new THREE.MeshLambertMaterial({ color: 0xff2222 }));
      stripe.position.set(-2.4 + s * 2.4, 1.2, 0);
      block.add(stripe);
    }
    // Cones on the near side (local -z faces the player).
    for (let j = 0; j < 3; j += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8),
        new THREE.MeshLambertMaterial({ color: 0xff6d00 }));
      cone.position.set(j * 3 - 3, 1, -4);
      block.add(cone);
    }
    block.position.set(cx, 0, cz);
    block.rotation.y = state.player.heading;
    scene.add(block);
    state.roadblocks.push(block);
  }
  return state.roadblocks;
}

// Air One, big and light: a pale body with a dark stripe and a glass
// cockpit, a wide rotor, a warm spotlight cone, and a pool of light on the
// ground under it (state.heliSpot, synced by render.js).
export function spawnHelicopter(state, scene, THREE) {
  if (state.helicopter) return state.helicopter;
  const heli = new THREE.Group();
  heli.name = 'AirOne';
  heli.scale.setScalar(HELI_STYLE.scale);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 3),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.body }));
  heli.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.7, 3.1),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.stripe }));
  stripe.position.y = -0.4;
  heli.add(stripe);
  // Glass cockpit at the front (+x): a pale blue box that catches the sun.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.6),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.glass }));
  glass.position.set(2.4, 0.3, 0);
  heli.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.25, 0.7),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.rotor }));
  rotor.position.y = 1.7;
  rotor.name = 'Rotor';
  heli.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 0.8),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.tail }));
  tail.position.set(-4.5, 0.4, 0);
  heli.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.8),
    new THREE.MeshLambertMaterial({ color: HELI_STYLE.stripe }));
  fin.position.set(-6.2, 0.9, 0);
  heli.add(fin);
  const light = new THREE.Mesh(new THREE.ConeGeometry(5, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: HELI_STYLE.spotOpacity }));
  light.position.y = -13;
  light.rotation.x = Math.PI;
  heli.add(light);
  heli.position.set(state.player.x + 18, 26, state.player.z - 28);
  scene.add(heli);
  state.helicopter = heli;
  const spot = new THREE.Mesh(new THREE.CircleGeometry(6, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.28 }));
  spot.rotation.x = -Math.PI / 2;
  spot.visible = false;
  scene.add(spot);
  state.heliSpot = spot;
  return heli;
}

export function updatePoliceList(state) {
  const names = ['Unit 12 — K. Sari', 'Unit 07 — D. Pras', 'Unit 21 — M. Lestari', 'Unit 03 — Air One', 'Unit 18 — R. Budi', 'Unit 09 — T. Wulan'];
  state.policeUnits = [];
  for (let i = 0; i < state.police.length; i += 1) {
    const p = state.police[i];
    const dx = Math.round(Math.hypot(p.position.x - state.player.x, p.position.z - state.player.z));
    state.policeUnits.push({ name: names[i % names.length], dist: dx, action: dx < 25 ? 'IN PURSUIT' : 'RESPONDING' });
  }
  if (state.helicopter) state.policeUnits.push({ name: 'Unit 03 — Air One', dist: 40, action: 'AIRBORNE' });
  return state.policeUnits;
}

export function stepPolice(state, dt) {
  const marked = (state.crew && state.crew.eyesOut.active > 0);
  // Chase: each police car steers toward the player, faster with more stars.
  // Eyes Out (Dimas) slows the chase while it is active.
  for (const car of state.police) {
    const dx = state.player.x - car.position.x;
    const dz = state.player.z - car.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = car.userData.speed * (marked ? 0.8 : 1) * dt;
    car.position.x += (dx / d) * speed;
    car.position.z += (dz / d) * speed;
    car.rotation.y = Math.atan2(-dz, dx);
    if (d < 4) {
      state.health = Math.max(0, state.health - dt * 8);
      state.wanted = Math.min(5, state.wanted);
      if (state.policeRamCool <= 0) {
        state.policeRamCool = 2;
        state.smokeEvents.push({ x: car.position.x, z: car.position.z });
      }
    }
  }
  // Police cars do not stack on top of each other: push overlapping pairs apart.
  for (let i = 0; i < state.police.length; i += 1) {
    for (let j = i + 1; j < state.police.length; j += 1) {
      const a = state.police[i]; const b = state.police[j];
      const dx = b.position.x - a.position.x; const dz = b.position.z - a.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < 5) {
        const push = (5 - d) / 2;
        a.position.x -= (dx / d) * push; a.position.z -= (dz / d) * push;
        b.position.x += (dx / d) * push; b.position.z += (dz / d) * push;
      }
    }
  }
  if (state.helicopter) {
    state.helicopter.position.x += (state.player.x - state.helicopter.position.x) * dt * 0.8;
    state.helicopter.position.z += (state.player.z - state.helicopter.position.z) * dt * 0.8;
    const rotor = state.helicopter.getObjectByName('Rotor');
    if (rotor) rotor.rotation.y += dt * 20;
    // Bank into the turn: lean toward the player as the helicopter circles
    // him, so it reads as flying, not hovering on a stick.
    const bank = Math.max(-0.25, Math.min(0.25, (state.player.x - state.helicopter.position.x) * 0.01));
    state.helicopter.rotation.z = bank;
  }
  // Wanted decays when no police car is close (broke line of sight); when
  // it reaches zero the player really did escape — count it.
  const before = state.wanted;
  const nearest = state.police.length ? Math.min(...state.police.map((c) => Math.hypot(c.position.x - state.player.x, c.position.z - state.player.z))) : 999;
  state.nearestPolice = nearest;
  if (nearest > 60) {
    state.wantedTimer += dt;
    if (state.wantedTimer > 5 && state.wanted > 0) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      updatePoliceList(state);
    }
  } else {
    state.wantedTimer = 0;
  }
  if (before > 0 && state.wanted === 0) state.copsEscaped += 1;
  return nearest;
}

export function clearPolice(state, scene) {
  for (const car of state.police) scene.remove(car);
  for (const b of state.roadblocks) scene.remove(b);
  if (state.helicopter) scene.remove(state.helicopter);
  if (state.heliSpot) scene.remove(state.heliSpot);
  state.police = [];
  state.roadblocks = [];
  state.helicopter = null;
  state.heliSpot = null;
  state.policeUnits = [];
  return state;
}

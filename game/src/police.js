// Police: wanted level, chase, roadblocks and the helicopter.
// Key functions first: startPoliceChase, spawnRoadblock, spawnHelicopter.
import { makeCarMesh } from './city.js';

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

export function spawnRoadblock(state, scene, THREE) {
  if (state.roadblocks.length >= 2) return state.roadblocks;
  for (let i = 0; i < 2; i += 1) {
    const block = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8),
        new THREE.MeshLambertMaterial({ color: 0xff6d00 }));
      cone.position.set(j * 3 - 3, 1, 0);
      block.add(cone);
    }
    const car = makeCarMesh(THREE, 0x111111, true);
    car.position.set(0, 0, 4);
    block.add(car);
    block.position.set(state.player.x + 40 + i * 30, 0, state.player.z + 20);
    scene.add(block);
    state.roadblocks.push(block);
  }
  return state.roadblocks;
}

export function spawnHelicopter(state, scene, THREE) {
  if (state.helicopter) return state.helicopter;
  const heli = new THREE.Group();
  heli.name = 'AirOne';
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 2.5),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  heli.add(body);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  rotor.position.y = 1.4;
  rotor.name = 'Rotor';
  heli.add(rotor);
  const light = new THREE.Mesh(new THREE.ConeGeometry(3, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.25 }));
  light.position.y = -9;
  light.rotation.x = Math.PI;
  heli.add(light);
  heli.position.set(state.player.x + 18, 26, state.player.z - 28);
  scene.add(heli);
  state.helicopter = heli;
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
  // Chase: each police car steers toward the player, faster with more stars.
  for (const car of state.police) {
    const dx = state.player.x - car.position.x;
    const dz = state.player.z - car.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = car.userData.speed * dt;
    car.position.x += (dx / d) * speed;
    car.position.z += (dz / d) * speed;
    car.rotation.y = Math.atan2(-dz, dx);
    if (d < 4) {
      state.health = Math.max(0, state.health - dt * 8);
      state.wanted = Math.min(5, state.wanted);
    }
  }
  if (state.helicopter) {
    state.helicopter.position.x += (state.player.x - state.helicopter.position.x) * dt * 0.8;
    state.helicopter.position.z += (state.player.z - state.helicopter.position.z) * dt * 0.8;
    const rotor = state.helicopter.getObjectByName('Rotor');
    if (rotor) rotor.rotation.y += dt * 20;
  }
  // Wanted decays when no police car is close (broke line of sight).
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
  return nearest;
}

export function clearPolice(state, scene) {
  for (const car of state.police) scene.remove(car);
  for (const b of state.roadblocks) scene.remove(b);
  if (state.helicopter) scene.remove(state.helicopter);
  state.police = [];
  state.roadblocks = [];
  state.helicopter = null;
  state.policeUnits = [];
  return state;
}

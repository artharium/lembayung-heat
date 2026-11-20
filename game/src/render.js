// Render: Three.js scene, sunset light, chase camera, mesh sync, effects.
// Key setup first: createRenderer builds the scene, draw syncs it every frame.
import { buildCityDistricts, spawnTraffic, spawnPedestrians, makeCarMesh } from './city.js';
import { CARS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_MAP = 'map';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas, THREE, rand) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff8c42);
  scene.fog = new THREE.Fog(0xffb703, 120, 380);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
  const ambient = new THREE.AmbientLight(0xffe0b3, 0.9);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xff9e5e, 1.4);
  sun.position.set(-120, 90, -60);
  scene.add(sun);
  // Sun disc + a soft glow halo low on the west, so the sky has a source.
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  sunBall.position.set(-280, 55, -80);
  scene.add(sunBall);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16 });
  glowMat.fog = false;
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(46, 16, 16), glowMat);
  sunGlow.position.copy(sunBall.position);
  scene.add(sunGlow);
  // Dusk clouds: big flattened white spheres high up, catching the sunset.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe8c9, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(22 + rand.next() * 18, 10, 10), cloudMat);
    cloud.scale.y = 0.28;
    cloud.position.set(-260 + rand.next() * 420, 75 + rand.next() * 35, -220 + rand.next() * 320);
    scene.add(cloud);
  }
  const city = buildCityDistricts(scene, THREE, rand);
  const traffic = spawnTraffic(scene, THREE, rand, 12);
  const pedestrians = spawnPedestrians(scene, THREE, rand, 20);
  // Player mesh: a standing figure on foot, teal jacket, skin head.
  const playerMesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x118ab2 }));
  body.position.y = 1.2;
  playerMesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
  head.position.y = 2.6;
  playerMesh.add(head);
  // Weapon in the right hand, pointing forward, with a muzzle-flash mesh
  // at its tip that shows for one beat after a shot.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 1.3),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gun.position.set(-0.62, 1.35, 0.75);
  gun.name = 'PlayerGun';
  playerMesh.add(gun);
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.55),
    new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  flash.position.set(-0.62, 1.35, 1.7);
  flash.visible = false;
  flash.name = 'MuzzleFlash';
  playerMesh.add(flash);
  scene.add(playerMesh);
  // Parked cars the player can steal (6 original cars).
  const parked = [];
  for (let i = 0; i < 6; i += 1) {
    const def = CARS[i];
    const mesh = makeCarMesh(THREE, def.color, false);
    const x = [-120, -40, 0, 80, 120, -80][i];
    const z = [-100, 40, 0, -60, 20, 120][i];
    mesh.position.set(x, 1, z);
    mesh.rotation.y = (i % 2) * Math.PI / 2;
    scene.add(mesh);
    parked.push({ x, z, name: def.name, index: i, mesh });
  }
  // Player car mesh (hidden until in a car); its paint follows the car
  // actually being driven, so the frame never lies about which car it is.
  const playerCar = makeCarMesh(THREE, CARS[0].color, false);
  playerCar.visible = false;
  scene.add(playerCar);
  // Smoke pool: grey puffs for crashes and rammed police cars.
  const smokePool = [];
  for (let i = 0; i < 8; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), mat);
    puff.visible = false;
    puff.userData.life = 0;
    scene.add(puff);
    smokePool.push(puff);
  }
  // Mission marker: yellow beacon pillar + floating diamond.
  const marker = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.35 }));
  pillar.position.y = 20;
  marker.add(pillar);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(2),
    new THREE.MeshBasicMaterial({ color: 0xffea00 }));
  diamond.position.y = 12;
  marker.add(diamond);
  scene.add(marker);
  function spawnSmokePuff(x, z) {
    const puff = smokePool.find((p) => !p.visible);
    if (!puff) return;
    puff.position.set(x, 2.5, z);
    puff.userData.life = 90;
    puff.visible = true;
  }
  function makeEnemyMesh(enemy) {
    const g = new THREE.Group();
    const eBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 1.2, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x9d0208 }));
    eBody.position.y = 1.4;
    g.add(eBody);
    const eHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xe07a5f }));
    eHead.position.y = 2.9;
    g.add(eHead);
    // Health bar above the head: red back, green front that shrinks.
    // Wide and tall on purpose, so it reads at a glance in a firefight
    // (and in a 250px thumbnail). It sits at y 4.7, above the market
    // stall awnings (y ~4.2), or the awning's long striped bar swallows
    // it — the first version at y 4.1 was invisible against the awning.
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x330000 }));
    barBg.position.y = 4.7;
    g.add(barBg);
    const barFg = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.34, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x06d6a0 }));
    barFg.position.y = 4.7;
    barFg.name = 'EnemyHealthBar';
    g.add(barFg);
    g.userData.barFg = barFg;
    scene.add(g);
    return g;
  }
  function resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function draw(state, screen) {
    resize();
    // Consume smoke events the world queued this frame.
    for (const ev of state.smokeEvents.splice(0)) spawnSmokePuff(ev.x, ev.z);
    for (const puff of smokePool) {
      if (!puff.visible) continue;
      puff.userData.life -= 1;
      if (puff.userData.life <= 0) { puff.visible = false; continue; }
      const age = 1 - puff.userData.life / 90;
      puff.scale.setScalar(1 + age * 2.2);
      puff.material.opacity = 0.5 * (1 - age);
      puff.position.y += 0.03;
    }
    // Sync player / car.
    playerCar.visible = state.inCar;
    playerMesh.visible = !state.inCar;
    if (state.inCar) {
      const def = CARS[state.carIndex % CARS.length];
      if (playerCar.userData.bodyMat) playerCar.userData.bodyMat.color.set(def.color);
      if (playerCar.userData.roofMat) playerCar.userData.roofMat.color.set(def.color);
      playerCar.position.set(state.player.x, 1, state.player.z);
      // Car body is long on its local x-axis; forward is the heading, so
      // rotation is heading - PI/2. The old heading + PI made the car sit
      // sideways across the road in every screenshot.
      playerCar.rotation.y = state.player.heading - Math.PI / 2;
    } else {
      playerMesh.position.set(state.player.x, 0, state.player.z);
      playerMesh.rotation.y = state.player.heading;
      flash.visible = (state.muzzleTimer || 0) > 0;
      if (flash.visible) flash.scale.setScalar(0.8 + Math.random() * 0.5);
    }
    // Traffic + pedestrians sync (their x/z live in state arrays, meshes in scene).
    for (const t of state.traffic) {
      if (t.mesh) {
        t.mesh.position.z = t.z; t.mesh.position.x = t.x;
        // Traffic drives along z: dir +1 is heading 0 (south), dir -1 is
        // heading PI (north). Same -PI/2 rule as the player car, or every
        // traffic car sits sideways across its lane too.
        t.mesh.rotation.y = t.dir >= 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    }
    for (const p of state.pedestrians) {
      if (p.mesh) { p.mesh.position.x = p.x; p.mesh.position.z = p.z; }
    }
    // Police cars face the player (their forward is local +x).
    for (const car of state.police) {
      const dx = state.player.x - car.position.x;
      const dz = state.player.z - car.position.z;
      car.rotation.y = Math.atan2(-dz, dx);
    }
    // Enemies: materialise on first sight, face the player, shrink the bar.
    for (const e of state.enemies || []) {
      if (!e.mesh) e.mesh = makeEnemyMesh(e);
      e.mesh.visible = !!e.alive;
      if (!e.alive) continue;
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(state.player.x - e.x, state.player.z - e.z);
      const bar = e.mesh.userData.barFg;
      const frac = Math.max(0, e.health / e.maxHealth);
      bar.scale.x = frac;
      bar.position.x = -1.25 * (1 - frac);
    }
    // Helicopter spotlight pool on the ground under the helicopter.
    if (state.helicopter && state.heliSpot) {
      state.heliSpot.visible = true;
      state.heliSpot.position.set(state.helicopter.position.x, 0.7, state.helicopter.position.z);
    } else if (state.heliSpot) {
      state.heliSpot.visible = false;
    }
    // Marker at the current mission stage.
    const stage = state.mission && !state.mission.done ? state.mission.def.stages[state.mission.stage] : null;
    marker.visible = !!stage;
    if (stage) { marker.position.set(stage.x, 0, stage.z); diamond.rotation.y += 0.05; }
    // Ferris wheel turns.
    const wheel = city.getObjectByName('FerrisWheel');
    if (wheel) wheel.rotation.z += 0.002;
    // Camera.
    if (screen === SCREEN_TITLE) {
      // Bukit vista looking west: sea, ferris wheel and sun in frame.
      // (A closer camera at (-120, 35, 40) filled the frame with one
      // building wall, so the wide vista from (140, 55, 190) is the one
      // that reads; this angle keeps the sun and the sea in the frame.)
      camera.position.set(-60, 42, 80);
      camera.lookAt(-200, 18, -50);
    } else {
      const camAngle = state.cameraAngle || 0;
      const back = state.player.heading + Math.PI + camAngle;
      const onfootClose = state.shotMode && state.shotName === 'onfoot';
      // The cover shot pulls the chase camera back and up, so the hero car
      // does not fill the frame and the roadblock, police and skyline ahead
      // have room to read.
      const coverShot = state.shotMode && state.shotName === 'cover';
      const dist = state.inCar ? (coverShot ? 17 : 14) : (onfootClose ? 8 : 8);
      const height = state.inCar ? (coverShot ? 7 : 5.5) : (onfootClose ? 4 : 4);
      camera.position.set(
        state.player.x + Math.sin(back) * dist,
        height,
        state.player.z + Math.cos(back) * dist);
      camera.lookAt(state.player.x, 2, state.player.z);
    }
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', resize);
  resize();
  return { draw, scene, camera, renderer, traffic, pedestrians, parked, playerCar, playerMesh };
}

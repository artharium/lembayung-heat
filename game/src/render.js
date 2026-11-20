// Render: Three.js scene, sunset light, chase camera, mesh sync, effects.
// createRenderer builds the scene; draw syncs it every frame, one helper
// per system so the frame reads top to bottom: player, crowd, police,
// enemies, effects, marker, camera.
import { buildCityDistricts, spawnTraffic, spawnPedestrians, makeCarMesh } from './city.js';
import { CARS, ENEMY_BAR, FLASH } from './config.js';

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
  buildSky(scene, THREE, rand);

  const city = buildCityDistricts(scene, THREE, rand);
  const traffic = spawnTraffic(scene, THREE, rand, 12);
  const pedestrians = spawnPedestrians(scene, THREE, rand, 20);
  const playerMesh = buildPlayer(scene, THREE);
  const flash = playerMesh.getObjectByName('MuzzleFlash');
  const parked = buildParkedCars(scene, THREE);
  const playerCar = makeCarMesh(THREE, CARS[0].color, false);
  playerCar.visible = false;
  scene.add(playerCar);
  const smokePool = buildSmokePool(scene, THREE);
  const marker = buildMarker(scene, THREE);

  // Sun disc + glow halo low on the west, so the sky has a source, and
  // dusk clouds: big flattened spheres high up, catching the sunset.
  function buildSky(scene, THREE, rand) {
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    sunBall.position.set(-280, 55, -80);
    scene.add(sunBall);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16 });
    glowMat.fog = false;
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(46, 16, 16), glowMat);
    sunGlow.position.copy(sunBall.position);
    scene.add(sunGlow);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe8c9, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i += 1) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(22 + rand.next() * 18, 10, 10), cloudMat);
      cloud.scale.y = 0.28;
      cloud.position.set(-260 + rand.next() * 420, 75 + rand.next() * 35, -220 + rand.next() * 320);
      scene.add(cloud);
    }
  }

  // Raka on foot: teal jacket, skin head, gun in the right hand pointing
  // forward, and a four-point star flash at the muzzle that shows for one
  // beat after a shot. A star reads as a gunshot; the old octahedron read
  // as a floating yellow diamond.
  function buildPlayer(scene, THREE) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.1, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x118ab2 }));
    body.position.y = 1.2;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
    head.position.y = 2.6;
    g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 1.3),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(-0.62, 1.35, 0.75);
    gun.name = 'PlayerGun';
    g.add(gun);
    const star = new THREE.Group();
    star.name = 'MuzzleFlash';
    const armH = new THREE.Mesh(new THREE.BoxGeometry(FLASH.size, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: FLASH.color }));
    star.add(armH);
    const armV = new THREE.Mesh(new THREE.BoxGeometry(0.18, FLASH.size, 0.18),
      new THREE.MeshBasicMaterial({ color: FLASH.color }));
    star.add(armV);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
      new THREE.MeshBasicMaterial({ color: FLASH.core }));
    star.add(core);
    star.position.set(-0.62, 1.35, 1.7);
    star.visible = false;
    g.add(star);
    scene.add(g);
    return g;
  }

  // Parked cars the player can steal (the six original cars).
  function buildParkedCars(scene, THREE) {
    const list = [];
    for (let i = 0; i < 6; i += 1) {
      const def = CARS[i];
      const mesh = makeCarMesh(THREE, def.color, false);
      const x = [-120, -40, 0, 80, 120, -80][i];
      const z = [-100, 40, 0, -60, 20, 120][i];
      mesh.position.set(x, 1, z);
      mesh.rotation.y = (i % 2) * Math.PI / 2;
      scene.add(mesh);
      list.push({ x, z, name: def.name, index: i, mesh });
    }
    return list;
  }

  // Grey puffs for crashes and rammed police cars, reused from a pool.
  function buildSmokePool(scene, THREE) {
    const pool = [];
    for (let i = 0; i < 8; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
      const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), mat);
      puff.visible = false;
      puff.userData.life = 0;
      scene.add(puff);
      pool.push(puff);
    }
    return pool;
  }

  // Mission marker: yellow beacon pillar + floating diamond.
  function buildMarker(scene, THREE) {
    const marker = new THREE.Group();
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.35 }));
    pillar.position.y = 20;
    marker.add(pillar);
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(2),
      new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    diamond.position.y = 12;
    diamond.name = 'MarkerDiamond';
    marker.add(diamond);
    scene.add(marker);
    return marker;
  }

  function spawnSmokePuff(x, z) {
    const puff = smokePool.find((p) => !p.visible);
    if (!puff) return;
    puff.position.set(x, 2.5, z);
    puff.userData.life = 90;
    puff.visible = true;
  }

  // An enemy: red body, skin head, and a health bar that is part of him.
  // The bar lives in its own group in the scene (not inside the enemy's
  // rotating group) and copies the camera's rotation every frame, so it
  // always faces the viewer — a billboard. A short white stem joins the
  // bar to the top of his head, so the bar can never read as a floating
  // strip at the top of the frame the way v2's fixed box did. The fill
  // shrinks from the right and shifts green to amber to red as he is hurt.
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
    scene.add(g);
    const bar = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(ENEMY_BAR.width + 0.24, ENEMY_BAR.height + 0.24, 0.1),
      new THREE.MeshBasicMaterial({ color: ENEMY_BAR.frame }));
    frame.position.y = ENEMY_BAR.y;
    bar.add(frame);
    const back = new THREE.Mesh(new THREE.BoxGeometry(ENEMY_BAR.width, ENEMY_BAR.height, 0.12),
      new THREE.MeshBasicMaterial({ color: ENEMY_BAR.back }));
    back.position.y = ENEMY_BAR.y;
    bar.add(back);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(ENEMY_BAR.width - 0.16, ENEMY_BAR.height - 0.16, 0.14),
      new THREE.MeshBasicMaterial({ color: ENEMY_BAR.full }));
    fill.position.y = ENEMY_BAR.y;
    fill.name = 'EnemyHealthBar';
    bar.add(fill);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.22, ENEMY_BAR.stem, 0.1),
      new THREE.MeshBasicMaterial({ color: ENEMY_BAR.frame }));
    stem.position.y = ENEMY_BAR.y - ENEMY_BAR.height / 2 - ENEMY_BAR.stem / 2 + 0.1;
    bar.add(stem);
    scene.add(bar);
    g.userData.barGroup = bar;
    g.userData.barFill = fill;
    return g;
  }

  function resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function syncPlayer(state) {
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
      if (flash.visible) flash.scale.setScalar(0.85 + Math.random() * 0.45);
    }
  }

  function syncCrowd(state) {
    for (const t of state.traffic) {
      if (!t.mesh) continue;
      t.mesh.position.z = t.z; t.mesh.position.x = t.x;
      // Traffic drives along z: dir +1 is heading 0 (south), dir -1 is
      // heading PI (north). Same -PI/2 rule as the player car, or every
      // traffic car sits sideways across its lane too.
      t.mesh.rotation.y = t.dir >= 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    for (const p of state.pedestrians) {
      if (p.mesh) { p.mesh.position.x = p.x; p.mesh.position.z = p.z; }
    }
  }

  function syncPoliceChase(state) {
    // Police cars face the player (their forward is local +x).
    for (const car of state.police) {
      const dx = state.player.x - car.position.x;
      const dz = state.player.z - car.position.z;
      car.rotation.y = Math.atan2(-dz, dx);
    }
    // Helicopter spotlight pool on the ground under the helicopter.
    if (state.helicopter && state.heliSpot) {
      state.heliSpot.visible = true;
      state.heliSpot.position.set(state.helicopter.position.x, 0.7, state.helicopter.position.z);
    } else if (state.heliSpot) {
      state.heliSpot.visible = false;
    }
  }

  function syncEnemies(state) {
    for (const e of state.enemies || []) {
      if (!e.mesh) e.mesh = makeEnemyMesh(e);
      e.mesh.visible = !!e.alive;
      const bar = e.mesh.userData.barGroup;
      if (bar) bar.visible = !!e.alive;
      if (!e.alive) continue;
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(state.player.x - e.x, state.player.z - e.z);
      // Billboard: the bar group sits at the enemy and turns with the
      // camera, so the bar always reads flat-on, attached by its stem.
      bar.position.set(e.x, 0, e.z);
      bar.quaternion.copy(camera.quaternion);
      const fill = e.mesh.userData.barFill;
      const frac = Math.max(0, e.health / e.maxHealth);
      fill.scale.x = frac;
      fill.position.x = -(ENEMY_BAR.width - 0.16) * (1 - frac) / 2;
      fill.material.color.set(frac > 0.66 ? ENEMY_BAR.full : frac > 0.33 ? ENEMY_BAR.half : ENEMY_BAR.low);
    }
  }

  function syncEffects(state) {
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
    const stage = state.mission && !state.mission.done ? state.mission.def.stages[state.mission.stage] : null;
    marker.visible = !!stage;
    if (stage) {
      marker.position.set(stage.x, 0, stage.z);
      const diamond = marker.getObjectByName('MarkerDiamond');
      if (diamond) diamond.rotation.y += 0.05;
    }
    const wheel = city.getObjectByName('FerrisWheel');
    if (wheel) wheel.rotation.z += 0.002;
  }

  function placeCamera(state, screen) {
    if (screen === SCREEN_TITLE) {
      // Bukit vista looking west: sea, ferris wheel and sun in frame.
      // (A closer camera at (-120, 35, 40) filled the frame with one
      // building wall, so the wide vista from (140, 55, 190) is the one
      // that reads; this angle keeps the sun and the sea in the frame.)
      camera.position.set(-60, 42, 80);
      camera.lookAt(-200, 18, -50);
      return;
    }
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

  function draw(state, screen) {
    resize();
    syncPlayer(state);
    syncCrowd(state);
    syncPoliceChase(state);
    syncEnemies(state);
    syncEffects(state);
    placeCamera(state, screen);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();
  return { draw, scene, camera, renderer, traffic, pedestrians, parked, playerCar, playerMesh };
}

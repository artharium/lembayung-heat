// Render: Three.js scene, sunset light, chase camera, mesh sync.
// Key setup first: createRenderer builds the scene, draw syncs it.
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
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  const ambient = new THREE.AmbientLight(0xffe0b3, 0.9);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xff9e5e, 1.4);
  sun.position.set(-120, 90, -60);
  scene.add(sun);
  // Sun disc + sky gradient are faked with a big orange sphere low on the west.
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  sunBall.position.set(-280, 55, -80);
  scene.add(sunBall);
  const city = buildCityDistricts(scene, THREE, rand);
  const traffic = spawnTraffic(scene, THREE, rand, 12);
  const pedestrians = spawnPedestrians(scene, THREE, rand, 20);
  // Player mesh: a standing figure on foot.
  const playerMesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x118ab2 }));
  body.position.y = 1.2;
  playerMesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
  head.position.y = 2.6;
  playerMesh.add(head);
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
  // Player car mesh (hidden until in a car).
  const playerCar = makeCarMesh(THREE, CARS[0].color, false);
  playerCar.visible = false;
  scene.add(playerCar);
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
  function resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function draw(state, screen) {
    resize();
    // Sync player / car.
    playerCar.visible = state.inCar;
    playerMesh.visible = !state.inCar;
    if (state.inCar) {
      playerCar.position.set(state.player.x, 1, state.player.z);
      playerCar.rotation.y = state.player.heading + Math.PI;
    } else {
      playerMesh.position.set(state.player.x, 0, state.player.z);
      playerMesh.rotation.y = state.player.heading;
    }
    // Traffic + pedestrians sync (their x/z live in state arrays, meshes in scene).
    // Traffic meshes are stored on the state objects by main.js; here we move
    // the scene children that carry userData.speed.
    for (const t of state.traffic) {
      if (t.mesh) { t.mesh.position.z = t.z; t.mesh.position.x = t.x; }
    }
    for (const p of state.pedestrians) {
      if (p.mesh) { p.mesh.position.x = p.x; p.mesh.position.z = p.z; }
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
      camera.position.set(150, 70, 190);
      camera.lookAt(0, 10, -40);
    } else {
      const camAngle = state.cameraAngle || 0;
      const back = state.player.heading + Math.PI + camAngle;
      const dist = state.inCar ? 10 : 8;
      const height = state.inCar ? 4.5 : 4;
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

// City: Lembayung's 5 districts as low-poly Three.js geometry — windowed
// towers, a skyline, roads with lane markings, crosswalks and sidewalks,
// the pier with its ferris wheel, the night-market stalls, palms, traffic
// and pedestrians. Everything is seeded, so the same seed builds the same
// city. v3 pulls the beach-road traffic closer together (five hero cars in
// a tight stagger instead of three far apart) and gives the market crates
// and sign boards, so both read at a glance in a small thumbnail.
import { DISTRICTS, ROAD_GAP, WORLD_SIZE } from './config.js';

export function buildCityDistricts(scene, THREE, rand) {
  const group = new THREE.Group();
  group.name = 'LembayungCity';
  buildGround(group, THREE);
  buildRoads(group, THREE);
  buildRoadMarkings(group, THREE);
  buildSidewalks(group, THREE);
  // Buildings: windowed towers. One shared canvas texture draws the window
  // grid; each tower tints it with its own palette colour, so a box reads
  // as a building at a glance instead of a flat slab.
  const facade = makeFacadeTexture(THREE);
  const palette = [0xf2f2f2, 0xffb703, 0xfb8500, 0x2ec4b6, 0xe07a5f, 0x8ecae6];
  const buildingGeo = new THREE.BoxGeometry(18, 20, 18);
  for (let x = -147; x <= 147; x += ROAD_GAP) {
    for (let z = -147; z <= 147; z += ROAD_GAP) {
      if (Math.abs(x) < 12 || Math.abs(z) < 12) continue;
      // Keep the Pasar Malam plaza open: no wall in front of the stalls.
      if (x + 12 >= -70 && x + 12 <= -10 && z + 12 >= 90 && z + 12 <= 135) continue;
      if (rand.next() < 0.25) continue;
      const h = 8 + rand.next() * 34;
      const mat = new THREE.MeshLambertMaterial({
        map: facade, color: palette[Math.floor(rand.next() * palette.length)],
      });
      const b = new THREE.Mesh(buildingGeo, mat);
      b.scale.y = h / 20;
      b.position.set(x + 12, h / 2, z + 12);
      group.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4),
        new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      roof.position.set(x + 12, h + 1, z + 12);
      group.add(roof);
    }
  }
  buildSkyline(group, THREE, facade, rand);
  buildPier(group, THREE);
  buildMarket(group, THREE, rand);
  buildPalms(group, THREE, rand);
  scene.add(group);
  return group;
}

// Ground: grass base, turquoise sea west, sand beach along the coast road.
function buildGround(group, THREE) {
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD_SIZE * 2, 1, WORLD_SIZE * 2),
    new THREE.MeshLambertMaterial({ color: 0x3a5f3a }));
  ground.position.y = -0.5;
  group.add(ground);
  const sea = new THREE.Mesh(
    new THREE.BoxGeometry(220, 1, WORLD_SIZE * 2),
    new THREE.MeshLambertMaterial({ color: 0x2ec4b6 }));
  sea.position.set(-300, 0.2, 0);
  group.add(sea);
  // Beach strip x=-196..-140, top just below the road top so the sand never
  // buries the beach road or the car in the cover shot.
  const beach = new THREE.Mesh(
    new THREE.BoxGeometry(56, 1.2, WORLD_SIZE * 2),
    new THREE.MeshLambertMaterial({ color: 0xe9d8a6 }));
  beach.position.set(-168, -0.1, 0);
  group.add(beach);
}

// Roads: dark asphalt grid, one strip per ROAD_GAP.
function buildRoads(group, THREE) {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2d42 });
  for (let x = -168; x <= 168; x += ROAD_GAP) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, WORLD_SIZE), roadMat);
    road.position.set(x, 0.3, 0);
    group.add(road);
  }
  for (let z = -168; z <= 168; z += ROAD_GAP) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE, 0.6, 10), roadMat);
    road.position.set(0, 0.3, z);
    group.add(road);
  }
}

// One canvas texture, shared by every tower: a pale facade with a grid of
// dark windows, a few of them lit warm. Tinting comes from the material
// colour, and a darker base band grounds each tower.
export function makeFacadeTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f5efe4'; g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = ((row * 6 + col) % 8) === 0;
      g.fillStyle = lit ? '#ffd166' : '#2b3a4a';
      g.fillRect(8 + col * 20, 10 + row * 20, 12, 13);
    }
  }
  g.fillStyle = '#3a3a3a'; g.fillRect(0, 238, 128, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tall skyline towers along the north edge and the beach road, so the cover
// (looking north-west from the beach road) sees a real city skyline, not
// empty sky, and the title vista has towers against the sea.
export function buildSkyline(group, THREE, facade, rand) {
  const spots = [
    [-150, -168, 78], [-96, -168, 62], [-42, -168, 88], [12, -168, 55],
    [66, -168, 72], [120, -168, 60], [-120, -150, 48], [-60, -160, 66],
    [150, -120, 52], [-168, -84, 44],
  ];
  const geo = new THREE.BoxGeometry(20, 20, 20);
  const tints = [0xf2f2f2, 0xffb703, 0x8ecae6, 0xe07a5f];
  for (const [x, z, h] of spots) {
    const mat = new THREE.MeshLambertMaterial({
      map: facade, color: tints[Math.floor(rand.next() * tints.length)],
    });
    const tower = new THREE.Mesh(geo, mat);
    tower.scale.y = h / 20;
    tower.position.set(x, h / 2, z);
    group.add(tower);
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 3),
      new THREE.MeshBasicMaterial({ color: 0xff5d5d }));
    beacon.position.set(x, h + 1, z);
    group.add(beacon);
  }
  return group;
}

// Lane markings and crosswalks as instanced meshes: hundreds of dashes,
// one draw call. Centre dashes on every road; zebra crossings where the
// beach road and the market road meet the cross streets.
export function buildRoadMarkings(group, THREE) {
  const dashGeo = new THREE.BoxGeometry(0.3, 0.08, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f0dc });
  const spots = [];
  for (let x = -168; x <= 168; x += ROAD_GAP) {
    for (let z = -160; z <= 160; z += 10) spots.push([x, z, 0]);
  }
  for (let z = -168; z <= 168; z += ROAD_GAP) {
    for (let x = -160; x <= 160; x += 10) spots.push([x, z, 1]);
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z, rot], i) => {
    m.makeRotationY(rot ? Math.PI / 2 : 0);
    m.setPosition(x, 0.65, z);
    dashes.setMatrixAt(i, m);
  });
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);
  // Zebra crossings: 5 stripes across the road at beach-road and market
  // intersections.
  const stripeGeo = new THREE.BoxGeometry(0.9, 0.08, 9);
  const crossings = [];
  for (let z = -126; z <= 126; z += 42) {
    for (let s = 0; s < 5; s += 1) crossings.push([-168, z - 3.2 + s * 1.6, 0]);
  }
  for (let x = -126; x <= 126; x += 42) {
    for (let s = 0; s < 5; s += 1) crossings.push([x - 3.2 + s * 1.6, 126, 1]);
  }
  const stripes = new THREE.InstancedMesh(stripeGeo, dashMat, crossings.length);
  crossings.forEach(([x, z, rot], i) => {
    m.makeRotationY(rot ? Math.PI / 2 : 0);
    m.setPosition(x, 0.65, z);
    stripes.setMatrixAt(i, m);
  });
  stripes.instanceMatrix.needsUpdate = true;
  group.add(stripes);
  return group;
}

// Pale sidewalks beside the beach road and the market road, so the streets
// have edges and the pedestrians have somewhere to walk.
export function buildSidewalks(group, THREE) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xd9c9a8 });
  const walk = (w, d, x, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), mat);
    s.position.set(x, 0.55, z);
    group.add(s);
  };
  walk(3, WORLD_SIZE, -161.5, 0);
  walk(3, WORLD_SIZE, -174.5, 0);
  walk(WORLD_SIZE, 3, 0, 119.5);
  walk(WORLD_SIZE, 3, 0, 132.5);
  return group;
}

export function buildPier(group, THREE) {
  const wood = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 12), wood);
  pier.position.set(-200, 1, -40);
  group.add(pier);
  // Ferris wheel: torus rim + spokes, turning slowly in the render loop.
  const wheel = new THREE.Group();
  wheel.name = 'FerrisWheel';
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 1, 8, 24),
    new THREE.MeshLambertMaterial({ color: 0xef476f }));
  wheel.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1, 32, 1),
      new THREE.MeshLambertMaterial({ color: 0xffd166 }));
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
  }
  wheel.position.set(-215, 22, -40);
  group.add(wheel);
  return wheel;
}

// Market stalls, bigger than v1 (7 wide, 4 tall) with striped awnings and
// goods on the counter, plus crates and sign boards between them, so a stall
// reads as a market stall at 250px wide and the market floor is not empty.
export function buildMarket(group, THREE, rand) {
  const colours = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2];
  for (let i = 0; i < 10; i += 1) {
    const sx = -60 + (i % 5) * 10; const sz = 100 + Math.floor(i / 5) * 10;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 5),
      new THREE.MeshLambertMaterial({ color: colours[i % colours.length] }));
    stall.position.set(sx, 2, sz);
    group.add(stall);
    // Striped awning: alternating bright panels, so the stall top reads
    // even in the small on-foot thumbnail.
    for (let s = 0; s < 4; s += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 6),
        new THREE.MeshLambertMaterial({ color: s % 2 ? 0xf2f2f2 : colours[i % colours.length] }));
      panel.position.set(sx - 2.8 + s * 1.9, 4.3, sz);
      group.add(panel);
    }
    const goods = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xffd166 }));
    goods.position.set(sx - 1.8, 4.6, sz);
    group.add(goods);
    // A hanging lantern, so the market glows at dusk.
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb703 }));
    lamp.position.set(sx + 2, 5, sz);
    group.add(lamp);
  }
  // Crates between the stall rows and a pair of sign boards at the market
  // mouth, so the plaza floor reads as a busy market, not bare asphalt.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
  for (let i = 0; i < 6; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    crate.position.set(-58 + i * 9, 0.8, 96 + (i % 2) * 18);
    group.add(crate);
  }
  const signMat = new THREE.MeshLambertMaterial({ color: 0xffd166 });
  for (const sx of [-64, -16]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x5a3a1a }));
    post.position.set(sx, 2.5, 94);
    group.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 0.4), signMat);
    board.position.set(sx, 5.2, 94);
    group.add(board);
  }
  return group;
}

export function buildPalms(group, THREE, rand) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7f5539 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d6a4f });
  for (let i = 0; i < 40; i += 1) {
    const x = -170 + rand.next() * 330;
    const z = -170 + rand.next() * 330;
    if (Math.abs(x % ROAD_GAP) < 8 || Math.abs(z % ROAD_GAP) < 8) continue;
    // No palms in the cover staging corridor (beach road, z 20..140) or
    // the market plaza: a random palm there lands between the camera and
    // the player and fills the whole frame with a trunk.
    if (x >= -185 && x <= -145 && z >= 20 && z <= 140) continue;
    if (x >= -70 && x <= -10 && z >= 90 && z <= 135) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.set(x, 4.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 6), leafMat);
    leaves.position.set(x, 11, z);
    group.add(leaves);
  }
  return group;
}

export function spawnTraffic(scene, THREE, rand, count) {
  const cars = [];
  const colours = rand.shuffle([0xffb703, 0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0xf2f2f2]);
  for (let i = 0; i < count; i += 1) {
    const car = makeCarMesh(THREE, colours[i % colours.length], false);
    // Five hero cars drive the beach road (x=-168) in a tight stagger,
    // 22m apart, so the cover frame always has real traffic in it close
    // to the camera — seeded, so the same seed always gives the same
    // frame. Each car sits in a lane (offset +/-2.5 from the road centre),
    // never on the line.
    const onBeach = i < 5;
    const lane = i % 2 ? 2.5 : -2.5;
    const px = onBeach ? -168 + lane : -168 + (i % 9) * ROAD_GAP + lane;
    const pz = onBeach ? -20 - i * 22 + rand.next() * 4 : -160 + rand.next() * 320;
    car.position.set(px, 1, pz);
    car.userData = {
      speed: 8 + rand.next() * 6, baseSpeed: 8 + rand.next() * 6,
      dir: rand.next() > 0.5 ? 1 : -1, lane: i % 2, nearMissed: false,
    };
    car.userData.speed = car.userData.baseSpeed;
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function spawnPedestrians(scene, THREE, rand, count) {
  const peds = [];
  const shirts = [0xef476f, 0xffd166, 0x118ab2, 0xf2f2f2, 0x06d6a0, 0xfb8500];
  for (let i = 0; i < count; i += 1) {
    const ped = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.7, 1.2, 4, 8),
      new THREE.MeshLambertMaterial({ color: shirts[i % shirts.length] }));
    body.position.y = 1.4;
    ped.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
    head.position.y = 2.9;
    ped.add(head);
    // First six pedestrians are the Pasar Malam crowd, around the stalls,
    // so the market is busy in real play, not empty.
    const inMarket = i < 6;
    const px = inMarket ? -55 + i * 6 + rand.next() * 2 : -160 + rand.next() * 320;
    const pz = inMarket ? 96 + (i % 3) * 12 + rand.next() * 2 : -160 + rand.next() * 320;
    ped.position.set(px, 0, pz);
    ped.userData = { speed: 1 + rand.next(), dir: rand.next() * Math.PI * 2 };
    scene.add(ped);
    peds.push(ped);
  }
  return peds;
}

// A car that reads as a car at 768px: dark window band, bright headlights,
// red tail lights, a rear spoiler, and real wheels. Police cars are white
// with a red/blue light bar and a black hood stripe — they read as police,
// not traffic. Forward is the local +x axis.
export function makeCarMesh(THREE, color, isPolice) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 2.1), bodyMat);
  body.position.y = 0.8;
  car.add(body);
  car.userData.bodyMat = bodyMat;
  // Window band: dark glass around the cabin, inset so the cabin reads as
  // glass, not a black box.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x0d2733 }));
  glass.position.set(-0.3, 1.75, 0);
  car.add(glass);
  const roofMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x111111 : color });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.8), roofMat);
  roof.position.set(-0.3, 2.2, 0);
  car.add(roof);
  car.userData.roofMat = roofMat;
  // Headlights (front, +x) and tail lights (rear, -x).
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const wz of [0.7, -0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.45), lampMat);
    lamp.position.set(2.22, 0.75, wz);
    car.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tail.position.set(-2.22, 0.75, wz);
    car.add(tail);
  }
  // Rear spoiler.
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  spoiler.position.set(-1.95, 2.05, 0);
  car.add(spoiler);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[1.5, 1], [1.5, -1], [-1.5, 1], [-1.5, -1]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    car.add(w);
  }
  if (isPolice) {
    // Black hood stripe + red/blue light bar on the roof.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    stripe.position.set(1.4, 1.38, 0);
    car.add(stripe);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    red.position.set(-0.3, 2.45, -0.45);
    red.name = 'PoliceLightRed';
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(-0.3, 2.45, 0.45);
    blue.name = 'PoliceLightBlue';
    car.add(blue);
  }
  return car;
}

export function districtAt(x, z) {
  let best = DISTRICTS[0]; let bestD = 1e9;
  for (const d of DISTRICTS) {
    const dd = (d.x - x) ** 2 + (d.z - z) ** 2;
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.name;
}

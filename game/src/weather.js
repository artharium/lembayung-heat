// Weather: a living sky over Lembayung. The cycle turns every ninety
// seconds of game time — Clear, Light Rain, Heavy Rain, Fog — and the
// world answers: rain streaks on the streets, a grey veil in the fog,
// choppier seas when it pours, and a lighthouse beam that only shows
// when the mist rolls in.
import { WEATHER_CYCLE } from './config.js';

const CYCLE_SECONDS = 90;
const RAIN_STREAKS = 90;
const RAINBOW_SECONDS = 20;
const FLASH_SECONDS = 0.25;

function weatherState(state) {
  if (!state.weatherState) {
    state.weatherState = { index: 0, timer: 0, rainMeshes: null, fogMesh: null, veil: null };
  }
  if (!state.weather) {
    const savedId = state.weatherId;
    state.weather = WEATHER_CYCLE.find((w) => w.id === savedId) || WEATHER_CYCLE[0];
  }
  if (state.weatherChanges === undefined) state.weatherChanges = 0;
  return state.weatherState;
}

export function setWeather(state, id) {
  const ws = weatherState(state);
  const found = WEATHER_CYCLE.findIndex((w) => w.id === id);
  if (found < 0) return state.weather;
  ws.index = found;
  ws.timer = 0;
  state.weather = WEATHER_CYCLE[found];
  state.weatherChanges += 1;
  state.splash = { text: `WEATHER — ${state.weather.label}`, timer: 2 };
  return state.weather;
}

function advanceWeather(state) {
  const ws = weatherState(state);
  const leaving = WEATHER_CYCLE[ws.index];
  ws.index = (ws.index + 1) % WEATHER_CYCLE.length;
  ws.timer = 0;
  state.weather = WEATHER_CYCLE[ws.index];
  state.weatherChanges += 1;
  if (leaving && leaving.rain > 0 && state.weather.rain === 0) {
    ws.rainbow = RAINBOW_SECONDS;
  }
  if (state.weather.id === 'heavy-rain') {
    ws.lightning = 8 + Math.random() * 7;
  }
  state.splash = { text: `WEATHER — ${state.weather.label}`, timer: 2 };
}

export function updateWeather(state, dt, THREE) {
  const ws = weatherState(state);
  ws.timer += dt;
  if (ws.timer >= CYCLE_SECONDS) advanceWeather(state);
  if (ws.flash > 0) ws.flash = Math.max(0, ws.flash - dt);
  if (ws.rainbow > 0) ws.rainbow = Math.max(0, ws.rainbow - dt);
  if (state.weather && state.weather.id === 'heavy-rain') {
    if (ws.lightning === undefined) ws.lightning = 8 + Math.random() * 7;
    ws.lightning -= dt;
    if (ws.lightning <= 0) {
      ws.flash = FLASH_SECONDS;
      ws.lightning = 8 + Math.random() * 7;
      state.splash = { text: 'LIGHTNING STRIKE — THE SKY SPLIT OPEN', timer: 2 };
    }
  }
  applyWeather(state, THREE);
}

function makeRainStreak(THREE) {
  const geo = new THREE.BufferGeometry();
  const top = new Float32Array([0, 0, 0, 0, -2.4, 0]);
  geo.setAttribute('position', new THREE.BufferAttribute(top, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xbcd6ff, transparent: true, opacity: 0.55 });
  return new THREE.Line(geo, mat);
}

function makeFogVeil(THREE) {
  const geo = new THREE.PlaneGeometry(220, 130);
  const mat = new THREE.MeshBasicMaterial({ color: 0xc9cfc8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function applyWeather(state, THREE) {
  const ws = weatherState(state);
  const w = state.weather || WEATHER_CYCLE[0];
  if (!THREE || !state.scene) return;
  if (!ws.rainMeshes) {
    ws.rainMeshes = [];
    for (let i = 0; i < RAIN_STREAKS; i += 1) {
      const streak = makeRainStreak(THREE);
      streak.visible = false;
      state.scene.add(streak);
      ws.rainMeshes.push(streak);
    }
    ws.veil = makeFogVeil(THREE);
    ws.veil.visible = false;
    state.scene.add(ws.veil);
    ws.rainbowMesh = makeRainbow(THREE);
    ws.rainbowMesh.visible = false;
    state.scene.add(ws.rainbowMesh);
  }
  const px = state.player ? state.player.x : 0;
  const pz = state.player ? state.player.z : 0;
  const now = performance.now() / 1000;
  for (let i = 0; i < ws.rainMeshes.length; i += 1) {
    const streak = ws.rainMeshes[i];
    const show = w.rain > 0 && i < Math.floor(RAIN_STREAKS * w.rain);
    streak.visible = show;
    if (!show) continue;
    const seed = i * 7.31;
    const fall = ((now * 14 + seed) % 26);
    streak.position.set(
      px + Math.sin(seed) * 42,
      24 - fall,
      pz + Math.cos(seed * 1.3) * 42,
    );
  }
  if (ws.veil) {
    ws.veil.visible = w.fog > 0.3 || ws.flash > 0;
    ws.veil.position.set(px, 1.2, pz);
    if (ws.flash > 0) {
      ws.veil.material.color.setHex(0xffffff);
      ws.veil.material.opacity = 0.55;
    } else {
      ws.veil.material.color.setHex(0x8a97a8);
      ws.veil.material.opacity = 0.1 + w.fog * 0.12;
    }
  }
  if (ws.rainbowMesh) {
    const showRainbow = (ws.rainbow || 0) > 0;
    ws.rainbowMesh.visible = showRainbow;
    if (showRainbow) {
      ws.rainbowMesh.position.set(px, 0.5, pz - 55);
    }
  }
  if (state.scene && state.scene.fog) {
    state.scene.fog.near = w.fog > 0.3 ? 28 : 90;
    state.scene.fog.far = w.fog > 0.3 ? 120 : 320;
  }
  if (w.slip > 0 && state.player && state.inCar) {
    const sp = state.player.speed || 0;
    if (Math.abs(sp) > 1) state.player.speed = sp * (1 - w.slip * 0.02);
  }
  state.seaChop = 1 + w.rain * 1.6;
  state.lampGlow = 1 + w.rain * 0.8 + w.fog * 0.4;
}

export function drawWeather(state, THREE) {
  applyWeather(state, THREE);
}

export function weatherHudLine(state) {
  const w = state.weather || WEATHER_CYCLE[0];
  return w.label;
}

export function weatherSummary(state) {
  const w = state.weather || WEATHER_CYCLE[0];
  return { current: w.label, changes: state.weatherChanges || 0, rain: w.rain, fog: w.fog };
}

// Rainbow: three stacked half-arcs that appear for twenty seconds after
// the rain clears. It sits north of the player, facing south, so it is
// visible the moment the sky opens.
function makeRainbow(THREE) {
  const group = new THREE.Group();
  const bands = [
    { radius: 34, color: 0xff5a5a },
    { radius: 32, color: 0xffd34d },
    { radius: 30, color: 0x4d9fff },
  ];
  for (const band of bands) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(band.radius, 1.1, 6, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: band.color, transparent: true, opacity: 0.75 }),
    );
    group.add(arc);
  }
  return group;
}

// Lightning forecast: how many seconds until the next strike, or null
// when the sky is not in heavy rain. The HUD uses it for a warning chip.
export function nextLightningIn(state) {
  const ws = weatherState(state);
  if (!state.weather || state.weather.id !== 'heavy-rain') return null;
  return Math.max(0, Math.ceil(ws.lightning || 0));
}

export function rainbowActive(state) {
  const ws = weatherState(state);
  return (ws.rainbow || 0) > 0;
}

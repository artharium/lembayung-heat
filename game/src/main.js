// Lembayung Heat — boot and the one loop. The world advances in fixed
// 1/60 s steps, the renderer paints what is there. Screens: title, play,
// paused, map. ?shot=cover|chase|onfoot|map|title&seed=1 stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP, RADIOS } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MAP, ACTION_ENTER, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_MAP } from './render.js';
import { stageShot } from './shots.js';
import { updateHud } from './hud.js';
import { showTitleScreen, showMapScreen, showPauseScreen, hideScreens } from './screens.js';
import { saveGame, loadGame, loadAllSaves, hasSave } from './save.js';
import { startMission } from './missions.js';
import { startPoliceChase } from './police.js';

const THREE = window.THREE;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const rand = createRandom(seed);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas, THREE, rand);
const world = createWorld(rand);
const state = world.state;
state.scene = renderer.scene;
state.THREE = THREE;
window.__lembayung = state;
// Wire traffic / pedestrians / parked cars from the renderer into the state.
state.traffic = renderer.traffic.map((mesh) => ({ mesh, x: mesh.position.x, z: mesh.position.z, dir: mesh.userData.dir || 1, speed: mesh.userData.speed || 10 }));
state.pedestrians = renderer.pedestrians.map((mesh) => ({ mesh, x: mesh.position.x, z: mesh.position.z, dir: mesh.userData.dir || 0, speed: mesh.userData.speed || 1.5 }));
state.parkedCars = renderer.parked;
state.saves = loadAllSaves();

// Simple WebAudio beeps: mission complete, wanted up, shot. Radio is text only.
let audioCtx = null;
function beep(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch { /* sound is optional */ }
}

function runShot(name) {
  const scene = stageShot(name, world, state);
  hideScreens();
  const hud = document.getElementById('hud');
  if (name === 'map') { showMapScreen(state); if (hud) hud.style.display = 'none'; }
  else if (name === 'title') {
    showTitleScreen(state);
    if (hud) hud.style.display = 'none';
    const cb = document.getElementById('btn-continue');
    if (cb) cb.disabled = !hasSave();
  }
  updateHud(state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let radioTimer = 0;
  showTitleScreen(state);
  // Title buttons.
  const continueBtn = document.getElementById('btn-continue');
  const newBtn = document.getElementById('btn-new');
  if (continueBtn) {
    continueBtn.disabled = !hasSave();
    continueBtn.addEventListener('click', () => {
      loadGame(state, 0);
      startMission(state, Math.min(8, state.missionsDone + 1));
      startPlaying();
    });
  }
  if (newBtn) newBtn.addEventListener('click', () => { world.reset(); startPlaying(); });
  function startPlaying() {
    hideScreens();
    screen = SCREEN_PLAY;
    status.textContent = 'Playing Lembayung Heat. WASD move, E enter car, P pause, M map.';
  }
  function step() {
    const actions = input.takeActions();
    const drag = input.takeDrag();
    if (drag) state.cameraAngle += drag * 0.005;
    // Radio cycles with R (edge: only when the key was just pressed — we
    // approximate with a 300ms cooldown).
    radioTimer -= STEP;
    if (input.isDown('KeyR') && radioTimer <= 0) {
      state.radioIndex = (state.radioIndex + 1) % RADIOS.length;
      state.radio = RADIOS[state.radioIndex];
      radioTimer = 0.3;
    }
    if (input.isDown('Digit1')) state.weapon = 0;
    if (input.isDown('Digit2')) state.weapon = 1;
    if (input.isDown('Digit3')) state.weapon = 2;
    if (input.isDown('Digit4')) state.weapon = 3;
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startPlaying();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; showPauseScreen(state); return; }
      if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; hideScreens(); return; }
      if (screen === SCREEN_MAP) { screen = SCREEN_PLAY; hideScreens(); return; }
    }
    if (actions & ACTION_MAP) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_MAP; showMapScreen(state); return; }
      if (screen === SCREEN_MAP) { screen = SCREEN_PLAY; hideScreens(); return; }
    }
    if (screen !== SCREEN_PLAY) return;
    const before = state.missionsDone;
    world.step(STEP, input, actions);
    if (state.missionsDone > before) { beep(880, 0.2); saveGame(state, 0); }
    if (actions & 16) {
      // Shoot on foot: muzzle beep + wanted up if police are near.
      beep(220, 0.08);
      if (state.wanted < 3) { state.wanted = Math.min(5, state.wanted + 1); startPoliceChase(state, state.scene, THREE); }
    }
    updateHud(state);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (accumulator >= STEP) { step(); accumulator -= STEP; }
    renderer.draw(state, screen);
    if (screen === SCREEN_PLAY) updateHud(state);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; showPauseScreen(state); }
  });
  status.textContent = 'Lembayung Heat. Press Space or click to start.';
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

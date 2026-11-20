// Screenshot scenes behind ?shot=cover|chase|onfoot|map|title.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { startPoliceChase } from './police.js';
import { SCREEN_MAP, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export function stageShot(name, world, state) {
  const w = world;
  w.reset();
  state.shotMode = true;
  if (name === 'title') {
    state.player.x = 140; state.player.z = 140;
    state.mission = null;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'map') {
    state.missionsDone = 5; state.racesWon = 1; state.stuntJumps = 5;
    state.collectibles = state.collectibles.slice(0, 8);
    state.money = 18450; state.respect = 290;
    startMission(state, 6);
    return { screen: SCREEN_MAP, best: 0 };
  }
  if (name === 'onfoot') {
    state.player.x = -40; state.player.z = 120;
    state.inCar = false; state.weapon = 1;
    state.wanted = 2;
    startMission(state, 5);
    startPoliceChase(state, state.scene, state.THREE);
    // Walk forward a little so the market stalls are in frame.
    for (let i = 0; i < 60; i += 1) w.step(STEP, { direction: () => ({ x: 0, y: 1 }), isDown: () => false }, 0);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // cover / chase (default): in a car on the Pantai beach road, driving
  // north with the turquoise sea on the left and the city on the right,
  // 3+ police behind and the helicopter overhead, HUD complete.
  state.player.x = -160; state.player.z = 80;
  state.player.heading = Math.PI; state.player.speed = 28; state.inCar = true;
  state.carName = 'Elang Comet'; state.carIndex = 2; state.speedKmh = 111;
  state.money = 18450; state.respect = 290; state.health = 82; state.armour = 64;
  state.wanted = 5;
  startMission(state, 6);
  // Advance the mission to stage 3/4 so the HUD reads "STAGE 3/4".
  state.mission.stage = 2;
  state.dialogue = 'Mira: Engine patched. Go, go! The pier is straight ahead.';
  startPoliceChase(state, state.scene, state.THREE);
  // Keep 5 stars for the cover: the helicopter is the 5-star escalation.
  state.wanted = 5;
  // Drive forward for 2 seconds with the autopilot (straight, no steering).
  for (let i = 0; i < 120; i += 1) {
    w.step(STEP, { direction: () => ({ x: 0, y: 1 }), isDown: () => false }, 0);
  }
  // Reposition AFTER the drive, relative to the final player position, so
  // the chase is visible in the frame: two police cars ahead, the helicopter
  // above and ahead. The rest chase from behind, as the police list shows.
  if (state.police[0]) { state.police[0].position.set(state.player.x + 12, 1, state.player.z - 32); }
  if (state.police[1]) { state.police[1].position.set(state.player.x - 10, 1, state.player.z - 48); }
  if (state.helicopter) state.helicopter.position.set(state.player.x + 14, 13, state.player.z - 30);
  return { screen: SCREEN_PLAY, best: 0 };
}

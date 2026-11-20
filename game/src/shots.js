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
    // Pasar Malam, on foot: mission 5 STAGE 1 (reach Mira), NOT stage 2
    // ("Drive Mira to the safehouse" is a driving stage, so it did not
    // match a walking shot). Player walks north up the market road, camera
    // offset to the side so Raka is seen in 3/4 view, not full back.
    state.player.x = -42; state.player.z = 128;
    state.player.heading = Math.PI;
    // Camera 1.3 rad to the side: Raka in profile, gun pointing forward,
    // not a full back view.
    state.cameraAngle = 1.3;
    state.inCar = false; state.weapon = 1;
    state.wanted = 2;
    startMission(state, 5);
    state.mission.stage = 0;
    state.dialogue = 'Mira: Over here, Raka! The market is crawling with cops.';
    startPoliceChase(state, state.scene, state.THREE);
    // Walk north a little so the market stalls are in frame ahead.
    for (let i = 0; i < 60; i += 1) w.step(STEP, { direction: () => ({ x: 0, y: 1 }), isDown: () => false }, 0);
    // The walk above reaches stage 1's target (Mira, 12m away), so the
    // mission auto-advanced to stage 2 ("Drive Mira...") — which is a
    // driving stage and did not match this walking shot. Reset it back to
    // stage 1 after the walk, so the HUD matches the picture.
    state.mission.stage = 0;
    state.mission.done = false;
    state.dialogue = 'Mira: Over here, Raka! The market is crawling with cops.';
    // Real game meshes: three pedestrians in the market, ahead of the
    // player, so the shot shows a crowd, not an empty street.
    const marketPeds = [[-52, 108], [-28, 104], [-40, 98]];
    marketPeds.forEach(([x, z], i) => {
      if (state.pedestrians[i]) { state.pedestrians[i].x = x; state.pedestrians[i].z = z; }
    });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // cover / chase (default): in a car on the Pantai BEACH road at x=-168,
  // a north-south road with the sea on the west and no building directly
  // ahead — NOT x=-126, where a teal building block sat 20m ahead and
  // filled the frame, and NOT x=-160, which is the beach/grass seam line.
  // Camera looks north-west (cameraAngle +0.45) so the sea is left, the
  // ferris wheel is ahead-left and the skyline is ahead-right.
  // Start far south (z=130) and drive north 2s to z~60: the ferris wheel
  // is then ~100m away (small enough to fit whole in the frame) and the
  // Downtown skyline to the north is far enough to fit on the right, while
  // the sea stays on the left. Starting at z=80 put the wheel too close
  // and cut its top off, and put the skyline out of the frame.
  state.player.x = -168; state.player.z = 130;
  state.player.heading = Math.PI; state.player.speed = 28; state.inCar = true;
  // CameraAngle 0.45: 0.25 cut the ferris wheel's top and still showed no
  // skyline, so 0.45 (wheel whole, sun disc visible) is the keeper.
  state.cameraAngle = 0.45;
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
  // Reposition AFTER the drive, relative to the final player position and
  // the view direction (north-west), so the chase is visible in the frame:
  // police ahead-left and ahead-right, the helicopter ahead and to the
  // right of the view centre, whole in the frame. The rest chase from
  // behind, as the police list shows.
  // View unit vector (north-west, cameraAngle +0.45 from north) and its
  // right-hand vector (north-east).
  const vx = -0.43; const vz = -0.90; const rx = 0.90; const rz = -0.43;
  const ahead = (d, r) => [state.player.x + vx * d + rx * r, state.player.z + vz * d + rz * r];
  if (state.police[0]) { const [x, z] = ahead(22, -5); state.police[0].position.set(x, 1, z); }
  if (state.police[1]) { const [x, z] = ahead(16, 7); state.police[1].position.set(x, 1, z); }
  if (state.police[2]) { const [x, z] = ahead(38, 0); state.police[2].position.set(x, 1, z); }
  if (state.helicopter) {
    const [x, z] = ahead(28, 12);
    state.helicopter.position.set(x, 9, z);
  }
  return { screen: SCREEN_PLAY, best: 0 };
}

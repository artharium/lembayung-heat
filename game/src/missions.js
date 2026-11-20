// Missions: start, stage, complete. Key functions first. A mission is a
// row of the MISSIONS table plus live progress (stage, holdTimer, done);
// the world steps it, the HUD reads it, and completing a stage pays real
// money and respect. v3 adds a summary the map screen reads, so the stats
// there never drift from the mission state.
import { MISSIONS } from './config.js';

export function startMission(state, id) {
  const def = MISSIONS.find((m) => m.id === id);
  if (!def) return null;
  state.mission = { id: def.id, name: def.name, chapter: def.chapter, verb: def.verb, stage: 0, def, holdTimer: 0, done: false };
  state.missionElapsed = 0;
  state.enemiesSpawnedFor = '';
  state.dialogue = `Raka: ${def.name} — ${def.stages[0].text}`;
  return state.mission;
}

export function stagePay(mission) {
  return 250 + mission.id * 150;
}

export function completeMissionStage(state) {
  const m = state.mission;
  if (!m || m.done) return false;
  m.stage += 1;
  state.money += stagePay(m);
  state.respect += 20;
  if (m.stage >= m.def.stages.length) {
    m.done = true;
    state.missionsDone += 1;
    state.money += 500;
    if (m.def.verb === 'Race') state.racesWon += 1;
    state.splash = { text: `MISSION PASSED — ${m.def.name.toUpperCase()}  +$500`, timer: 3 };
    state.dialogue = `Mission complete: ${m.name} — $500 bonus. Nice work, Raka.`;
    return 'complete';
  }
  state.dialogue = `Stage ${m.stage + 1}/${m.def.stages.length}: ${m.def.stages[m.stage].text}`;
  return 'stage';
}

export function currentStage(state) {
  if (!state.mission || state.mission.done) return null;
  return state.mission.def.stages[state.mission.stage];
}

// One object for the map screen and the HUD: what is done, what is current,
// and what the current stage asks for — read from the live mission, so the
// numbers on the map can never disagree with the mission panel.
export function missionSummary(state) {
  const m = state.mission;
  const stage = currentStage(state);
  return {
    done: state.missionsDone,
    total: 8,
    current: m ? m.id : 0,
    chapter: m ? m.chapter : '',
    stageText: stage ? stage.text : 'No active mission',
    stageNum: m && !m.done ? m.stage + 1 : 0,
    stageTotal: m ? m.def.stages.length : 0,
    pay: m ? stagePay(m) : 0,
  };
}

export function stepMissions(state, dt) {
  const stage = currentStage(state);
  if (!stage) return null;
  const px = state.player.x; const pz = state.player.z;
  const d = Math.hypot(stage.x - px, stage.z - pz);
  state.stageDist = d;
  if (stage.type === 'escape') {
    if (state.wanted === 0) { completeMissionStage(state); return 'escape-done'; }
    return null;
  }
  if (stage.type === 'collect') {
    // Hold the target: the timer only runs while the player is at the
    // vault / cargo (within 12m), and it resets if they leave — the
    // stage must be held, not just waited out. The text says 10s, so
    // the timer is 10s. (The first version ran the timer anywhere and
    // finished in 3s, so the bank job completed while the player was
    // standing across town.)
    if (d < 12) {
      state.mission.holdTimer += dt;
      if (state.mission.holdTimer > 10) { completeMissionStage(state); return 'collect-done'; }
    } else {
      state.mission.holdTimer = 0;
    }
    return null;
  }
  if (stage.type === 'steal') {
    if (state.inCar) { completeMissionStage(state); return 'steal-done'; }
    return null;
  }
  // goto / race: reach the marker within 12 units.
  if (d < 12) { completeMissionStage(state); return 'goto-done'; }
  return null;
}

export function nextMissionId(state) {
  return Math.min(8, (state.mission ? state.mission.id : 0) + 1);
}

export function missionProgress(state) {
  return { done: state.missionsDone, total: 8, current: state.mission ? state.mission.id : 0 };
}

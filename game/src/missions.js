// Missions: start, stage, complete. Key functions first.
import { MISSIONS } from './config.js';

export function startMission(state, id) {
  const def = MISSIONS.find((m) => m.id === id);
  if (!def) return null;
  state.mission = { id: def.id, name: def.name, verb: def.verb, stage: 0, def, holdTimer: 0, done: false };
  state.dialogue = `Raka: ${def.name} — ${def.stages[0].text}`;
  return state.mission;
}

export function completeMissionStage(state) {
  const m = state.mission;
  if (!m || m.done) return false;
  m.stage += 1;
  state.money += 250 + m.id * 150;
  state.respect += 20;
  if (m.stage >= m.def.stages.length) {
    m.done = true;
    state.missionsDone += 1;
    state.money += 500;
    state.dialogue = `Mission complete: ${m.name} — $${500} bonus. Nice work, Raka.`;
    return 'complete';
  }
  state.dialogue = `Stage ${m.stage + 1}/${m.def.stages.length}: ${m.def.stages[m.stage].text}`;
  return 'stage';
}

export function currentStage(state) {
  if (!state.mission || state.mission.done) return null;
  return state.mission.def.stages[state.mission.stage];
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
    state.mission.holdTimer += dt;
    if (state.mission.holdTimer > 3) { completeMissionStage(state); return 'collect-done'; }
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

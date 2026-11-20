// Save: 3 slots in localStorage, autosave after each mission.
// Key functions first: saveGame, loadGame.
import { SAVE_KEY } from './config.js';

export function saveGame(state, slot) {
  const data = {
    money: state.money, respect: state.respect, missionsDone: state.missionsDone,
    racesWon: state.racesWon, stuntJumps: state.stuntJumps, collectibles: state.collectibles,
    exportsDone: state.exportsDone, districtJobs: state.districtJobs,
    carsStolen: state.carsStolen, copsEscaped: state.copsEscaped,
    missionId: state.mission ? state.mission.id : 1,
    player: { x: state.player.x, z: state.player.z },
    at: new Date().toISOString(),
  };
  try {
    const all = loadAllSaves();
    all[slot || 0] = data;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(all));
    state.saves = all;
    return true;
  } catch {
    return false;
  }
}

export function loadGame(state, slot) {
  const all = loadAllSaves();
  const data = all[slot || 0];
  if (!data) return false;
  state.money = data.money; state.respect = data.respect;
  state.missionsDone = data.missionsDone; state.racesWon = data.racesWon;
  state.stuntJumps = data.stuntJumps; state.collectibles = data.collectibles;
  state.exportsDone = data.exportsDone; state.districtJobs = data.districtJobs;
  state.carsStolen = data.carsStolen; state.copsEscaped = data.copsEscaped;
  if (data.player) { state.player.x = data.player.x; state.player.z = data.player.z; }
  state.saves = all;
  return true;
}

export function loadAllSaves() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasSave() {
  return loadAllSaves().length > 0 && !!loadAllSaves()[0];
}

// Save: 3 slots in localStorage, autosave after each mission.
// Key functions first: saveGame, loadGame. Saves are versioned (v3) and
// validated on load: a slot with a wrong version or a missing number is
// treated as empty instead of crashing the title screen. The combat
// counters (takedowns, shots fired) ride along as optional fields, so a
// v2 save still loads — they just start at zero. v3 adds the garage and
// the race results, restored through the garage's own validator.
import { SAVE_KEY } from './config.js';
import { restoreGarage } from './garage.js';

const SAVE_VERSION = 3;

export function saveGame(state, slot) {
  const data = {
    v: SAVE_VERSION,
    money: state.money, respect: state.respect, missionsDone: state.missionsDone,
    racesWon: state.racesWon, stuntJumps: state.stuntJumps, collectibles: state.collectibles,
    exportsDone: state.exportsDone, districtJobs: state.districtJobs,
    carsStolen: state.carsStolen, copsEscaped: state.copsEscaped,
    takedowns: state.takedowns || 0, shotsFired: state.shotsFired || 0,
    garage: state.garage || null, raceResults: state.raceResults || {},
    ammo: state.ammo, day: state.day, clockMin: state.clockMin,
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
  if (!data || !validSave(data)) return false;
  state.money = data.money; state.respect = data.respect;
  state.missionsDone = data.missionsDone; state.racesWon = data.racesWon;
  state.stuntJumps = data.stuntJumps; state.collectibles = data.collectibles;
  state.exportsDone = data.exportsDone; state.districtJobs = data.districtJobs;
  state.carsStolen = data.carsStolen; state.copsEscaped = data.copsEscaped;
  state.takedowns = typeof data.takedowns === 'number' ? data.takedowns : 0;
  state.shotsFired = typeof data.shotsFired === 'number' ? data.shotsFired : 0;
  if (data.garage) restoreGarage(state, data.garage);
  if (data.raceResults && typeof data.raceResults === 'object') state.raceResults = data.raceResults;
  if (Array.isArray(data.ammo)) state.ammo = data.ammo;
  if (typeof data.day === 'number') state.day = data.day;
  if (typeof data.clockMin === 'number') state.clockMin = data.clockMin;
  if (data.player) { state.player.x = data.player.x; state.player.z = data.player.z; }
  state.saves = all;
  return true;
}

// Empty one slot (the title screen never offers a delete button, but a
// fresh start is one call away for anything that needs it).
export function wipeSave(state, slot) {
  try {
    const all = loadAllSaves();
    all[slot || 0] = null;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(all));
    state.saves = all;
    return true;
  } catch {
    return false;
  }
}

export function validSave(data) {
  return !!data && data.v === SAVE_VERSION
    && typeof data.money === 'number' && typeof data.missionsDone === 'number'
    && typeof data.respect === 'number';
}

export function loadAllSaves() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => !s || validSave(s));
  } catch {
    return [];
  }
}

export function hasSave() {
  return loadAllSaves().length > 0 && !!loadAllSaves()[0];
}

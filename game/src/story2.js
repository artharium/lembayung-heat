// Epilogue: two missions that unlock after mission 8 (STORY COMPLETE).
// Mission 9, The Informant: meet a contact in Pasar Malam, survive a
// sixty-second ambush, then drive him to the Bukit safehouse. Mission 10,
// The Last Ferry: a timed night race to the Pelabuhan ferry with three
// rivals on your tail, then a five-star escape to the dock.
import { EPILOGUE } from './config.js';

const MEET_RADIUS = 8;
const SAFEHOUSE_RADIUS = 10;
const FERRY_RADIUS = 10;
const AMBUSH_DAMAGE_PER_SECOND = 3;
const RIVAL_LAP_SPEED = 26;

function epilogueState(state) {
  if (!state.epilogueState) {
    state.epilogueState = { unlocked: false, current: null, done: [], announced: false };
  }
  if (state.epilogueDone === undefined) state.epilogueDone = 0;
  if (state.epiloguePayouts === undefined) state.epiloguePayouts = 0;
  if (state.epilogueDone > 0 && !state.epilogueState.unlocked) {
    state.epilogueState.unlocked = true;
    state.epilogueState.done = state.epilogueDone >= 2 ? [9, 10] : [9];
  }
  return state.epilogueState;
}

export function unlockEpilogue(state) {
  const es = epilogueState(state);
  if (es.unlocked) return false;
  if ((state.missionsDone || 0) < 8) return false;
  es.unlocked = true;
  state.splash = { text: 'EPILOGUE UNLOCKED — 2 NEW MISSIONS', timer: 4 };
  return true;
}

export function startEpilogue(state, missionId) {
  const es = epilogueState(state);
  if (!es.unlocked || es.current) return false;
  const def = EPILOGUE.find((m) => m.id === missionId);
  if (!def) return false;
  const replay = es.done.includes(missionId);
  if (missionId === 10 && !es.done.includes(9)) return false;
  es.current = {
    id: def.id,
    title: def.title,
    phase: missionId === 9 ? 'meet' : 'race',
    timeLeft: missionId === 10 ? def.limit : 0,
    ambushLeft: missionId === 9 ? def.ambushSeconds : 0,
    enemies: [],
    rivals: [],
    payout: replay ? Math.floor(def.payout / 2) : def.payout,
    replay,
    introLines: def.intro ? def.intro.slice() : [],
    introIndex: 0,
  };
  if (es.current.introLines.length > 0) {
    state.dialogue = es.current.introLines[0];
  }
  if (missionId === 9) {
    for (let i = 0; i < def.ambushCount; i += 1) {
      es.current.enemies.push({
        x: def.meet.x + (i - 1.5) * 9,
        z: def.meet.z - 18 - (i % 2) * 8,
        hp: 100,
        speed: 3.2 + i * 0.3,
      });
    }
  }
  if (missionId === 10) {
    state.wanted = 5;
    for (let i = 0; i < def.rivals; i += 1) {
      es.current.rivals.push({
        lane: -6 + i * 6,
        progress: 0.12 + i * 0.05,
        speed: RIVAL_LAP_SPEED + i * 1.5,
      });
    }
  }
  state.splash = { text: `MISSION ${def.id} — ${def.title.toUpperCase()}`, timer: 4 };
  return true;
}

function finishEpilogueMission(state) {
  const es = epilogueState(state);
  const cur = es.current;
  if (!cur) return 0;
  state.money = (state.money || 0) + cur.payout;
  state.epiloguePayouts += cur.payout;
  state.epilogueDone += 1;
  es.done.push(cur.id);
  es.current = null;
  if (es.done.length >= 2) {
    state.splash = { text: 'EPILOGUE COMPLETE — LEGEND OF LEMBAYUNG', timer: 6 };
  } else {
    state.splash = { text: `MISSION ${cur.id} COMPLETE +$${cur.payout}`, timer: 4 };
  }
  return cur.payout;
}

function failEpilogueMission(state, reason) {
  const es = epilogueState(state);
  const cur = es.current;
  if (!cur) return;
  es.current = null;
  state.splash = { text: `MISSION ${cur.id} FAILED — ${reason}`, timer: 4 };
}

function updateMissionNine(state, dt) {
  const es = epilogueState(state);
  const cur = es.current;
  const def = EPILOGUE[0];
  if (cur.phase === 'meet') {
    const d = Math.hypot(def.meet.x - state.player.x, def.meet.z - state.player.z);
    if (d < MEET_RADIUS) {
      cur.phase = 'ambush';
      advanceEpilogueDialogue(state);
      state.splash = { text: 'AMBUSH — SURVIVE 60 SECONDS', timer: 3 };
    }
    return;
  }
  if (cur.phase === 'ambush') {
    cur.ambushLeft -= dt;
    for (const enemy of cur.enemies) {
      const dx = state.player.x - enemy.x;
      const dz = state.player.z - enemy.z;
      const d = Math.hypot(dx, dz) || 1;
      enemy.x += (dx / d) * enemy.speed * dt;
      enemy.z += (dz / d) * enemy.speed * dt;
      if (d < 3.5) {
        state.health = Math.max(0, (state.health || 100) - AMBUSH_DAMAGE_PER_SECOND * dt);
      }
    }
    if ((state.health || 0) <= 0) {
      failEpilogueMission(state, 'RAKA WENT DOWN');
      return;
    }
    if (cur.ambushLeft <= 0) {
      cur.phase = 'escort';
      advanceEpilogueDialogue(state);
      state.splash = { text: 'INFORMANT SAFE — DRIVE HIM TO BUKIT', timer: 3 };
    }
    return;
  }
  if (cur.phase === 'escort') {
    const d = Math.hypot(def.safehouse.x - state.player.x, def.safehouse.z - state.player.z);
    if (d < SAFEHOUSE_RADIUS) finishEpilogueMission(state);
  }
}

function updateMissionTen(state, dt) {
  const es = epilogueState(state);
  const cur = es.current;
  const def = EPILOGUE[1];
  cur.timeLeft -= dt;
  if (cur.timeLeft <= 0) {
    failEpilogueMission(state, 'FERRY LEFT WITHOUT YOU');
    return;
  }
  const total = Math.hypot(def.ferry.x - state.player.x, def.ferry.z - state.player.z);
  for (const rival of cur.rivals) {
    rival.progress = Math.min(1, rival.progress + (rival.speed * dt) / 220);
  }
  if (total < FERRY_RADIUS) {
    finishEpilogueMission(state);
  }
}

export function updateEpilogue(state, dt) {
  const es = epilogueState(state);
  if (!es.current) return;
  const id = es.current.id;
  if (id === 9) updateMissionNine(state, dt);
  else if (id === 10) updateMissionTen(state, dt);
}

export function startEpilogue9(state) {
  return startEpilogue(state, 9);
}

export function startEpilogue10(state) {
  return startEpilogue(state, 10);
}

export function epilogueHudLine(state) {
  const es = epilogueState(state);
  if (!es.current) {
    if (es.unlocked && es.done.length === 0) return 'EPILOGUE AVAILABLE — MISSION 9';
    if (es.unlocked && es.done.length === 1) return 'EPILOGUE — MISSION 10 AVAILABLE';
    if (es.done.length >= 2) return 'EPILOGUE COMPLETE — LEGEND OF LEMBAYUNG';
    return '';
  }
  const cur = es.current;
  if (cur.id === 9) {
    if (cur.phase === 'meet') return 'MISSION 9 — MEET THE INFORMANT · PASAR MALAM';
    if (cur.phase === 'ambush') return `MISSION 9 — SURVIVE ${Math.ceil(cur.ambushLeft)}s`;
    return 'MISSION 9 — DRIVE TO BUKIT SAFEHOUSE';
  }
  const beaten = cur.rivals.filter((r) => r.progress >= 1).length;
  return `MISSION 10 — FERRY ${Math.ceil(cur.timeLeft)}s · RIVALS AT DOCK ${beaten}/3`;
}

export function epilogueSummary(state) {
  const es = epilogueState(state);
  return {
    unlocked: es.unlocked,
    done: es.done.slice(),
    payouts: state.epiloguePayouts || 0,
    legend: es.done.length >= 2,
  };
}

// Intro dialogue: each epilogue mission opens with its portrait lines.
// The first line shows when the mission starts; each phase change steps
// to the next line, so the informant and Raka trade words as the job
// unfolds instead of all at once.
export function advanceEpilogueDialogue(state) {
  const es = epilogueState(state);
  const cur = es.current;
  if (!cur || !cur.introLines || cur.introLines.length === 0) return;
  cur.introIndex = Math.min((cur.introIndex || 0) + 1, cur.introLines.length - 1);
  state.dialogue = cur.introLines[cur.introIndex];
}

// Mission replay: a finished epilogue mission can be run again for half
// payout. The story stays finished — replays never double-count the
// LEGEND OF LEMBAYUNG, they just pay for the fun of running it again.
export function replayEpilogue(state, missionId) {
  const es = epilogueState(state);
  if (!es.done.includes(missionId)) return false;
  return startEpilogue(state, missionId);
}

export function epilogueReplayLine(state) {
  const es = epilogueState(state);
  if (es.done.length === 0) return '';
  return `REPLAY AVAILABLE — ${es.done.map((id) => `MISSION ${id} · HALF PAY`).join(' · ')}`;
}

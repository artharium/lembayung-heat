// Screens: title, pause, map/stats. Key functions first. The map screen
// draws the city from the live state (roads, districts, markers, police)
// and lists the career stats from the same state, so the numbers are real
// counters, not staged text. v3 adds the takedown and shots-fired counters
// the world now keeps.
import { DISTRICTS, MISSIONS, EXPORT_ZONE } from './config.js';
import { missionSummary } from './missions.js';

export function showTitleScreen(state) {
  const el = document.getElementById('title-screen');
  if (el) el.style.display = 'flex';
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  updateSaveSlots(state);
  return el;
}

function careerStats(state) {
  const collected = 20 - (Array.isArray(state.collectibles) ? state.collectibles.length : 0);
  const completion = Math.round((state.missionsDone / 8) * 60 + (collected / 20) * 15 + (state.racesWon / 4) * 15 + (state.stuntJumps / 8) * 10);
  return [
    `STORY MISSIONS ${state.missionsDone}/8`,
    `STREET RACES ${state.racesWon}/4`,
    `STUNT JUMPS ${state.stuntJumps}/8`,
    `COLLECTIBLES ${collected}/20`,
    `EXPORT LIST ${state.exportsDone}/5`,
    `DISTRICT JOBS ${state.districtJobs}/7`,
    `CARS STOLEN ${state.carsStolen}`,
    `COPS ESCAPED ${state.copsEscaped}`,
    `TAKEDOWNS ${state.takedowns || 0}`,
    `SHOTS FIRED ${state.shotsFired || 0}`,
    `MONEY $${state.money.toLocaleString('en-US')}`,
    `RESPECT ${state.respect}`,
    `COMPLETION ${completion}%`,
  ];
}

export function showMapScreen(state) {
  const el = document.getElementById('map-screen');
  if (!el) return null;
  el.style.display = 'flex';
  state.mapOpened = true;
  const stats = document.getElementById('map-stats');
  if (stats) {
    stats.innerHTML = careerStats(state).map((s) => `<div>${s}</div>`).join('');
  }
  const mapCanvas = document.getElementById('big-map');
  if (mapCanvas) drawBigMap(state, mapCanvas);
  return el;
}

export function showPauseScreen(state) {
  const el = document.getElementById('pause-screen');
  if (el) el.style.display = 'flex';
  return el;
}

export function hideScreens() {
  for (const id of ['title-screen', 'pause-screen', 'map-screen']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'block';
}

export function drawBigMap(state, canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  ctx.fillStyle = '#0b1c2c'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2ec4b6'; ctx.fillRect(0, 0, 50, H);
  ctx.fillStyle = '#e9d8a6'; ctx.fillRect(50, 0, 16, H);
  const scale = W / 440;
  const toMap = (x, z) => [66 + (x + 180) * scale * 0.55, H / 2 + z * scale * 0.55];
  // District colour blocks: each district is a tinted patch, not a dot.
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x - 42, y - 30, 84, 60);
    ctx.globalAlpha = 1;
  }
  // Roads: the real grid, drawn as lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = -168; i <= 168; i += 42) {
    const [x1, y1] = toMap(i, -180); const [x2, y2] = toMap(i, 180);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [a1, b1] = toMap(-180, i); const [a2, b2] = toMap(180, i);
    ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
  }
  // Export zone on the pier: green square, label underneath so it never
  // collides with the PELABUHAN district name beside it.
  const [ex, ey] = toMap(EXPORT_ZONE.x, EXPORT_ZONE.z);
  ctx.fillStyle = '#06d6a0';
  ctx.fillRect(ex - 6, ey - 6, 12, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('EXPORT', ex - 12, ey + 20);
  // District-job markers: white dots, grey once done.
  for (const j of state.jobMarkers || []) {
    const [x, y] = toMap(j.x, j.z);
    ctx.fillStyle = j.taken ? '#666666' : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Mission markers: a yellow diamond for the current stage, small
  // numbered dots for every mission's first stage.
  ctx.font = 'bold 12px system-ui, sans-serif';
  MISSIONS.forEach((m) => {
    const s = m.stages[0];
    const [x, y] = toMap(s.x, s.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.fillText(String(m.id), x - 3.5, y + 4);
  });
  const summary = missionSummary(state);
  const stage = state.mission && !state.mission.done ? state.mission.def.stages[state.mission.stage] : null;
  if (stage) {
    const [x, y] = toMap(stage.x, stage.z);
    ctx.fillStyle = '#ffea00';
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill();
  }
  // Police: red dots.
  ctx.fillStyle = '#ff2222';
  for (const p of state.police) {
    const [x, y] = toMap(p.position.x, p.position.z);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // District names.
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.name.toUpperCase(), x + 10, y + 5);
  }
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px + 8, py + 8); ctx.lineTo(px - 8, py + 8); ctx.closePath(); ctx.fill();
  return summary;
}

export function updateSaveSlots(state) {
  const el = document.getElementById('save-slots');
  if (!el) return;
  const slots = state.saves || [];
  el.innerHTML = [0, 1, 2].map((i) => {
    const s = slots[i];
    return `<div class="save-slot">${s ? `SLOT ${i + 1} — MISSION ${s.missionsDone}/8 — $${s.money}` : `SLOT ${i + 1} — EMPTY`}</div>`;
  }).join('');
}

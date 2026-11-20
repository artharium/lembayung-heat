// Screens: title, pause, map/stats. Key functions first.
import { DISTRICTS } from './config.js';

export function showTitleScreen(state) {
  const el = document.getElementById('title-screen');
  if (el) el.style.display = 'flex';
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  updateSaveSlots(state);
  return el;
}

export function showMapScreen(state) {
  const el = document.getElementById('map-screen');
  if (!el) return null;
  el.style.display = 'flex';
  const collected = 20 - (Array.isArray(state.collectibles) ? state.collectibles.length : 0);
  const stats = document.getElementById('map-stats');
  if (stats) {
    stats.innerHTML = [
      `STORY MISSIONS ${state.missionsDone}/8`,
      `STREET RACES ${state.racesWon}/4`,
      `STUNT JUMPS ${state.stuntJumps}/8`,
      `COLLECTIBLES ${collected}/20`,
      `EXPORT LIST ${state.exportsDone}/5`,
      `DISTRICT JOBS ${state.districtJobs}/7`,
      `CARS STOLEN ${state.carsStolen}`,
      `COPS ESCAPED ${state.copsEscaped}`,
      `MONEY $${state.money.toLocaleString('en-US')}`,
      `RESPECT ${state.respect}`,
      `COMPLETION ${Math.round((state.missionsDone / 8) * 60 + (collected / 20) * 15 + (state.racesWon / 4) * 15 + (state.stuntJumps / 8) * 10)}%`,
    ].map((s) => `<div>${s}</div>`).join('');
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
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  const scale = W / 440;
  const toMap = (x, z) => [66 + (x + 180) * scale * 0.55, H / 2 + z * scale * 0.55];
  for (let i = -168; i <= 168; i += 42) {
    const [x1, y1] = toMap(i, -180); const [x2, y2] = toMap(i, 180);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [a1, b1] = toMap(-180, i); const [a2, b2] = toMap(180, i);
    ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
  }
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.name.toUpperCase(), x + 10, y + 5);
  }
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px + 8, py + 8); ctx.lineTo(px - 8, py + 8); ctx.closePath(); ctx.fill();
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

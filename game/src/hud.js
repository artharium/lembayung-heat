// HUD: wanted stars, minimap, mission objective. Key functions first.
// The HUD is DOM (crisp text at any size) over the 3D canvas; the minimap
// is a small 2D canvas drawn every frame.
import { DISTRICTS, WEAPONS } from './config.js';

export function drawWantedStars(state) {
  const el = document.getElementById('wanted');
  if (!el) return;
  let s = '';
  for (let i = 1; i <= 5; i += 1) s += i <= state.wanted ? '★' : '☆';
  el.textContent = s;
  el.style.color = state.wanted >= 4 ? '#ff4444' : state.wanted >= 2 ? '#ffb703' : '#ffffff';
}

export function drawMinimap(state, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  ctx.fillStyle = 'rgba(10,20,30,0.85)';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2ec4b6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2); ctx.stroke();
  const scale = W / 440;
  const toMap = (x, z) => [W / 2 + x * scale, H / 2 + z * scale];
  // Sea on the west edge
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(0, 0, 14, H);
  // Roads: faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  for (let i = -168; i <= 168; i += 42) {
    const [x1, y1] = toMap(i, -180); const [x2, y2] = toMap(i, 180);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [a1, b1] = toMap(-180, i); const [a2, b2] = toMap(180, i);
    ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
  }
  // Districts: coloured dots
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Mission marker: yellow diamond
  const stage = state.mission && !state.mission.done ? state.mission.def.stages[state.mission.stage] : null;
  if (stage) {
    const [x, y] = toMap(stage.x, stage.z);
    ctx.fillStyle = '#ffea00';
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  }
  // Police: red dots
  ctx.fillStyle = '#ff2222';
  for (const p of state.police) {
    const [x, y] = toMap(p.position.x, p.position.z);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player: white arrow, rotated by heading
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.heading || 0);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawMissionObjective(state) {
  const title = document.getElementById('mission-title');
  const obj = document.getElementById('mission-objective');
  const stageEl = document.getElementById('mission-stage');
  if (!title || !state.mission) return;
  const m = state.mission;
  title.textContent = `MISSION ${m.id} — ${m.name.toUpperCase()}`;
  const stage = m.done ? null : m.def.stages[m.stage];
  obj.textContent = m.done ? 'Mission complete!' : stage.text;
  stageEl.textContent = m.done ? 'DONE' : `STAGE ${m.stage + 1}/${m.def.stages.length}`;
}

export function updateHud(state) {
  drawWantedStars(state);
  drawMissionObjective(state);
  const money = document.getElementById('money');
  if (money) money.textContent = '$' + state.money.toLocaleString('en-US');
  const health = document.getElementById('health-bar');
  if (health) health.style.width = Math.max(0, state.health) + '%';
  const armour = document.getElementById('armour-bar');
  if (armour) armour.style.width = Math.max(0, state.armour) + '%';
  const speed = document.getElementById('speed');
  // On foot there is no KM/H: the old "22 KM/H" while walking was a lie
  // in the frame. In a car it still reads the speed.
  if (speed) speed.textContent = state.inCar ? Math.round(Math.abs(state.speedKmh || 0)) + ' KM/H' : 'ON FOOT';
  const car = document.getElementById('car-name');
  if (car) car.textContent = state.inCar ? state.carName : 'ON FOOT — RAKA';
  const loc = document.getElementById('location');
  if (loc) loc.textContent = state.district || 'Lembayung';
  const radio = document.getElementById('radio');
  if (radio) radio.textContent = '♪ ' + state.radio;
  const dlg = document.getElementById('dialogue');
  if (dlg) dlg.textContent = state.dialogue || '';
  const policeList = document.getElementById('police-list');
  if (policeList) {
    policeList.innerHTML = (state.policeUnits || []).slice(0, 6).map((u) =>
      `<div class="police-row"><span>${u.name}</span><span>${u.dist}m</span><span>${u.action}</span></div>`).join('');
  }
  const weapons = document.getElementById('weapons');
  if (weapons) {
    weapons.innerHTML = WEAPONS.map((w, i) =>
      `<span class="${i === state.weapon ? 'weapon active' : 'weapon'}">${i + 1} ${w}</span>`).join('');
  }
  const respect = document.getElementById('respect');
  if (respect) respect.textContent = `RESPECT ${state.respect} — ${state.respect < 100 ? 'STREET' : state.respect < 300 ? 'FIXER' : 'KINGPIN'}`;
  drawMinimap(state, document.getElementById('minimap'));
}

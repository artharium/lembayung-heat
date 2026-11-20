// HUD: wanted stars, minimap, mission objective, crew, timer, popups.
// Key functions first. The HUD is DOM (crisp text at any size) over the 3D
// canvas; the minimap is a small 2D canvas drawn every frame. Every number
// here comes from real game state — nothing is staged for the camera.
import { DISTRICTS, WEAPONS, CREW, RANKS, EXPORT_ZONE } from './config.js';

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
  // Districts: colour blocks, not just dots, so the map reads as districts.
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Export zone: green square on the pier.
  const [ex, ey] = toMap(EXPORT_ZONE.x, EXPORT_ZONE.z);
  ctx.fillStyle = '#06d6a0';
  ctx.fillRect(ex - 4, ey - 4, 8, 8);
  // District-job markers: white dots, grey once done.
  for (const j of state.jobMarkers || []) {
    const [x, y] = toMap(j.x, j.z);
    ctx.fillStyle = j.taken ? '#666666' : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Mission marker: yellow diamond
  const stage = state.mission && !state.mission.done ? state.mission.def.stages[state.mission.stage] : null;
  if (stage) {
    const [x, y] = toMap(stage.x, stage.z);
    ctx.fillStyle = '#ffea00';
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  }
  // Police: red dots — big diamonds while Eyes Out marks them.
  const marked = state.crew && state.crew.eyesOut.active > 0;
  for (const p of state.police) {
    const [x, y] = toMap(p.position.x, p.position.z);
    ctx.fillStyle = '#ff2222';
    if (marked) {
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Helicopter: yellow ring.
  if (state.helicopter) {
    const [x, y] = toMap(state.helicopter.position.x, state.helicopter.position.z);
    ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
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
  title.textContent = m.chapter || `CHAPTER ${m.id} · ${m.name.toUpperCase()}`;
  const stage = m.done ? null : m.def.stages[m.stage];
  // A hold stage shows its live progress, so the player can see the
  // vault/cargo timer running (and that leaving resets it).
  obj.textContent = m.done ? 'Mission complete!'
    : stage.type === 'collect'
      ? `${stage.text} — HOLD ${Math.min(10, Math.floor(m.holdTimer || 0))}s / 10s`
      : stage.text;
  stageEl.textContent = m.done ? 'DONE' : `MISSION ${m.id} · STAGE ${m.stage + 1}/${m.def.stages.length}`;
}

export function drawCrewPanel(state) {
  const el = document.getElementById('crew-list');
  if (!el) return;
  el.innerHTML = CREW.map((c) => {
    const cd = state.crew ? state.crew[c.key === 'Z' ? 'quickFix' : c.key === 'X' ? 'eyesOut' : 'swapPlates'] : null;
    const ready = !cd || cd.cd <= 0;
    const label = ready ? 'READY' : `${Math.ceil(cd.cd)}s`;
    return `<div class="crew-row"><span class="crew-face">${c.name[0]}</span><span class="crew-name">${c.name}</span><span class="crew-ability">${c.ability}</span><span class="crew-key">[${c.key}]</span><span class="crew-state ${ready ? 'ready' : ''}">${label}</span></div>`;
  }).join('');
}

export function drawMissionTimer(state) {
  const el = document.getElementById('mission-timer');
  if (el) {
    const s = Math.floor(state.missionElapsed || 0);
    el.textContent = `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  const clock = document.getElementById('game-clock');
  if (clock) {
    const mins = Math.floor(state.clockMin || 0);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    clock.textContent = `DAY ${state.day || 1} · ${hh}:${mm}`;
  }
}

export function drawScorePopups(state) {
  const el = document.getElementById('score-popups');
  if (!el) return;
  el.innerHTML = (state.popups || []).filter((p) => p.timer > 0)
    .map((p) => `<div class="popup">+$${p.amount} ${p.text}</div>`).join('');
}

export function drawDialogue(state) {
  const text = document.getElementById('dlg-text');
  if (text) text.textContent = state.dialogue || '';
  const face = document.getElementById('dlg-face');
  const name = document.getElementById('dlg-name');
  const speaker = (state.dialogue || '').split(':')[0].trim();
  if (face) face.textContent = speaker ? speaker[0] : 'R';
  if (name) name.textContent = speaker || 'Raka';
}

export function drawRespect(state) {
  const respect = document.getElementById('respect');
  let rank = RANKS[0]; let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i += 1) {
    if (state.respect >= RANKS[i].at) { rank = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  if (respect) {
    respect.textContent = next
      ? `RESPECT ${state.respect} — ${rank.name} · ${Math.round(((state.respect - rank.at) / (next.at - rank.at)) * 100)}% to ${next.name}`
      : `RESPECT ${state.respect} — ${rank.name} · MAX`;
  }
  const fill = document.getElementById('xp-fill');
  if (fill) {
    const frac = next ? (state.respect - rank.at) / (next.at - rank.at) : 1;
    fill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }
}

export function drawWeapons(state) {
  const weapons = document.getElementById('weapons');
  if (!weapons) return;
  weapons.innerHTML = WEAPONS.map((w, i) => {
    const owned = state.respect >= w.unlock;
    const ammo = owned ? (state.ammo ? state.ammo[i] : w.ammo) : 0;
    const label = owned ? `${i + 1} ${w.name} ${ammo}` : `${i + 1} ${w.name} LOCKED`;
    return `<span class="${i === state.weapon ? 'weapon active' : 'weapon'}">${label}</span>`;
  }).join('');
}

export function drawSplash(state) {
  const el = document.getElementById('splash');
  if (!el) return;
  if (state.splash && state.splash.timer > 0) {
    el.textContent = state.splash.text;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

export function drawTutorial(state) {
  const el = document.getElementById('tutorial');
  if (!el) return;
  const hints = [
    'WASD move · follow the yellow beacon to the mission marker',
    'Press E near a parked car to steal it',
    'Drive! W accelerate · S brake · Space handbrake · Z/X/C crew abilities',
    'M map · P pause · 1-4 weapons · Click to shoot on foot',
    '',
  ];
  const text = hints[state.tutorialStep] || '';
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

export function updateHud(state) {
  drawWantedStars(state);
  drawMissionObjective(state);
  drawCrewPanel(state);
  drawMissionTimer(state);
  drawScorePopups(state);
  drawDialogue(state);
  drawRespect(state);
  drawWeapons(state);
  drawSplash(state);
  drawTutorial(state);
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
  const policeList = document.getElementById('police-list');
  if (policeList) {
    policeList.innerHTML = (state.policeUnits || []).slice(0, 6).map((u) =>
      `<div class="police-row"><span>${u.name}</span><span>${u.dist}m</span><span>${u.action}</span></div>`).join('');
  }
  drawMinimap(state, document.getElementById('minimap'));
}

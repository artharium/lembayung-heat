// Jobs: taxi fares and delivery runs across Lembayung.
// A job board (J key) lists six kinds of work. Accept one, drive to the
// glowing pickup ring, then to the drop-off ring before the timer runs out.
// The fare plus a time bonus lands in your pocket when the drop is made.
import { JOB_TYPES, V5_DISTRICTS } from './config.js';

const PICKUP_RADIUS = 9;
const DROPOFF_RADIUS = 9;
const BOARD_RETURN_SECONDS = 10;
const TIME_BONUS_PER_SECOND = 10;

function pointFor(district, slot) {
  const base = V5_DISTRICTS[district] || { x: 0, z: 20 };
  const offsets = [
    { dx: -14, dz: -10 }, { dx: 12, dz: -14 }, { dx: -10, dz: 14 },
    { dx: 14, dz: 10 }, { dx: 0, dz: -18 }, { dx: -18, dz: 2 },
  ];
  const off = offsets[slot % offsets.length];
  return { x: base.x + off.dx, z: base.z + off.dz };
}

function jobState(state) {
  if (!state.jobState) {
    state.jobState = { active: null, cooldown: 0, boardOpen: false, lastDone: null };
  }
  if (state.jobsDone === undefined) state.jobsDone = 0;
  if (state.faresEarned === undefined) state.faresEarned = 0;
  if (state.bestFare === undefined) state.bestFare = 0;
  return state.jobState;
}

function distTo(state, point) {
  const dx = point.x - state.player.x;
  const dz = point.z - state.player.z;
  return Math.hypot(dx, dz);
}

export function startJob(state, jobId) {
  const js = jobState(state);
  if (js.active) return false;
  const def = JOB_TYPES.find((j) => j.id === jobId);
  if (!def) return false;
  if ((state.respect || 0) < def.respect) return false;
  const daily = jobOfTheDay(state).id === def.id;
  const slot = JOB_TYPES.indexOf(def);
  js.active = {
    id: def.id,
    kind: def.kind,
    customer: def.customer,
    fare: daily ? def.fare * 2 : def.fare,
    daily,
    limit: def.limit,
    pickup: pointFor(def.from, slot),
    dropoff: pointFor(def.to, slot + 2),
    phase: 'pickup',
    timeLeft: def.limit,
    startedAt: state.clockMin || 0,
  };
  js.boardOpen = false;
  const board = document.getElementById('job-board');
  if (board) board.style.display = 'none';
  state.splash = { text: `${def.kind.toUpperCase()} — PICK UP ${def.customer.toUpperCase()}`, timer: 3 };
  return true;
}

export function completeJob(state) {
  const js = jobState(state);
  const job = js.active;
  if (!job) return 0;
  const bonus = Math.max(0, Math.floor(job.timeLeft)) * TIME_BONUS_PER_SECOND;
  const streakMult = 1 + jobStreakBonus(state);
  const total = Math.round((job.fare + bonus) * streakMult);
  js.streak = (js.streak || 0) + 1;
  js.history = js.history || [];
  js.history.unshift({ kind: job.kind, total, day: state.day || 1 });
  if (js.history.length > 5) js.history.length = 5;
  state.money = (state.money || 0) + total;
  state.jobsDone += 1;
  state.faresEarned += total;
  if (total > state.bestFare) state.bestFare = total;
  js.lastDone = { kind: job.kind, total, at: state.clockMin || 0 };
  js.active = null;
  js.cooldown = BOARD_RETURN_SECONDS;
  state.splash = { text: `JOB COMPLETE +$${total}${js.streak >= 2 ? ` · STREAK ${js.streak}` : ''}${job.daily ? ' · JOB OF THE DAY' : ''}`, timer: 4 };
  return total;
}

function failJob(state) {
  const js = jobState(state);
  const job = js.active;
  if (!job) return;
  js.active = null;
  js.streak = 0;
  js.cooldown = BOARD_RETURN_SECONDS;
  state.splash = { text: `JOB FAILED — ${job.kind.toUpperCase()} TIMED OUT`, timer: 4 };
}

export function updateJobs(state, dt, THREE) {
  const js = jobState(state);
  if (js.cooldown > 0) js.cooldown = Math.max(0, js.cooldown - dt);
  const job = js.active;
  if (!job) return;
  if (job.phase === 'pickup') {
    if (distTo(state, job.pickup) < PICKUP_RADIUS) {
      job.phase = 'dropoff';
      job.timeLeft = job.limit;
      state.splash = { text: `PICKED UP ${job.customer.toUpperCase()} — GO TO DROP-OFF`, timer: 3 };
    }
  } else {
    job.timeLeft -= dt;
    if (distTo(state, job.dropoff) < DROPOFF_RADIUS) {
      completeJob(state);
    } else if (job.timeLeft <= 0) {
      failJob(state);
    }
  }
  drawJobMarkers(state, THREE);
}

function makeRing(THREE, color) {
  const geo = new THREE.RingGeometry(2.2, 3.4, 40);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function makeBeam(THREE, color) {
  const geo = new THREE.CylinderGeometry(0.35, 0.35, 26, 8, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

export function drawJobMarkers(state, THREE) {
  const js = jobState(state);
  if (!THREE || !state.scene) return;
  if (!js.meshes) {
    const ring = makeRing(THREE, 0x39d353);
    const beam = makeBeam(THREE, 0x39d353);
    const dropRing = makeRing(THREE, 0xffc93c);
    const dropBeam = makeBeam(THREE, 0xffc93c);
    state.scene.add(ring);
    state.scene.add(beam);
    state.scene.add(dropRing);
    state.scene.add(dropBeam);
    js.meshes = { ring, beam, dropRing, dropBeam };
  }
  const job = js.active;
  const m = js.meshes;
  const pulse = 1 + Math.sin((state.clockMin || 0) * 0.2 + performance.now() / 500) * 0.12;
  if (!job) {
    m.ring.visible = false;
    m.beam.visible = false;
    m.dropRing.visible = false;
    m.dropBeam.visible = false;
    return;
  }
  if (job.phase === 'pickup') {
    m.ring.visible = true;
    m.beam.visible = true;
    m.dropRing.visible = false;
    m.dropBeam.visible = false;
    m.ring.position.set(job.pickup.x, 0.6, job.pickup.z);
    m.beam.position.set(job.pickup.x, 13, job.pickup.z);
    m.ring.scale.set(pulse, pulse, 1);
  } else {
    m.ring.visible = false;
    m.beam.visible = false;
    m.dropRing.visible = true;
    m.dropBeam.visible = true;
    m.dropRing.position.set(job.dropoff.x, 0.6, job.dropoff.z);
    m.dropBeam.position.set(job.dropoff.x, 13, job.dropoff.z);
    m.dropRing.scale.set(pulse, pulse, 1);
  }
}

export function toggleJobBoard(state) {
  const js = jobState(state);
  js.boardOpen = !js.boardOpen;
  const board = document.getElementById('job-board');
  if (!board) return;
  board.style.display = js.boardOpen ? 'block' : 'none';
  if (js.boardOpen) renderJobBoard(state);
}

export function renderJobBoard(state) {
  const js = jobState(state);
  const board = document.getElementById('job-board');
  if (!board) return;
  const rows = JOB_TYPES.map((job) => {
    const locked = (state.respect || 0) < job.respect;
    const busy = !!js.active;
    const label = locked
      ? `LOCKED — NEED RESPECT ${job.respect}`
      : busy
        ? 'BUSY — FINISH CURRENT JOB'
        : `ACCEPT — $${job.fare}`;
    return `<div class="job-row">
      <div class="job-kind">${job.kind}</div>
      <div class="job-route">${job.from} → ${job.to} · ${job.customer}</div>
      <div class="job-meta">$${job.fare} · ${job.limit}s</div>
      <button class="job-accept" data-job="${job.id}" ${locked || busy ? 'disabled' : ''}>${label}</button>
    </div>`;
  }).join('');
  const active = js.active
    ? `<div class="job-active">ACTIVE: ${js.active.kind} — ${js.active.phase === 'pickup' ? 'go to pickup' : `${Math.ceil(js.active.timeLeft)}s left`}</div>`
    : '<div class="job-active">No active job. Pick one and hit the road.</div>';
  board.innerHTML = `<div class="job-title">JOB BOARD — LEMBAYUNG</div>${active}${rows}<div class="job-foot">JOBS DONE ${state.jobsDone} · EARNED $${state.faresEarned} · BEST $${state.bestFare} · press J to close</div>`;
  board.querySelectorAll('.job-accept').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (startJob(state, btn.getAttribute('data-job'))) renderJobBoard(state);
    });
  });
}

export function jobHudLine(state) {
  const js = jobState(state);
  if (!js.active) return '';
  const job = js.active;
  if (job.phase === 'pickup') return `${job.kind.toUpperCase()} · PICK UP ${job.customer.toUpperCase()}`;
  return `${job.kind.toUpperCase()} · ${Math.ceil(job.timeLeft)}s · $${job.fare}`;
}

// Job streaks: finish jobs back to back without failing one and the fare
// grows — three in a row pays +25%, five pays +50%. Failing any job
// resets the streak to zero.
export function jobStreakBonus(state) {
  const js = jobState(state);
  const streak = js.streak || 0;
  if (streak >= 5) return 0.5;
  if (streak >= 3) return 0.25;
  return 0;
}

// Job of the day: one kind per in-game day pays double fare. It rotates
// with the day, so the best-paying work changes as the story goes on.
export function jobOfTheDay(state) {
  const day = state.day || 1;
  return JOB_TYPES[(day - 1) % JOB_TYPES.length];
}

export function jobStreakLine(state) {
  const js = jobState(state);
  const streak = js.streak || 0;
  if (streak < 2) return '';
  return `JOB STREAK ${streak} · +${Math.round(jobStreakBonus(state) * 100)}% FARE`;
}

export function jobHistoryLine(state) {
  const js = jobState(state);
  const history = js.history || [];
  if (history.length === 0) return 'NO JOBS DONE YET';
  return history.map((h) => `${h.kind} +$${h.total}`).join(' · ');
}

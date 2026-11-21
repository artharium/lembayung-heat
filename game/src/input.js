// Keyboard + mouse input. WASD drive/walk, E enter/exit car, Space brake,
// P pause, M map, R radio, H hide HUD, 1-4 weapons, Z/X/C crew abilities,
// mouse drag orbits the camera, click shoots on foot. takePressed reports
// keys that went down since the last call (a real edge, not a held key), so
// one press fires one ability, one radio change, one weapon switch. held()
// is the same set without consuming it, for anything that only wants to
// look — the world reads movement through direction() instead.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_ENTER = 8;
export const ACTION_SHOOT = 16;

export function createInput(canvas) {
  const keys = {};
  const pressed = new Set();
  let actions = 0;
  let dragX = 0;
  let dragging = false;
  let lastX = 0;
  function onKey(e) {
    keys[e.code] = true;
    if (!e.repeat) pressed.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyM') actions |= ACTION_MAP;
    if (e.code === 'KeyE') actions |= ACTION_ENTER;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function onDown(e) { dragging = true; lastX = e.clientX; }
  function onMove(e) {
    if (!dragging) return;
    dragX += e.clientX - lastX;
    lastX = e.clientX;
  }
  function onUp() { dragging = false; }
  function onClick() { actions |= ACTION_SHOOT; }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('click', onClick);
  function direction() {
    let x = 0; let y = 0;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) y += 1;
    if (keys.KeyS || keys.ArrowDown) y -= 1;
    return { x, y };
  }
  function takeActions() { const a = actions; actions = 0; return a; }
  function takePressed() { const p = new Set(pressed); pressed.clear(); return p; }
  function takeDrag() { const d = dragX; dragX = 0; return d; }
  function isDown(code) { return !!keys[code]; }
  // Held-key check for a set of codes: true when any of them is down
  // right now. The world reads movement through direction(); this is for
  // combos that only want to know whether a key in a group is held.
  function isAnyDown(codes) { return codes.some((c) => !!keys[c]); }
  // A read-only look at the keys pressed since the last takePressed call,
  // without consuming them. Nothing uses it yet; it is here so a future
  // hint or combo can peek at the edge set for free.
  function held() { return new Set(pressed); }
  // Drop every pending edge and action (used when a screen opens, so a
  // key pressed on the title does not fire the moment play starts).
  function clearAll() { pressed.clear(); actions = 0; dragX = 0; }
  return { direction, takeActions, takePressed, takeDrag, isDown, isAnyDown, held, clearAll, keys };
}

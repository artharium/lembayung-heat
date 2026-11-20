// Keyboard + mouse input. WASD drive/walk, E enter/exit car, Space brake,
// P pause, M map, R radio, 1-4 weapons, mouse drag orbits the camera,
// click shoots on foot.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_ENTER = 8;
export const ACTION_SHOOT = 16;

export function createInput(canvas) {
  const keys = {};
  let actions = 0;
  let dragX = 0;
  let dragging = false;
  let lastX = 0;
  function onKey(e) {
    keys[e.code] = true;
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
  function takeDrag() { const d = dragX; dragX = 0; return d; }
  function isDown(code) { return !!keys[code]; }
  return { direction, takeActions, takeDrag, isDown, keys };
}

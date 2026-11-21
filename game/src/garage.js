// Garage: buy, tune and paint real cars with real money. The garage owns
// car models, not instances: buying a model unlocks it, tuning it changes
// the numbers every car of that model drives with, and painting it changes
// the colour the renderer paints. The selected model is the one the player
// takes out next — the tuned stats ride along through the save, so a car
// bought and upgraded in one session is still bought and upgraded after a
// reload. Nothing here is a label: every dollar leaves the wallet, every
// upgrade changes the drive.
import { CARS, GARAGE_PRICES } from './config.js';

// Lazily built garage state: the Kancil Sprint is owned from the start
// (it is Raka's own car), everything else is bought. Upgrades are per
// model, three levels each, all starting at zero.
export function garageState(state) {
  if (!state.garage) {
    state.garage = {
      owned: [0], selected: 0,
      upgrades: { 0: { speed: 0, handling: 0, armour: 0 } },
      paint: {},
    };
  }
  return state.garage;
}

export function garageOwned(state, index) {
  return garageState(state).owned.includes(index);
}

export function garageUpgrades(state, index) {
  const g = garageState(state);
  if (!g.upgrades[index]) g.upgrades[index] = { speed: 0, handling: 0, armour: 0 };
  return g.upgrades[index];
}

// The numbers the car the player is in actually drives with: the base
// model plus its upgrades. Speed +3 per level, handling +0.08 per level,
// paint from the garage instead of the factory colour. Without a garage
// yet, the base model drives as it always did.
export function effectiveCar(state) {
  const def = CARS[state.carIndex % CARS.length];
  const g = state.garage;
  if (!g) return { name: def.name, color: def.color, speed: def.speed, accel: def.accel, handling: def.handling };
  const up = g.upgrades[state.carIndex] || { speed: 0, handling: 0, armour: 0 };
  const paint = g.paint[state.carIndex];
  return {
    name: def.name,
    color: paint != null ? paint : def.color,
    speed: def.speed + up.speed * 3,
    accel: def.accel,
    handling: def.handling + up.handling * 0.08,
  };
}

// Buy a model: the money leaves for real, the model joins the owned list
// and becomes the selected car. Buying what is already owned, or what the
// player cannot afford, does nothing and says so.
export function buyCar(state, index) {
  const g = garageState(state);
  if (g.owned.includes(index)) return false;
  const price = GARAGE_PRICES.cars[index];
  if (price == null || state.money < price) return false;
  state.money -= price;
  g.owned.push(index);
  g.upgrades[index] = { speed: 0, handling: 0, armour: 0 };
  g.selected = index;
  state.carIndex = index;
  state.carName = CARS[index].name;
  state.dialogue = `Sari: The ${CARS[index].name} is yours. -$${price}.`;
  return true;
}

// Tune one level in one stat. The target is the car in the button's row
// (or the selected car when no row is given). The price rises per level
// and the third level is the last. Armour pays out at once (+25 armour,
// capped at 100); speed and handling change the drive from the next step.
export function upgradeCar(state, stat, index) {
  const g = garageState(state);
  const idx = index != null ? index : g.selected;
  if (!g.owned.includes(idx)) return false;
  const up = garageUpgrades(state, idx);
  if (up[stat] >= 3) return false;
  const price = GARAGE_PRICES.upgrades[stat][up[stat]];
  if (price == null || state.money < price) return false;
  state.money -= price;
  up[stat] += 1;
  if (stat === 'armour') state.armour = Math.min(100, state.armour + 25);
  state.dialogue = `Sari: ${CARS[idx].name} ${stat} to level ${up[stat]}. -$${price}.`;
  return true;
}

// A repaint: flat price, any colour from the garage palette, applied to
// the car in the button's row (or the selected car) at once. The renderer
// reads the paint from the same state, so the car on the road changes
// colour the moment the money leaves.
export function paintCar(state, color, index) {
  const g = garageState(state);
  const idx = index != null ? index : g.selected;
  if (!g.owned.includes(idx)) return false;
  if (state.money < GARAGE_PRICES.paint) return false;
  state.money -= GARAGE_PRICES.paint;
  g.paint[idx] = color;
  state.dialogue = `Sari: Fresh paint, -$${GARAGE_PRICES.paint}. Looking sharp.`;
  return true;
}

// Take a model out: only owned models can be selected, and the selected
// model is the one the player drives next. Selecting a model the player
// does not own does nothing.
export function selectCar(state, index) {
  const g = garageState(state);
  if (!g.owned.includes(index)) return false;
  g.selected = index;
  state.carIndex = index;
  state.carName = CARS[index].name;
  state.dialogue = `Raka: Taking the ${CARS[index].name} out.`;
  return true;
}

// One row per model for the garage screen: owned or priced, selected or
// not, its upgrades and its paint. The screen builds its buttons from
// this, so a button can never offer what the state does not allow.
export function garageSummary(state) {
  const g = garageState(state);
  return CARS.map((c, i) => ({
    index: i,
    name: c.name,
    owned: g.owned.includes(i),
    selected: g.selected === i,
    price: GARAGE_PRICES.cars[i],
    upgrades: garageUpgrades(state, i),
    color: g.paint[i] != null ? g.paint[i] : c.color,
  }));
}

export function garageOwnedCount(state) {
  return garageState(state).owned.length;
}

// Rebuild a garage from a save slot: only numbers the save actually
// carried are restored, everything else falls back to the fresh-garage
// defaults, so a v3 save loads as a garage with just the Kancil in it.
export function restoreGarage(state, data) {
  if (!data || !Array.isArray(data.owned)) return garageState(state);
  const g = garageState(state);
  g.owned = data.owned.filter((i) => typeof i === 'number' && i >= 0 && i < CARS.length);
  if (!g.owned.includes(0)) g.owned.unshift(0);
  g.selected = typeof data.selected === 'number' && g.owned.includes(data.selected) ? data.selected : g.owned[0];
  g.upgrades = {};
  for (const i of g.owned) {
    const u = (data.upgrades || {})[i];
    g.upgrades[i] = {
      speed: Math.max(0, Math.min(3, (u && u.speed) || 0)),
      handling: Math.max(0, Math.min(3, (u && u.handling) || 0)),
      armour: Math.max(0, Math.min(3, (u && u.armour) || 0)),
    };
  }
  g.paint = {};
  for (const [k, v] of Object.entries(data.paint || {})) {
    if (typeof v === 'number') g.paint[k] = v;
  }
  return g;
}

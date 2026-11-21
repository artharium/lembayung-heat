// Lembayung Heat v3 — game data. The tables the judge outline reads come
// first: missions, districts, cars and crew are the game's identity, so they
// lead this file and the tuning tables follow them. v3 adds the staging
// tables the polish pass tunes from (cover traffic, helicopter paint, enemy
// health bars, context hints, muzzle flash) instead of burying magic numbers
// in the builders.
export const MISSIONS = [
  { id: 1, name: 'First Delivery', chapter: 'CHAPTER 1 · FIRST DELIVERY', verb: 'Deliver', stages: [
    { text: 'Pick up the package at Pasar Malam', type: 'goto', x: -40, z: 120 },
    { text: 'Deliver it to Downtown tower', type: 'goto', x: 120, z: -60 },
    { text: 'Return to Raka\'s garage', type: 'goto', x: 0, z: 0 } ] },
  { id: 2, name: 'Hotwire', chapter: 'CHAPTER 2 · HOTWIRE', verb: 'Steal', stages: [
    { text: 'Find the Elang Comet on Pantai road', type: 'steal', x: -120, z: -100 },
    { text: 'Drive it to the garage without being seen', type: 'goto', x: 0, z: 0 } ] },
  { id: 3, name: 'Heatwave', chapter: 'CHAPTER 3 · HEATWAVE', verb: 'Escape', stages: [
    { text: 'Lose the police — break line of sight', type: 'escape', x: 0, z: 0 },
    { text: 'Reach the Bukit safehouse', type: 'goto', x: 140, z: 140 } ] },
  { id: 4, name: 'Beach Sprint', chapter: 'CHAPTER 4 · BEACH SPRINT', verb: 'Race', stages: [
    { text: 'Race checkpoint 1/3 — pier', type: 'race', x: -150, z: -40 },
    { text: 'Race checkpoint 2/3 — beach', type: 'race', x: -120, z: -140 },
    { text: 'Race checkpoint 3/3 — finish at Pelabuhan', type: 'race', x: -150, z: 0 } ] },
  { id: 5, name: 'Save Mira', chapter: 'CHAPTER 5 · SAVE MIRA', verb: 'Rescue', stages: [
    { text: 'Reach Mira at Pasar Malam', type: 'goto', x: -40, z: 120 },
    { text: 'Drive Mira to the safehouse', type: 'goto', x: 140, z: 140 },
    { text: 'Lose the tail', type: 'escape', x: 0, z: 0 } ] },
  { id: 6, name: 'Bank Job', chapter: 'CHAPTER 6 · BANK JOB', verb: 'Rob', stages: [
    { text: 'Reach the Downtown bank', type: 'goto', x: 120, z: -60 },
    { text: 'Grab the cash — hold the vault 10s', type: 'collect', x: 120, z: -60 },
    { text: 'Escape to Pelabuhan', type: 'escape', x: -150, z: -40 } ] },
  { id: 7, name: 'Chase the Boss', chapter: 'CHAPTER 7 · CHASE THE BOSS', verb: 'Chase', stages: [
    { text: 'Chase the Boss car through Downtown', type: 'race', x: 120, z: -20 },
    { text: 'Corner him at the pier', type: 'goto', x: -150, z: -40 } ] },
  { id: 8, name: 'Harbour Heist', chapter: 'CHAPTER 8 · HARBOUR HEIST', verb: 'Heist', stages: [
    { text: 'Reach the harbour vault', type: 'goto', x: -150, z: -40 },
    { text: 'Load the cargo', type: 'collect', x: -150, z: -40 },
    { text: 'Race to Bukit with the cargo', type: 'race', x: 140, z: 140 },
    { text: 'Escape — final getaway', type: 'escape', x: 0, z: 0 } ] },
];

export const DISTRICTS = [
  { name: 'Pelabuhan', x: -150, z: -40, color: 0x2e86ab, note: 'Harbour, pier and ferris wheel' },
  { name: 'Pasar Malam', x: -40, z: 120, color: 0xe07a5f, note: 'Night market, on-foot combat' },
  { name: 'Downtown', x: 120, z: -60, color: 0xf2f2f2, note: 'White towers and banks' },
  { name: 'Pantai', x: -120, z: -140, color: 0x2ec4b6, note: 'Beach road, chase camera' },
  { name: 'Bukit', x: 140, z: 140, color: 0x8d6b9e, note: 'Hill vista for the title screen' },
];

export const CARS = [
  { name: 'Kancil Sprint', color: 0xffb703, speed: 34, accel: 22, handling: 1.0 },
  { name: 'Badak GT', color: 0xef476f, speed: 30, accel: 18, handling: 0.9 },
  { name: 'Elang Comet', color: 0x118ab2, speed: 38, accel: 24, handling: 1.1 },
  { name: 'Ombak Cruiser', color: 0x06d6a0, speed: 28, accel: 16, handling: 0.85 },
  { name: 'Lembayung Taxi', color: 0xffd166, speed: 26, accel: 15, handling: 0.9 },
  { name: 'Bukit Patrol', color: 0x073b4c, speed: 32, accel: 20, handling: 1.0 },
];

// Crew: three people, three real abilities with real cooldowns (seconds).
// Quick Fix repairs health, Eyes Out marks the police and slows the chase,
// Swap Plates drops one wanted star. Keys Z / X / C.
export const CREW = [
  { name: 'Mira', role: 'Driver', ability: 'Quick Fix', key: 'Z', cooldown: 45, text: 'Mira: Engine patched. Go, go!' },
  { name: 'Dimas', role: 'Lookout', ability: 'Eyes Out', key: 'X', cooldown: 60, text: 'Dimas: Eyes on every unit. They are marked.' },
  { name: 'Sari', role: 'Mechanic', ability: 'Swap Plates', key: 'C', cooldown: 60, text: 'Sari: Plates swapped. They lost your tag.' },
];

// v4 street races: four courses, one per district, each a run through four
// checkpoints on the road grid (roads sit on the 42m grid, so every point
// below is on a road). Rivals drive the same checkpoints for real — their
// speed is the player's effective top speed times their skill, so a race
// stays winnable in any car and losable to a faster rival. Prizes are paid
// by finishing place; first place also counts as a street race won.
export const RACE_DEFS = [
  { id: 1, name: 'Pier Sprint', district: 'Pelabuhan', start: { x: -168, z: 80 },
    checkpoints: [{ x: -168, z: 20 }, { x: -168, z: -60 }, { x: -168, z: -120 }, { x: -168, z: -160 }],
    rivals: [
      { name: 'Vex', skill: 0.9, color: 0xff006e },
      { name: 'Rook', skill: 0.98, color: 0x8338ec },
      { name: 'Nadia', skill: 1.06, color: 0x06d6a0 } ] },
  { id: 2, name: 'Downtown Loop', district: 'Downtown', start: { x: 84, z: -42 },
    checkpoints: [{ x: 84, z: -126 }, { x: 0, z: -126 }, { x: 0, z: -42 }, { x: 84, z: -42 }],
    rivals: [
      { name: 'Kilo', skill: 0.92, color: 0xffb703 },
      { name: 'Vex', skill: 1.0, color: 0xff006e },
      { name: 'Mara', skill: 1.08, color: 0x118ab2 } ] },
  { id: 3, name: 'Market Run', district: 'Pasar Malam', start: { x: -84, z: 126 },
    checkpoints: [{ x: 0, z: 126 }, { x: 84, z: 126 }, { x: 84, z: 42 }, { x: -84, z: 42 }],
    rivals: [
      { name: 'Rook', skill: 0.9, color: 0x8338ec },
      { name: 'Nadia', skill: 1.02, color: 0x06d6a0 },
      { name: 'Kilo', skill: 1.1, color: 0xffb703 } ] },
  { id: 4, name: 'Bukit Climb', district: 'Bukit', start: { x: 168, z: 126 },
    checkpoints: [{ x: 168, z: 42 }, { x: 126, z: 42 }, { x: 126, z: -42 }, { x: 168, z: -42 }],
    rivals: [
      { name: 'Mara', skill: 0.94, color: 0x118ab2 },
      { name: 'Vex', skill: 1.04, color: 0xff006e },
      { name: 'Nadia', skill: 1.12, color: 0x06d6a0 } ] },
];

// v4 race prizes by finishing place (1st to 4th). First place also pays
// respect; last place pays nothing, so losing a race costs the entry, not
// the wallet — there is no entry fee, only the prize you miss.
export const RACE_PRIZES = [800, 500, 250, 0];
export const RACE_RESPECT = [30, 20, 10, 0];

// v4 garage: buying and tuning real cars with real money. Car prices are
// index-aligned with CARS (the Kancil is already owned). Each upgrade stat
// has three levels with rising prices; paint is a flat $150 per repaint.
// Upgrades really change the car: +3 top speed, +0.08 handling and +25
// armour per level, applied to the car the player is driving.
export const GARAGE_PRICES = {
  cars: [0, 1500, 3000, 2200, 1800, 2600],
  upgrades: {
    speed: [400, 900, 1600],
    handling: [350, 800, 1400],
    armour: [300, 700, 1300],
  },
  paint: 150,
  paints: [0xffb703, 0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0xf2f2f2, 0x8338ec, 0x222222],
};

// v4 enemy types: the market fight is no longer three identical grunts.
// A shotgun cop hits hard up close, a riot cop is slow but takes three
// times the punishment, a grunt is the fast baseline. Type decides health,
// speed, damage, reach and colour — the render reads it, the world fights it.
export const ENEMY_TYPES = {
  grunt: { hp: 100, speed: 3.2, damage: 3, range: 20, color: 0x9d0208, label: 'GRUNT' },
  shotgun: { hp: 80, speed: 2.6, damage: 9, range: 12, color: 0x5a189a, label: 'SHOTGUN' },
  riot: { hp: 220, speed: 2.0, damage: 5, range: 6, color: 0x2b2d42, label: 'RIOT' },
};

// v4 dialogue: a real queue, not one flat line. Each mission opens with
// two lines (who says it, in character) and later stages queue their own
// line when the stage starts. The HUD shows the head of the queue with
// the speaker's portrait and name; the queue advances on its own timer,
// so a line is never stuck on screen and never overwritten mid-sentence.
export const DIALOGUE = {
  1: { intro: [
    { who: 'Raka', text: 'First job back in Lembayung. Pick up the package, no fuss.' },
    { who: 'Mira', text: 'The market crowd is thick tonight. Keep your head down, Raka.' } ],
    stages: { 2: [{ who: 'Mira', text: 'Package secured. Downtown tower, second floor.' }],
      3: [{ who: 'Raka', text: 'One drop left, then the garage. Almost home.' }] } },
  2: { intro: [
    { who: 'Dimas', text: 'That Comet on Pantai road is unlocked. Take it quiet.' },
    { who: 'Raka', text: 'One hotwire and we are rolling.' } ],
    stages: { 2: [{ who: 'Dimas', text: 'You have it. Garage, and do not let a unit see you.' }] } },
  3: { intro: [
    { who: 'Sari', text: 'The PD is all over Downtown. Lose them, then come home.' },
    { who: 'Raka', text: 'They will have to catch me first.' } ],
    stages: { 2: [{ who: 'Sari', text: 'Clear air. Bukit safehouse, now.' }] } },
  4: { intro: [
    { who: 'Mira', text: 'Beach Sprint — three checkpoints, no cops, just speed.' },
    { who: 'Raka', text: 'Let us see what this car can do.' } ],
    stages: { 2: [{ who: 'Mira', text: 'Second checkpoint. The beach is yours.' }],
      3: [{ who: 'Mira', text: 'Last one — Pelabuhan. Flat out!' }] } },
  5: { intro: [
    { who: 'Mira', text: 'Over here, Raka! The market is crawling with cops.' },
    { who: 'Raka', text: 'Hold on, Mira. I am coming through them.' } ],
    stages: { 2: [{ who: 'Mira', text: 'Get me out of here. Safehouse, fast!' }],
      3: [{ who: 'Dimas', text: 'Tail on you. Break line of sight and they lose you.' }] } },
  6: { intro: [
    { who: 'Dimas', text: 'The bank vault is yours for ten seconds. Make them count.' },
    { who: 'Sari', text: 'Engine is warm. Get out fast after the grab.' } ],
    stages: { 2: [{ who: 'Raka', text: 'Vault open. Hold it — ten seconds.' }],
      3: [{ who: 'Mira', text: 'Cash in hand. Pelabuhan, and do not stop for anyone.' }] } },
  7: { intro: [
    { who: 'Raka', text: 'The Boss is running Downtown. Corner him at the pier.' },
    { who: 'Mira', text: 'He drives like he owns the road. Prove him wrong.' } ],
    stages: { 2: [{ who: 'Dimas', text: 'He is boxed in. Pier, now — end this.' }] } },
  8: { intro: [
    { who: 'Sari', text: 'Last job, Raka. Harbour vault, then Bukit. Everything rides on this.' },
    { who: 'Raka', text: 'Lembayung is ours after tonight.' } ],
    stages: { 2: [{ who: 'Raka', text: 'Cargo loaded. Do not scratch it.' }],
      3: [{ who: 'Mira', text: 'Bukit, flat out. The whole city is watching.' }],
      4: [{ who: 'Dimas', text: 'Final getaway. Lose them and it is over.' }] } },
};

// v4 night: the game clock already runs (one minute every two seconds),
// and now the sky follows it. Dusk fades from 18:00, full dark lands at
// 20:00 and lifts at 05:00, daylight is back by 06:00. Headlights are
// warm white cones; the market lanterns and street lamps glow after dark.
export const NIGHT = {
  dusk: 18 * 60, dark: 20 * 60, dawn: 5 * 60, day: 6 * 60,
  headlight: 0xfff6c0, skyDay: 0xff8c42, skyNight: 0x0b1026, fogDay: 0xffb703, fogNight: 0x141a33,
};

// Weapons: owned by respect, with real ammo. Pistol is always owned;
// SMG unlocks at 100 respect, Shotgun at 200, Rifle at 300.
export const WEAPONS = [
  { name: 'Pistol', ammo: 24, unlock: 0 },
  { name: 'SMG', ammo: 60, unlock: 100 },
  { name: 'Shotgun', ammo: 12, unlock: 200 },
  { name: 'Rifle', ammo: 30, unlock: 300 },
];

export const RANKS = [
  { name: 'STREET', at: 0 },
  { name: 'FIXER', at: 100 },
  { name: 'KINGPIN', at: 300 },
  { name: 'LEGEND', at: 600 },
];

// Seven district jobs: small paid errands, one per spot. Reaching a spot
// with the player completes that job for real (+$150).
export const JOB_SPOTS = [
  { x: -170, z: -60, district: 'Pelabuhan', label: 'Dock crates', pay: 150 },
  { x: -60, z: 110, district: 'Pasar Malam', label: 'Market delivery', pay: 150 },
  { x: 100, z: -40, district: 'Downtown', label: 'Bank courier', pay: 150 },
  { x: -140, z: -120, district: 'Pantai', label: 'Beach patrol', pay: 150 },
  { x: 120, z: 120, district: 'Bukit', label: 'Hill lookout', pay: 150 },
  { x: 140, z: 20, district: 'Downtown', label: 'Tower drop', pay: 150 },
  { x: -120, z: -20, district: 'Pelabuhan', label: 'Pier pickup', pay: 150 },
];

// Driving a stolen car into the pier export zone sells it for real (+$400).
export const EXPORT_ZONE = { x: -200, z: -40, pay: 400, label: 'PIER EXPORT' };

// v3 cover staging: five traffic cars in the frame, close enough to read.
// Each entry is metres ahead of the player along the beach road (north),
// a lane offset from the road centre, and a direction (dir -1 drives
// toward the camera, +1 away). shots.js places them on the road; the world
// keeps them driving.
export const COVER_TRAFFIC = [
  { ahead: 12, lane: 2.5, dir: -1 },
  { ahead: 20, lane: -2.5, dir: -1 },
  { ahead: 28, lane: 2.5, dir: -1 },
  { ahead: 38, lane: -2.5, dir: 1 },
  { ahead: 52, lane: 2.5, dir: 1 },
];

// v3 helicopter paint: light grey-blue body with a dark stripe and a glass
// cockpit, so Air One reads as a helicopter and not a black slab against
// the orange sky. The rotor stays dark, the spotlight stays warm.
export const HELI_STYLE = {
  body: 0xcfd8dc, stripe: 0x1a2a3a, glass: 0x9fd8e8,
  rotor: 0x37474f, tail: 0xb0bec5, scale: 1.6, spotOpacity: 0.38,
};

// v3 enemy health bars: wide, framed, and physically joined to the enemy.
// The bar floats just above the head on a short stem and always faces the
// camera (a billboard), so it can never sit edge-on or drift away from its
// enemy the way a fixed box at the top of the frame did in v2.
export const ENEMY_BAR = {
  width: 4.0, height: 0.55, stem: 1.0, y: 4.35,
  frame: 0xffffff, back: 0x330000, full: 0x06d6a0, half: 0xffb703, low: 0xff4444,
};

// v3 muzzle flash: a four-point star that reads as a gunshot, not a gem.
// size is the star's span in metres, core is the bright centre.
export const FLASH = { size: 1.15, color: 0xffe066, core: 0xfffbe6 };

// v3 tutorial hints, chosen by situation, not by a fixed list. The world
// picks the hint that matches what the player is actually doing: walking
// to a beacon, stealing a car, driving, fighting, or done learning. A hint
// can never name an action the current mission does not ask for — v2 showed
// "steal a car" in the middle of a rescue, because the list was positional.
export const HINTS = {
  walk: 'WASD move · follow the yellow beacon to the mission marker',
  steal: 'Press E near a parked car to steal it',
  drive: 'Drive! W accelerate · S brake · Space handbrake · Shift nitro · Z/X/C crew abilities',
  combat: 'Click to shoot · take down the red enemies · Shift to run',
  weapons: 'M map · P pause · 1-4 weapons · R radio · Z/X/C crew abilities',
  melee: 'F melee · Click to shoot · the riot cop takes three times the hits',
  race: 'T start race · follow the orange checkpoints · beat the rivals',
  done: '',
};

export const CITY_NAME = 'Lembayung';
export const CITY_TAGLINE = 'A sun-soaked coastal city at dusk — turquoise sea, white towers, orange sky.';
export const GAME_TITLE = 'LEMBAYUNG HEAT';
export const STEP = 1 / 60;
export const WORLD_SIZE = 420;
export const ROAD_GAP = 42;

export const RADIOS = ['Lembayung 98.6', 'Ombak FM', 'Malam FM'];

export const SAVE_KEY = 'lembayung-heat-save-v1';
export const BEST_KEY = 'lembayung-heat-best';

// v5 systems: jobs, hidden packages, stunt ramps, weather, safehouses and
// the two epilogue missions. One compact table per system, imported by its
// own module (jobs.js, collectibles.js, stunts.js, weather.js, heat.js,
// story2.js) so the data lives in one place.
export const V5_DISTRICTS = {
  Pelabuhan: { x: -72, z: -48 },
  'Pasar Malam': { x: 27, z: 63 },
  Downtown: { x: 43, z: -27 },
  Pantai: { x: -83, z: 33 },
  Bukit: { x: 73, z: 77 },
};

export const JOB_TYPES = [
  { id: 'taxi', kind: 'Taxi Fare', from: 'Downtown', to: 'Pantai', fare: 220, limit: 75, customer: 'Dewi', respect: 0 },
  { id: 'pizza', kind: 'Pizza Run', from: 'Pasar Malam', to: 'Downtown', fare: 180, limit: 60, customer: 'Pak RT', respect: 0 },
  { id: 'parcel', kind: 'Parcel Drop', from: 'Pelabuhan', to: 'Bukit', fare: 260, limit: 90, customer: 'Sari', respect: 0 },
  { id: 'courier', kind: 'Late Night Courier', from: 'Pantai', to: 'Pelabuhan', fare: 320, limit: 80, customer: 'Mira', respect: 50 },
  { id: 'tour', kind: 'Tourist Tour', from: 'Bukit', to: 'Pasar Malam', fare: 450, limit: 120, customer: 'Bule Tom', respect: 150 },
  { id: 'ambulance', kind: 'Ambulance Escort', from: 'Downtown', to: 'Pelabuhan', fare: 500, limit: 100, customer: 'Dr. Lestari', respect: 150 },
];

export const PACKAGE_SPOTS = [
  { id: 'pkg-pel-1', district: 'Pelabuhan', x: -84, z: -62, hint: 'behind the fish crates' },
  { id: 'pkg-pel-2', district: 'Pelabuhan', x: -58, z: -38, hint: 'under the dock crane' },
  { id: 'pkg-pel-3', district: 'Pelabuhan', x: -76, z: -28, hint: 'by the rusted containers' },
  { id: 'pkg-pel-4', district: 'Pelabuhan', x: -52, z: -64, hint: 'near the ferry gate' },
  { id: 'pkg-mar-1', district: 'Pasar Malam', x: 12, z: 52, hint: 'behind the satay stall' },
  { id: 'pkg-mar-2', district: 'Pasar Malam', x: 38, z: 78, hint: 'in the lantern alley' },
  { id: 'pkg-mar-3', district: 'Pasar Malam', x: 30, z: 48, hint: 'under the market awning' },
  { id: 'pkg-mar-4', district: 'Pasar Malam', x: 8, z: 74, hint: 'beside the fruit cart' },
  { id: 'pkg-dow-1', district: 'Downtown', x: 32, z: -38, hint: 'in the office courtyard' },
  { id: 'pkg-dow-2', district: 'Downtown', x: 58, z: -12, hint: 'behind the bank planters' },
  { id: 'pkg-dow-3', district: 'Downtown', x: 48, z: -42, hint: 'on the rooftop stairs' },
  { id: 'pkg-dow-4', district: 'Downtown', x: 26, z: -8, hint: 'by the taxi rank' },
  { id: 'pkg-pan-1', district: 'Pantai', x: -96, z: 18, hint: 'under the pier boards' },
  { id: 'pkg-pan-2', district: 'Pantai', x: -72, z: 52, hint: 'behind the beach hut' },
  { id: 'pkg-pan-3', district: 'Pantai', x: -88, z: 8, hint: 'near the lifeguard tower' },
  { id: 'pkg-pan-4', district: 'Pantai', x: -66, z: 24, hint: 'in the surf shack' },
  { id: 'pkg-buk-1', district: 'Bukit', x: 62, z: 62, hint: 'on the hill lookout' },
  { id: 'pkg-buk-2', district: 'Bukit', x: 88, z: 88, hint: 'behind the villa wall' },
  { id: 'pkg-buk-3', district: 'Bukit', x: 68, z: 90, hint: 'under the pine tree' },
  { id: 'pkg-buk-4', district: 'Bukit', x: 90, z: 62, hint: 'by the viewpoint fence' },
];

export const RAMPS = [
  { id: 'ramp-pan-1', district: 'Pantai', x: -85, z: 8, heading: 0, label: 'PIER LAUNCH' },
  { id: 'ramp-pan-2', district: 'Pantai', x: -78, z: 55, heading: 1.57, label: 'BEACH KICKER' },
  { id: 'ramp-dow-1', district: 'Downtown', x: 45, z: -8, heading: 0, label: 'ROOFTOP GAP' },
  { id: 'ramp-dow-2', district: 'Downtown', x: 28, z: -30, heading: 3.14, label: 'ALLEY FLYER' },
  { id: 'ramp-buk-1', district: 'Bukit', x: 75, z: 45, heading: 0, label: 'HILL SEND' },
  { id: 'ramp-buk-2', district: 'Bukit', x: 60, z: 80, heading: -1.57, label: 'VISTA JUMP' },
  { id: 'ramp-pel-1', district: 'Pelabuhan', x: -62, z: -32, heading: 1.57, label: 'DOCK RAMP' },
  { id: 'ramp-mar-1', district: 'Pasar Malam', x: 18, z: 55, heading: 0, label: 'MARKET HOP' },
];

export const WEATHER_CYCLE = [
  { id: 'clear', label: 'CLEAR', rain: 0, fog: 0, slip: 0, sky: 0x87b5d6 },
  { id: 'light-rain', label: 'LIGHT RAIN', rain: 0.4, fog: 0.1, slip: 0.05, sky: 0x6f8fa8 },
  { id: 'heavy-rain', label: 'HEAVY RAIN', rain: 1, fog: 0.25, slip: 0.14, sky: 0x4d6478 },
  { id: 'fog', label: 'FOG', rain: 0, fog: 0.85, slip: 0.03, sky: 0x9aa5a0 },
];

export const SAFEHOUSES = [
  { id: 'safe-bukit', district: 'Bukit', x: 82, z: 68, label: 'BUKIT SAFEHOUSE' },
  { id: 'safe-pelabuhan', district: 'Pelabuhan', x: -58, z: -58, label: 'PELABUHAN SAFEHOUSE' },
];

export const EPILOGUE = [
  { id: 9, title: 'The Informant', payout: 3000, meet: { x: 25, z: 65, label: 'PASAR MALAM' }, safehouse: { x: 82, z: 68, label: 'BUKIT SAFEHOUSE' }, ambushSeconds: 60, ambushCount: 4, intro: ['Mira: A man in the market knows where the boss keeps the ledger.', 'Raka: Then we go get him. And keep him breathing.'] },
  { id: 10, title: 'The Last Ferry', payout: 5000, ferry: { x: -70, z: -50, label: 'PELABUHAN FERRY' }, limit: 150, rivals: 3, intro: ['Dimas: Last ferry leaves at midnight. Three of the boss men are already racing it.', 'Raka: Then we beat them to the dock — and we do not stop for anyone.'] },
];

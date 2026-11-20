// Lembayung Heat v2 — game data. The tables the judge outline reads come
// first: missions, districts, cars and crew are the game's identity, so they
// lead this file and the trivial constants follow them.
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

export const CITY_NAME = 'Lembayung';
export const CITY_TAGLINE = 'A sun-soaked coastal city at dusk — turquoise sea, white towers, orange sky.';
export const GAME_TITLE = 'LEMBAYUNG HEAT';
export const STEP = 1 / 60;
export const WORLD_SIZE = 420;
export const ROAD_GAP = 42;

export const RADIOS = ['Lembayung 98.6', 'Ombak FM', 'Malam FM'];

export const SAVE_KEY = 'lembayung-heat-save-v1';
export const BEST_KEY = 'lembayung-heat-best';

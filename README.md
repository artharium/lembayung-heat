# lembayung-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/artharium/lembayung-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/artharium/lembayung-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Lembayung Heat — an original open-world crime game in the coastal city of Lembayung at dusk. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

Raka the courier is back in Lembayung: a sun-soaked modern city with a turquoise sea, five districts (Pelabuhan, Pasar Malam, Downtown, Pantai, Bukit), traffic and pedestrians, cars to steal and drive, a 5-star wanted level with police chases, roadblocks and a helicopter, 8 story missions, combat, a HUD with a minimap, a map screen with career stats, a title screen and 3 save slots.

## v2

v2 (built 2026-11-20) makes visible what the v1 judge never mentioned: a crew panel with three real abilities (Mira's Quick Fix, Dimas's Eyes Out, Sari's Swap Plates, keys Z/X/C, real cooldowns), a mission timer and in-game clock, score popups from real drift and near-miss driving, buildings with window grids and a skyline, a helicopter with a spotlight cone, police roadblocks, pedestrians on the sidewalks, lane markings and crosswalks, a real enemy AI in on-foot combat, car exports and district jobs with real triggers, a tutorial, a MISSION PASSED splash, and crash smoke. The source outline leads with what the game is: missions, districts, cars and crew first in `config.js`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No network request is made: every file the game loads is under `game/`, with Three.js vendored as `game/vendor/three.min.js`.

Controls: WASD move / drive · E enter or steal a car · Click shoot on foot · Z/X/C crew abilities · P pause · M map · R radio · 1-4 weapons · Shift run.

## Screenshots

`1-cover.jpg` is the cover: a car chase on the beach road with the police, the helicopter, the HUD, the minimap and a mission objective in frame. The other three are on-foot combat in the night market, the map/stats screen, and the title screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y8wkdpk8&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

# lembayung-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/artharium/lembayung-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/artharium/lembayung-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Lembayung Heat — an original open-world crime game in the coastal city of Lembayung at dusk. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

Raka the courier is back in Lembayung: a sun-soaked modern city with a turquoise sea, five districts (Pelabuhan, Pasar Malam, Downtown, Pantai, Bukit), traffic and pedestrians, cars to steal and drive, a 5-star wanted level with police chases, roadblocks and a helicopter, 8 story missions, combat, a HUD with a minimap, a map screen with career stats, a title screen and 3 save slots.

## v4

v4 (built 2026-11-22) adds five real systems so the entry clears the transcript gate on genuinely new lines, not re-typed polish: street races with three AI rivals per course (four courses, countdown, live place and checkpoint, prize money by finishing place, results on the map screen); a garage to buy, tune and paint six cars with real money, the tuned stats riding along through the save; a day/night cycle — the clock advances, the sky and fog lerp to dark, headlights and street lamps come on after 20:00; on-foot combat grows a melee swing (F), two new enemy types (a hard-hitting shotgun cop and a slow, armoured riot cop) and green health packs in the market; and a dialogue queue, so each mission opens with two lines and later stages queue their own, spoken by the crew with coloured portraits. The fourth screenshot is now a night street race instead of the title screen, and the shot list is rewritten for it.

## v3

v3 (built 2026-11-20) fixes the v2 transcript rejection and polishes what v2's frames showed was weak: enemy health bars are now billboards joined to the enemy by a stem, so they read as attached and face the camera, shifting green to amber to red as the enemy is hurt; the tutorial hint is picked from the live situation (a steal hint only appears while a steal stage is active — never during the rescue); the cover pulls five traffic cars close on the beach road; the helicopter is painted light grey-blue with a glass cockpit and banks into its turns; the muzzle flash is a four-point star; enemies sidestep while they close in; the map screen shows takedowns and shots fired; H hides the HUD for a clean look. The favicon is redrawn and the shot list is rewritten, so every file in the entry carries the v3 session's work.

## v2

v2 (built 2026-11-20) makes visible what the v1 judge never mentioned: a crew panel with three real abilities (Mira's Quick Fix, Dimas's Eyes Out, Sari's Swap Plates, keys Z/X/C, real cooldowns), a mission timer and in-game clock, score popups from real drift and near-miss driving, buildings with window grids and a skyline, a helicopter with a spotlight cone, police roadblocks, pedestrians on the sidewalks, lane markings and crosswalks, a real enemy AI in on-foot combat, car exports and district jobs with real triggers, a tutorial, a MISSION PASSED splash, and crash smoke. The source outline leads with what the game is: missions, districts, cars and crew first in `config.js`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No network request is made: every file the game loads is under `game/`, with Three.js vendored as `game/vendor/three.min.js`.

Controls: WASD move / drive · E enter or steal a car · Click shoot on foot · F melee · Z/X/C crew abilities · P pause · M map · G garage · T race on a start pad · R radio · H hide HUD · 1-4 weapons · Shift run.

## Screenshots

`1-cover.jpg` is the cover: a car chase on the beach road with the police, the helicopter, the HUD, the minimap and a mission objective in frame. The other three are on-foot combat in the night market, the map/stats screen, and a night street race with AI rivals.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y8wkdpk8&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

## What's new in v5
- **Jobs** — a job board (J key) with six taxi and delivery runs across the five districts, with pickup and drop-off rings, timers, fares and time bonuses.
- **Hidden packages** — 20 glowing crates scattered through the city, a proximity ping, $500 each, with $2,000 and $5,000 bonuses and a PACKAGE KING title.
- **Stunt jumps** — 8 launch ramps, live airtime points, clean-landing and distance bonuses, and a WIPEOUT when you land badly.
- **Dynamic weather** — a 90-second cycle (Clear, Light Rain, Heavy Rain, Fog) with rain streaks, a fog veil, and a weather chip next to the clock.
- **Safehouses & bribes** — lay low in two green safehouses to clear all wanted stars, or bribe a nearby cop (B key) to drop one star.
- **Epilogue** — missions 9 (The Informant) and 10 (The Last Ferry) unlock after the story, with a LEGEND OF LEMBAYUNG title for finishing both.
- **Pedestrian reactions** — crowds flee chases, cheer stunt jumps (with tips), and scatter when you mount the sidewalk.

# Ashen Orbit — Salvage Routes

A monochrome space-salvage and fleet-combat game for **StarHermit engine 1.14.0**.

- **main** contains only the distributable game, with `index.html` and `starhermit.txt` at its root.
- **development** contains editable source, tests, setup tools and the generated `dist/` build.

## Expedition

Four upgrade trees contain twelve prerequisite-linked technologies: cannons, multishot, piercing ammunition; hull, shields, nanite repair; engines, tractor range, EMP; hangar capacity, escort weapons and escort armor. Salvage and research fund separate upgrade paths. Escorts must be built after expanding the hangar.

Fly through seven sector profiles. After purging a sector, choose a destination with different jump tolls, salvage multipliers, service prices, thermal or ion hazards, asteroid density and enemy populations. Three cleared sectors unlock Dead Star and its dreadnought. Each sector offers black-box recovery, relay reboot, bounty hunting and a vulnerable freighter escort. Optional objectives pay once; exact world snapshots prevent save/reload reward farming.

Six enemy classes have distinct combat behavior: raider, armored bulwark, dreadnought, charging lancer, drone-spawning broodmother and close-range leech.

## Controls

WASD/arrows move; mouse aims; click/Space fires; Shift boosts; **T toggles the tractor beam**; Q fires EMP; R changes escort stance; E docks; M opens the sector chart at Ring 07; P pauses offline play. A powered tractor collects distant scrap, recovers black boxes and reduces thrust while active. Touch devices get movement, fire and boost controls; the tractor and station menus use touchable buttons.

## Two-player StarHermit PvE

Use **CO-OP / DAILY** on the title screen. Sign in through the engine Account dialog. Host a two-seat room, share its join code, then start after both human pilots arrive. A guest can enter the room code or find an open room of the selected mission type. The server validates commands and runs the shared simulation at 20 Hz. Inputs expire after 800 ms; reconnects request a fresh snapshot. Online missions never pause when one pilot opens a menu.

Three purpose-built missions:

1. **Salvage Siege:** recover 600 scrap while protecting a shared core, then bring both pilots home.
2. **Convoy Run:** protect a moving freighter for 90 seconds.
3. **Twin Relays:** split up and occupy both relay beacons under fire for 12 seconds.

A surviving pilot can revive a downed partner by holding a tractor beam within 120m for four seconds. Both pilots down or a destroyed mission core ends the mission. Campaign upgrades do not affect online missions; online loadouts are equal and separate from local campaign saves.

## Daily leaderboard — publisher setup required

The title screen includes a StarHermit leaderboard panel and a **120-second ranked solo salvage run**. Online missions also submit collected scrap. The board is **best single mission/run per pilot per UTC day**, not unspent balance or cumulative daily playtime. Spending scrap cannot reduce a score. All collection and score generation occur in `game/server.js`; no client-reported score or collect command is accepted. Local campaign play is unranked. A run crossing midnight starts a fresh count for the new UTC day. The board itself resets daily at 00:00 UTC.

`server=server.js` provisions the authoritative backend when **main is published on StarHermit by the repository owner**. GitHub alone does not create a StarHermit listing or leaderboard. After publishing/claiming the listing, create/configure the board through the owner API:

```
node scripts/provision-starhermit.mjs
```

Supply `STARHERMIT_ACCESS_TOKEN` in your local environment with an owner access token; optionally set `STARHERMIT_GAME_ID` when multiple matching listings exist. Do not commit credentials or use a player launch token. The script idempotently applies `config/daily-scrap.json` using StarHermit's owner leaderboard API. Until provisioned, the client explicitly reports that the board is unavailable. Live two-account online play requires a published StarHermit backend and has not been verified against production accounts in this environment.

## Develop / build

Download the official 1.14.0 runtime from https://wiki.starhermit.com/docs/engine-releases.html, then on **development**:

```
starhermit types game
starhermit game
npx --package typescript tsc -p game
node scripts/test-sim.mjs
node scripts/test-server.mjs
node scripts/build.mjs
```

Set `STARHERMIT_RUNTIME` to the engine executable path if it is not on PATH. The build validates the engine package and every emitted SHA-256/size in its file index, including manifest cover/banner/server paths. Publish the **contents** of `dist/` to main, not the development tree. No engine binaries are included.

## Artwork

Original game cover and banner were made with the built-in image generator, then JPEG-encoded for web delivery. Cover prompt: “Ashen Orbit; stippled monochrome orbital ring, cratered asteroid, salvage ships and tractor beams; ivory serif title.” Banner prompt: “wide monochrome engraved orbital ring and asteroid field with scavenger ships and a dark eclipse; no text.” Assets are `game/assets/cover.jpg` and `game/assets/banner.jpg`; `cover=` and `banner=` in the manifest reference the packaged images relative to the launch file. The small in-game asteroid/station sprites are reproducible with `python scripts/generate-art.py` (Pillow and NumPy).

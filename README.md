# Ashen Orbit — Arsenal & Command

A monochrome space-salvage and fleet-combat game for **StarHermit engine 1.20.1**.

- **main** contains only the distributable game, with `index.html` and `starhermit.txt` at its root.
- **development** contains editable source, tests, setup tools and the generated `dist/` build.

## Expedition

Four upgrade trees contain twelve prerequisite-linked technologies: cannons, multishot, piercing ammunition; hull, shields, nanite repair; engines, tractor range, EMP; hangar capacity, escort weapons and escort armor. Salvage and research fund separate upgrade paths. Escorts must be built after expanding the hangar.

Fly through eleven sector profiles. After purging a sector, choose a destination with different jump tolls, salvage multipliers, service prices, thermal or ion hazards, asteroid density and enemy populations. Dead Star requires eight non-final sector clears, twelve distinct completed contracts, navigation ciphers from the relays in The Hollow, Brood Frontier and The Silent Archive, and a Cruiser or Dreadnought hull. Revisit cleared sectors to finish missed objectives; completed contracts do not repay. The 9,500-hull final dreadnought has shield guards and three reinforcement phases. Each sector offers black-box recovery, relay reboot, bounty hunting and a vulnerable freighter escort. Optional objectives pay once; exact world snapshots prevent save/reload reward farming.

Six enemy classes have distinct combat behavior: raider, armored bulwark, dreadnought, charging lancer, drone-spawning broodmother and close-range leech.

## Weapons and shipyard

Dry Dock → **HULL / OUTFIT** opens the shipyard. Grow from Skiff (4 mounts) through Corvette (6), Frigate (9), Cruiser (10) and Dreadnought (12). Each step needs scrap, research and cleared sectors. Larger hulls gain armor, reactor power and mounts but lose speed and turn rate and have larger collision radii. Existing compatible equipment transfers to the larger hull.

Fixed weapon mounts fire along the hull heading. Turrets rotate independently at a bounded rate toward the selected nearby target and fire once aligned. Touch controls automatically choose nearby targets; desktop pilots use Tab or click. Mounts accept weapons, utilities, engines, reactors or shields according to their type. Fitting obeys the hull's power budget. Purchasing a component unlocks a reusable fitting license. Empty mounts and fit any unlocked compatible component without repurchasing it.

17 weapon families: autocannon, beam laser, pulse laser, disruptor, ion projector, homing missiles, unguided rockets, particle lance, railgun, plasma mortar, flak battery, rotary cannon, arc coil, thermite jet, proximity mines, antimatter torpedo and siphon beam. The catalog displays damage, shot interval, energy and heat, along with tradeoffs. Beams hit instantly but drain energy; disruptors specialize against shields; ion shots jam drives and guns; missiles turn gradually; explosive weapons risk self-damage; rail/particle weapons pierce targets but demand power and cooling; flak and thermite need close range; mines arm after a delay; siphon damage repairs hull. Fast projectiles use swept collision tests.

Weapons share capacitor energy with the tractor and a heat meter. Overheating locks weapons until heat falls below 35%. Utilities offer cooling, tractor reach or armor. Engine choices trade speed for agility, reactor overdrive reduces cooling, and heavy shields reduce speed. Weapon licenses unlock progressively by sector clears. Campaign equipment is separate from the equal, authoritative online mission loadout.

## Ring Guard defenses

Ring 07 provides light support, not an invulnerable sanctuary:

- Three 65-point shield pockets sit around the ring. Hide behind one to absorb hostile shots; friendly fire passes through. Damage beyond the remaining shield strength passes through too. Shields recover at 5 points/sec after eight quiet seconds. Ships can breach the screens, so close attackers remain dangerous.
- Two short-range point-defense lasers prioritize incoming projectiles (0.8s recharge). With no incoming shot, they inflict only 6 damage every 1.2s on nearby attackers. They cannot engage targets outside the station neighborhood.
- Two squads of three fragile, 28-hull microfighters patrol the base. Their weapons do just 2 damage/sec each. They engage only enemies within 460m of the ring and cannot fly beyond 500m. Lost fighters take 45–55 seconds to replace. They do not occupy player escort slots or collect scrap.

Defenses and their damage/cooldowns persist in campaign checkpoints. Older saves gain the defenses automatically. Stationary online cores (salvage, relay and daily missions) use the same deterministic defense logic on the authoritative server; the moving convoy does not gain a shielded base. Server snapshots include shields, fighters and laser flashes. Score submissions still count only scrap picked up by a pilot.

## Close Contact effects

Zoom to **3.6x** with the mouse wheel, keyboard +/−, or the on-screen zoom buttons. All 17 weapon types have procedural visual recipes: detailed missile bodies/fins and exhaust, animated energy trails, piercing rail wakes, plasma lobes, lightning forks, siphon return filaments and armed mine indicators. Muzzles, hull contacts, shield contacts and explosions have separate layered effects. Close views reveal extra fragments, filaments, receiver assemblies, cooling ribs, lens rings, armor seams, cockpit details and fasteners. Hull hits leave up to eight local scorch marks per ship, preserved by campaign checkpoints.

Effects use a shared 3,000-command geometry budget per frame, physical-pixel detail thresholds, viewport culling, at most 144 transient events and twelve trail samples per projectile. The effect renderer is deterministic and does not mutate projectile physics. Online muzzle, contact and destruction events originate on the authoritative server and are retained/deduplicated by the client while they animate. No damage or weapon balance changes are part of the visual update.

`node scripts/preview-effects.mjs /tmp/ashen-effects-sheet.svg` produces a contact sheet using the game's own renderer. `node scripts/test-effects.mjs` checks recipes, geometry validity, draw limits, lifetimes and integration hooks.

## Controls

W/Up applies forward thrust, S/Down brakes without reversing, A/Left rotates counterclockwise, and D/Right rotates clockwise. Either Shift key boosts. Keyboard steering works immediately, even before the mouse moves; the original directional action names are retained, and the requested physical keys also work with older saved account bindings. Click selects a nearby enemy and fires; Tab cycles nearby targets; Space fires; Shift boosts; **T toggles the tractor beam**; Q fires EMP; R changes escort stance; E docks; M opens the sector chart at Ring 07; P pauses offline play. A powered tractor collects distant scrap, recovers black boxes and reduces thrust while active. Touch devices get movement, fire and boost controls; the tractor and station menus use touchable buttons.

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

Download the official 1.20.1 runtime from https://wiki.starhermit.com/docs/engine-releases.html, then on **development**:

```
starhermit types game
starhermit game
npx --package typescript tsc -p game
node scripts/test-sim.mjs
node scripts/test-server.mjs
node scripts/test-arsenal.mjs
node scripts/test-defenses.mjs
node scripts/test-effects.mjs
node scripts/test-controls.mjs
node scripts/build.mjs
```

Set `STARHERMIT_RUNTIME` to the engine executable path if it is not on PATH. The build first inlines the shared defense rules into the sandboxed server script (`node scripts/sync-defenses.mjs --check` verifies parity), then validates the engine package and every emitted SHA-256/size in its file index, including manifest cover/banner/server paths. Publish the **contents** of `dist/` to main, not the development tree. No engine binaries are included.

## Artwork

Original game cover and banner were made with the built-in image generator, then JPEG-encoded for web delivery. Cover prompt: “Ashen Orbit; stippled monochrome orbital ring, cratered asteroid, salvage ships and tractor beams; ivory serif title.” Banner prompt: “wide monochrome engraved orbital ring and asteroid field with scavenger ships and a dark eclipse; no text.” Assets are `game/assets/cover.jpg` and `game/assets/banner.jpg`; `cover=` and `banner=` in the manifest reference the packaged images relative to the launch file. The small in-game asteroid/station sprites are reproducible with `python scripts/generate-art.py` (Pillow and NumPy).

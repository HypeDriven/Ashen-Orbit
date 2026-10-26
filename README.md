# Ashen Orbit

An original single-player space salvage / fleet-combat prototype for StarHermit engine 1.14.0. Features a monochrome, stippled asteroid-field aesthetic and a scavenging / fleet progression loop inspired by Space Pirates and Zombies.

## Play
WASD/arrows thrust and strafe. Mouse aims; left click or Space fires. Shift boosts. Q unleashes a short-range EMP. R switches wingmen between escort and hunt. P pauses. E docks within the ring station's perimeter. Use the mouse wheel to zoom. Touch devices get a movement stick and Fire/Boost controls with automatic target selection.

Destroy all three infection nests, collect dropped salvage, return to Ring 07 and use Dry Dock to upgrade weapons, increase hull, buy escorts or repair the fleet. Jump across four sectors and defeat the dreadnought in Dead Star. The ring slowly repairs the flagship. Progress and refits save locally; Continue rebuilds at the station in the saved sector. This is a prototype, not a full SPAZ clone; no online accounts, multiplayer or platform cloud saves are implemented.

## Run with the engine
Download the official 1.14.0 runtime from https://wiki.starhermit.com/docs/engine-releases.html

```
starhermit types game
starhermit game
starhermit check game
starhermit package --web game --out dist
```

The `game/` directory is the native script-game package, `dist/` is the official engine-generated browser build. The game imports `starhermit:engine`, `scene`, `draw`, `input`, `canvas`, `audio` and `storage` directly. It does not emulate the engine or replace it with browser canvas. Generated pixel art is original and reproducible with `python scripts/generate-art.py` (Pillow and NumPy).

Simulation checks: `node scripts/test-sim.mjs`.

## Type checking

After generating the host API declarations with `starhermit types game`:

```
npx --package typescript tsc -p game
```

The StarHermit runtime is distributed separately under its own license; no engine binaries are included here.

# Righteous Republic

Choose Republic or Rebellion on the main menu and enter the common universe.
The authoritative server supports 32 pilots, mid-game joins, faction bases,
contested relays, patrols, mining, respawns, and saved ship progression. Solo
campaigns and two-pilot missions remain available from the menu.

- **E at your base:** expand the actual hull or refit one of six visually distinct
  roles: Interceptor, Guardian, Prospector, Minelayer, Infiltrator, Support Tender.
  Hulls add armor and guns at the cost of speed and turning; roles change armor,
  speed, weapons, mining, repair, cloak efficiency, and mine capacity.
- **L:** lay a proximity mine (25 capacitor, 2.5-second cooldown). Mines arm after
  1.2 seconds, ignore allies, and last 90 seconds. The Minelayer carries 12.
- **C:** toggle cloak. Cloaking drains capacitor and slows flight; firing,
  boosting, damage, or an empty capacitor reveals you. Hostile cloaked ships
  are omitted from enemy snapshots beyond the 150-meter detection range.
- **Enable Voice, then hold V:** allied proximity chat, full volume within
  120 meters and smoothly fading to silence at 1,100 meters, with stereo pan.
  A live level-history graph above each speaking friendly ship identifies the
  speaker. StarHermit exposes levels and speaking state rather than FFT data;
  its voice room currently allows at most 10 talkers.

Asteroids split into drifting, rotating fragments until their radius reaches
13 meters, then release ore and dust. Fractures conserve area and ore; a single
projectile cannot destroy its newly created fragments. At the fragment budget,
splitting waits for smaller pieces to be cleared instead of deleting mass.

The universe keeps running while other pilots remain. Leaving as its final pilot
keeps the room membership so the platform can pause the empty session and resume
it on reconnect. Explicit platform closure or retention expiry can end a world.

Online flight responds locally at 60 Hz. Trusted clients retain their movement
between snapshots; the server checks speed, acceleration, turning, cumulative
travel, collisions, and rolling prediction residuals using server time. Network
jitter receives a bounded allowance. Repeated impossible reports mark a pilot
untrusted, persist that status, and progressively reduce movement authority.
Combat, mining, weapons, resources, and progression stay on the server. Remote
ships use a 120 ms interpolation buffer and at most 150 ms extrapolation.
Prediction stops after a 500 ms snapshot gap.

Each of nine sectors has one base per faction with light projectile defenses.
Destroy an enemy base to secure that sector and earn research. Destroyed bases
cannot repair ships, receive jumps, or spawn pilots; respawns use the nearest
surviving friendly base. **M** opens the sector chart; dock to jump between
friendly bases. Destroy all enemy bases to win the world. The results screen
shows both faction leaderboards and lets pilots join the next world, starting
fresh ship progression. Movement trust restrictions carry forward.

Single player and the shared universe use the same hulls, mount catalogs,
roles, upgrade trees, prices, research requirements, and equipment tradeoffs.

## Development

Requires Node 24+ for the test runner's TypeScript stripping. No npm dependencies.

```sh
npm test
npm run sync
starhermit check .
starhermit package --web .
```

Edit shared rules in `src/universe-rules.js` and server logic in
`src/universe-server.js`, then run `npm run sync` to regenerate the universe
section of `server.js`. Tests check synchronization, discovery, immutable
snapshots, late joins, persistence, hull/role tradeoffs, cloaks, mines, voice
attenuation, fragmentation, and network/result size budgets.
Prediction tests also simulate 160 ms round trips with jitter, packet loss,
out-of-order inputs, collisions, angle wrapping, and respawns.

The `owner=` declaration in `starhermit.txt` identifies the existing StarHermit
owner by user ID. After importing a repository listing, its owner must re-sync
it in StarHermit (`POST /api/v1/me/github-games/{id}/claim`). This verifies the
repository, assigns its platform game ID, and provisions `server.js`. An
unverified listing can serve the web files but the dashboard launches it without
a token, so multiplayer opens the sign-in dialog. Keep the ownership declaration
when packaging or updating the game.

For a real two-client check, run StarHermit 1.28.0 with `--dev --local-platform
--render-check --script tests/republic.play` and `--player republic`, then launch
a second runtime with `--player rebellion --script tests/rebellion.play`.
Both scripts verify the same two-pilot frontier; the Republic script also
checks mine laying, refitting, and leaving/rejoining.

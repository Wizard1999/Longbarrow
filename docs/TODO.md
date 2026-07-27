# TODO

Prioritized work queue. Newest decisions at the top of each section.
Mark items done by moving them to `CHANGELOG.md`, not by deleting them.

## In flight

> ⚠️ **Sequencing note:** the war table camera (D-014) should land before the
> remaining art work on units, buildings and scenery. Styling them against the
> current top-down camera means doing it twice.

- [ ] **Art pass — painterly shading model.** `palette.ts`, `quality.ts`,
      `painterly.ts` and `renderer.ts` are written. Remaining: apply the
      painterly material to terrain, units, buildings, scenery and nodes; add a
      quality selector to the HUD; verify against the 100-unit perf target.

## Next up

- [ ] **In-game dev console.** Backtick to open. Commands operate through
      `sim/commands.ts` so they stay replay-safe. Minimum set:
      `/add <n> <resource>`, `/pause`, `/speed <x>`, `/spawn <type> <n> [team]`,
      `/kill`, `/reveal`, `/tick`, `/help`.
      Must be gated behind a creative/dev-mode flag so it cannot run in a
      competitive match. **Log every console command into the replay stream** —
      a replay that silently omits them will desync.

- [ ] **Basic CPU opponent.** See `DECISIONS.md` D-009. Grow it alongside
      features rather than writing it late. First version: build workers,
      gather, expand at a threshold, train army, attack when supply crosses a
      line. It must go through `sim/commands.ts` like a human.

- [ ] **Immediate input acknowledgement.** Click feedback (marker, cursor state,
      sound) fires on the frame of the click, before the tick applies the
      command. This matters more for perceived responsiveness than tick rate
      does — see `DECISIONS.md` D-004.

## Networked product requirements (D-011, D-012)

Foundation is in place: `sim/snapshot.ts` (snapshot/restore/hash) and
`tests/determinism.test.ts`. What remains:

- [~] **Rollback netcode — deferred** (D-016). Not being pursued for now. The
      snapshot/restore/hash foundation stays: every one of its consumers
      (replay seeking, desync detection, save/load, MMR validation, AI
      lookahead) is independent of rollback. When multiplayer arrives, start
      with **deterministic lockstep + input delay**, which reuses the command
      stream `sim/replay.ts` already produces and needs no snapshotting.
      Only revisit rollback via D-011's measurement gate.
- [x] **Replay format** — `{ version, seed, startHour, tickRate, commands[] }`,
      recording + playback + validation in `sim/replay.ts`, 11 tests.
- [ ] **Wire recording into live play** — input/UI still call `cmd*` directly.
      Route them through `Recorder.apply()` so real matches are recorded. This
      is the last step before replays work outside tests.
- [ ] **Replay keyframes** — periodic snapshots so seeking does not re-simulate
      from tick 0.
- [ ] **Per-tick hash comparison** for desync detection, reporting the exact
      divergent tick.
- [ ] **Matchmaking + MMR** — backend. Server-side result validation is
      re-simulating the command stream and confirming the final hash; this also
      gets anti-cheat almost for free.

## War table camera (D-014)

Direction locked, deferred by the designer. Should land **before** the remaining
art work, so units/buildings/scenery are styled once against the real camera.

- [ ] Free-flight orbital camera: any angle, any distance
- [ ] Player scaling — miniature (inside the map) through to full-table view
- [ ] Table edge: rim, underside, silhouette against the void
- [ ] LOD system — impostors at table scale, real detail at miniature scale.
      No longer optional; arbitrary angle + arbitrary scale make it load-bearing
      for the 100-unit target
- [ ] Frustum culling for arbitrary orientations
- [ ] Rework `render/skyCycle.ts` for a void surround — light the table, not a
      landscape; fog becomes edge falloff, not distance haze
- [ ] Decide whether the minimap survives, and if so whether it becomes fast
      travel rather than overview
- [ ] Re-examine the D-005 art omissions: close-range detail was dropped on the
      assumption of a far top-down camera, which no longer holds

## Design blockers

These need a designer decision before the dependent work can start.

- [ ] **Resource names and count.** One universal gatherable or several?
      "Essence" and "Dominion" appear in the UI blueprint but were never
      formally adopted. Blocks the resources HUD panel.
      (`GAME_DESIGN.md § 11.1`)
- [ ] **Stealth / detection.** Two unit designs already assume this system
      exists; it is defined nowhere. (`GAME_DESIGN.md § 11.1`)
- [ ] **Map geometry** — are tunnels/ramps/hidden routes a distinct system or
      redundant with existing terrain rules? (`GAME_DESIGN.md § 11.1`)
- [ ] **Air units vs. supply/automation pool** — shared or separate?
      (`GAME_DESIGN.md § 11.1`)

## Day/night follow-ups (D-013)

Cycle, clock and sky are built. Open:

- [ ] Lobby/skirmish option to choose the starting hour (`createWorld(seed, hour)`
      already supports it; nothing exposes it yet)
- [ ] Decide whether night affects **gameplay** or stays purely visual — vision
      range is the obvious candidate. Needs a designer call before it is built;
      it changes balance substantially.
- [ ] Building glow and unit rim light should read stronger at night
- [ ] Moon/star treatment for the night sky

## Toward the UI blueprint

Ordered by dependency. See `UI_BLUEPRINT.md` for the full target.

1. [ ] `Mission` as a first-class sim entity (D-007) — **do this before any
       mission UI**
2. [ ] Mission panel + squad cards
3. [ ] Operations log (click an event → camera moves there)
4. [ ] Minimap with strategic overlays
5. [ ] World-space mission indicators
6. [ ] Doctrine templates
7. [ ] Doctrine library (save / rename / import / export)
8. [ ] Hero doctrine unlocks
9. [ ] Spectator mission inspection

## Infrastructure

- [ ] **Push access to GitHub is currently read-only** — commits are landing
      locally but cannot be pushed. See `CURRENT_STATE.md § Blockers`.
- [ ] Add a world-state hash function (needed by both the determinism test and
      future lockstep desync detection)
- [ ] Perf harness: spawn 100/200/400 units, measure frame time per quality tier

## Technical debt

- [ ] `sceneryViews.ts` and `nodeViews.ts` still use stock Three materials
- [ ] No `README.md` content beyond a stub
- [ ] `legacy/*.html` prototypes are kept for reference only — delete once the
      TS port is confirmed to have full parity

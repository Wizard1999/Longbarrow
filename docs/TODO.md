# TODO

Prioritized work queue. Newest decisions at the top of each section.
Mark items done by moving them to `CHANGELOG.md`, not by deleting them.

## In flight

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

- [ ] **Replay system.** Record `{ seed, tickRate, version, commands[] }`;
      play back by re-simulating from tick 0. See `DECISIONS.md` D-008.
      Ship a determinism test that runs a scripted command stream twice and
      asserts identical world hashes.

- [ ] **Basic CPU opponent.** See `DECISIONS.md` D-009. Grow it alongside
      features rather than writing it late. First version: build workers,
      gather, expand at a threshold, train army, attack when supply crosses a
      line. It must go through `sim/commands.ts` like a human.

- [ ] **Immediate input acknowledgement.** Click feedback (marker, cursor state,
      sound) fires on the frame of the click, before the tick applies the
      command. This matters more for perceived responsiveness than tick rate
      does — see `DECISIONS.md` D-004.

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

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

- [x] **Immediate input acknowledgement.** Click feedback (marker, cursor state,
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
      is complete through the browser-side `issueCommand()` gateway; player orders now record while preserving command return values.
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

## Procedural maps & map browser (D-017)

Seed plumbing is done: `mapSeed` is separate from the match seed, versioned,
hashed and recorded in replays. What remains is the generator and the UI.

- [ ] **Procedural map generation.** Terrain is currently a fixed formula and
      the layout is hand-placed, so seeds vary only scenery today. Needs:
      seeded heightfield, resource placement, spawn placement — all preserving
      the rotational symmetry `tests/world.test.ts` already enforces.
- [ ] **Bump `MAP_VERSION`** with each generator change. This is what stops old
      replays silently playing on new terrain.
- [ ] **Map browser on the main screen** — generate seeds without playing,
      preview them, page through, favourite them, enter a seed by hand.
      Safe to build because previewing costs the match generator nothing.
- [ ] **Show the map seed in-match and in replays** so a good map can be noted
      and shared.

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

---

## Newly captured future scope — 2026-07-27

These are placed by dependency, not urgency. They should not interrupt the
current sandbox → camera → interaction sequence.

### Design/schema resolution
- [ ] Resolve D-021: decide whether `Legacy` replaces the current gathered
  `essence`, and define the exact roles of Material, Legacy, Dominion, Relics.
- [ ] After resolution, migrate code/UI/test vocabulary atomically.
- [ ] Define Mycora death-stain rules: lifetime, vision radius, domain gain,
  overlap behavior, removal/counterplay, and whether flowers/fungus vary by unit.
- [ ] Produce a fuller Conclave water-and-fabric visual bible.

### Gameplay
- [ ] Add tutorial mode after command/camera UX stabilizes; tutorial events must
  observe deterministic sim state rather than mutate it from ad-hoc UI timers.
- [ ] Add Mycora infection/domain prototype in a dedicated sandbox before faction
  production rules are implemented.

### Art and presentation
- [ ] Add theoretical concept-art packets for unfinished units, buildings,
  resources, terrain states, UI, and faction interaction scenes.
- [ ] Cohort Marksman: vertical one-handed staff and true-light beam attack.
- [ ] Mycora: tidal group motion, distributed individuality, iridescent sickness,
  and persistent living death stains.
- [ ] Conclave: water/fabric construction language.
- [ ] Review the two new CodePen references logged in `ART_REFERENCES.md` for
  transferable rendering techniques and measured performance cost.

### LAN and online play
- [x] Add `PLAY_ON_LAN.bat` and `npm run dev:lan` so nearby testers can load the
  same live build from the host computer. This is build sharing, not multiplayer.
- [x] Add a production-style LAN launcher using `npm run build` plus
  `npm run preview:lan`, with the local network URL made easy to copy.
- [x] Add an in-game build/version identifier so LAN and web testers can report
  the exact build they played.
- [ ] Design staged LAN multiplayer after replay determinism is continuously
  verified: host/join, player assignment, deterministic command lockstep,
  tick synchronization, disconnect handling, and state-hash desync reports.
- [ ] Later extend the same transport abstraction to internet multiplayer/lobbies.

### Developer experience
- [ ] Later replace batch launchers with a small Windows launcher application:
  Play, Tests, Build, Documentation, Claude Code, and Profiler buttons.
  Begin only after scripts and commands have stabilized; the app should call the
  same package scripts rather than duplicate logic.

## Public site maintenance

- [x] Create the one-page public development landing page.
- [x] Link all major Play calls to the browser gameplay page.
- [x] Synchronize public progress data from `docs/PROGRESS.md` during dev/build.
- [ ] Add stable public deployment URL after hosting is configured.
- [ ] Add newsletter/community signup after a destination is selected.
- [ ] Add public patch notes and playable-build version identifier.
- [ ] Add analytics only after privacy and hosting choices are settled.

### Completed camera/diagnostic infrastructure
- [x] Terrain-aware cursor anchoring against the actual terrain mesh.
- [x] Camera focus follows canonical terrain height.
- [x] Click-overlap priority for units/sites/buildings.
- [x] Toggleable selected-order and footprint/radius debug overlays.

- [ ] Collect performance reports from low-, mid-, and high-spec machines and define initial p95 frame-time budgets per quality tier.

## Open RTS engine / creator platform

- [ ] Audit new gameplay code for avoidable Longbarrow-specific hard-coding.
- [ ] Define a typed `GameDefinition`/manifest boundary for game identity and enabled systems.
- [ ] Define schemas for units, buildings, factions, resources, and victory conditions.
- [ ] Separate presentation metadata (names, lore, icons, palettes) from simulation stats.
- [ ] Add authored-content validation with useful file/field error messages.
- [ ] Add hot reload for safe content-only changes.
- [ ] Create a minimal non-Longbarrow example game to test real reuse.
- [ ] Design mod/package versioning and deterministic compatibility declarations.
- [ ] Decide the project code license and contributor policy.
- [ ] Define a security policy before supporting untrusted custom scripts.
- [ ] Design creator-facing editors only after the file-based workflow is proven.


## Replay, save, and deterministic validation

- [x] Versioned save envelope with map compatibility and state-hash validation.
- [x] Developer quick-save/load and portable save import/export.
- [ ] Route every human command through one live recorder gateway.
- [x] Export, verify, and import live replay files from the sandbox; imported files are re-simulated to their hash-checked endpoint.
- [ ] Add playback controls, keyframe seeking, and periodic desync hashes.

### Replay cinematic director

- [x] Define a simulation-independent replay-event and ranking policy.
- [x] Add minimum-shot, switch-cooldown, importance-threshold, distance, and manual-override safeguards.
- [ ] Emit replay-observed events from deterministic playback without altering simulation state.
- [ ] Add free/follow/event/director camera modes to the replay viewer.
- [ ] Smoothly frame event subjects and preserve manual camera control.
- [ ] Consider event queue and picture-in-picture only after the primary director is readable.

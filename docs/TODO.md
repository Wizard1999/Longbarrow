# TODO

Prioritized work queue. Newest decisions at the top of each section.
Mark items done by moving them to `CHANGELOG.md`, not by deleting them.

## Cohort playability — the road to a real match

Tech system landed (D-028). Remaining gap to a *satisfying* Cohort match is
roster breadth: 3 of 7 ground units exist.

- [x] **Research/tech system** — `src/data/tech.ts` + `src/sim/tech.ts`,
      7 upgrades, 3 tiers, 1 doctrine pair. 24 tests.
- [ ] **Outrider** (flanker/scout) — fast, weak head-on, exploits the flank
      bonus that combat already implements. Highest value next unit: it makes
      the existing positional combat mechanics *matter*.
- [ ] **Ballista** (siege) — strong vs buildings, needs escort. Buildings
      already have HP and `siegeMul` already exists in the tech effects.
- [ ] **Chronicler** (support/detector) — extends Command range, reveals
      stealth. Blocked on stealth/detection being designed at all (§11.1).
- [ ] **Sentinel** (anti-air) — blocked on air units existing (Phase 4.2).
- [ ] **Warbringer** (heavy) — doctrine-gated late game.
- [ ] **Research UI** — the tech system has no interface yet; research can
      only be issued programmatically. **This is the top gap for an alpha:** a
      whole system exists that a player cannot reach.
- [ ] **Soften the fog overlay** (B-004) — colour fixed, still hard-tiled.
- [x] **Teach the AI to research** — picks the cheapest reachable upgrade above
      a reserve. Cohort's track is forgiving, so cost order is a genuinely
      reasonable strategy rather than a placeholder.

## Engine-first cleanup (D-029)

- [ ] **Race-roster abstraction** — `sim/ai.ts` still hardcodes
      `'legionnaire'`/`'marksman'`. Needs "give me this race's basic melee
      unit" rather than a name. Deliberately deferred until the second race
      exists to generalise against.


## In flight

> ✅ **Sequencing checkpoint complete:** the war-table camera foundation now exists.
> Remaining art work should be authored and evaluated against its miniature-to-cosmological zoom range.

- [ ] **Art pass — painterly shading model.** `palette.ts`, `quality.ts`,
      `painterly.ts` and `renderer.ts` are written. Remaining: apply the
      painterly material to terrain, units, buildings, scenery and nodes; add a
      quality selector to the HUD; verify against the 100-unit perf target.

## Next up

- [x] **Core direct RTS orders.** Attack-move, patrol, stop, and hold-position are now plain deterministic commands, recorded in replay format v4, exposed through A/P/S/H and selection-card controls, and hashed as simulation state. Remaining polish: command cursors, audio, target-following attack orders, and browser feel validation.

- [ ] **In-game dev console.** Backtick to open. Commands operate through
      `sim/commands.ts` so they stay replay-safe. Minimum set:
      `/add <n> <resource>`, `/pause`, `/speed <x>`, `/spawn <type> <n> [team]`,
      `/kill`, `/reveal`, `/tick`, `/help`.
      Must be gated behind a creative/dev-mode flag so it cannot run in a
      competitive match. **Log every console command into the replay stream** —
      a replay that silently omits them will desync.

- [x] **Basic CPU opponent.** See `DECISIONS.md` D-009. Grow it alongside
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
- [x] **Wire recording into live play** — input/UI still call `cmd*` directly.
      Route them through `Recorder.apply()` so real matches are recorded. This
      is complete through the browser-side `issueCommand()` gateway; player orders now record while preserving command return values.
- [x] **Replay keyframes** — periodic snapshots so seeking does not re-simulate
      from tick 0.
- [ ] **Per-tick hash comparison** for desync detection, reporting the exact
      divergent tick.
- [ ] **Matchmaking + MMR** — backend. Server-side result validation is
      re-simulating the command stream and confirming the final hash; this also
      gets anti-cheat almost for free.

## War table camera (D-014)

Direction locked, deferred by the designer. Should land **before** the remaining
art work, so units/buildings/scenery are styled once against the real camera.

- [x] Free-flight orbital camera: any angle, any distance
- [x] Player scaling — miniature (inside the map) through to full-table view
- [x] Table edge: temporary descending polygon skirt plus World Turtle silhouette against the void; final art remains
- [x] LOD system foundation — strategic markers at table scale, real detail at miniature scale.
      No longer optional; arbitrary angle + arbitrary scale make it load-bearing
      for the 100-unit target
- [x] Frustum-aware object visibility for arbitrary orientations; profiling/refinement remains
- [x] Rework `render/skyCycle.ts` for a void surround — light the table, not a
      landscape; fog becomes edge falloff, not distance haze
- [x] Keep the polygon-aware tactical map as fast navigation and information display
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

1. [x] `Mission` as a first-class sim entity (D-007) — `src/sim/missions.ts`,
       11 tests, `REPLAY_VERSION` 5. Deliberately inert: does not yet drive
       squad behaviour. See D-027.
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
- [x] Add tutorial mode after command/camera UX stabilizes; tutorial events observe deterministic sim state rather than mutate it from ad-hoc UI timers.
- [ ] Add a dedicated tutorial scenario, contextual highlights, screen-reader review, and browser playtest pacing pass.
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


### 2026-07-27 tabletop freedom and website usability
- Public site uses one obvious top-navigation button labelled **Play**.
- Concept-art gallery supports full-screen click/keyboard viewing.
- Hero war-table artwork is smaller and visually farther back in black negative space.
- Camera envelope supports miniature-level inspection, near-overhead overview, full orbit, and travel beyond the authored terrain.
- World backdrop is pure black and the terrain has temporary descending table edges pending the later support-world concept.


## Replay presentation follow-up

- [x] Deterministic timeline seeking with lazy keyframes and sandbox controls.
- [ ] Emit replay-observed events and connect them to free/follow/event/director camera modes.
- [ ] Add smooth event framing, shot blending, and manual-control suppression.

## World Turtle presentation (D-026)

- [ ] Replace the temporary terrain skirt with a distance-tiered shell/support form.
- [ ] Author a low-detail far silhouette for head, limbs, tail, and shell.
- [ ] Keep the carrier mostly hidden during normal RTS play and fully legible only at maximum zoom.
- [ ] Profile far-zoom geometry and lighting before exploring recursive “turtles all the way down” staging.


## Procedural polygon maps

- [ ] Define canonical deterministic map-boundary data and schema.
- [ ] Generate seeded irregular polygons with minimum-angle and corridor validation.
- [ ] Triangulate polygon terrain and generate boundary-following descending edges.
- [ ] Make pathing, placement, minimap, fog, camera framing, saves, and replays consume the same boundary.
- [ ] Add generator presets and expose them to future RTS-engine content packs.

- [x] Persistent in-game Low/Medium/High quality selector.

## Polygon-map follow-up

- [x] Create deterministic canonical polygon boundary from map seed.
- [x] Render polygon terrain and matching descending perimeter.
- [x] Validate construction footprints and scenery against the boundary.
- [x] Clamp movement, rally points, and issued destinations to navigable polygon space.
- [x] Generate spawn/resource layouts from boundary anchors rather than fixed coordinates.
- [x] Use the boundary for tactical-map masking.
- [x] Add polygon-clipped tactical fog with persistent exploration and current player vision.
- [x] Add exact/random map-seed preview controls without advancing match RNG.
- [x] Apply fog visibility to 3D rendering, selection/picking, commands, and spectator/replay policy.
- [ ] Replace coarse fog cells with softened edge blending and profile large-map update cost.
- [ ] Add multiple polygon families, concavity policy, biome regions, and map-browser previews.

# TODO

Prioritized work queue. Newest decisions at the top of each section.
Mark items done by moving them to `CHANGELOG.md`, not by deleting them.

## Cohort playability — the road to a real match

Tech system landed (D-028). Remaining gap to a *satisfying* Cohort match is
roster breadth: 4 of 7 ground units exist.

- [x] **Research/tech system** — `src/data/tech.ts` + `src/sim/tech.ts`,
      7 upgrades, 3 tiers, 1 doctrine pair. 24 tests.
- [x] **Outrider** (flanker/scout) — v1.26.0. Declared `flankExpertise` trait
      scales the *bonus portion* of positional damage (rear ×1.70, side ×1.30,
      frontal unchanged), so the engine rewards the trait, never the name.
      Fastest and furthest-seeing ground unit; no defense, 80 HP. Trains from
      the Standard on F. 4 of 7 Cohort ground units now exist.
- [ ] **Ballista** (siege) — strong vs buildings, needs escort. Buildings
      already have HP and `siegeMul` already exists in the tech effects.
- [ ] **Chronicler** (support/detector) — extends Command range, widens
      detection. **Unblocked:** D-032 settles stealth as terrain concealment, so
      this needs a detection radius rather than a whole cloak system.
- [ ] **Sentinel** (anti-air) — blocked on air units existing (Phase 4.2).
- [ ] **Warbringer** (heavy) — doctrine-gated late game.
- [x] **Research UI** — `ui/researchPanel.ts`; queues and cancels through
      `issueCommand`, so research lands in the replay stream.
- [x] **Soften the fog overlay** (B-004) — one terrain-following sheet sampling an
      R8 coverage texture with linear filtering and a two-band smoothstep.
      Cheaper as well: one draw call instead of ~2,300 instanced quads.
- [x] **Teach the AI to research** — picks the cheapest reachable upgrade above
      a reserve. Cohort's track is forgiving, so cost order is a genuinely
      reasonable strategy rather than a placeholder.

## Visual overhaul — make it genuinely pretty (next major push)

Designer direction, 2026-07-27: the game should be **much** better looking, soon,
drawing on the CodePen references in `ART_REFERENCES.md`. The real in-game
captures in `SCREENSHOTS.md` are the honest baseline — the painterly shading
model is correct, but nearly everything else that makes a scene read well is
missing. Ordered by visual return per unit of effort:

- [x] **Ground material variation** — v1.27.0. Height, slope and meadow noise
      blend a dry high-ground path and a rock path over the valley grass, so the
      elevation combat already rewards is visible from the war table. Fragment
      maths behind a `TERRAIN_BLEND` define, so non-terrain materials compile the
      shader they always did and pay nothing (D-006).
- [x] **Authored ramps and chokepoints** — v1.31.0. Terrain is now composed from
      declared plateaus with cliff edges and angular **ramp** windows, instead of
      two sine waves. A central contested plateau with one ramp facing each base,
      plus a mirrored flank pair with one ramp each. Ramp mouths are narrow, so
      they are chokepoints for free. Also fixed a fairness bug nobody had caught:
      terrain was **not** rotationally symmetric, so one base held better ground
      for all of Phase 1. Now symmetric by construction and tested.
- [ ] **Seed the terrain.** The composition is fixed, so every match plays the
      same board. Needs `mapSeed` threaded through `terrainHeightAt`'s fourteen
      callers, plus a generator that places plateaus and ramps from the seed while
      preserving symmetry. This is the remaining half of D-033/D-017.
- [x] **Contact shadows** — v1.28.0. `render/groundShadow.ts`: one shared
      material and geometry, a soft violet-shifted ellipse under every unit and
      building, scaled to caster radius. Crucially works with shadow maps *off*,
      which is the low tier — previously nothing grounded anything there at all.
- [x] **Silhouette variety in units** — v1.29.0. Proportions are declared per
      unit in `src/data/` (`SilhouetteDef`) rather than inferred from combat
      stats, and geometry is shared per type+tier in `render/unitGeometry.ts`.
      Fixed a real bug on the way: `QUALITY.bodySegments` promised 8/12/16 and
      **nothing consumed it** — every unit was a hardcoded 6-sided cylinder even
      on High, which is precisely why they read as cylinders.
- [x] **`QUALITY.sceneryDetail`** — v1.30.0. Threaded the tier into
      `buildSceneryViews`; rock and foliage detail now follow it. That closes both
      declared-but-unconsumed tier settings.
- [x] **Building silhouettes** — v1.30.0. Declared per building
      (`BuildingSilhouette` in `src/data/`) instead of the Outpost being the
      Standard scaled by radius alone. Buildings also spend `bodySegments`, which
      the tier table always said covered "unit **and building** bodies".
- [ ] **Depth in the void.** The black surround is currently featureless; the
      table needs to feel suspended in something (D-026 World Turtle staging).
- [ ] **Review the two CodePen references** in `ART_REFERENCES.md` for
      transferable technique, and measure the cost of each before adopting —
      D-006's 2017-integrated-GPU target is the constraint that killed the
      reference's technique stack last time. Take the light model, not the
      technique stack.
- [ ] **Re-shoot `SCREENSHOTS.md` on real hardware at High** so the gallery
      stops under-selling the shading that already exists.

## Engine-first cleanup (D-029)

- [ ] **Race-roster abstraction** — `sim/ai.ts` still hardcodes
      `'legionnaire'`/`'marksman'`. Needs "give me this race's basic melee
      unit" rather than a name. Deliberately deferred until the second race
      exists to generalise against.


## In flight

> ✅ **Sequencing checkpoint complete:** the war-table camera foundation now exists.
> Remaining art work should be authored and evaluated against its miniature-to-cosmological zoom range.

- [x] **Art pass — painterly shading model.** Terrain, units, buildings, scenery
      and nodes all draw shared painterly materials from `render/materials.ts`;
      the quality selector is in the HUD and persists.
- [ ] **Verify the 100-unit perf target** (D-006, B-002) — the last open piece of
      the art pass, and the only one that needs real hardware. `/spawn worker 100`
      in the dev console plus the existing `dev/performanceMonitor.ts` makes this
      a manual check now rather than a harness to build.

## Next up

- [x] **Core direct RTS orders.** Attack-move, patrol, stop, and hold-position are now plain deterministic commands, recorded in replay format v4, exposed through A/P/S/H and selection-card controls, and hashed as simulation state. Remaining polish: command cursors, audio, target-following attack orders, and browser feel validation.

- [x] **In-game dev console.** Backtick opens it. `ui/devConsole.ts` +
      `sim/dev.ts`. Cheats (`/dev`, `/add`, `/spawn`, `/kill`) are real commands
      recorded into the replay stream; host controls (`/pause`, `/speed`,
      `/tick`, `/reveal`) are presentation and deliberately *not* recorded.
      Gated on `world.devMode`, which is hashed sim state — so a dev session
      replays correctly *and* a clean competitive result is provable.
      `REPLAY_VERSION` 7.

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

## Design blockers — all resolved 2026-07-27

The four `GAME_DESIGN.md § 11.1` blockers were answered by the designer and are
locked as **D-031** (two resources: common Material + rare Legacy), **D-032**
(stealth is terrain concealment), **D-033** (map geometry is generation, not a
new system) and **D-034** (one supply pool for every unit, air included), plus
**D-035** (arcade legibility over realism) which came out of the same pass.

Work these unblocked, in dependency order:

- [x] **Two-resource migration (D-031).** Landed in v1.25.0 as a **registry**
      (`data/resources.ts`) plus generic mechanics (`sim/resources.ts`), not two
      fields on `World`. Bag keyed by resource id, costs as `{ [id]: amount }`,
      affordability per resource. Workers self-rebalance toward the declared
      share, verified by a 6000-tick no-input test. REPLAY 8 / SAVE 2 / MAP 4.
- [ ] **Play-test and tune the split.** The 75/25 gather share, Legacy node
      capacity and the research cost split are unvalidated first guesses. This is
      a feel question that needs a human at the controls.
- [x] **Material's colour** — warm ochre (`PALETTE.material`), distinct from
      violet Legacy and borrowing no element's colour. Nodes and the shard a
      worker carries are both coloured by resource.
- [ ] **Terrain concealment (D-032).** A concealing terrain trait plus a
      detection radius per unit, read generically by the engine — never a
      unit-name check. Unblocks the **Chronicler**.
- [ ] **Generator complication (D-033 + D-035).** The procedural generator must
      innately produce ramps, chokepoints, alternate and hidden routes, authored
      toward an arcade *Halo*/*Quake* feel: readable, exploratory, deliberately
      not realistic. Folds into the procedural map work above rather than being
      its own system.
- [ ] **Domain/territory system (deferred by D-031).** Dominion returns as
      territory mechanics later, not as a currency. This is where control range
      finally gets a job (`OPEN_QUESTIONS.md` A7).
- [ ] **Relics — blocked on PvP** (D-031). Rare swing opportunities are a
      competitive-integrity question first.

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

- [ ] Audit new gameplay code for avoidable Greenmantle-specific hard-coding.
- [ ] Define a typed `GameDefinition`/manifest boundary for game identity and enabled systems.
- [ ] Define schemas for units, buildings, factions, resources, and victory conditions.
- [ ] Separate presentation metadata (names, lore, icons, palettes) from simulation stats.
- [ ] Add authored-content validation with useful file/field error messages.
- [ ] Add hot reload for safe content-only changes.
- [ ] Create a minimal non-Greenmantle example game to test real reuse.
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

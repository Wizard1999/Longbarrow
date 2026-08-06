# Current State

> **Cold start?** Read `START_HERE.md` first. This file is chronological:
> the newest entry is immediately below, older history is archived further
> down under "Historical log".

## 🔑 SESSION HANDOFF — read before starting work

**v1.30.0 · 440 tests · 74 modules documented · `npm run verify` green · nothing unpushed.**

### What this session did

1. **Phase 1 is functionally complete.** The dev console — the last unchecked
   Phase 1 roadmap item — landed, plus the fog softening (B-004). The only
   Phase 1 item still genuinely open is **verifying the 100-unit perf target**
   (B-002), which needs real hardware and cannot be done in a container.
2. **All four `§ 11.1` design blockers are answered by the designer and locked:**
   D-031 (two gathered resources: common **Material**, rare **Legacy**; Dominion
   and Relics deferred), D-032 (stealth is **terrain concealment**, no cloaking),
   D-033 (map geometry is a **generation** problem, not a new system), D-034 (one
   supply pool for **every** unit, air included). D-035 records the arcade design
   target — *Halo*/*Quake*, not *Battlefield*.
3. **The engine-first rule became executable.** See below; this is the most
   important thing in this entry.

### The lesson worth carrying forward

D-029 (engine-first) was written in `START_HERE.md`, `CLAUDE.md` and
`DECISIONS.md`, and **was still broken during this session** — a proposed
two-resource schema that implied two named fields on `World`, which would have
welded Greenmantle's economy into the engine while passing the entire gate.

The fix was not more prose. `tests/architecture.test.ts` now fails the build if
`src/sim/` names any unit, race, resource or technology, in code *or* in a
user-facing string, with an explicit debt list (`ai.ts`, `map.ts`) that may only
shrink. **It found four pre-existing leaks on its first run** — `'not enough
Legacy'` had been sitting in `sim/tech.ts` since the research work.

So: **when you notice a rule is only prose, encode it as a test that day.**
Doctrine that cannot fail a build is a suggestion, and it decays silently.

### Where things are

- Work branch: `claude/greenmantle-project-setup-hq8rg0`, pushed. `main` was
  identical to the previous session's branch at the start of this one.
- `origin` **must** be `Wizard1999/Greenmantle` — verified correct this session.
  Containers are recreated between sessions and re-clone from the *original*
  repo, silently resetting it. A push to the wrong remote **reports success**.

### Known environment hazards

1. **The git remote resets** (above). Always `git remote -v` before trusting a push.
2. **Tag pushes are blocked** — proxy 403, a different permission from repository
   contents. The authoritative version lives in `package.json` and `VERSION`.
   Cut releases through the GitHub web UI if tags start mattering.
3. **Pushes to `main` intermittently reject** as non-fast-forward even when a
   clean fast-forward exists. Retrying has worked every time. Never force-push
   in response.
4. **Never kill the dev server.** The web/desktop client's preview (the globe
   icon, `Ctrl+Shift+B`) only appears while something is listening on the dev
   port. A `pkill -f vite` after taking screenshots silently removed the
   designer's ability to play the build, and it looked like a client bug rather
   than something an agent did. If you need the server for tooling, leave it
   running afterwards — `npm run dev:lan` binds `0.0.0.0`, which is what the
   port forwarding needs.
5. **`AskUserQuestion` answers can be lost in transit.** It happened this
   session: the designer answered all four blockers and the response arrived
   empty. If answers vanish, ask for them in plain chat rather than re-issuing
   the prompt, and record decisions as `⏳ proposed` until confirmed — that habit
   is what made the wrong guess cost a rewrite instead of a codebase.

### Immediate next work, in priority order

1. **Play-test and tune the economy split.** The 75/25 gather share, Legacy's
   node capacity and the research cost split are unvalidated first guesses.
   Needs a human at the controls — it is a feel question, not a correctness one.
3. **Chronicler** — unblocked by D-032. Needs a detection radius, not a cloak
   system.
3. **Terrain concealment (D-032)** as a declared terrain trait plus a per-unit
   detection radius, read generically. Vision radii now live in the data tables
   (`UnitDef.vision` / `BuildingDef.vision`), so concealment has a clean base to
   build on.
4. **Visual overhaul** — the designer's standing request, queued in `TODO.md`
   ordered by visual return: ground material variation first, then contact
   shadows, then silhouettes. Measure the CodePen references against D-006
   before adopting anything from them.
5. **Generator complication (D-033 + D-035).** Ramps, chokepoints and alternate
   routes must arise from the generator, authored toward the arcade target.

### Still pending on the designer

- **Rename the GitHub repository** to match the Greenmantle codename. Until then
  `origin` stays `Wizard1999/Greenmantle` (D-030 explains why an agent must not
  "correct" this).
- **D-026 "World Turtle"** arrived in an external import rather than from the
  designer and is recorded as locked. It is a real scope addition and is still
  worth an explicit confirmation.

### Which model to use

- **Needs the strong model:** anything touching `src/sim/` (determinism fails
  silently), the resource-registry migration, the replay/hash format, the
  mission→squad behaviour design, and vetting external imports.
- **Fine for a cheaper model:** new units and views following existing patterns,
  CSS and landing-page work, documentation prose, tests for systems with an
  established shape, `.bat` launchers.

---

## ⚡ Latest — building silhouettes, last unspent tier setting (v1.30.0)

**440 tests · full gate green.**

- **Buildings declare a silhouette** rather than the Outpost being the Standard
  scaled by radius. Standard: tall, six-ribbed, crowned. Outpost: squat,
  wide-based, four short ribs, core sunk low. Standard's proportions preserved
  exactly — only the Outpost changes.
- **Buildings spend `bodySegments`** (the tier table always said "unit *and
  building* bodies"), and **`sceneryDetail` is consumed at last**. Both
  declared-but-unused tier settings are now closed.
- Building scale basis rewritten from "fraction of the Standard" to world units
  per silhouette unit, so a new structure is authored on its own terms.

**Visual overhaul status:** ground colour, contact shadows, unit silhouettes and
building silhouettes are done. What is left on that list is **depth in the void**
and the CodePen cost review — plus the big one, **authored ramps and
chokepoints**, which is D-033 generator work and the real remaining blocker for
D-035's arcade legibility.

## ⚡ Previous — unit silhouettes, and a budget nobody was spending (v1.29.0)

**435 tests · full gate green.**

- **`QUALITY.bodySegments` was declared and consumed nowhere.** The tier table
  promises 8/12/16 radial segments and calls itself the place "'not needlessly
  low-poly' gets spent"; every unit was a hardcoded six-sided cylinder at every
  tier, High included. That, not art, is why units read as cylinders. Now spent.
- **Geometry shared per type and tier** (`render/unitGeometry.ts`). A hundred
  units meant a hundred identical geometry uploads; materials had been shared
  for exactly this reason and geometry had not.
- **Silhouettes are declared per unit** (`SilhouetteDef` in `src/data/`), not
  inferred. Inference was tried and was wrong twice in one sitting: melee
  `range` is 0.9, not the 0 its own doc claimed, and speeds cluster too tightly
  for a threshold to isolate a scout. How a unit reads is an authoring decision.

**Still unspent, same class of bug:** `QUALITY.sceneryDetail` is declared and
consumed nowhere, so scenery is identical at every tier. Logged in `TODO.md`.

## ⚡ Previous — contact shadows (v1.28.0)

**425 tests · full gate green.**

- **A soft violet-shifted ellipse under every unit and building**
  (`render/groundShadow.ts`), scaled to caster radius and spread slightly wider
  than it. Nothing on the board was grounded before this; the scene read as
  decals on a plane.
- **It works with shadow maps off**, which is the whole point: `QUALITY.low`
  disables shadows, so on the weak machines D-006 targets there was previously
  no grounding at all. Four instructions of fragment maths, shipped in every
  tier.
- One shared material and geometry across all casters, pinned by tests — a
  `ShaderMaterial` per unit would break the 100-unit target on its own. Lives
  inside each unit's `detailRoot`, so it vanishes with the body at LOD swap.

## ⚡ Previous — ground that reads as ground (v1.27.0)

**419 tests · full gate green.**

- **Terrain blends three hue paths** by world height, surface slope and
  meadow-scale noise: valley grass, sun-dried `grassHigh`, and rock on steep
  faces. Drying begins below the high-ground combat threshold, so a rise is
  already changing colour as you climb it. This is the first item of the visual
  overhaul and the one that was costing most — elevation carries a real damage
  bonus and was previously invisible (D-035).
- **Behind a `TERRAIN_BLEND` define**, so every other painterly material
  compiles unchanged and pays nothing (D-006).
- **Gallery re-shot** and captions corrected — the old text called the terrain
  "one flat green mass", which is no longer true. It now names what is still
  wrong: ground *shape* is soft, with no authored ramps or chokepoints.

**The remaining D-035 blocker is generation, not shading.** Colour tells you
where the rises are; nothing tells you where the *approaches* are, because the
generator makes smooth noise. That is D-033.

## ⚡ Previous — the Outrider makes flanking matter (v1.26.0)

**416 tests · full gate green.**

- **Outrider** (§8.7: "exploits flank bonuses; weak head-on"). The mechanic is a
  declared **`flankExpertise` trait** that scales the *bonus portion* of
  positional damage — rear ×1.70, side ×1.30, frontal exactly what everyone
  gets — so the specialist gains nothing head-on and the engine rewards the
  trait, never the unit's name (D-029). Weak head-on is the rest of the row: no
  defense, 80 HP, less damage than a Legionnaire. The scout half: fastest ground
  unit (6.0) and the furthest sight (16).
- **Vision radii moved to the data tables** (`UnitDef.vision`,
  `BuildingDef.vision`) out of `ui/fogOfWar.ts` — they are balance numbers, and
  terrain concealment (D-032) now has a clean base to build on.
- **Training hotkeys are content**: `UnitDef.hotkey` drives both the HUD label
  and the key binding, so a new unit declares its own key. Outrider is F.
- No replay/save bump: `flankExpertise` defaults to 1, so existing units and old
  command streams are byte-identical.

**4 of 7 Cohort ground units.** Numbers are first guesses, untested by play.

## ⚡ Previous — two-resource economy as a registry (v1.25.0)

**406 tests · full gate green.**

- **Material (common) and Legacy (rare)**, implemented the way D-031 insisted:
  a **registry** in `src/data/resources.ts` plus generic mechanics in
  `src/sim/resources.ts`, never named fields on `World`. Stocks are a bag keyed
  by resource id; costs are `{ [resourceId]: amount }`.
- **Affordability is per resource, never a sum** — 1000 of one currency does not
  buy something needing 5 of another.
- **Workers self-rebalance**, which is the guard rail that keeps two currencies
  compatible with set-and-forget. They steer toward whichever resource is
  furthest below its declared share and re-aim on deposit only when their
  current resource stops being the shortfall. A 6000-tick no-input test asserts
  both resources get banked.
- **Research costs both currencies**, and the rare nodes sit on the centre line,
  so the tech curve is paid for with map control.
- `REPLAY_VERSION` 8 · `SAVE_VERSION` 2 · `MAP_VERSION` 4.
- A test now fails the build if any `src/sim/` module so much as names a declared
  resource — the exact mistake this session opened with.

**Balance unvalidated:** gather shares, node capacities and the research split
are first guesses. Nothing structural depends on the numbers.

## ⚡ Previous — dev console, softened fog, design blockers closed (v1.24.0)

**382 tests · full gate green.**

- **Dev console** (`ui/devConsole.ts` + `sim/dev.ts`). Backtick to open. The
  design question was which commands are simulation state: cheats (`/dev`,
  `/add`, `/spawn`, `/kill`) are recorded commands, host controls (`/pause`,
  `/speed`, `/tick`, `/reveal`) are not, because the sim has no concept of
  "paused" and recording no-ops would imply it does. `world.devMode` is hashed
  sim state so dev sessions replay *and* clean results are provable.
  `REPLAY_VERSION` 7.
- **Fog softened (B-004).** One terrain-following sheet sampling an R8 coverage
  texture with linear filtering, replacing ~2,300 instanced quads with one draw
  call. Outside the polygon is written *clear* so the rim fades rather than cuts.
- **Four design blockers locked** (D-031…D-034) plus **D-035** (arcade
  legibility over realism).
- **Engine-first is now enforced by a test**, not just documented — it caught
  four pre-existing leaks immediately.
- **B-001 closed as stale**: scenery and nodes had already been on painterly
  materials for some time. A bug list nobody re-checks misleads exactly like a
  stale module map.

**Phase 1 functionally complete.** Only the 100-unit perf verification (B-002)
remains, and it needs real hardware.

## ⚡ Previous — renamed to Greenmantle; painterly pass on units and buildings

**340 tests · 68 modules documented · full gate green.**

- **Project renamed Longbarrow → Greenmantle (D-030).** The old name described
  a burial mound — bones — which fit a fossil race on a terrain slab and no
  longer fits four living elemental forces, overgrowth-as-material, and a
  world-bearing turtle. Two things deliberately did *not* change: the GitHub
  repo is still `Wizard1999/Greenmantle` (renaming it is a manual step, and an
  agent "correcting" the remote would break it), and the save-file magic string
  is still `longbarrow-save` (a format identifier, not branding — renaming it
  would orphan every existing save).
- **Painterly materials on units, buildings, scenery and nodes.** Previously
  terrain only. Shared and cached by role/team in `render/materials.ts` —
  per-unit ShaderMaterials would mean 100+ shader compiles mid-battle and break
  the 100-unit target.
- **Fog recoloured** from pure black (violating D-005) to deep violet-blue.
  Still hard-tiled — logged as B-004, not claimed as fixed.
- **AI now researches**, closing a balance regression from the tech system.

**Phase 1 ≈ 90%.** Remaining for a coherent alpha: **research UI** (the tech
system exists but no player can reach it — top priority), the dev console, and
softening the fog.

## ⚡ Previous — research lands, engine boundary tightened

**340 tests · typecheck/lint/build clean.**

- **Tech system (D-028).** Cohort's linear track: 7 upgrades, 3 tiers, one
  doctrine pair that deliberately does *not* lock the other option out. Effects
  are category-wide (melee/ranged/worker/all) and derived from the researched
  list on demand rather than baked into units — baking would survive tests but
  break `restore()` silently. Hashed, replayed (`REPLAY_VERSION` 6), 24 tests.
  Research now genuinely changes damage, defense, HP, siege and income.
- **Engine-first fix (D-029).** `combat.ts` was implementing the shield wall as
  `if (unit.type !== 'legionnaire')` — a Cohort mechanic inside the engine. Now
  a declared `formsShieldWall` trait the engine reads generically. `sim/` no
  longer names any Cohort unit except in `ai.ts`, which is tracked.

**Roster status: 3 of 7 Cohort ground units.** A match is playable but shallow;
the Outrider (flanker) is the highest-value next unit because it makes the
already-implemented flanking mechanics matter.

## ⚡ Session catch-up — 2026-07-27

**315 tests · typecheck/lint/build clean · `main` current at the commit after this one.**

Two independent tracks landed this session and were reconciled:

1. **External import "v1.23.0"** (72 files, +3,248 lines) — fog of war,
   minimap, direct orders (attack-move/patrol/stop/hold), map boundary polygon,
   LOD, guided tutorial, and the **World Turtle** far-zoom silhouette (D-026,
   a genuine scope addition to the presentation layer — see that entry before
   assuming it's settled art direction rather than a first pass). Fast-forward
   merged and **independently re-verified**: typecheck, lint, all 302 tests
   including `architecture.test.ts` (sim purity), and a manual audit for
   `Math.random`/`Date.now`/`performance.now` leaking into `sim/`. Clean.
2. **`Mission` as a sim entity** (D-007/D-027) — built this session on top of
   (1). `src/sim/missions.ts`, `REPLAY_VERSION` → 5, 11 tests. **Deliberately
   inert** — a mission does not yet change what an assigned squad does; that
   wiring is mission-panel UI work, intentionally left for later so it's built
   against a real primitive instead of inventing its own state.

**Known recurring hazard:** this session's `origin` remote reset to the old
`RTS` repo mid-session (container recreation), *twice*. Always check
`git remote -v` says `Greenmantle` before trusting a push succeeded.

---

## v1.23.0 core direct RTS orders — 84%

- Added deterministic attack-move, patrol, stop, and hold-position commands.
- Commands are available from A/P/S/H hotkeys and the selected-unit card.
- Patrol state is plain snapshot-safe data; replay format advanced to v4 and state hashing now includes direct-order state.
- Orders remain constrained by the generated polygon boundary.
- Clean dependency installation, site consistency, typecheck, lint, all 302 tests, and the production build pass.


---

# Historical log

_Older checkpoints, newest first. Kept for provenance; the current picture
is the top of this file._


## v1.22.0 guided tutorial foundation

Greenmantle now includes an optional seven-step browser tutorial, launchable from the permanent in-game **Tutorial** button or with `?tutorial=1`. The guide observes existing deterministic world and UI state rather than injecting timer-driven simulation changes. It teaches worker selection, set-and-forget gathering, Standard selection, Legionnaire production, combat-unit selection, movement orders, and whole-board camera framing. Completion/skip state is stored locally, and the guide can be reopened at any time. Pure progression tests cover prerequisite ordering and completion. Dedicated tutorial-map setup, contextual world highlights, accessibility review, and real-player pacing validation remain.

## v1.21.0 full-world fog enforcement

A single presentation-side visibility controller now governs the tactical map, 3D unit/building/site/resource views, world picking, right-click target acquisition, and replay/spectator overrides. Unseen rival entities are hidden and cannot be clicked or attacked through fog; discovered resource nodes remain remembered. The battlefield now carries an instanced polygon-clipped fog overlay with distinct unexplored and explored treatments. Replay viewing automatically switches to omniscient vision, developer sandbox modes can toggle player/omniscient visibility, and `?vision=omniscient` supports explicit spectator testing. Deterministic simulation remains untouched.

## v1.20.1 documentation and public-roadmap synchronization

The public development page now embeds the complete contents of `docs/ROADMAP.md`, including all phases, tables, extensions, multiplayer staging, engine-platform stages, World Turtle direction, and polygon-map milestones. `scripts/sync-site-progress.mjs` is the only publication path, so editing the canonical roadmap and running or building the project updates the site automatically. A documentation audit also corrected stale camera, replay, save/load, minimap, AI, and engine-progress statuses across the roadmap and TODO list.

## v1.20.0 tactical fog and seed browsing

The tactical map now maintains a polygon-clipped presentation-side visibility field with unexplored, explored, and currently visible states. Player units, buildings, and sites provide vision; rival markers appear only under current vision, while discovered resources remain known. A compact seed control loads an exact `mapSeed` or generates a new one without consuming the deterministic match RNG. The next visibility milestone applies the same information policy to the 3D world, picking, and commands.


**Date:** 2026-07-27
**Repository:** `Wizard1999/Greenmantle` (public) — migrated from `Wizard1999/RTS`
**Branch:** `main` is the canonical public branch for this handoff
**Last known upstream verification:** 226 passing · typecheck clean · lint clean · build clean
**Current working-copy verification:** 302 passing; site consistency, typecheck, lint, and production build clean

---



## 2026-07-27 active production checkpoint — 84% / v1.23.0

The renderer now has its first camera-distance LOD architecture. Units and buildings retain their authored silhouettes at close and tactical distance, then swap to inexpensive, team-readable strategic markers at overview and whole-world distance. Selection remains available because the active pick target follows the visible representation. Decorative scenery is culled beyond tactical range. The policy is quality-tier aware and isolated in `src/render/lod.ts` with dedicated tests.

The temporary terrain slab now gives way at cosmological zoom to a first World Turtle blockout: shell, head, four limbs, and tail. This is deliberately silhouette-first and not final art. It remains hidden during ordinary RTS play and exists to validate scale, reveal distance, framing, and the transition from battlefield to mythic world-object.

Verification note: a clean `npm ci` completed successfully. `npm run verify`
passes site synchronization and consistency, typecheck, lint, all 302 tests,
and the production Vite build.

## 2026-07-27 active production checkpoint — 44%

The developer sandbox foundation is now complete: scenario presets, simulation controls, render metrics, selected-order diagnostics, and toggleable world overlays are available through `?dev=<mode>`. The war-table camera pans and orbits smoothly, zooms around the cursor, focuses at the actual terrain height, and uses the rendered terrain for anchoring. Selection now rejects hidden projections and resolves overlapping unit/site/building hits through a tested RTS priority policy. Move, gather, rally, attack, and invalid commands all provide immediate world-space acknowledgement.

Automated verification now passes. Manual browser feel, accessibility, and
real-machine performance checks remain pending and are tracked separately.


### Deterministic save files
`src/sim/save.ts` + `tests/save.test.ts` add a versioned, hash-validated save envelope on top of the existing snapshot/restore system. Developer sandbox modes now support browser quick-save/load and portable JSON import/export. Save loading rejects wrong formats, save versions, map-generator versions, tick metadata, and tampered state instead of attempting an unsafe best-effort restore. See `SAVE_AND_REPLAY.md`.

## Developer sandbox diagnostics

Opening the game with `?dev=camera`, `?dev=battle`, `?dev=units`, `?dev=economy`, or `?dev=performance` enables the developer panel. It supports pause, one-tick stepping, simulation speeds, spawning, scenario presets, and live diagnostics for FPS, draw calls, triangle count, entity totals, camera state, and the current selected-unit order. The performance preset creates a repeatable 200-unit formation.

## Last completed

### Repository restructure
- Deleted 21.5 MB / ~150 files of tracked waste: `Claude.html` and `2/3/4/5/7.html`
  plus their six `_files` directories. These were saved copies of the claude.ai
  **app shell** — 1,627 characters of visible text each (a sidebar chat list),
  no design content, and the six asset directories were byte-identical.
- Repo went **222 tracked files / 22 MB → 57 files / 604 KB**.
- Removed `Claude Code Transfer/` (duplicated root files); kept its design doc
  as `docs/GAME_DESIGN.md`.
- Moved working docs to `docs/`, HTML prototypes to `legacy/`, session notes to
  `docs/history/`. Deleted `test_sim.mjs` (superseded by `tests/*.test.ts`).

### Documentation brain
Created `CLAUDE.md`, `START_HERE.md`, `README.md`, and `docs/`:
`ARCHITECTURE.md`, `CURRENT_STATE.md`, `TODO.md`, `DECISIONS.md`, `BUGS.md`,
`UI_BLUEPRINT.md`, `ROADMAP.md`, `ART_REFERENCES.md`.

### Recovered lost design content
The designer re-uploaded `01_design_document.md`. Diffing it against the repo
copy showed the repo version was newer in most respects (elemental framing, art
direction) **but had silently dropped Section 11.1** — four unresolved design
gaps (gatherable resource naming, map tunnels/ramps, stealth/detection, air
units vs. supply pool). These existed in *neither* `GAME_DESIGN.md` nor
`OPEN_QUESTIONS.md` and would have been lost. Merged back into
`docs/GAME_DESIGN.md § 11.1`.

### Tick rate 20 Hz → 30 Hz  (`DECISIONS.md` D-004)
Rescaled every tick-denominated constant by 1.5 to preserve wall-clock behaviour:

| Constant | 20 Hz | 30 Hz |
|---|---|---|
| `AUTOMATION.stepTimeout` | 900 | 1350 |
| `COMBAT.settleTicks` | 20 | 30 |
| `ECON.gatherTicks` | 30 | 45 |
| `ECON.depositTicks` | 4 | 6 |
| `legionnaire.buildTicks` / `attackTicks` | 80 / 16 | 120 / 24 |
| `marksman.buildTicks` / `attackTicks` | 90 / 24 | 135 / 36 |
| `worker.buildTicks` / `attackTicks` | 60 / 24 | 90 / 36 |
| `outpost.buildTicks` | 100 | 150 |
| `MAX_CATCHUP` | 5 | 8 |

Two things deliberately **not** changed:
- `BUILD.progressPerTick` stays 1 — it is a rate, and `buildTicks` scaling
  already preserves wall-clock build duration.
- Unit `speed` stays as-is — movement is `speed * DT`, i.e. per-second, so it is
  tick-rate independent by construction.

`MAX_CATCHUP` was raised because it was sized to absorb exactly one
maximally-clamped 250 ms frame (5 × 50 ms). At 30 Hz that needs 8 steps; leaving
it at 5 would have silently dropped simulated time on slow frames.

All 146 tests passed unchanged, because they reference constants symbolically
(`COMBAT.settleTicks`, `TICK_HZ`) rather than hardcoding numbers.

---

### Determinism foundation — snapshot / restore / hash
New `src/sim/snapshot.ts` + `tests/determinism.test.ts` (10 tests).

Found and fixed a real latent blocker: **`World.rng` was a closure**, so the
generator's position was unreachable state. Nothing failed visibly — a fresh sim
from tick 0 works fine — but rollback could not have restored the RNG position
and every rewind would have desynced. Now `rngState: number`, verified by a test
that JSON round-trips the world (which a closure cannot survive).

This is the shared foundation under all three networked requirements: rollback
is `restore()` + N × `simStep()`, replay seeking is `restore()` to a keyframe,
desync detection is comparing `hash()`, and MMR validation is a server
re-simulating and confirming the final hash.

### Day/night cycle
`src/sim/daynight.ts` + `src/render/skyCycle.ts` + HUD clock, 18 tests.

10 real minutes per in-game day, derived from `world.tick` — **not** wall clock.
A match can start at any hour via `createWorld(seed, startHour)`, and
`dayStartTick` is part of the hashed state so a replay cannot restore a match to
the wrong time of day and still report agreement. Day length is declared in real
seconds in `data/tuning.ts` and converted to ticks once, so changing `TICK_HZ`
cannot silently change day length.

The HUD shows a conic-gradient dial plus `HH:MM` and the period name, always
visible. The sun tracks a real arc and the sky/fog/exposure follow it.

### Replay system
`src/sim/replay.ts` + 11 tests. Records `{ version, seed, startHour, tickRate,
commands[] }` and plays back by re-simulating from tick 0.

All 17 player actions are now a serializable discriminated union routed through
one `dispatch()` funnel, which is what makes recording a single call rather than
25 scattered ones — and forces commands to stay serializable, the property
rollback and networking both need.

Verified to reproduce a recorded match at **every intermediate tick**, not only
the final one; a replay agreeing only at the end could be right by luck. Also
tested: JSON round trip, correct time-of-day restoration, and rejection of
mismatched tick rate or version rather than playing them wrong.

**Live recording is now wired.** Browser input and UI commands pass through a single `issueCommand()` gateway that records the serializable command before invoking the normal `cmd*` function, preserving command results needed by the interface. Replay v3 also records whether the standard AI was enabled plus an optional endpoint tick/hash. The sandbox can export, independently verify, and load the exact verified endpoint. The sandbox now includes an interactive timeline viewer with deterministic lazy keyframes, start/end navigation, 10-second skips, play/pause, and direct scrubbing. Remaining replay work is observed-event integration and cinematic camera framing.

### Map seeds separated from match seeds
`mapSeed` + `MAP_VERSION`, 12 tests.

Map generation now draws from its own generator, never `world.rngState`. That
separation is what makes a **map browser** possible at all — previewing a seed
would otherwise advance the match generator, so the match you played after
browsing would differ from the one you would have played without.

`MAP_VERSION` is the non-obvious half: a seed alone does not reproduce a map,
the generator has to match too. Without it, improving map generation would
silently replay old matches on different terrain. Replay format bumped to v2
and now carries both.

**Not yet procedural** — terrain is still a fixed formula and the layout is
hand-placed, so seeds currently vary only scenery. The plumbing is the part that
would have been expensive to retrofit; the generator itself can be written
whenever.

### PHASE 1 COMPLETE — steps 1.9 to 1.12
29 new tests. Greenmantle is now a game you can win or lose.

**1.9 Squad cohesion.** Diminishing returns past 20 units, measured by
*proximity* not squad membership (D-020) — squad-based counting would be
trivially dodged by simply not grouping, which is the exact formation the rule
exists to discourage. Constants solved backwards from §2's requirement that "a
30-40 unit army should only barely beat a 20-25 unit army"; a test asserts that
ratio so retuning cannot silently break the design intent. Workers exempt.

**1.10 Positioning-driven combat.** High ground, flanking (rear/side/front arcs
off the defender's facing), settle state and cohesion all multiply into
`resolvedDamage()`. Units acquire targets and fight unprompted. Damage is a
deterministic expectation, not a to-hit roll (D-019) — combat consumes no RNG
at all, verified by test.

**1.11 AI opponent.** Gathers, expands supply, builds an army, commits to
attacking. Issues the same commands a human does, and lives inside the sim so
AI matches replay correctly. **Opt-in** via `enableAi()` — a bare world is
inert, so tests and replays are not silently driven by an opponent.

**1.12 Win condition.** Buildings are destructible; a team with no buildings
*and no construction sites* loses after a grace period, so a match cannot be
decided by a one-tick race between a base falling and a site completing.

Two real bugs found and fixed while building this:
- The AI stalled permanently at 7 workers with 2,300 essence banked — it was
  supply-capped and never built anything. Command gates population, so an AI
  that cannot build cannot grow.
- The AI re-tasked its own builder back to mining every think, because
  `cmdAssignBuilders` parks a builder's gather job in `idle`. Construction
  never finished.

## Currently working on

**Development infrastructure and war-table camera prerequisites.**

Completed in the current working copy:
- Windows one-button Play, LAN Play, Tests, and Build launchers.
- Unified `npm run verify` command.
- `docs/PROGRESS.md` live benchmark/percentage scoreboard.
- First developer sandbox entry point and deterministic pause/step/speed controls.
- War-table camera iteration one: camera-relative smooth pan, cursor-anchored smooth zoom, middle-mouse orbit, pure camera math, and safe bounds.

Active next work:
1. Re-test picking, drag selection, and commands at all camera angles.
2. Validate the new move/gather/rally markers and add expanded diagnostics.
3. Refine cursor anchoring against actual terrain height after browser validation.
4. Continue manual cross-browser and real-machine performance validation.

The war-table camera (D-014) remains the next major feature and unblocks the
remaining art pass.

### Paused: the painterly art pass (`DECISIONS.md` D-005) — partially landed.

Built and wired:
- `render/palette.ts` — hue paths (shade/mid/lit) per material, sun/sky/fog
- `render/painterly.ts` — the shading model, plus a `facet()` geometry helper
- `render/quality.ts` — low/medium/high tiers + capability detection
- `render/renderer.ts` — tone mapping, tiered shadows, pixel-ratio cap, fog
- `render/terrainMesh.ts` — terrain now uses the painterly material
- `main.ts` — quality flows through; cloud-shadow globals update per frame

**Still to do:** apply painterly materials to units, buildings, scenery, nodes
and sites; add a quality selector to the HUD; verify the 100-unit target.

### Note on `flatShading`
`PainterlyOptions.flatShading` was removed rather than fixed. Three implements
that flag by recomputing normals per-fragment with `dFdx/dFdy` inside
`<normal_fragment_begin>` — a chunk this shader does not include, since it
carries its own world-space normal through a varying. Setting it would have been
a **silent no-op**. Faceting is now done at geometry level via `facet()`, which
works with any shader. Use that, not the flag.

---

## ⚠️ Sequencing change — read before doing more art

The **war table camera** (D-014) is now the direction: the map as a hologram in
empty space, free flight from any angle, player scaling from miniature to
enormous. Deferred by the designer, but it **should land before** the remaining
art work on units, buildings and scenery — otherwise that work gets done twice.

It also invalidates an assumption baked into the art pass: D-005 justified
omitting close-range detail because the camera was far and top-down. If the
player can shrink into the map, close-up detail is exactly what they will be
looking at. Treat those omissions as scoped to a camera that is being replaced,
not as settled. LOD stops being optional.

### LAN testing and future multiplayer

`PLAY_ON_LAN.bat` now starts Vite on all local interfaces, allowing another
device on the same private network to load the exact development build. This is
currently **shared build access only**; browsers do not yet participate in the
same simulation. True LAN multiplayer is recorded in the roadmap as the first
networking target, ahead of internet lobbies, and depends on replay recording,
periodic state hashes, and deterministic command lockstep.

## Blockers

### ✅ GitHub push access — RESOLVED 2026-07-27
Write access was granted; all commits are pushed and the branch tracks
`origin/claude/project-plan-review-34kyva`. Historical note below kept in case
it recurs.

### ~~🔴 GitHub push access is read-only~~ (resolved)
Commits land locally but **cannot be pushed**. Both credential paths fail:

- `git push` → `403` from the session git proxy
- GitHub API `create_branch` → `403 Resource not accessible by integration`

Reads work fine (`git ls-remote`, `get_me` → authenticated as `Wizard1999`), so
this is a **permissions scope** problem, not a network or auth failure. The
GitHub App installed on the repo has Contents: **Read**, and needs
**Read & Write**.

**Fix:** github.com → Settings → Applications → Installed GitHub Apps → Claude →
Repository permissions → grant **Contents: Read & write** (and **Pull requests:
Read & write** if PRs are wanted), then re-authorize.

Until then, work accumulates as local commits on
`claude/project-plan-review-34kyva`. Nothing is lost, but **nothing is backed
up either** — this container is ephemeral.

---

## Next session

In priority order — full detail in `TODO.md`:

1. **War table camera** (D-014) — free flight, player scaling, table edge, LOD.
   Do this *before* the remaining art work, not after.
2. **Then finish the art pass** — units, buildings, scenery, nodes, sites; HUD
   quality selector. Against the new camera, with LOD in mind.
3. **Dev console** — backtick to open; `/add`, `/pause`, `/speed`, `/spawn`,
   `/kill`, `/reveal`, `/tick`, `/help`. Must route through `sim/commands.ts`
   and be recorded into the replay stream, or replays will desync.
4. **Replay system** (`DECISIONS.md` D-008) — record `{seed, tickRate, version,
   commands[]}`, play back by re-simulating. Ship the determinism test with it.
5. **Basic CPU opponent** (`DECISIONS.md` D-009) — grown alongside features, not
   written late; issues the same commands a human does.

## Rollback: deferred, and that is fine (D-016)

Rollback netcode is **not being pursued for now**. This costs nothing later:

- The snapshot/restore/hash work was never rollback-specific. Replay seeking,
  desync detection, save/load, MMR validation and AI lookahead each need it
  independently. None of it is dead code.
- The expensive parts — per-tick snapshotting, a structure-of-arrays rewrite,
  prediction/reconciliation — were deliberately never started.
- The only thing rollback needs preserved is D-010's plain-data rule, which is
  required by replays and networking anyway and is enforced by tests.

**When multiplayer arrives, start with deterministic lockstep + input delay.**
It is what most RTS ship, and it reuses the command stream `sim/replay.ts`
already produces with no snapshotting at all.

**The one thing that would genuinely hurt:** letting unreachable state back into
`World` — a closure, a `Map`, an object reference between entities. That breaks
replays and validation too, not just rollback, and stays invisible until
something desyncs.

## Still gated on a measurement

- **The 100-unit performance target** (D-006) remains unverified.

## Design decisions awaiting the designer

Four gaps block dependent work — see `GAME_DESIGN.md § 11.1` and `TODO.md`.
The most urgent is **resource naming**: `UI_BLUEPRINT.md` shows a resource panel
reading "Material / Essence / Dominion / Relics", but none of those names were
ever formally adopted. That panel cannot be built until it is settled.

---

## Design philosophy — do not lose this

The game is about **commanding intent**, not clicking fast. The player is an
Operations Commander issuing objectives and doctrine to an army that executes
intelligently. Direct StarCraft-style unit control still exists and always
will — it is simply the *worse* way to play, never a removed capability.

The interface asks *"What are you trying to accomplish?"*, never *"Where do you
want this unit to stand?"* It presents **information, never advice**: "Enemy
Hero Sighted", never "Retreat Recommended". The player owns every decision.

The engineering counterpart: `src/sim/` is pure and deterministic and never
imports outward. Replays, lockstep multiplayer and a testable AI are all free if
that holds and near-impossible to retrofit if it doesn't.


## Public development site

A production-facing one-page site now lives at `/development.html`. It presents the game fantasy, factions, resource language, concept art, active roadmap, completed milestones, and current development focus. Its primary and closing calls to action open `/index.html`, so visitors can play the current browser build without installing anything.

The page does not maintain a second hand-edited progress number. `npm run sync:site` parses `docs/PROGRESS.md` and writes `public/data/progress.json`; `predev` and `prebuild` run that synchronization automatically. Any milestone that changes the live percentage must therefore update `PROGRESS.md` first.

## Performance harness

The performance sandbox now supports repeatable quality-tier comparisons at
`?dev=performance&quality=low|medium|high`. Its fixed 200-unit preset records
average FPS, p50/p95/worst frame time, renderer workload, viewport/device pixel
ratio, and world counts. **Export report** downloads a JSON artifact suitable for
tester bug reports. See `PERFORMANCE_TESTING.md`. Real hardware budgets are not
yet claimed; reports still need to be collected outside this container.

## Replay camera groundwork

A pure optional cinematic replay-director policy now exists in
`src/replay/director.ts`. It ranks plain replay events while enforcing minimum
shot duration, switch cooldowns, score thresholds, distance penalties, and a
manual-camera override window. It is not yet connected to live replay playback
or camera interpolation.


### 2026-07-27 tabletop freedom and website usability
- Public site uses one obvious top-navigation button labelled **Play**.
- Concept-art gallery supports full-screen click/keyboard viewing.
- Hero war-table artwork is smaller and visually farther back in black negative space.
- Camera envelope supports miniature-level inspection, near-overhead overview, full orbit, and travel beyond the authored terrain.
- World backdrop is pure black and the terrain has temporary descending table edges pending the later support-world concept.


### Replay timeline and far-zoom cosmology

`src/replay/timeline.ts` now provides deterministic keyframe-backed seeking. The
developer sandbox can open the current recording or import a verified replay,
scrub to any tick, jump by ten seconds, and play from the timeline while the main
simulation loop remains paused. The first seek builds keyframes lazily and later
seeks restore the nearest cached state.

D-026 locks the maximum-zoom world silhouette to a stylized World Turtle. The
current black void and descending terrain body are intentionally temporary; the
carrier geometry should be introduced through LOD so normal play reads as a war
table and cosmic zoom reveals the complete mythic support creature.


## Whole-board visibility and future map silhouettes

Global distance fog has been removed so the board is never erased by an arbitrary render cutoff. The perspective far plane is 10,000 world units, camera overview range extends to 520 units, and `Home` invokes a tested aspect-aware whole-board framing calculation. Production maps are planned as seeded polygonal boundaries rather than permanent squares; see `MAP_GENERATION.md`.


## v1.17.0 seeded polygon battlefield

The test map is no longer rendered or bounded as a permanent square. A seeded,
rotationally symmetric twelve-vertex polygon is now the canonical battlefield
boundary. The terrain top, descending perimeter, construction validation,
scenery placement, whole-board camera framing, and World Turtle proportions all
consume that same boundary. `MAP_VERSION` advanced to 3 because identical seeds
now produce a different physical map shape.

## v1.16.0 strategic-view readability

The first LOD pass now keeps strategic unit and building markers readable as the camera moves from tactical play to whole-world overview. Marker scale grows sublinearly with camera distance and remains capped, so it does not explode during transition shots. Players can choose Low, Medium, or High rendering quality inside the running game; the choice is persisted and applied through a clean reload because terrain and renderer construction depend on the tier. Perspective near clipping now adapts to camera distance to preserve close inspection while improving depth precision at extreme zoom.


## v1.19.0 polygon tactical map

The HUD now includes a polygon-aware tactical map derived from the same canonical boundary as terrain and gameplay. It renders live units, structures, sites, resources, and the current camera focus/heading. Clicking or dragging on the map recentres the tabletop camera while clamping the requested focus to valid battlefield space. The coordinate transform is pure and covered by tests, leaving a clean future insertion point for fog-of-war masking.

## v1.18.0 polygon-safe gameplay layout

The polygon boundary is now a gameplay constraint rather than only a rendering shape. Manual moves, formation offsets, rallies, behaviour-chain steps, unit-production exits, and per-tick movement are projected into safe navigable space. The simulation safety clamp prevents future systems from accidentally driving units off the table even if they bypass the normal command UI.

Match setup no longer assumes square-map coordinates. Bases, mirrored resource clusters, starting workers, and starting armies are derived from the actual seeded boundary through a deterministic symmetric layout. The AI expansion search now validates circular footprints against the polygon instead of using hard-coded `±34` square limits. `MAP_VERSION` is 3 because this changes the physical setup produced by existing seeds.

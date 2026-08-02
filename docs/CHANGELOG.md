## v1.25.0 — Two-resource economy, as a registry (90%)
**Date:** 2026-07-27

The economy D-031 called for, implemented in the shape D-031 insisted on.

- **Material and Legacy.** Material is common and sits near each base; Legacy is
  rare, few, and placed on the centre line equidistant from both bases, so the
  scarce currency is bought with map control rather than with time.
- **A registry, not two fields.** `src/data/resources.ts` declares which
  currencies exist and their rarity, node capacity, carry amount and gather
  share. `src/sim/resources.ts` implements afford / pay / refund / reserve and
  the worker rebalance by walking `RESOURCE_ORDER`. Stocks are a bag keyed by
  resource id; costs are `{ [resourceId]: amount }`. A game author ships a
  different economy by editing one table, without opening `src/sim/`.
- **Affordability is per resource, never a sum.** A thousand of one currency does
  not buy something that needs five of another — which is the entire reason to
  have more than one.
- **The set-and-forget guard rail is code.** Two currencies normally reintroduce
  worker micro. Idle workers steer toward whichever resource is furthest below
  its declared share, and re-aim on deposit only when their current resource
  stops being the one the team is short of: re-picking every trip would
  ping-pong workers across the map, never re-picking would leave the rare
  resource untouched forever. A test runs 6000 ticks with no player input and
  asserts both resources are banked.
- **Research is paid in both** — Material for the labour, Legacy for the
  understanding.
- **Presentation:** nodes are coloured by resource (warm ochre Material, violet
  Legacy per D-025), the shard a worker carries swaps to match what is in hand,
  and the HUD renders one row per declared resource rather than a hardcoded
  field. Carried loads remember their resource, since a node can be mined out
  while the worker is still walking home.
- `REPLAY_VERSION` 8, `SAVE_VERSION` 2, `MAP_VERSION` 4 — command meaning, state
  shape and map layout all changed.
- 382 → 406 tests, including conservation across both resources (banked +
  carried + still in the ground equals the starting total) and a check that no
  `src/sim/` module names a declared resource.

**Balance is unvalidated.** The 75/25 gather share, Legacy's node capacity and
the research cost split are first guesses that have never been played.

## v1.24.0 — Dev console, softened fog, and the four design blockers closed (88%)
**Date:** 2026-07-27

Phase 1's last unchecked item lands, and the design questions that had been
open since the full-document audit are answered.

- **In-game developer console** (`ui/devConsole.ts` + `sim/dev.ts`). Backtick to
  open. Cheats (`/dev`, `/add`, `/spawn`, `/kill`) are ordinary deterministic
  commands recorded into the replay stream; host controls (`/pause`, `/speed`,
  `/tick`, `/reveal`) change how the session is observed and are deliberately
  *not* recorded. `world.devMode` is hashed simulation state, so a dev session
  replays correctly and a clean competitive result is provable rather than
  claimed. `REPLAY_VERSION` 6 → 7.
- **Fog of war softened** (B-004). Replaced the grid of instanced quads with one
  terrain-following sheet sampling an R8 coverage texture through linear
  filtering and a two-band smoothstep, so cell boundaries read as gradients.
  Ground outside the map polygon is written as clear, fading the fog across the
  rim instead of cutting it. One draw call and a ~2 KB upload per frame in place
  of up to ~2,300 instanced quads.
- **All four `GAME_DESIGN.md § 11.1` design blockers resolved and locked:**
  D-031 two gathered resources (common Material, rare Legacy; Dominion and
  Relics deferred), D-032 stealth as terrain concealment rather than cloaking,
  D-033 map geometry as a generation problem rather than a new system, D-034 a
  single supply pool for every unit including air. D-035 records the arcade
  design target (*Halo*/*Quake*, not *Battlefield*) that came out of the same
  pass.
- **Engine-first content boundary is now executable.** `tests/architecture.test.ts`
  fails the build if `src/sim/` names any unit, race, resource or technology, in
  code or in a user-facing string, with an explicit debt list for `ai.ts` and
  `map.ts` that may only shrink. It found four pre-existing leaks on its first
  run. D-029 had been written in three documents and still got broken during
  this session, which is the point: doctrine that cannot fail a build is a
  suggestion.
- Genericised resource vocabulary inside `sim/` (`'not enough Legacy'` and
  friends became `'insufficient resources'`).
- Added the missing `researchPanel.ts` module-map row that was failing
  `npm run check:docs`, and closed B-001, which had outlived its own fix.
- 340 → 382 tests. Full gate green: docs check, site sync, typecheck, lint,
  tests, production build.

## v1.23.0 — Core direct RTS orders (84%)

- Added replay-safe attack-move, patrol, stop, and hold-position commands.
- Added A/P/S/H hotkeys and selected-unit command buttons.
- Added serializable per-unit order and patrol state, polygon-safe endpoints, and deterministic hash coverage.
- Replay format advanced to v4 because the command stream gained new command meanings.
- Added direct-order tests for arrival, patrol reversal, stopping, and holding.
- Updated the roadmap, progress log, current state, TODO, README-facing website data, package version, and build metadata.
- Reconciled the complete v1.23.0 working archive with current GitHub `main`.
- Fixed strict-TypeScript defects in terrain geometry, the concept-art lightbox, and a visibility fixture.
- Made construction and remote-placement tests deterministic against irregular polygon maps.
- Verified a clean dependency install, site synchronization/consistency, typecheck, lint, all 302 tests, and the production Vite build.

## v1.22.0 — Guided tutorial foundation (82%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Added an optional seven-step tutorial launched from an in-game button or `?tutorial=1`.
- Tutorial progression observes deterministic world/UI state for selection, gathering, production, movement, and camera framing.
- Added persistent completion/skip state without altering match simulation or replay data.
- Added tutorial progression tests for prerequisites and full completion.
- Updated the full roadmap, TODO, current state, README, progress tracker, website data, package version, and build metadata.
- Full dependency-based verification remains pending because project dependencies are unavailable in the current container.

## v1.20.1 — Full public roadmap and documentation consistency audit (77%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Published the complete canonical `docs/ROADMAP.md` on `/development.html` instead of exposing only the compact progress table.
- Extended `scripts/sync-site-progress.mjs` to convert roadmap headings, paragraphs, lists, tables, emphasis, and inline code into generated public data.
- Added responsive styling for the full roadmap and a direct Roadmap navigation link.
- Added `npm run check:site` and made it part of `npm run verify`, rejecting stale progress percentages or omitted roadmap headings.
- Corrected stale roadmap/TODO records for the implemented camera, replay recording, replay keyframes, save/load, CPU opponent, minimap, void presentation, and LOD foundations.
- Corrected the open-engine track's stale 56% reference to the current 77% game-production checkpoint.
- Kept the game-production score at 77%; this patch improves public accountability and project continuity rather than adding gameplay scope.

## v1.20.0 — Polygon fog and map-seed preview controls (77%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Added a polygon-clipped fog-of-war field with unexplored, explored, and currently visible states.
- Derived vision from player units, structures, and construction sites without adding presentation data to deterministic simulation state.
- Hid rival units, structures, and sites from the tactical map unless currently visible; resource nodes persist after discovery.
- Added compact map-seed controls above the tactical map with exact-seed loading and cryptographically random new-seed selection.
- Added `?mapSeed=<integer>` match setup without coupling map browsing to the match RNG.
- Added fog-field tests and passed a strict dependency-free TypeScript compile of the new visibility module.
- Advanced package version to 1.20.0 and tracked production progress to 77%.
- Full Vite/Vitest verification remains pending because project dependencies are unavailable in the current container.

## v1.19.0 — Polygon tactical map and strategic navigation (74%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Added an in-game tactical map clipped to the same deterministic polygon used by terrain and simulation.
- Added live markers for units, buildings, construction sites, and resource nodes.
- Added a camera-focus/heading marker that remains useful at whole-board zoom.
- Added click-and-drag minimap navigation, clamped to the canonical battlefield boundary.
- Added pure minimap coordinate-transform tests.
- Advanced package version to 1.19.0 and tracked production progress to 74%.
- Full dependency-based verification remains pending because package installation is unavailable in the current container.

## v1.18.0 — Polygon-safe movement and boundary-derived match layout (71%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Clamped manual move destinations, formation offsets, rally points, and behaviour-chain steps to the canonical polygon boundary.
- Added a per-tick simulation safety clamp so units cannot drift or be driven beyond the table edge.
- Kept production spawn points and rally destinations inside navigable space.
- Replaced fixed square-map bases, resources, worker groups, and armies with deterministic mirrored anchors derived from each polygon.
- Replaced the AI's square expansion bounds with polygon-footprint validation.
- Advanced `MAP_VERSION` to 3 because the same seed now produces a new gameplay layout.
- Added boundary-clamping, mirrored-layout, move, rally, and behaviour-chain tests.
- Advanced package version to 1.18.0 and tracked production progress to 71%.
- Full dependency-based verification remains pending in the current container.


## v1.17.0 — Seeded polygon battlefields

- Added deterministic, rotationally symmetric irregular map boundaries derived from `mapSeed`.
- Replaced the square plane with a polygon-clipped heightfield and matching vertical perimeter geometry.
- Routed building placement, scenery generation, camera framing, and World Turtle sizing through the canonical boundary.
- Advanced `MAP_VERSION` to 2 and added boundary determinism/fairness/footprint tests.
- Updated all production logs and public progress data to 68%.

## v1.16.0 — Strategic readability and quality controls

- Added capped distance-aware strategic marker scaling for units and buildings.
- Added a persistent in-game Low/Medium/High quality selector.
- Added adaptive camera near clipping across miniature and cosmological zoom.
- Added LOD policy coverage for strategic marker scaling.
- Updated roadmap, current state, progress data, website data, and build metadata.

## v1.14.0 — Whole-board visibility and polygon-map planning

- Removed global distance fog and extended the camera far plane to 10,000 world units.
- Extended free-camera overview range to 520 units.
- Added `Home` whole-board framing using aspect-aware tested camera math.
- Added `MAP_GENERATION.md` for deterministic irregular polygon maps and shared boundary architecture.
- Required versioned working-folder and archive names.
- Advanced tracked production progress to 59%.

## v1.13.0 — Replay timeline and World Turtle direction

- Added deterministic replay seeking with lazy 300-tick keyframes.
- Added sandbox replay timeline, scrubbing, play/pause, start/end, and ±10-second controls.
- Added correctness tests comparing keyframe seeks against full playback.
- Locked the far-zoom world presentation to a progressive World Turtle reveal (D-026).
- Updated roadmap, current state, TODO, and progress score to 56%.



- Added a repeatable performance harness with a fixed 200-unit scenario, temporary `?quality=` tier overrides, p50/p95/worst frame timing, and downloadable JSON reports.
- Added `docs/PERFORMANCE_TESTING.md` and unit tests for percentile math and URL quality selection.
## 2026-07-27 — Test-build identification and production LAN flow (38%)

## 2026-07-27 — Live replay capture and verification (49%)

- Routed all human gameplay commands through one browser-side recording gateway while preserving normal command return values.
- Bumped replay format to v3 and recorded opponent setup, export endpoint tick, and final state hash.
- Added exact replay verification by deterministic re-simulation and explicit desync reporting.
- Added sandbox controls to export, verify, and import replay files; imported replays load only after their endpoint hash agrees.
- Invalidated active recording after save/replay state replacement so a misleading mixed-history replay cannot be exported.
- Added tests for AI-enabled replay reproduction, endpoint verification, tamper rejection, and invalidated recordings.


- Added generated `public/data/build.json` metadata for every dev/build run.
- Added an unobtrusive in-game build badge for exact tester reports.
- Added `PLAY_ON_LAN_PRODUCTION.bat` to build and serve the optimized browser game over LAN.
- Updated package pre-scripts so site progress and build metadata remain synchronized.

## 2026-07-27 — Camera/interaction diagnostics checkpoint (36%)

- Added tested overlap-aware click-picking priority for units, sites, and buildings.
- Added distinct attack-order and invalid-order world feedback.
- Made camera focus sample the canonical terrain-height function.
- Made cursor-anchored zoom raycast the rendered terrain mesh, preventing hill drift.
- Added developer toggles for selected-unit order lines and footprint/radius overlays.
- Synchronized progress, current-state, roadmap, and task records.

## 2026-07-27 — Camera-safe selection benchmark

- Extracted normalized screen-rectangle and point-containment math into a pure module.
- Prevented drag selection from accepting units behind the camera or outside clip depth.
- Added tests for reverse-direction drags, rectangle edges, out-of-bounds points, and invisible projections.
- Advanced the live production plan to 30%.

## 2026-07-27 — Sandbox diagnostics benchmark

- Added purpose-built presets for battle, units, economy, and performance sandbox modes.
- Added live FPS, WebGL draw-call, triangle, entity-count, camera-state, and selected-order diagnostics.
- Added a one-click 200-unit stress formation for repeatable performance checks.
- Advanced the live production plan to 28%.
## 2026-07-27 — Agent reasoning and quality protocol

- Added `docs/AGENT_REASONING.md` as a permanent pre-work checklist for coding agents.
- Adopted UNDERSTAND → ANALYZE → REASON → SYNTHESIZE → CONCLUDE and domain-specific variants as quality disciplines.
- Added Longbarrow-specific architecture, determinism, visual-readability, performance, evidence, and documentation checks.
- Explicitly separated useful structured prompting from unverified claims about hidden model modes or internal architecture.
- Updated `CLAUDE.md` and `START_HERE.md` so future agents read and apply the protocol every session.


## 2026-07-27 — Public development landing page

- Added a premium one-page public-facing development site at `development.html`.
- Added prominent Play buttons that open the browser game at `index.html`.
- Added faction, resource, concept-art, roadmap, milestone, and current-focus sections.
- Added `scripts/sync-site-progress.mjs`, which converts `docs/PROGRESS.md` into site data before development and production builds.
- Configured Vite as a multi-page build so both the game and development page ship together.
- Added responsive layouts, reduced-motion support, accessible progress semantics, and restrained reveal motion.

# Changelog

## v1.21.0 — Full-world fog enforcement

- Added one shared presentation-side visibility controller for player and omniscient modes.
- Added an instanced 3D fog overlay for unexplored and explored polygon-map cells.
- Hidden rival units, buildings, sites, and territory rings no longer render or participate in picking.
- Hidden rival targets can no longer receive click-based attack orders through fog.
- Discovered resource nodes remain visible as remembered information.
- Replay viewer switches to omniscient vision; developer sandbox and `?vision=omniscient` expose explicit overrides.
- Added visibility-policy tests and synchronized the public roadmap/progress data.


- Added the VoXelo CodePen (`yygKOVy`) to the high-fidelity WebGL inspiration list for later technical review.
Tracks every buildable version and every locked design decision, regardless of
which environment produced it (this chat, or Claude Code). Newest entry on top.

Versioning follows the blueprint's phase.step numbering (`02_development_blueprint.md`),
e.g. `v1.2` = Phase 1, step 1.2. Design-only entries (no code) are marked `[design]`.

---

## v1.15.0 — Zoom-aware LOD and first World Turtle blockout (62%)
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

- Added quality-aware close, tactical, strategic, and world LOD tiers.
- Units and buildings swap to low-cost team markers at long range while remaining selectable.
- Distant scenery is culled outside tactical viewing distance.
- Added pure LOD distance/reveal tests.
- Added the first far-zoom World Turtle silhouette: shell, head, limbs, and tail.
- The temporary slab is hidden when the turtle support is revealed.
- Advanced package and build version to 1.15.0.
- Full verification remains pending because dependency repair timed out.


## 2026-07-27 — Cinematic replay-director groundwork (45%)

- Added a simulation-independent replay-event taxonomy and event-ranking policy.
- Added minimum shot duration, switch cooldown, importance threshold, distance-aware scoring, and manual camera override protection.
- Added dedicated policy tests.
- Documented free, follow, event, and director replay-camera modes and kept the feature outside deterministic simulation.


## [design] Ghibli art reference received — analysis, no code yet
**Date:** 2026-07-27 · **File:** designer-supplied CodePen (`claude-opus-5-ghibli`)

Designer supplied a reference scene as major art direction, plus three notes:
**not too low-poly if it doesn't have to be**, **good lighting matters a lot**,
and **it must run on practically any machine straight from the website**. The
pen itself is unreachable from this environment (`codepen.io` is blocked by
egress policy), so it arrived as a zip and was read as source.

**What the reference actually is:** a first-person walker in a valley, ~6k
lines, Three.js r180, hand-written `RawShaderMaterial` throughout. Instanced
grass across four overlapping rings with per-blade view-cone culling and a
depth prepass; planar water reflection as a second full scene render; cloud
coverage and cloud-shadow render targets; a post chain of bloom, watercolour
softening, chroma bleed, print curve, vignette and grain; sky drawn last. It
already ships LOW/MED/HIGH quality presets, which tells you what it costs.

**The useful finding: the Ghibli look is not coming from the expensive parts.**
It comes from the shading model, which is cheap fragment maths:
- `ramp3()` — a three-colour **hue path** (shade → mid → lit are different
  hues, not one colour darkened), with soft but visibly banded transitions.
- Half-lambert wrap (`ndl*0.62 + 0.46`) so a low sun doesn't crush the ground
  into shadow — the comment notes plain Lambert made golden hour read as dusk.
- Painterly jitter on the band edges, so the bands aren't machined.
- **Shadows change hue rather than going black.**
- Hemispheric ambient normalised to unit luminance so it *tints* without
  bleaching the palette.
- A backlight rim term the author calls "the connective tissue of the whole
  image".
- Aerial perspective, and subsurface transmission for thin things.

That set transfers to an RTS almost for free. The per-blade grass, the planar
reflection and the full post chain do not — and at a far, top-down RTS camera
they buy much less than they do in first person, while being exactly what
breaks the "runs on any machine" requirement.

**No renderer code changed yet.** Scoping and scheduling are open — see
`OPEN_QUESTIONS.md` Q25. Logged now so the reference and the analysis aren't
lost.

---

## v1.8 — Core Units (Legionnaire shield-wall, Marksman setup)
**Date:** 2026-07-27 · **Environment:** Claude Code · **Files:** `src/sim/combat.ts`, `src/data/units.ts`

Gives Cohort's two core units the mechanics that make them *those* units rather
than two stat blocks. No fighting yet — that's 1.9. What exists now is the
answer to "how good is this unit right now, standing where it is standing",
which is the part that has to be right first in a game where positioning beats
micro (§2).

**What changed:**
- **Marksman added** — ranged, fragile, long reach, and deliberately punishing
  to kite with.
- **Combat stat block on every unit type** (hp, damage, range, attack interval,
  accuracy stationary/moving, defense). Workers get one too, so 1.9 and the
  1.12 win condition have something to act on.
- **Legionnaire shield-wall (§8.7):** defense climbs with each adjacent
  friendly Legionnaire, capped, with a hard ceiling. A formed line measurably
  out-trades the same models scattered — tested directly rather than implied.
  Drawn on the ground as a ring that brightens with the bonus, because §8.6 is
  explicit that this should be legible on the battlefield rather than a hidden
  stat.
- **Marksman accuracy (§8.7):** far better set up than moving, and stopping
  doesn't restore it instantly — accuracy ramps over `COMBAT.settleTicks` of
  holding position. That ramp is the whole point: without it, kiting is free
  and the unit becomes an execution test, which §2 explicitly doesn't want.
- Silhouettes now carry role, since the battlefield has to read at a glance:
  the Legionnaire is broad and low with a shield, the Marksman narrow and tall
  with a long stave, the worker smallest.
- `stillTicks` added to units and advanced by `stepSettle` after movement.

**Testing:**
- **146 passing** (110 previous + 20 new + others). New suites cover the wall
  scaling with neighbours, interior-of-line beating the ends, formed vs.
  scattered expected damage, the neighbour cap and defense ceiling, enemy and
  wrong-type units not counting, the settle ramp in both directions, kiting
  costing damage, and determinism of the new state.

**Assumptions/notes:**
- **A12 (new):** the design doc says the shield wall scales "up to cohesion
  cap", which is ambiguous. I read it as a *local adjacency* cap
  (`shieldWallMaxNeighbours`, currently 5 — roughly how many bodies can
  actually touch you), separate from §8.6's ~20-unit squad cohesion cap that
  arrives at 1.10. Flagged as Q22.
- **A13 (new):** `settleTicks` (1s) is invented — the design doc says the
  Marksman is better stationary but never says how long setting up takes.
- Every number here is a placeholder; none of it is balanced.

**How to test:** `VERIFICATION_CHECKLIST.md` §E4.

---

## v1.7 — Squads & Behaviour Chains
**Date:** 2026-07-26 · **Environment:** Claude Code · **Files:** `src/sim/squads.ts`, `src/ui/chainEditor.ts`, `src/render/chainVisuals.ts`

Finishes the step that was mid-flight at the handoff. The draft's simulation
logic was sound and is kept nearly verbatim; what was missing was everything
that made it reachable — the tick call, the commands, the interaction, and the
tests.

**What changed:**
- `stepSquads` now runs in the tick, between construction and gathering, so
  standing orders are resolved before the units they command move.
- **Squad commands**: form, disband, add/remove/clear chain step, loop toggle,
  run, stop. Squads are persistent named groups (**Q1(a)**), addressed by
  number — `Ctrl+1…5` forms, `1…5` selects. A unit belongs to at most one squad.
- **The interaction** (`ui/chainEditor.ts`): pick a behaviour, click the map to
  site that step. A three-step chain is six clicks, plus Run. The blueprint's
  bar is "if it feels like scripting, it's wrong", so the chain is also drawn
  **on the ground** — coloured waypoint posts joined by a line, the executing
  step standing taller, the line closing into a loop when the chain loops.
  Squad membership shows as a cyan ring under every member, whether or not
  that squad is currently selected.
- **Assumption A4 is now actually enforced.** The draft computed
  `automationSlots()` but never consulted it, so the Command-gated concurrency
  cap did nothing. Starting a chain past the cap is now refused with a reason,
  and the HUD carries a `chains` readout beside supply. Starting Command (15)
  buys exactly one slot; an Outpost (+8) buys the second. This is the half of
  §8.3 that gives Cohort its "bandwidth of standing orders" flavour, so it
  needed to bite.
- **"Continues until redirected" (§4) is mechanical, not just prose.** A
  hand-issued move, gather, or build order to any squad member takes that squad
  off automation rather than fighting it.
- Fixed `attackmove`'s `ongoing` flag, which the draft wrote as `true === false`.
  It evaluated to `false`, which matches the intent — attack-move completes on
  arrival — but it read like a typo mid-edit.
- `assignGather` moved from `commands.ts` into `economy.ts`. Both the player's
  gather order and an automated `gather` step need it, and `squads.ts` must not
  import `commands.ts`; `cmdGather` is now a thin wrapper that also handles the
  redirect.

**Testing:**
- **126 passing** (85 ported + 5 architecture + 36 new). New suites: squad
  persistence and single-squad membership, a three-step chain advancing through
  every step unattended, loop-by-default and the loop-off toggle, the Command
  gate refusing a second chain and an Outpost lifting it, manual redirect,
  gather steps as ongoing, the step timeout clearing an unreachable step, chain
  editing limits, and squads disbanding when their last member dies.

**Assumptions/notes:**
- **A9 (new):** 8 Command per automation slot. Chosen so the opening position
  has exactly one slot and the first Outpost visibly buys the second — the
  mechanic should be legible within the first few minutes. Pure tuning.
- **A10 (new):** a manual order stops the chain rather than pausing it. See
  `OPEN_QUESTIONS.md` Q18.
- **A11 (new):** a `gather` step targets the nearest live node to the point you
  clicked, not one specific node, so a chain keeps working after that node is
  mined out.
- **Q3 is implemented as leaning** — loop by default, per-chain toggle — but
  still unconfirmed with the designer.
- Chains are capped at 6 steps and squads at 5, both arbitrary.

**How to test:** `VERIFICATION_CHECKLIST.md` §E3. Short version: press **G**,
then **Ctrl+1**, then Move→click, Attack-move→click, Patrol→click, then **Run**.
It should run the loop unattended until you right-click somewhere with those
units selected.

---

## v1.1 — Project Structure (Vite + TypeScript migration)
**Date:** 2026-07-26 · **Environment:** Claude Code · **Files:** `package.json`, `src/**`, `tests/**`

The step that was skipped in chat for lack of `npm`, done as a real migration
rather than a blank scaffold, per `07_claude_code_migration.md`.

**What changed:**
- Vite + TypeScript (`strict`, plus `noUncheckedIndexedAccess`) + Three.js and
  vitest via npm. Dev server, type checker, linter, and a test suite that runs
  against real modules instead of a string-extracted `<script>` block.
- Ported `phase1_step1.6_construction.html` into the module layout from
  `06_phase1_kickoff.md` §2. Each `/* ---------- path.ts ---------- */` marker
  in the source became its module; behaviour is unchanged.
- `core/loop.ts` now owns the accumulator loop itself rather than just its
  constants. Nothing in the render callback advances game state.
- **The sim-purity rule is enforced rather than documented** (06 §3): an ESLint
  `no-restricted-imports`/`globals`/`properties` block scoped to `src/sim/**`
  fails the lint if the sim imports `three`, touches the DOM, reads wall-clock
  time, or calls `Math.random()`. `tests/architecture.test.ts` re-checks it
  statically, and the ported purity test still runs a full simulation with
  `Math.random` rigged to throw.

**Testing:**
- **85/85 ported tests passing, unchanged in behaviour** — the point of porting
  them in the same pass rather than after. Plus 5 new architecture tests.

**Assumptions/notes:**
- Three.js r128 → r185. Every geometry and material still exists; only the
  point lights on building cores needed rescaling, since Three's lighting has
  been physically correct since r155. Directional and hemisphere intensities
  carry over unchanged. Output is sRGB now rather than r128's linear default,
  so colour reproduction is slightly different — and more correct.
- `npm audit` reports a high-severity advisory in `brace-expansion`, reached
  only through ESLint's own config loader. Clearing it means ESLint 10, a
  breaking upgrade, for a dev-only DoS vector. Left alone deliberately.
- The single-file HTML builds are kept for reference and rollback; they are no
  longer the thing under test.

**How to test:** `npm install`, then `npm run dev`. `npm test` for the suite,
`npm run lint` for the purity rule, `npm run build` for a production bundle.

---

## [design] Migration to Claude Code
**Date:** 2026-07-26 · **File:** `07_claude_code_migration.md` (new)

Designer ready to move development to Claude Code. Wrote the migration handoff doc: current status table, full file manifest, and instructions to treat 1.1 as a real port of the validated single-file builds (through 1.6) into the Vite/TS module structure from `06_phase1_kickoff.md`, porting `test_sim.mjs` to `vitest` in the same pass rather than after, so all 85 tests continue proving the port didn't change behavior.

1.7 (squads & behaviour chains) was mid-flight in chat when the switch happened. Simulation logic is drafted and parses standalone — squad persistence, the four Phase 1 behaviours, ongoing-vs-completing step semantics, a step timeout, and the Command-gated concurrency cap (A4) — but it is **not wired into the tick, has no commands, no input/UI, and no tests.** Handed off as `phase1_step1.7_squads_IN_PROGRESS.html` for Claude Code to finish rather than restart. Depends on two unconfirmed assumptions from `OPEN_QUESTIONS.md`: Q1 (squads as persistent groups) and Q3 (chains loop by default).

---

## v1.6 — Queue & Walk Construction
**Date:** 2026-07-26 · **Environment:** chat (no build step) · **File:** `phase1_step1.6_construction.html`

**What changed:**
- Replaced 1.5's instant-placement placeholder with Cohort's real construction identity (blueprint 1.6, design doc §8.1). Placing a structure now commits the essence and creates a **construction site**; a worker still has to walk there, and building only advances while a builder is actually standing at it.
- **Pause-on-reassignment**, the behaviour the blueprint singles out as deliberate: progress is stored on the *site*, not the worker. Pulling a worker off — via a move order, a gather order, or any other reassignment — stops the clock and keeps the progress. Right-clicking the site with a worker resumes from exactly where it stopped. This is the whole reason construction is modelled this way rather than as a worker-owned timer.
- Sites can be cancelled for a full refund (Esc or the command card), block placement of other structures, and grant **no Command until finished**.
- Building and gathering are mutually exclusive per worker; each order type cleanly releases the other.
- Sites render as the real silhouette **sunk into the earth, rising as they complete** — fitting for a civilisation whose visual identity is geological. Paused sites go translucent and their footprint ring turns amber, so a forgotten build site is visible at a glance across the map.
- Sites are selectable, with live progress and an explicit "PAUSED (no worker)" readout.

**Assumptions/notes:**
- **A8 (new): additional workers do not build faster.** Construction runs at a flat rate whenever at least one assigned worker is present. Stacking workers to rush a structure is a different race's fantasy, and Cohort's economy is "flat and reliable" throughout (§8.1) — the intended decision here is *whether to leave the worker there*, not how many to pile on. Explicitly tested. Flagged in `OPEN_QUESTIONS.md` as worth a second look, since it does make construction feel slightly inert.
- Builders go idle at the site on completion rather than returning to their previous job. The design doc doesn't specify; auto-returning to the last gather assignment might feel better and is a small change.

**Testing:**
- **85/85 passing.** New suites: sites vs. buildings at placement, no progress while walking, completion into a real structure, builder release, unfinished sites granting no Command, progress retention across reassignment (the core mechanic, tested from both directions), gather/build mutual exclusion, non-workers rejected as builders, cancellation and refund, placement blocking against existing sites, and a test confirming four workers build no faster than one.
- Updated 1.5's placement tests, which now correctly expect a site rather than a finished building.

**How to test:** `VERIFICATION_CHECKLIST.md` §E2. The one that matters: start a build, let it reach ~40%, then send the worker away. The site must keep its progress and say PAUSED — not reset, not vanish.

---

## v1.5 — Command Supply, Production & Outposts
**Date:** 2026-07-26 · **Environment:** chat (no build step) · **File:** `phase1_step1.5_command_supply.html`

**What changed:**
- Implemented Cohort's **Command** supply stat (blueprint 1.5, design doc §8.1): a single value that both caps population and defines control range, contributed by Command structures rather than tracked separately.
- Added **unit production**: the Standard trains Workers and Legionnaires; Outposts train Workers. Costs essence, takes time, queues up to 5 deep, full refund on cancel. Units emerge at the building edge and walk to a rally point (right-click with a building selected to move it).
- **Queued units count against the cap immediately.** Charging only on completion would let a player over-queue and strand finished units with nowhere to stand.
- Added the **Outpost**: a smaller Command structure (+8 command, 11 control radius) that also accepts essence, so expanding toward a distant node shortens the haul — the mechanical payoff for §8.1's "methodical — road, then outpost, then permanently held."
- Placement system with live preview ghost, green/red validity colouring, and validation against structures, essence nodes, map bounds, and cost. Shift+click places repeatedly.
- Command card UI (bottom centre) driven by selection, with affordability-aware buttons, queue progress, and a toast for rejected orders. Buildings are now selectable; hotkeys Q/E train, B builds, Esc cancels.
- Control-range rings drawn flat on the terrain, following elevation so they read as territory rather than floating UI.
- Extended the fossil/glow art language (§8.8) to the Outpost — same silhouette language at a smaller scale, four ribs instead of six.

**Assumptions/notes:**
- **A7 (new): what control range *does* for Cohort is unspecified in the design doc.** The obvious use — restricting where you may build — is Conclave's mechanic ("Project from Network," §8.1), so using it for Cohort would violate the no-reskinning rule; Cohort's construction identity is "Queue & Walk," meaning a worker walks wherever you point it. Control range is therefore implemented as **territory display only**, with no mechanical bite yet, and is explicitly tested to confirm it does *not* gate placement. Needs a designer decision on what it should earn.
- Outpost placement is **instant** — a deliberate placeholder. 1.6 replaces it with real Queue & Walk construction (worker walks to site, builds over time, reassignable mid-build without cancelling). The placement validation and cost logic built here are what 1.6 keeps; only instant completion goes away.
- Starting Command is 15 against 12 used, so the cap is reachable within a couple of units. Deliberate for testability; may want more early headroom once tuning starts.
- All costs, build times, and Command values are placeholders.

**Testing:**
- **61/61 passing.** New suites: Command cap derivation, supply accounting including queued units, cap enforcement, essence deduction, production timing and queue depth, cancel refunds, rally behaviour, placement validation (overlap / node / bounds / affordability), outposts raising the cap, outposts serving as nearest drop-off for remote nodes, and an explicit test that control range does *not* gate construction (A7).

**How to test:** See `VERIFICATION_CHECKLIST.md` §E. Short version: click the Standard, press **Q** twice to hit the Command cap, then select a worker and press **B** to place an Outpost near a distant node and watch the cap rise and the haul shorten.

---

## v1.4 — Worker Gather Loop
**Date:** 2026-07-26 · **Environment:** chat (no build step) · **File:** `phase1_step1.4_gather_loop.html`

**What changed:**
- Implemented Cohort's set-and-forget gather loop (blueprint 1.4, design doc §8.1/§8.2): one right-click on a resource node assigns a worker indefinitely — walk out, extract, haul back, deposit, repeat, with no further input for the rest of the match.
- Added `sim/economy.ts`-equivalent: resource nodes with finite capacity, drop-off buildings, per-team resource stocks, and the four-state worker job machine (`toNode → gathering → toBase → depositing`).
- Added worker unit type (slower and smaller than Legionnaire) and the `standard` building type (base + drop-off; becomes the Command structure at 1.5 and the win-condition target at 1.12).
- **Auto-retasking:** when a node runs dry, workers deliver what they're carrying and re-target the nearest remaining node on their own. When the map is fully exhausted they deliver the last load and go idle rather than spinning.
- Added `sim/map.ts`-equivalent `buildTestMap()` — 180°-rotationally-symmetric two-base map with four nodes, satisfying §2's "no spawn has an inherent advantage." Symmetry is now enforced by test, not by eye.
- Explicit move orders cancel a gather job (the player's escape hatch from automation); non-worker units correctly reject gather orders and just walk to the node instead.
- Resource UI: essence banked, workers gathering / total, essence remaining on map, plus an essence/min rate readout in the debug panel.
- **First art-direction implementation** (§8.8 Cohort): the base structure is bone-pale stone, fossil-ribbed with no visible mechanism, moss collecting in the seams, and a slowly pulsing warm gold core — the "still faintly alive" tell. Resource nodes are pale crystalline shards that visibly shrink as they deplete, so map state reads at a glance without UI.

**Bugs fixed:**
- **Workers parked on top of each other at resource nodes.** Each worker is assigned its own slot around the node (deterministic golden-angle offset from unit id, no RNG), but the transition into `gathering` was gated on distance to the *node centre* — so since workers all approach from the base, they all crossed that radius in the same place and stopped there, never reaching their assigned slots. Now gated on arrival at the worker's own slot. Caught by test [12].

**Testing:**
- Test suite rewritten and expanded: **36/36 passing.** New coverage — map symmetry, resource conservation (banked + carried + remaining always equals the starting total), exact carry multiples with no rounding drift, node depletion, automatic re-tasking, graceful exhaustion, order interaction (move cancels gather, non-workers reject gather, invalid node is a no-op), and parked-worker separation sampled across a full gather cycle.
- Framerate-independence test upgraded to compare full world state (resources, node amounts, all worker positions to 9 decimal places) rather than a single unit's position.

**Assumptions/notes:**
- **A6 (new): the resource is named "essence"** — a placeholder. Never named in the design doc; "Essence" was floated in the early ChatGPT reference conversation. It's one string in `data/`, trivially renamed, and probably wants a pass alongside the elemental/naming work.
- Units still pass through each other in transit. Unit collision belongs with pathfinding — deliberately out of scope for 1.4, noted in the test file.
- Gather numbers (30-tick extract, 8 per trip, 1200 per node) are placeholders per the blueprint's scope-discipline note. The economy is deliberately *not* tuned yet.

**How to test:** Open the file. Press **G** to select all four workers, then right-click a glowing crystal cluster. They should run the full loop indefinitely with no further input — watch the essence counter climb, the node visibly shrink, and workers show a carried shard on the return trip. Press **T** to confirm the economy runs at the same real-time rate regardless of framerate.

---

## [design] Mycora tonal reference logged
**Date:** 2026-07-26 · **File:** `01_design_document.md` §11

Designer reference for the later Mycora pass: *Nausicaä*'s Sea of Corruption (fungal spread as a vast natural process indifferent to people) crossed with *The Last of Us*'s treatment of infection as an intimate, proximate threat. Read: Mycora is the thing creeping at your border that must be burned back now, not a blight on the horizon. Logged rather than acted on — reinforces existing mechanics (deniable Grow construction, cheap-to-plant/cheap-to-erase colonies) without requiring changes. Full pass deferred to Phase 2.

---

## [design] Elemental Race Framing + Ghibli Art Direction
**Date:** 2026-07-26 · **File:** `01_design_document.md` (updated in place — this is now the living copy; supersedes the project-folder version)

**What changed:**
- Locked all four races as forces of nature, each mapped from its existing core value: Cohort/Order → **Death**, Mycora/Presence → **Life**, Conclave/Knowledge → **Water**, Titanfolk/Control → **Earth**. No mechanical systems changed — this is a visual/thematic layer over identities already in place.
- Revised Cohort's visual identity: kept the "ancient dead civilization" concept rather than discarding it, but evolved it — the war-machine isn't a relic that's still running, it's become a permanent, inherent scar on the world, indistinct from any other force of nature. Fossil-boned, weathered, gently overgrown with moss/vines, soft warm internal glow (gold/pale-green) at vital points, beam weapons reading as light escaping cracks in bone. Explicit reference: the guardian robots in *Castle in the Sky*. Explicitly still NOT steampunk/clockwork, and newly flagged as NOT reading as Necron-style cold dormant-machine horror — warmth and overgrowth are the details doing that work.
- Locked **Ghibli-influenced low-poly** (not just BOTW-low-poly) as the project-wide art pillar: warm painterly lighting, natural asymmetry, weathering/overgrowth as real material across all four races. Updated Production Plan (Section 10.1) accordingly.
- Added a flagged-for-later idea: contested ground cover (ash spreading from Cohort vs. green overgrowth from Mycora) where their territories touch. Not scheduled to a phase yet — logged in Section 11 so it isn't lost.

**Assumptions/notes:**
- Section 8.8 table now has a fifth column (Element) — Conclave and Titanfolk rows carried forward unchanged; whether their names/visuals should lean further into "Water"/"Earth" explicitly is now an open question (added to Section 11), not yet decided.
- This design doc revision happened in chat, independent of the Claude Code environment. If Claude Code has made its own edits to a copy of this file in parallel, diff before merging.

---

## v1.2 — Fixed-Tick Simulation
**Date:** 2026-07-26 · **Environment:** chat (no build step) · **File:** `phase1_step1.2_fixed_tick.html`

**What changed:**
- Restructured Phase 0 into a fixed 20Hz simulation tick, decoupled from the render loop, per blueprint 1.2.
- Introduced the `SIM CORE START` / `SIM CORE END` boundary: everything inside is pure — no Three.js, no DOM, no `Math.random()`. This is the rule the whole architecture leans on later (headless testing now, lockstep multiplayer in Phase 4.3).
- Added `core/rng.ts`-equivalent seeded PRNG; scenery generation is now deterministic per seed instead of random per load.
- Added render-side interpolation (`syncViews`) so 20Hz simulation still looks smooth at display refresh rate.
- Added a debug HUD (render fps vs. sim ticks/s, tick count, interpolation alpha, unit/selection counts) and a **T** key to artificially throttle the frame rate, so tick-rate independence is visible without opening devtools.
- Added groundwork for 1.3: `elevationAdvantage()` / `hasHighGroundOver()` in `sim/terrain.ts`-equivalent. Not wired to combat yet — no combat exists yet.
- Single source of truth for terrain height (`terrainHeightAt`) — the render mesh now samples the same function the sim uses, instead of a duplicated formula.

**Bugs fixed (carried over from Phase 0, see `06_phase1_kickoff.md` §6):**
- Click-select and drag-select no longer allow selecting/commanding the rival (red) squad.
- Terrain height duplication removed — was causing the mesh and gameplay height to disagree at low elevation.
- Duplicate `mouseup` listeners on the canvas consolidated into one.

**Testing:**
- Added `test_sim.mjs` — extracts the `SIM CORE` section from the HTML and runs it standalone under Node, with `Math.random` rigged to throw. Verifies: sim purity, determinism, movement timing, framerate-independent tick batching, interpolation lag, terrain floor clamping, high-ground helper correctness, and that `cmd*` functions are the only mutation path.
- **18/18 passing.**

**Assumptions/notes:**
- High-ground helpers exist but aren't yet exercised by anything — real validation waits for 1.3 once combat exists to attach the bonus to.
- This file is a temporary single-file build for working without a dev server (library computer, no `npm install` access). It is written in clearly-marked sections matching the `src/` module layout in `06_phase1_kickoff.md` §2, specifically so migrating to the real Vite project in Claude Code is a per-section cut-and-paste rather than a rewrite.

**How to test:** Open `phase1_step1.2_fixed_tick.html` directly in a browser. Select/move units normally. Press **T** to throttle rendering to ~12fps and confirm units still cross the map in the same real time (sim ticks/s stays ~20 in the debug panel even as render fps collapses).

---

## v1.1 — Project Structure
**Status:** Not started. Blocked on Claude Code access (needs `npm`/Vite; not achievable in the no-network chat sandbox). Deferred behind 1.2 — see designer note in chat.

---

## v0 — Phase 0: Tech Spike
**Date:** (prior to this package) · **Environment:** unspecified · **File:** `05_phase0_prototype.html`

**What it proved:**
- Three.js renders low-poly terrain with gentle elevation in-browser, no build step.
- RTS camera (fixed downward angle, WASD + edge-scroll pan, scroll-wheel zoom) feels workable.
- Click-select, drag-box-select, right-click-move with basic formation spread all function.

**Known issues carried into v1.2 (see above for fixes):** rival units selectable, terrain height duplicated between mesh and gameplay, right-click move ignored terrain height (`y = 0` hardcoded), duplicate event listeners, team assignment ran after spawn.

---

## [design] Handoff package received
**Date:** 2026-07-26

`00_START_HERE_FOR_OPUS.md` through `05_phase0_prototype.html` received and read in full. `06_phase1_kickoff.md` authored: settles stack (Vite/TS/Three.js via npm), target module structure, the sim-purity rule, per-step acceptance criteria for 1.1–1.13, and five flagged assumptions (A1–A5, see that file §5) where the design document doesn't fully resolve a Phase 1 implementation detail.

**Environment split decided:** Claude Code not available until later same day. Chat work continues in the meantime using single-file, no-build-step HTML (library computer has no server access), written in sections that map onto the real module layout so nothing here is throwaway.

---

<!--
TEMPLATE FOR NEW ENTRIES — copy this block

## vX.X — Short Title
**Date:** YYYY-MM-DD · **Environment:** chat / Claude Code · **File(s):**

**What changed:**
-

**Bugs fixed:**
-

**Testing:**
-

**Assumptions/notes:**
-

**How to test:**
-->

---

## [in progress] Development infrastructure and sandbox foundation
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

**Completed:**
- Added `PLAY_LONGBARROW.bat`: checks for Node/npm, installs dependencies when
  absent, starts Vite, and opens the local game URL.
- Added `RUN_TESTS.bat` and `BUILD_GAME.bat` with the same dependency guard.
- Added `npm run verify` for typecheck → lint → tests → production build.
- Added `docs/PROGRESS.md`, the live percentage/benchmark scoreboard.
- Added an opt-in developer sandbox (`?dev=camera`, `battle`, `units`,
  `economy`, or `performance`). Its first controls pause/resume the deterministic
  loop, advance one tick, set 0.25×–4× simulation speed, and spawn basic units.
- Extended the core loop with pause, single-step, and simulation-speed controls;
  render still runs while the simulation is paused.

**Validation status:**
- Source-level review complete.
- Full automated verification is temporarily blocked because dependencies are
  absent from the ZIP and package installation did not complete in this
  execution environment. Do not describe this as a test failure.

**Next:** finish sandbox validation, then split camera state/math/input and land
war-table camera iteration one.


### War-table camera iteration one
- Split pure, browser-independent camera calculations into
  `src/render/cameraMath.ts`.
- Added explicit focus, yaw, pitch, and distance state with safe clamps.
- Panning is now camera-relative and uses acceleration/damping rather than
  frame-by-frame position jumps.
- Mouse-wheel zoom is smoothed; middle-mouse drag orbits around the focus point.
- Added `tests/camera.test.ts` for clamps, geometry, yaw-relative panning, and
  angle normalization. Test execution remains pending dependency installation.


## [in progress] LAN sharing and anchored camera zoom
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

**Completed:**
- Added `PLAY_ON_LAN.bat`, which performs the same Node/npm/dependency guards as
  the local launcher and starts Vite on the private LAN.
- Added `npm run dev:lan` and `npm run preview:lan`.
- Added staged LAN multiplayer to `ROADMAP.md` and `TODO.md`, explicitly
  separating current build sharing from future synchronized play.
- Mouse-wheel zoom now retains the ground point beneath the cursor while the
  smoothed zoom settles, using a horizontal battlefield plane as iteration one.
- Wheel handling is now non-passive so the browser page does not scroll while
  zooming the game.
- Added short-lived world-space markers for move, gather, and rally commands,
  giving immediate confirmation without mutating deterministic simulation state.

**Validation status:**
- Source inspection complete. Automated verification remains blocked by absent
  dependencies in the uploaded ZIP/current execution environment.
- Cursor anchoring still needs browser validation at map edges and refinement
  against actual terrain height rather than the iteration-one flat plane.


## [in progress] Complete CodePen reference capture
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

**Completed:**
- Corrected the permanent art-reference log to include every CodePen supplied
  through this date, not only the first three high-fidelity examples.
- Added explicit intended uses for water, liquid-glass UI, dimensional panels,
  cinematic motion, bioelectric organic systems, and bloom.
- Marked VoXelo `GgNawEE` as a bloom/emissive technique reference only, not a
  target for the game's overall visual style.
- Added an authoritative complete-link checklist to prevent future omissions.

## [in progress] First-party concept-art archive and GitHub presentation
**Date:** 2026-07-27 · **Environment:** ChatGPT working copy

**Completed:**
- Added eleven optimized first-party concept images under
  `docs/assets/concept-art/`.
- Added `docs/CONCEPT_ART.md`, with faction/system-specific interpretation,
  implementation constraints, and explicit notes distinguishing hero-detail
  references from the actual stylized RTS target.
- Added a restrained battlefield hero and three-faction visual strip to the
  GitHub README, plus a link to the complete gallery.
- Declared the original concept set the primary art-direction source; external
  CodePens remain secondary technique references.

**Validation status:**
- All repository image paths and filenames were checked locally.
- Images were converted to GitHub-friendly WebP derivatives (maximum 2048 px,
  approximately 3.8 MB total) to avoid inflating every clone and handoff with
  the roughly 37 MB source PNG set.

## Unreleased — open RTS engine vision

- Added `docs/ENGINE_VISION.md`, defining Longbarrow's long-term role as an open,
  browser-first RTS engine and creator platform.
- Added a staged mod/creator SDK track to the roadmap without prematurely
  extracting unfinished gameplay systems.
- Added architecture rules that distinguish reusable mechanics, Longbarrow game
  composition, and authored content.
- Added backlog and open questions for schemas, content packs, templates,
  licensing, version compatibility, editors, and safe custom scripting.


## 2026-07-27 — deterministic save/load development tools

- Added `src/sim/save.ts` with versioned save envelopes, map-version checks, tick metadata, and deterministic state-hash validation.
- Added browser quick-save/load and portable JSON save import/export to every developer sandbox mode.
- Added save round-trip, incompatibility, metadata, and tamper-detection tests.
- Added `docs/SAVE_AND_REPLAY.md` and synchronized roadmap/current-state/progress documentation.


### 2026-07-27 tabletop freedom and website usability
- Public site uses one obvious top-navigation button labelled **Play**.
- Concept-art gallery supports full-screen click/keyboard viewing.
- Hero war-table artwork is smaller and visually farther back in black negative space.
- Camera envelope supports miniature-level inspection, near-overhead overview, full orbit, and travel beyond the authored terrain.
- World backdrop is pure black and the terrain has temporary descending table edges pending the later support-world concept.

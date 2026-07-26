# Changelog

Tracks every buildable version and every locked design decision, regardless of
which environment produced it (this chat, or Claude Code). Newest entry on top.

Versioning follows the blueprint's phase.step numbering (`02_development_blueprint.md`),
e.g. `v1.2` = Phase 1, step 1.2. Design-only entries (no code) are marked `[design]`.

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

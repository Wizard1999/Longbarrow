# Current State

**Date:** 2026-07-27
**Repository:** `Wizard1999/Longbarrow` (private) — migrated from `Wizard1999/RTS`
**Branch:** `claude/project-plan-review-34kyva` · `main` is current
**Last known upstream verification:** 226 passing · typecheck clean · lint clean · build clean
**Current working-copy verification:** blocked pending dependency installation; no source failure established

---


## 2026-07-27 active production checkpoint — 44%

The developer sandbox foundation is now complete: scenario presets, simulation controls, render metrics, selected-order diagnostics, and toggleable world overlays are available through `?dev=<mode>`. The war-table camera pans and orbits smoothly, zooms around the cursor, focuses at the actual terrain height, and uses the rendered terrain for anchoring. Selection now rejects hidden projections and resolves overlapping unit/site/building hits through a tested RTS priority policy. Move, gather, rally, attack, and invalid commands all provide immediate world-space acknowledgement.

Browser verification is still pending because dependencies could not be installed in the execution environment used for this handoff. Source changes and tests are present, but must not be described as executed until `npm run verify` succeeds locally.


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

**Live recording is now wired.** Browser input and UI commands pass through a single `issueCommand()` gateway that records the serializable command before invoking the normal `cmd*` function, preserving command results needed by the interface. Replay v3 also records whether the standard AI was enabled plus an optional endpoint tick/hash. The sandbox can export, independently verify, and load the exact verified endpoint. The remaining work is an interactive timeline/keyframe viewer and observed-event integration for the cinematic director.

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
29 new tests. Longbarrow is now a game you can win or lose.

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
4. Validate the full suite once dependencies are available.

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

# Current State

**Date:** 2026-07-27
**Repository:** `Wizard1999/Longbarrow` (private) — migrated from `Wizard1999/RTS`
**Branch:** `claude/project-plan-review-34kyva` · `main` is current
**Tests:** 185 passing · typecheck clean · lint clean · build clean

---

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

**Not yet wired into live play** — input and UI still call `cmd*` directly.
Routing them through `Recorder.apply()` is the last step before real matches
record, and it is mechanical.

## Currently working on

**The painterly art pass** (`DECISIONS.md` D-005) — partially landed.

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

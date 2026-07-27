# Current State

**Date:** 2026-07-27
**Branch:** `claude/project-plan-review-34kyva`
**Tests:** 146 passing · typecheck clean · lint clean

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

## Blockers

### 🔴 GitHub push access is read-only
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

1. **Resolve push access** (above). Highest priority: everything else is at risk
   while the only copy of this work is in an ephemeral container.
2. **Finish the art pass** — units, buildings, scenery, nodes, sites; HUD quality
   selector.
3. **Dev console** — backtick to open; `/add`, `/pause`, `/speed`, `/spawn`,
   `/kill`, `/reveal`, `/tick`, `/help`. Must route through `sim/commands.ts`
   and be recorded into the replay stream, or replays will desync.
4. **Replay system** (`DECISIONS.md` D-008) — record `{seed, tickRate, version,
   commands[]}`, play back by re-simulating. Ship the determinism test with it.
5. **Basic CPU opponent** (`DECISIONS.md` D-009) — grown alongside features, not
   written late; issues the same commands a human does.

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

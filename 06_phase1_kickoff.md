# 06 — Phase 1 Kickoff (Decisions & Task Spec)

Add this file to the handoff package alongside `00`–`05`. Read it **after** those, immediately before starting Phase 1.

**Precedence:**
- `01_design_document.md` remains authoritative for *what the game is*. Nothing here overrides it.
- This file is authoritative over `02_development_blueprint.md` for *stack and architecture within Phase 1* — it settles choices the blueprint deliberately left open, and adds acceptance criteria per step.

**Status:** Phase 0 complete (`05_phase0_prototype.html`). Phase 1 not started. Begin at 1.1.

---

## 1. Settled decisions

| Decision | Choice | Source |
|---|---|---|
| Environment | Claude Code | Designer, this session |
| Bundler / dev server | Vite | Blueprint 1.1 |
| Language | TypeScript, `strict: true` | Design doc 10.1 |
| Rendering | Three.js via npm (not CDN) | Design doc 10.1 |
| Pathfinding | Grid-based A*; defer navmesh | Design doc 10.1 |
| Simulation | 20Hz fixed tick, separate from render | Blueprint 1.2 |
| Multiplayer | Deferred to Phase 4.3; architecture must not preclude it | Design doc 10.1 |

**Proposed, confirm with designer at 1.1 before locking:**
- No state-management library. The sim owns plain TS structures; the renderer and UI read them and never write them.
- Testing: `vitest` for headless simulation tests. This adds a dev dependency, so it needs a nod first.

---

## 2. Target project structure

```
index.html
package.json
tsconfig.json
vite.config.ts
src/
  main.ts                 bootstrap: build world, wire render + input, start loop
  core/
    loop.ts               fixed-tick accumulator, interpolation alpha
    rng.ts                seeded PRNG — the sim must never call Math.random()
    types.ts              shared ids, vectors, enums
  sim/                    PURE — see rule below
    world.ts              authoritative game state
    terrain.ts            heightmap, elevation queries, high-ground tests
    entities.ts           units, buildings, resource nodes
    movement.ts
    pathfinding.ts
    combat.ts
    economy.ts            gather/return loop, resource stocks
    construction.ts       queue & walk, pause/resume
    squads.ts             squads, behavior chains, cohesion
    commands.ts           the ONLY entry point for outside code to mutate sim
  render/
    renderer.ts
    camera.ts             RTS camera (port from Phase 0)
    terrainMesh.ts
    unitViews.ts          sim entity id -> Three object, interpolated
    selectionVisuals.ts
  input/
    mouse.ts
    keyboard.ts
    selection.ts          screen-space picking -> emits commands
  ui/
    hud.ts
    buildMenu.ts
    chainEditor.ts        behavior chain UI (1.7)
  data/
    units.ts
    buildings.ts
    tuning.ts             every balance number lives here, nowhere else
```

---

## 3. The one architectural rule that matters

**`src/sim/**` must not import `three`, touch the DOM or `window`, read wall-clock time, or call `Math.random()`.**

Everything outside `sim/` reads sim state freely and mutates it only through `commands.ts`. All durations are expressed in **ticks**, not seconds. All randomness comes from the seeded PRNG in `core/rng.ts`.

Why this is worth the discipline: it makes the simulation headlessly testable from day one, makes replays nearly free, and is the single thing that decides whether Phase 4.3 (lockstep multiplayer) is a feature or a rewrite. Enforce it with an ESLint `no-restricted-imports` rule scoped to `src/sim/` — a rule that fails the build is worth more than a comment asking people to be careful.

**Loop shape (1.2):** accumulator pattern, 50ms tick, cap catch-up at ~5 ticks per frame to avoid a death spiral on slow frames. Entities store previous and current position; the renderer interpolates between them using the leftover alpha. Nothing in the render loop advances game state.

---

## 4. Phase 1 steps with acceptance criteria

Blueprint 1.1–1.13 descriptions stand. These are the "how do we know it's done" conditions.

| Step | Done when |
|---|---|
| 1.1 Project structure | Dev server runs; scene is visually identical to the Phase 0 prototype; a grep confirms `sim/` imports nothing from `three`; no gameplay logic in the render loop yet. |
| 1.2 Fixed tick | Units move at identical speed regardless of framerate (test by throttling); motion is visibly smooth, proving interpolation works; a debug HUD shows tick count and current FPS separately. |
| 1.3 High ground | A unit on higher terrain than its target measurably out-trades an equal unit below it, and sees further; a debug overlay can shade elevation bands so the advantage is legible. |
| 1.4 Gather loop | One right-click on a resource node makes a worker gather and return indefinitely; the resource counter climbs; zero further input needed. |
| 1.5 Command supply | Production is blocked at the pop cap; building a Standard/Outpost raises it and visibly extends control range. |
| 1.6 Construction | A worker reassigned mid-build **pauses** construction rather than cancelling it; sending it back resumes from where it stopped. Placement preview shows valid/invalid. |
| 1.7 Behavior chains | A three-step chain (e.g. move → attack-move → patrol) can be assembled in a handful of clicks and runs unattended until redirected. If it feels like scripting, it's wrong — rebuild the interaction, not the backend. |
| 1.8 Core units | Legionnaire defense scales with adjacent Legionnaires up to the cap; Marksman accuracy is measurably better stationary than moving. |
| 1.9 Combat | Two otherwise-equal squads fight; the one with a flank or high ground wins clearly and quickly, with no player input during the fight. |
| 1.10 Cohesion | 30 units in one squad without a second officer visibly underperform against two squads of 15. This is the number to watch at the playtest. |
| 1.11 AI | Opponent gathers, builds, produces, and attacks on a unit-count trigger. Not smart, just alive. |
| 1.12 Win condition | Destroying all enemy Command structures ends the match with a win/loss screen. |
| 1.13 Playtest | Stop. Report to the designer specifically against the three core claims: positioning over micro, split squads over deathball, automation without loss of depth. Expect design changes; that's the point. |

---

## 5. Assumptions (flagged for designer correction)

Made because the design document doesn't resolve them. Each is cheap to reverse.

- **A1 — One resource type in Phase 1**, plus Command as the separate supply stat. Adding a second later is a data change, not a structural one.
- **A2 — High ground grants a damage bonus vs. lower targets and a vision-range bonus.** Both single constants in `tuning.ts`.
- **A3 — The Chronicler is Cohort's officer unit** for the cohesion cap. The roster names no explicit officer; Chronicler (support, extends Command range) is the natural fit.
- **A4 — Command gates both pop cap and the number of simultaneously automated squads** (design doc 8.3). The blueprint only requires pop cap at 1.5; the automation cap is the more interesting half and is nearly free once 1.7 exists.
- **A5 — Phase 1 map:** one symmetric map, two spawns, mirrored resource nodes, and at least one contested piece of high ground on the path between bases. Concrete map design is unspecified in the design doc; this is the minimum needed to test the terrain pillar.

---

## 6. Known Phase 0 issues to fix during migration

- Click-select doesn't filter by team — the rival squad is currently selectable and commandable.
- `terrainHeightAt()` duplicates the terrain generation formula; the two will drift. Single source of truth in `sim/terrain.ts`.
- Right-click move targets hardcode `y = 0` instead of sampling terrain height.
- Two separate `mouseup` listeners on the canvas; consolidate.
- Team assignment runs after spawn rather than at construction.
- No unit collision or obstacle avoidance yet (expected — arrives with 1.1/pathfinding).

---

## 7. Working agreement (restated from `00_START_HERE_FOR_OPUS.md`)

- State what you're about to do before each step; summarize what changed and how to test it after.
- Pause for approval before: starting a new phase, any architectural decision not specified here, adding a dependency, or anything expensive to undo.
- Don't pause for small implementation details inside an approved step.
- Every increment leaves the game runnable.
- Every number in the design doc is a first-draft placeholder. Implement the systems faithfully; don't agonize over the values.

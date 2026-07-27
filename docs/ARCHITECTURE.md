# Architecture

## The one rule

`src/sim/` is a **pure, deterministic, headless** simulation. It never imports
from `render/`, `input/`, or `ui/`. `tests/architecture.test.ts` enforces this
mechanically — it scans imports and fails the build if the boundary is crossed.

Everything downstream of that rule follows from three things we want:

| Want | Requires |
|---|---|
| Replays | Same inputs + same seed ⇒ same state, every time |
| Lockstep multiplayer | Every client computes an identical tick |
| Testable AI opponent | Run the sim thousands of ticks with no renderer |

All three are free if determinism is preserved from day one, and all three are
near-impossible to retrofit. That is why the rule is non-negotiable.

## Layers

```
core/   ──────────────► no dependencies at all
  types.ts    shared ids, vectors, entity shapes
  rng.ts      seeded mulberry32 — the ONLY randomness in the sim
  loop.ts     fixed-tick accumulator loop + tick constants

data/   ──────────────► no logic, only numbers
  tuning.ts     build, combat, economy, automation constants
  units.ts      unit stat table
  buildings.ts  building stat table

sim/    ──────────────► imports core/ + data/ ONLY
  world.ts        World state + simStep() — the tick entry point
  entities.ts     spawn/despawn
  map.ts          test map construction
  terrain.ts      heightfield + high-ground queries
  movement.ts     steering
  combat.ts       target acquisition, damage, shield wall, settle ramp
  economy.ts      worker gather state machine
  construction.ts build sites and progress
  production.ts   training queues
  supply.ts       supply + command bandwidth
  squads.ts       squad membership, behaviour chains
  commands.ts     the ONLY way outside code mutates the world
  daynight.ts     day/night cycle derived from world.tick
  snapshot.ts     snapshot / restore / hash — rollback + replay foundation

render/ ──────────────► reads sim, never writes it
  renderer.ts      WebGLRenderer, lights, tone mapping
  palette.ts       hue-path colour definitions
  painterly.ts     the stylised shading material
  quality.ts       perf tiers (low/medium/high)
  camera.ts        RTS pan/zoom camera
  terrainMesh.ts   ground mesh
  *Views.ts        one module per entity kind; syncs Three objects to sim state
  chainVisuals.ts  behaviour-chain overlay
  skyCycle.ts      sun/sky/fog derived from the sim clock (read-only)
  placementGhost.ts

input/  ──────────────► translates events into commands/*
  mouse.ts, keyboard.ts, selection.ts

ui/     ──────────────► DOM overlays
  hud.ts, chainEditor.ts
```

## The tick

`core/loop.ts` runs a fixed-timestep accumulator:

- `TICK_HZ = 30` — the sim advances in fixed 33.3 ms steps
- `render(alpha, …)` receives the leftover fraction so views interpolate
  between the previous and current tick
- `MAX_CATCHUP = 5` caps catch-up so a stalled tab cannot spiral

**Nothing in `render` advances game state.** Units store `prevX/prevZ` and
`prevFacing`; the renderer lerps between previous and current using `alpha`.
This is why a 30 Hz sim looks perfectly smooth at 144 fps.

## Commands are the only mutation path

Input and UI never touch `world` fields directly. They call `sim/commands.ts`
(`cmdSetSelection`, `cmdFormSquad`, `cmdCancelSite`, …). Every command:

- validates before mutating
- returns `{ ok, reason? }` rather than throwing
- is a **serializable intent**

That last property is what makes replays and networking possible later — a
replay is just the recorded stream of commands plus the seed. Keep commands
serializable: no functions, no Three.js objects, no DOM references in a
command payload.

## Determinism checklist

When touching `sim/`:

- [ ] No `Math.random()` — use `world.rng`
- [ ] No `Date.now()` / `performance.now()`
- [ ] No wall-clock durations — ticks only
- [ ] No iteration over a structure whose order can vary between runs
- [ ] No floating-point accumulation that depends on frame timing
- [ ] No closures, functions, `Map`/`Set` or object references stored on `World`
      — snapshot/restore/hash all break on unreachable state (D-010)

## Snapshot, restore, hash

`sim/snapshot.ts` provides the three operations every networked feature needs:

| Feature | Implementation |
|---|---|
| Rollback | `restore()` then N × `simStep()` |
| Replay seek | `restore()` to nearest keyframe, then re-simulate |
| Desync detection | compare `hash()` per tick |
| Match validation | server re-simulates, confirms final `hash()` |

`restore()` mutates the world **in place** — swapping the object would leave
every view holding an orphan. `hash()` excludes `prevX`/`prevZ`/`prevFacing`
(render interpolation state, not simulation inputs) and quantises floats to 1e-6
so peers agreeing within tolerance are not reported as desynced.

## Rendering model

Painterly stylisation lives in `render/painterly.ts`. The idea, taken from the
art reference: a surface is not one colour lit and darkened, it is a **hue
path** — separate shade, midtone and lit colours the shading model walks along.
Shadows shift hue rather than going black. That single choice is most of the
difference between "stylised" and "3D render with the lights turned down".

Performance is tiered, not the look. The shading model is fragment maths and
costs nothing; what scales by tier is shadow resolution, antialiasing, pixel
ratio, and mesh subdivision. Target: **1080p / 30 fps / 100+ units on a 2017
integrated GPU.**

## Engine-readiness rule

Longbarrow is also the proving ground for a future open RTS engine. Do not extract
an abstract engine prematurely, but write new systems so game-specific content is
not needlessly embedded in reusable mechanics.

When adding a feature, ask:

- Is this a generic mechanic, a Longbarrow rule composition, or authored content?
- Could faction/resource/unit differences be represented through typed data or
  capabilities rather than faction-name conditionals?
- Does the feature preserve serializable commands, snapshots, hashing, headless
  execution, and deterministic custom rule sets?
- Is the rendering assumption truly engine-wide, or only Longbarrow art direction?

The target layering and staged extraction plan are documented in
`docs/ENGINE_VISION.md`.

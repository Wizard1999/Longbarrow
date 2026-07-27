# Project: Greenmantle

> Read `START_HERE.md` at the beginning of every session.

**Codename:** Greenmantle — a prehistoric burial mound, grassed over: ancient
machinery of death gently overgrown. It names the *project*. *Cohort* names a
race inside the game. Keep the two distinct: the codename should not change
when the roster does.

## Overview

A real-time strategy game built around **commanding intent**, not clicking fast.

The player is an Operations Commander. They issue objectives and doctrine to an
army that executes intelligently. Direct StarCraft-style unit control still
exists and always will — it is simply the *worse* way to play, not a removed one.

Core philosophy:

- Intent over execution — the interface expresses goals, not keystrokes
- Terrain decides fights — position beats raw stats
- Set-and-forget economy — workers do not need babysitting
- Four races as **forces of nature**, not civilizations

Full design: `docs/GAME_DESIGN.md`. Interface target: `docs/UI_BLUEPRINT.md`.

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Renderer | Three.js `^0.185` |
| Build | Vite 7 |
| Tests | Vitest — run `npm test` for the current count (340 at last update) |
| Lint | ESLint 9 + typescript-eslint |

No engine. No framework. Plain modules.

## Architecture Rules

The single hard rule of this codebase:

**`src/sim/` never imports from `src/render/`, `src/input/`, or `src/ui/`.**

The simulation is a pure, deterministic, headless state machine. Everything
else observes it. This is enforced by `tests/architecture.test.ts` — if you
break it, that test fails.

Why it matters: determinism is what makes replays, lockstep multiplayer, and
a testable AI opponent possible. It is cheap to keep and expensive to retrofit.

```
src/
├── core/      types, RNG, fixed-tick loop     (no deps)
├── data/      ALL balance numbers             (no logic)
├── sim/       deterministic game state        (never imports outward)
├── render/    Three.js views of sim state     (read-only on sim)
├── input/     mouse, keyboard, selection
└── ui/        HUD, chain editor (DOM)
```

## Required Reasoning Protocol

Before substantial planning, coding, debugging, or visual work, apply
`docs/AGENT_REASONING.md`. Use its structured checklist privately; communicate
concise rationale, decisions, evidence, and verification rather than private
chain-of-thought. Treat claims about model internals as unverified unless reliable
evidence is present.

## The mission, because it changes what "correct" means

**This is a game engine first. We are building the engine by building the game.**
See `docs/ENGINE_VISION.md`. Greenmantle is the first game on it, not the point
of it.

The practical consequence, and the one that gets missed: **`src/sim/` is an RTS
engine that happens to be running Greenmantle.** It must not know the name of
anything a future game author could replace — not units, not races, not
resources, not the stealth model, not the character of the terrain. Every one of
those is content declared in `src/data/` and read generically.

The test to apply before touching `src/sim/`, especially before adding a field to
`World` or a string literal anywhere in it:

> *Could someone building a completely different RTS on this engine want this to
> be different? If yes, it is data, not code.*

Worked example, from a real mistake: "the game has two resources, Material and
Legacy" (D-031) is **content**. Implementing it as two fields on `World` would
have been **architecture** — and would have silently welded Greenmantle's economy
into the engine while passing every existing test. The right shape is a resource
registry in `src/data/` and a bag keyed by resource id, so a game author can ship
one resource or five without opening `src/sim/`. Same pattern for stealth: this
game declares terrain concealment (D-032), and the engine must still make a
StarCraft-style cloak reachable as content rather than as a fork.

## Important Rules

**Never:**
- Put game logic in render, input, or UI files
- Import outward from `src/sim/`
- Hardcode a balance number outside `src/data/`
- Use wall-clock time in the sim — durations are **ticks**, never seconds
- Use `Math.random()` in the sim — use the seeded RNG in `src/core/rng.ts`
- Iterate a `Map`/`Set` in a way that lets insertion order change results
- Name game content inside `src/sim/` — no unit, race, resource or tech name, in
  code *or* in a user-facing string. Enforced by `tests/architecture.test.ts`
  ("engine-first content boundary")

**Always:**
- Express durations in ticks (`TICK_HZ` is 30 — see `docs/DECISIONS.md` D-004)
- Add a test when you add a system
- Update `docs/CURRENT_STATE.md` when you finish a chunk of work
- Log a design decision in `docs/DECISIONS.md` when you make one
- Interpolate in render using the loop's `alpha` — never move a unit in `render`
- **Add a row to `docs/ARCHITECTURE.md` when you add a file.** The module map is
  complete by contract: any coding agent must be able to pull this repo and
  orient with no outside instruction. A map missing half the codebase is worse
  than none, because it gets trusted.
- Declare race mechanics as **traits in `src/data/`**, never as a unit-name
  check inside `src/sim/` (D-029)
- **Encode a rule as a test the moment you notice it is only prose.** D-029 was
  written in three documents and still got broken, because nothing executed it.
  The test added for it found a pre-existing violation on its first run. Doctrine
  that cannot fail the build is a suggestion.

## Current Focus

See `docs/CURRENT_STATE.md` — that file is the source of truth for
"what were we doing?" and is updated as work lands.

## Commands

```bash
npm run dev        # vite dev server
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src tests
npm run build      # typecheck + vite build
npm run verify     # typecheck + lint + test + build (the full gate)
npm run sync:site  # republish docs/ROADMAP.md to the public dev page
```

Run `npm run verify` before every commit.


## Versioned handoff naming

Extracted work folders and packaged archives must include the build version, for example `Greenmantle-v1.14.0-work` and `Greenmantle-v1.14.0-59pct.zip`. Do not hand off generic `Greenmantle-main` folders when a version is known.

## Public roadmap invariant

- Treat `docs/ROADMAP.md` as public product data: run `npm run sync:site` after roadmap/progress edits and verify the full roadmap appears on `/development.html`.

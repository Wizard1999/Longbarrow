# Cohort RTS

A real-time strategy game built around **commanding intent** rather than
clicking fast. The player acts as an Operations Commander — issuing objectives
and doctrine to an army that executes them intelligently.

Runs in the browser. No engine, no framework — TypeScript, Three.js and Vite.

## Quick start

```bash
npm install
npm run dev
```

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest (146 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + production build |

## Controls

| Key | Action |
|---|---|
| Drag / click | Select units |
| Right click | Move |
| `1`–`5` | Select squad |
| `Ctrl`+`1`–`5` | Form squad from selection |
| `Q` / `E` / `R` | Train worker / legionnaire / marksman |
| `B` | Place outpost (with a worker selected) |
| `G` | Select all gatherers |
| `Esc` | Cancel current mode |
| `T` | Toggle the slow-frame throttle (tick-rate independence test) |

## Repository layout

```
src/
├── core/    types, seeded RNG, fixed-tick loop
├── data/    all balance numbers, no logic
├── sim/     deterministic headless simulation
├── render/  Three.js views
├── input/   mouse, keyboard, selection
└── ui/      HUD, chain editor
tests/       Vitest suites
docs/        design bible, architecture, decisions, state
legacy/      original HTML prototypes, kept for reference
```

**The one architectural rule:** `src/sim/` never imports from `render/`,
`input/` or `ui/`. The simulation is pure and deterministic — that is what makes
replays, lockstep multiplayer and a testable AI possible.
`tests/architecture.test.ts` enforces it.

## Documentation

Start at [`START_HERE.md`](START_HERE.md). The key documents:

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Orientation + coding rules |
| [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) | What's done, in flight, next |
| [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) | Full design bible |
| [`docs/UI_BLUEPRINT.md`](docs/UI_BLUEPRINT.md) | Target command interface |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module map |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Decision log |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase plan |

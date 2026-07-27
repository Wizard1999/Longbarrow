# Longbarrow

> **Longbarrow** is the project codename. *Cohort* is a race within the game —
> the two are deliberately separate, so the project has an identity that does
> not shift when the roster does.

A real-time strategy game built around **commanding intent** rather than
clicking fast. The player acts as an Operations Commander — issuing objectives
and doctrine to an army that executes them intelligently.


![Longbarrow contested battlefield concept art](docs/assets/concept-art/contested-ground.webp)

<p align="center">
  <em>Fossilized memory meets an aggressive tide of iridescent life.</em>
</p>

Runs in the browser. No engine, no framework — TypeScript, Three.js and Vite.

## Visual direction

<table>
<tr>
<td width="33%"><img src="docs/assets/concept-art/cohort-legionnaire.webp" alt="Cohort legionnaire"></td>
<td width="33%"><img src="docs/assets/concept-art/mycora-spread-structures.webp" alt="Mycora spread"></td>
<td width="33%"><img src="docs/assets/concept-art/conclave-ritual.webp" alt="Conclave ritual"></td>
</tr>
<tr>
<td align="center"><b>Cohort</b><br>Fossilized legacy still carrying out its purpose.</td>
<td align="center"><b>Mycora</b><br>Beautiful life spreading with the violence of disease.</td>
<td align="center"><b>Conclave</b><br>Coordination embodied as water, fabric, and flow.</td>
</tr>
</table>

See the full [original concept-art gallery](docs/CONCEPT_ART.md).

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
| [`docs/CONCEPT_ART.md`](docs/CONCEPT_ART.md) | First-party visual targets and implementation notes |


## Open RTS engine vision

Longbarrow is intended to remain open source and gradually become a reusable,
browser-first RTS foundation. The long-term goal is to let creators define their
own armies, factions, resources, lore, balance, scenarios, and presentation while
reusing the deterministic simulation, commands, replay foundation, renderer,
testing tools, and public development site. Development remains game-first: the
engine is extracted from systems proven in Longbarrow rather than designed in the
abstract. See [`docs/ENGINE_VISION.md`](docs/ENGINE_VISION.md).

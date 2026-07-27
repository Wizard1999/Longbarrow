# START HERE

**You are picking up an in-progress game project. Everything you need is in
this repository — there is no missing context and you should not need to ask
for any.** Read this file, then the four in "Orientation" below, and begin.

---

## 0. Check the git remote before anything else

The home of this project is **`Wizard1999/Longbarrow`**, not the older
`Wizard1999/RTS`.

```bash
git remote -v          # origin MUST be .../Wizard1999/Longbarrow
```

Remote-execution containers are recreated between sessions and re-clone from
whichever repo the session was originally attached to, silently resetting
`origin` back to `RTS`. This has happened **three times** and has sent commits
to the wrong repository. A push to the wrong remote reports success, so this is
silent — check it, don't assume it. If wrong:

```bash
git remote rename origin rts-old
git remote add origin https://github.com/Wizard1999/Longbarrow
```

---

## 1. What this is, in one paragraph

**Longbarrow** is a browser real-time strategy game about **commanding intent,
not clicking fast**. The player is an Operations Commander who issues
objectives and doctrine to an army that executes them intelligently. Terrain
decides fights; nobody wins by clicking faster. Four races are *forces of
nature* rather than civilizations — Cohort (Death), Mycora (Life), Conclave
(Water), Titanfolk (Earth). TypeScript + Three.js + Vite, no engine, no
framework.

*Longbarrow is the **project** codename. Cohort is a **race** inside it. Never
conflate them.*

---

## 2. The two rules that are not negotiable

**A. `src/sim/` is pure, deterministic, and never imports outward.**
No `render/`, `input/`, or `ui/`. No `Math.random()` (use `world.rngState`), no
`Date.now()`, no wall-clock — durations are **ticks** (`TICK_HZ` = 30).
Enforced by `tests/architecture.test.ts`.

**B. No sim state may live anywhere unreachable.**
No closures, functions, `Map`/`Set` on `World`, or object references between
entities — ids only. If `structuredClone` can't carry it, you have broken
replays, save/load and future multiplayer *simultaneously*, and a fresh
simulation from tick 0 will still pass all tests. See `DECISIONS.md` **D-010**.

**C. Engine-first.** `src/sim/` must not name any specific unit, building or
technology. Race content lives in `src/data/` and declares **traits** the
engine reads generically. Scrapping all four races and rebuilding must stay
cheap. See **D-029**.

---

## 3. Orientation — read these four, in order

| File | What it gives you |
|---|---|
| `CLAUDE.md` | Architecture rules, coding rules, commands |
| `docs/CURRENT_STATE.md` | **What was just done and what is next** (top section only) |
| `docs/TODO.md` | Prioritized work queue |
| `docs/DECISIONS.md` | 29 logged decisions — **do not relitigate these** |

`DECISIONS.md` is the highest-value file in the repository. It records not just
what was decided but *why the obvious alternative was rejected*. Read it before
proposing a change to tick rate, combat resolution, cohesion, the resource
colour, netcode, or the camera.

## Read on demand

| File | For |
|---|---|
| `docs/GAME_DESIGN.md` | The design bible — races, economy, combat, phases |
| `docs/UI_BLUEPRINT.md` | Target command interface (missions, doctrine, squads) |
| `docs/ARCHITECTURE.md` | Module-by-module map |
| `docs/ROADMAP.md` | Phase plan — **public data, see invariant below** |
| `docs/ART_PROMPTS.md` | Art direction encoded as image-generation prompts |
| `docs/ART_REFERENCES.md` | Supplied references and what each is for |
| `docs/OPEN_QUESTIONS.md` | Needs a designer decision |
| `docs/BUGS.md` | Known defects |
| `docs/CHANGELOG.md` | Version history |
| `docs/AGENT_REASONING.md` | Structured reasoning protocol |
| `docs/ENGINE_VISION.md` | Open-engine / creator-platform direction |

---

## 4. Art direction in one block

Ghibli-influenced low-poly. **Warm painterly light; shadows shift hue toward
violet rather than going black — never grimdark.** Weathering and overgrowth
are real materials, not decals. Surfaces use a three-colour *hue path*
(shade / mid / lit), not one colour dimmed.

Cohort specifically: **fossil, not machinery.** Bone-pale weathered stone, no
visible joints or gears, warm gold or pale green internal glow, moss in the
seams. If it reads as a robot, it's wrong — the Laputa guardians from *Castle
in the Sky* are the target.

The gatherable resource is **violet** (`PALETTE.legacy`), never teal — teal
reads as StarCraft minerals *and* belongs to Conclave (D-025).

All published imagery is **concept art, not in-game footage**, and must be
labelled as such. `src/site.ts` badges it automatically at the injection point.

---

## 5. The working loop

```
Read this file + the four orientation docs
        ↓
Do the work
        ↓
npm run verify        (typecheck + lint + tests + build)
        ↓
Update CURRENT_STATE.md  (+ DECISIONS.md if a decision was made)
npm run sync:site        (if ROADMAP or progress changed)
        ↓
git remote -v   → confirm Longbarrow
git commit && git push
```

**Commit and push before you run out of context.** The container is ephemeral;
anything unpushed is lost.

## Invariants to preserve

- **Public roadmap:** `docs/ROADMAP.md` is public product data. Run
  `npm run sync:site` after editing it and confirm it appears on
  `/development.html`.
- **Versioned handoffs:** archives and work folders carry the build version
  (`Longbarrow-v1.14.0-work`), never a generic `Longbarrow-main`.
- **Replay format:** bump `REPLAY_VERSION` whenever a command's meaning or a
  sim rule changes, or old replays will silently play wrong.

## When context runs low

Rewrite the top section of `CURRENT_STATE.md` in full — architecture
decisions, files changed, unfinished work, bugs, next steps, design philosophy.
Omit nothing. Then push. A fresh session starts again from this file.
